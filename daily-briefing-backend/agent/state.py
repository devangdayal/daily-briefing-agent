from typing import TypedDict, Annotated, Any
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


class BriefingState(TypedDict):
    """"
    The shared whiteboard all agents can read and write to. It contains the current state of the briefing, including the topics being researched, the queries made, the raw results obtained, and the summaries generated.
    """
    # Configuration for the briefing
    config : dict
    date : str
    # The topics being researched, the queries made, the raw results obtained, and the summaries generated.
    topics : list[dict]
    topic_results : Annotated[list[TopicResult],operator.add]
    # The final briefing, which is a summary of all the topics researched and their results.
    sections : Annotated[list[str],operator.add]
    
    final_briefing : str    
    events : Annotated[list[str],operator.add]
    live_queue: Any
    
def default_state(config:dict, live_queue:Any) -> BriefingState:
    """
    Initializes the state with default values.
    """
    return BriefingState(
        config = config,
        date = "",
        topics = [],
        topic_results = [],
        sections = [],
        final_briefing = "",
        events = [],
        live_queue=live_queue 
    ) 
    
    
    
    
    
    
    
    
    
    