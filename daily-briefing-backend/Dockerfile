# -------- Base Image --------
FROM python:3.12-slim

# -------- Environment --------
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# -------- System deps --------
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# -------- Install Poetry --------
RUN pip install --no-cache-dir poetry

# -------- Set working dir --------
WORKDIR /app

# -------- Copy dependency files --------
COPY pyproject.toml poetry.lock* ./

# -------- Install dependencies --------
RUN poetry config virtualenvs.create false \
 && poetry install --no-interaction --no-ansi

# -------- Copy app --------
COPY . .

# -------- Create runtime dirs --------
RUN mkdir -p /app/daily_briefings

# -------- Expose port --------
EXPOSE 8000

# -------- Start app --------
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]