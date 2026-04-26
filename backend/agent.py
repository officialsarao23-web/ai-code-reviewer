import os
from typing import TypedDict, Annotated
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
import json

llm = ChatGroq(
    model="llama3-8b-8192",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.2,
)


class ReviewState(TypedDict):
    pr_data: dict
    bugs: list
    security: list
    quality: dict
    suggestions: list
    final_report: dict


def format_files_for_prompt(files: list[dict]) -> str:
    output = []
    for f in files[:10]:  # limit to 10 files to stay within token limit
        output.append(f"FILE: {f['filename']} ({f['status']})")
        output.append(f"Additions: {f['additions']} Deletions: {f['deletions']}")
        if f.get("patch"):
            output.append("DIFF:")
            output.append(f["patch"][:2000])  # limit patch size
        output.append("---")
    return "\n".join(output)


def bug_detector(state: ReviewState) -> ReviewState:
    files = state["pr_data"]["files"]
    diff_text = format_files_for_prompt(files)

    messages = [
        SystemMessage(content="""You are an expert code reviewer specializing in bug detection.
Analyze the given code diff and identify bugs. Look for:
- Null/undefined reference errors
- Off-by-one errors
- Unhandled exceptions
- Logic errors
- Missing error handling
- Incorrect conditionals

Respond ONLY with a valid JSON array. No explanation, no markdown, just the JSON array.
Format: [{"line": "filename:linenum", "severity": "high|medium|low", "description": "bug description", "suggestion": "how to fix"}]
If no bugs found, respond with: []"""),
        HumanMessage(content=f"Analyze this code diff for bugs:\n\n{diff_text}")
    ]

    response = llm.invoke(messages)
    try:
        text = response.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        state["bugs"] = json.loads(text.strip())
    except Exception:
        state["bugs"] = []

    return state


def security_scanner(state: ReviewState) -> ReviewState:
    files = state["pr_data"]["files"]
    diff_text = format_files_for_prompt(files)

    messages = [
        SystemMessage(content="""You are a security expert specializing in code vulnerability detection.
Analyze the given code diff and identify security vulnerabilities. Look for:
- SQL injection risks
- Hardcoded secrets or API keys
- Insecure authentication patterns
- XSS vulnerabilities
- Insecure direct object references
- Missing input validation
- Sensitive data exposure

Respond ONLY with a valid JSON array. No explanation, no markdown, just the JSON array.
Format: [{"line": "filename:linenum", "severity": "critical|high|medium|low", "vulnerability": "type of vulnerability", "description": "detailed description", "fix": "how to fix"}]
If no vulnerabilities found, respond with: []"""),
        HumanMessage(content=f"Analyze this code diff for security vulnerabilities:\n\n{diff_text}")
    ]

    response = llm.invoke(messages)
    try:
        text = response.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        state["security"] = json.loads(text.strip())
    except Exception:
        state["security"] = []

    return state


def quality_checker(state: ReviewState) -> ReviewState:
    files = state["pr_data"]["files"]
    diff_text = format_files_for_prompt(files)

    messages = [
        SystemMessage(content="""You are a senior software engineer focused on code quality.
Analyze the given code diff and assess quality. Evaluate:
- Code readability and naming conventions
- Function/method length and complexity
- Code duplication
- Documentation and comments
- Adherence to best practices
- Test coverage considerations

Respond ONLY with a valid JSON object. No explanation, no markdown, just the JSON object.
Format: {"score": 8, "summary": "overall quality summary", "positives": ["thing done well"], "issues": [{"description": "issue", "recommendation": "fix"}]}
Score is out of 10."""),
        HumanMessage(content=f"Assess the code quality of this diff:\n\n{diff_text}")
    ]

    response = llm.invoke(messages)
    try:
        text = response.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        state["quality"] = json.loads(text.strip())
    except Exception:
        state["quality"] = {"score": 0, "summary": "Could not assess quality", "positives": [], "issues": []}

    return state


def improvement_suggester(state: ReviewState) -> ReviewState:
    files = state["pr_data"]["files"]
    diff_text = format_files_for_prompt(files)
    bugs = state["bugs"]
    security = state["security"]
    quality = state["quality"]

    messages = [
        SystemMessage(content="""You are a senior engineer providing actionable improvement suggestions.
Based on the code diff and findings from bug detection, security scanning, and quality assessment,
provide concrete improvement suggestions.

Respond ONLY with a valid JSON array. No explanation, no markdown, just the JSON array.
Format: [{"category": "performance|maintainability|security|testing|architecture", "title": "short title", "description": "detailed suggestion", "priority": "high|medium|low"}]"""),
        HumanMessage(content=f"""Code diff:\n{diff_text}\n\nBugs found: {json.dumps(bugs)}\nSecurity issues: {json.dumps(security)}\nQuality score: {quality.get('score', 'N/A')}/10""")
    ]

    response = llm.invoke(messages)
    try:
        text = response.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        state["suggestions"] = json.loads(text.strip())
    except Exception:
        state["suggestions"] = []

    return state


def assemble_report(state: ReviewState) -> ReviewState:
    metadata = state["pr_data"]["metadata"]
    state["final_report"] = {
        "pr_title": metadata["title"],
        "pr_author": metadata["author"],
        "pr_url": metadata["url"],
        "files_changed": state["pr_data"]["files_changed"],
        "total_additions": state["pr_data"]["total_additions"],
        "total_deletions": state["pr_data"]["total_deletions"],
        "bugs": state["bugs"],
        "security": state["security"],
        "quality": state["quality"],
        "suggestions": state["suggestions"],
        "summary": {
            "total_bugs": len(state["bugs"]),
            "total_security_issues": len(state["security"]),
            "quality_score": state["quality"].get("score", 0),
            "total_suggestions": len(state["suggestions"]),
        }
    }
    return state


def build_agent():
    graph = StateGraph(ReviewState)

    graph.add_node("bug_detector", bug_detector)
    graph.add_node("security_scanner", security_scanner)
    graph.add_node("quality_checker", quality_checker)
    graph.add_node("improvement_suggester", improvement_suggester)
    graph.add_node("assemble_report", assemble_report)

    graph.set_entry_point("bug_detector")
    graph.add_edge("bug_detector", "security_scanner")
    graph.add_edge("security_scanner", "quality_checker")
    graph.add_edge("quality_checker", "improvement_suggester")
    graph.add_edge("improvement_suggester", "assemble_report")
    graph.add_edge("assemble_report", END)

    return graph.compile()


review_agent = build_agent()