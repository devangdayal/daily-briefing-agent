from dotenv import load_dotenv
load_dotenv()   # must be before any other import that reads env vars

from agent.graph import build_graph


def main():
    graph, cfg = build_graph("config.yaml")

    print("\n Starting Daily Briefing Agent...\n")

    result = graph.invoke({
        "config":          cfg,
        "date":            "",
        "topics":          [],
        "topic_results":   [],
        "sections":        [],
        "final_briefing":  "",
        "events":          []
    })

    print("\n--- Agent Run Log ---")
    for event in result["events"]:
        print(event)

    print("\n--- Briefing Preview (first 500 chars) ---")
    print(result["final_briefing"][:500])
    print("\n[Full briefing saved to ./briefings/]")


if __name__ == "__main__":
    main()