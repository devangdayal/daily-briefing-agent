# agent/graph.py
import yaml
from langgraph.graph import StateGraph, END

from .nodes import make_search_node, planner_node, synthesizer_node, writer_node
from .state import BriefingState


def build_graph_from_config(cfg: dict):
    """Build graph from a config dict — used by API."""
    builder = StateGraph(BriefingState)

    builder.add_node("planner",     planner_node)
    builder.add_node("synthesizer", synthesizer_node)
    builder.add_node("writer",      writer_node)

    search_names = []
    for topic in cfg.get("topics", []):
        name = f"search_{topic['name'].replace(' ', '_').lower()}"
        builder.add_node(name, make_search_node(topic, delay=0.0))
        search_names.append(name)

    builder.set_entry_point("planner")

    prev = "planner"
    for name in search_names:
        builder.add_edge(prev, name)
        prev = name

    builder.add_edge(prev, "synthesizer")
    builder.add_edge("synthesizer", "writer")
    builder.add_edge("writer", END)

    return builder.compile()


def build_graph(config_path: str = "config.yaml"):
    """Build graph from a yaml file — used by CLI (app.py)."""
    cfg = yaml.safe_load(open(config_path))
    return build_graph_from_config(cfg), cfg