# AI Code Reviewer 🤖

A production-grade AI agent that automatically reviews GitHub Pull Requests — detecting bugs, security vulnerabilities, assessing code quality, and suggesting improvements. Powered by LangGraph, LLaMA 3.3, and Voyage AI.

**Live Demo:** https://ai-code-reviewer-blue-seven.vercel.app

---

## Features

- **Bug Detection** — Identifies null references, logic errors, unhandled exceptions, and off-by-one errors
- **Security Scanning** — Detects SQL injection, hardcoded secrets, missing input validation, and insecure patterns
- **Code Quality Assessment** — Scores code out of 10 with specific feedback on readability, complexity, and best practices
- **Improvement Suggestions** — Prioritized, actionable refactoring recommendations
- **Long-term Memory** — Agent remembers past findings per user using pgvector semantic search
- **Review History** — All past reviews saved and accessible anytime
- **JWT Authentication** — Secure register/login with bcrypt password hashing

---

## Architecture

```
User
│
▼
React Frontend (Vercel)
│  Axios + JWT
▼
FastAPI Backend (Render)
│
├── Auth Module (JWT + bcrypt)
│    └── Supabase → users table
│
├── GitHub Integration
│    └── httpx → GitHub REST API v3
│         └── PR metadata + diff fetching + hunk parsing
│
├── LangGraph Agent
│    ├── Node 1: bug_detector
│    ├── Node 2: security_scanner
│    ├── Node 3: quality_checker
│    ├── Node 4: improvement_suggester
│    └── Node 5: assemble_report
│
├── Long-term Memory
│    └── Voyage AI embeddings → Supabase pgvector
│
└── LangSmith (tracing + observability)
Supabase (PostgreSQL + pgvector)
├── users table
├── reviews table
└── user_memory table (vector embeddings)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS v4 |
| Backend | FastAPI + Uvicorn |
| Agent | LangGraph + LangChain |
| LLM | Groq (llama-3.3-70b-versatile) |
| Embeddings | Voyage AI (voyage-3-lite) |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | JWT (python-jose) + bcrypt |
| Observability | LangSmith |
| GitHub API | httpx (async) |
| State Management | Zustand |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## How It Works

1. User pastes a GitHub PR URL
2. Backend fetches PR diff via GitHub REST API
3. Diff is parsed into structured format (hunks, added/removed lines)
4. LangGraph agent runs 4 specialized AI nodes sequentially
5. Each node sends focused prompts to LLaMA 3.3 via Groq
6. Results assembled into final report and saved to Supabase
7. Voyage AI embeds key findings into pgvector for future memory retrieval
8. Frontend displays full report with bugs, security issues, quality score, suggestions

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account
- Groq API key (free at console.groq.com)
- Voyage AI API key (voyageai.com)
- GitHub personal access token
- LangSmith API key (free at smith.langchain.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in project root:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GROQ_API_KEY=your_groq_key
JWT_SECRET=your_jwt_secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=ai-code-reviewer
GITHUB_TOKEN=your_github_token
VOYAGE_API_KEY=your_voyage_key
FRONTEND_URL=http://localhost:5173
```

```bash
cd backend
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

---

## Supabase Setup

Run these SQL queries in Supabase SQL Editor:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  hashed_password text not null,
  created_at timestamp default now()
);

-- Reviews table
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  pr_url text,
  repo_name text,
  report jsonb,
  created_at timestamp default now()
);

-- Memory table
create table user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  content text,
  embedding vector(512),
  created_at timestamp default now()
);

-- Vector search function
create or replace function match_user_memory(
  query_embedding vector(512),
  match_user_id uuid,
  match_count int
)
returns table (id uuid, content text, similarity float)
language plpgsql
as $$
begin
  return query
  select
    user_memory.id,
    user_memory.content,
    1 - (user_memory.embedding <=> query_embedding) as similarity
  from user_memory
  where user_memory.user_id = match_user_id
  order by user_memory.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

---

## Project Structure

```
ai-code-reviewer/
├── backend/
│   ├── main.py           # FastAPI app, all endpoints
│   ├── auth.py           # JWT + bcrypt authentication
│   ├── github_client.py  # GitHub API integration + diff parsing
│   ├── agent.py          # LangGraph agent with 4 analysis nodes
│   ├── memory.py         # Voyage AI embeddings + pgvector memory
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   ├── Auth.jsx          # Login + Register UI
        │   ├── Dashboard.jsx     # PR review interface
        │   └── History.jsx       # Past reviews list + detail
        ├── components/
        │   └── ProtectedRoute.jsx
        ├── store/
        │   └── authStore.js      # Zustand auth state
        └── main.jsx              # React Router setup
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Health check |
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/auth/me` | Yes | Get current user |
| POST | `/review/pr` | Yes | Analyze a GitHub PR |
| GET | `/reviews` | Yes | Get all past reviews |
| GET | `/reviews/{id}` | Yes | Get single review |

---

## Key Design Decisions

### Why LangGraph over a single LLM call?
Specialized nodes produce significantly better results than one generic prompt. Each node has a focused system prompt and analyzes only its domain.

### Why diff-only review?
LLMs have token limits and reviewing unchanged code on every PR is expensive. Long-term memory compensates by surfacing past findings about unchanged functions.

### Why Supabase over a dedicated vector DB?
pgvector gives semantic search inside PostgreSQL — one less service to manage. For this scale, it performs equivalently to dedicated vector databases.

### Why Groq over OpenAI?
Groq's inference speed is 10-20x faster than OpenAI for the same model size. For a code review tool where users expect quick results, this matters significantly.

---

## Author

**Gurjot Singh**
B.Tech CSE, Baba Banda Singh Bahadur Engineering College
Building AI/ML projects for internship applications.

---

## License

MIT