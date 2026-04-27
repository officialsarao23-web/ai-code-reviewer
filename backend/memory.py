import os
from supabase import create_client
import voyageai

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
voyage_client = voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))


def embed_text(text: str) -> list[float]:
    """Convert text to a 1024-dimension vector using Voyage AI."""
    result = voyage_client.embed([text], model="voyage-large-2")
    return result.embeddings[0]


def save_memory(user_id: str, content: str):
    """Embed a finding and save it to Supabase user_memory table."""
    embedding = embed_text(content)
    supabase.table("user_memory").insert({
        "user_id": user_id,
        "content": content,
        "embedding": embedding,
    }).execute()


def search_memory(user_id: str, query: str, limit: int = 5) -> list[str]:
    """Search past memories relevant to the current query using cosine similarity."""
    query_embedding = embed_text(query)
    result = supabase.rpc("match_user_memory", {
        "query_embedding": query_embedding,
        "match_user_id": user_id,
        "match_count": limit,
    }).execute()
    if result.data:
        return [row["content"] for row in result.data]
    return []


def save_review_memories(user_id: str, final_report: dict):
    """
    After a review is complete, save key findings as memories.
    This lets the agent reference past issues in future reviews.
    """
    repo = final_report.get("pr_url", "unknown repo")

    # Save each bug as a memory
    for bug in final_report.get("bugs", []):
        content = f"Bug found in {repo}: {bug.get('description', '')} — Suggestion: {bug.get('suggestion', '')}"
        save_memory(user_id, content)

    # Save each security issue as a memory
    for issue in final_report.get("security", []):
        content = f"Security issue in {repo}: {issue.get('vulnerability', '')} — {issue.get('description', '')} — Fix: {issue.get('fix', '')}"
        save_memory(user_id, content)

    # Save quality summary as a memory
    quality = final_report.get("quality", {})
    if quality.get("summary"):
        content = f"Code quality in {repo}: Score {quality.get('score', 0)}/10 — {quality.get('summary', '')}"
        save_memory(user_id, content)