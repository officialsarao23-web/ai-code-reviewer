import os
import google.generativeai as genai
from supabase import create_client

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def embed_text(text: str) -> list[float]:
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
    )
    return result["embedding"]


def save_memory(user_id: str, content: str):
    embedding = embed_text(content)
    supabase.table("user_memory").insert({
        "user_id": user_id,
        "content": content,
        "embedding": embedding,
    }).execute()


def search_memory(user_id: str, query: str, limit: int = 5) -> list[str]:
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
    repo = final_report.get("pr_url", "unknown repo")

    for bug in final_report.get("bugs", []):
        content = f"Bug found in {repo}: {bug.get('description', '')} — Suggestion: {bug.get('suggestion', '')}"
        save_memory(user_id, content)

    for issue in final_report.get("security", []):
        content = f"Security issue in {repo}: {issue.get('vulnerability', '')} — {issue.get('description', '')} — Fix: {issue.get('fix', '')}"
        save_memory(user_id, content)

    quality = final_report.get("quality", {})
    if quality.get("summary"):
        content = f"Code quality in {repo}: Score {quality.get('score', 0)}/10 — {quality.get('summary', '')}"
        save_memory(user_id, content)