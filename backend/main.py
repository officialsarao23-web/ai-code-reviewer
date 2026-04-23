import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from supabase import create_client
from auth import hash_password, verify_password, create_token, get_current_user, TokenData

load_dotenv()

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "ai-code-reviewer"

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
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
