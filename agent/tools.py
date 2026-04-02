import os
import smtplib
from datetime import datetime
import time
from email.mime.text import MIMEText
from pathlib import Path

from ddgs import DDGS


# Tool 1 - Web Search - DDG is free for all, So using it, but can be easily switched to Google Search API or Bing Search API if needed.
def web_search(query: str, max_results: int = 5) -> list[dict]:
        
    for attempt in range(3):
        try:
            results = []

            with DDGS(timeout=10) as ddgs:
                for r in ddgs.text(query, max_results=max_results, safesearch="off"):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "body": r.get("body", "")
                    })

            if results:
                return results

            print(f"[search] Empty result for '{query}', retry {attempt + 1}/3")

        except Exception as e:
            print(f"[search] Attempt {attempt + 1} failed: {e}")

    # AFTER all retries fail
    return [{
        "title": f"No results: {query}",
        "url": "",
        "body": "Search failed after retries (rate limit or no data)."
    }]

    
    
# Tool 2 - Save Briefing - Saves the final briefing to a text file with the current date as the filename.
def save_briefing(content: str, output_dir: str = "./briefings") -> str:
    
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    date_str = datetime.now().strftime("%Y-%m-%d")
    file_path = f"{output_dir}/briefing_{date_str}.md"
    
    with open(file_path, 'w', encoding="utf-8") as f:
        f.write(content)

    return file_path

# Tool 3 - Email Sender - Using SMTP to send email, can be easily switched to any email service provider's API if needed.
# TODO: Add Mail Functionality
def send_email(subject: str, body: str) -> dict:
    """
    Send briefing via Gmail SMTP.

    This only runs if GMAIL_USER is set in .env.
    Uses Python's built-in smtplib — no third-party email SDK needed.

    Gmail setup (one time):
      1. Enable 2FA on your Google account
      2. Go to myaccount.google.com → Security → App Passwords
      3. Create an app password, paste into GMAIL_APP_PASSWORD in .env
    """
    gmail_user = os.getenv("GMAIL_USER")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD")
    to_addr    = os.getenv("GMAIL_TO", gmail_user)

    if not gmail_user:
        return {"sent": False, "reason": "GMAIL_USER not set in .env"}

    msg            = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"]    = gmail_user
    msg["To"]      = to_addr

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_pass)
            server.send_message(msg)
        return {"sent": True, "to": to_addr}
    except Exception as e:
        return {"sent": False, "reason": str(e)}