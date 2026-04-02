# agent/graph.py
import yaml
from langgraph.graph import StateGraph, END

from .nodes import make_search_node, planner_node, synthesizer_node, writer_node
from .state import BriefingState


def build_graph(config_path: str = "config.yaml"):
    """
    Sequential graph — nodes run one after another.
    
    Why sequential instead of parallel?
    Groq free tier = 6,000 tokens/minute.
    Parallel nodes fire simultaneously → both hit Groq at same second
    → silent rate limit wait → looks like a hang.
    
    Sequential flow:
      planner → search_topic_1 → search_topic_2 → synthesizer → writer
    
    Each search node finishes completely before the next starts.
    Slightly slower but 100% reliable on free tier.
    """
    cfg     = yaml.safe_load(open(config_path))
    builder = StateGraph(BriefingState)

    # Register fixed nodes
    builder.add_node("planner",     planner_node)
    builder.add_node("synthesizer", synthesizer_node)
    builder.add_node("writer",      writer_node)

    # Register search nodes
    search_names = []
    for topic in cfg.get("topics", []):
        name = f"search_{topic['name'].replace(' ', '_').lower()}"
        builder.add_node(name, make_search_node(topic, delay=0.0))  # no delay needed
        search_names.append(name)

    # Entry point
    builder.set_entry_point("planner")

    # Sequential chain — planner → search1 → search2 → ... → synthesizer
    prev = "planner"
    for name in search_names:
        builder.add_edge(prev, name)
        prev = name

    # Last search → synthesizer → writer → END
    builder.add_edge(prev, "synthesizer")
    builder.add_edge("synthesizer", "writer")
    builder.add_edge("writer", END)

    return builder.compile(), cfg