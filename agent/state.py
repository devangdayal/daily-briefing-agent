from typing import TypedDict, Annotated
import operator


class TopicResult(TypedDict):
    """"
    What one search node produces for one topic.
    e.g. "AI News" → 5 articles → Claude summary
    """
    
    topic: str
    queries: list[str]
    raw_results: list[str]
    summary: str
    