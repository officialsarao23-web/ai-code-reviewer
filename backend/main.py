import os
import asyncio
import httpx
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from supabase import create_client
from auth import hash_password, verify_password, create_token, get_current_user, TokenData
from github_client import parse_pr_url, fetch_pr_metadata, fetch_pr_files, parse_diff_into_structured

load_dotenv()

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "ai-code-reviewer"

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", ""),
        "https://ai-code-reviewer-blue-seven.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class PRReviewRequest(BaseModel):
    pr_url: str

@app.get("/")
def root():
    return{"status": "ai code reviewer is running"}

@app.post("/auth/register")
def register(body: RegisterRequest):
    existing = supabase.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(body.password)
    result = supabase.table("users").insert({
        "email": body.email,
        "hashed_password": hashed
    }).execute()
    user = result.data[0]
    token = create_token(user["id"])
    return{"access_token": token, "token_type": "bearer", "user_id": user["id"]}
@app.post("/auth/login")
def login(body: LoginRequest):
    result = supabase.table('users').select("*").eq('email', body.email).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    user = result.data[0]
    if not verify_password(body.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    return {"access_token": token, "token_type": "bearer", "user_id": user["id"]}
@app.get("/auth/me")
def me(current_user: TokenData = Depends(get_current_user)):
    result = supabase.table("users").select("id, email, created_at").eq("id", current_user.user_id).execute()
    return result.data[0]

@app.post("/review/pr")
async def review_pr(
    body: PRReviewRequest,
    current_user: TokenData = Depends(get_current_user)
):
    try:
        owner, repo, pr_number = parse_pr_url(body.pr_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        metadata, files_raw = await asyncio.gather(
            fetch_pr_metadata(owner, repo, pr_number),
            fetch_pr_files(owner, repo, pr_number),
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="PR not found. Check URL and GitHub token permissions.")
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e.response.status_code}")

    structured_files = parse_diff_into_structured(files_raw)

    report = {
        "pr_url": body.pr_url,
        "owner": owner,
        "repo": repo,
        "pr_number": pr_number,
        "metadata": metadata,
        "files_changed": len(structured_files),
        "total_additions": sum(f["additions"] for f in structured_files),
        "total_deletions": sum(f["deletions"] for f in structured_files),
        "files": structured_files,
    }

    supabase.table("reviews").insert({
        "user_id": current_user.user_id,
        "pr_url": body.pr_url,
        "repo_name": f"{owner}/{repo}",
        "report": report,
    }).execute()

    return report
