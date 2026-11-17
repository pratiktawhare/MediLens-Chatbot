from app.agent import graph

config = {"configurable": {"thread_id": "test_session_123"}}

result = graph.invoke(
    {
        "question": "What causes headaches?",
        "history": [],
        "image_description": "",
        "kb": [],
        "web": [],
        "answer": "",
        "route": "",
        "model_used": ""
    },
    config=config
)

print("\n--- LangGraph Execution Result ---")
print("Route Chosen:", result.get("route"))
print("KB Citations Count:", len(result.get("kb", [])))
print("Web Citations Count:", len(result.get("web", [])))
print("Model Used:", result.get("model_used"))
print("Answer Preview:\n", result.get("answer")[:250])
