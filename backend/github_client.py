import httpx
import re
import os
from typing import Optional

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def parse_pr_url(pr_url: str) -> tuple[str, str, int]:
    pattern = r"https://github\.com/([^/]+)/([^/]+)/pull/(\d+)"
    match = re.match(pattern, pr_url.strip())
    if not match:
        raise ValueError(f"Invalid GitHub PR URL: {pr_url}")
    owner, repo, pr_number = match.groups()
    return owner, repo, int(pr_number)


async def fetch_pr_metadata(owner: str, repo: str, pr_number: int) -> dict:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
    return {
        "title": data["title"],
        "description": data.get("body") or "",
        "author": data["user"]["login"],
        "base_branch": data["base"]["ref"],
        "head_branch": data["head"]["ref"],
        "state": data["state"],
        "created_at": data["created_at"],
        "url": data["html_url"],
    }


async def fetch_pr_files(owner: str, repo: str, pr_number: int) -> list[dict]:
    all_files = []
    async with httpx.AsyncClient() as client:
        for page in range(1, 4):
            url = (
                f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files"
                f"?per_page=100&page={page}"
            )
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()
            page_data = response.json()
            if not page_data:
                break
            all_files.extend(page_data)
    return all_files


def parse_diff_into_structured(files: list[dict]) -> list[dict]:
    structured = []
    for f in files:
        patch = f.get("patch", "")
        hunks = parse_hunks(patch) if patch else []
        structured.append({
            "filename": f["filename"],
            "status": f["status"],
            "additions": f["additions"],
            "deletions": f["deletions"],
            "changes": f["changes"],
            "patch": patch,
            "hunks": hunks,
            "previous_filename": f.get("previous_filename"),
        })
    return structured


def parse_hunks(patch: str) -> list[dict]:
    hunks = []
    current_hunk = None

    for line in patch.split("\n"):
        if line.startswith("@@"):
            if current_hunk:
                hunks.append(current_hunk)
            hunk_match = re.match(r"@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
            old_start = int(hunk_match.group(1)) if hunk_match else 0
            new_start = int(hunk_match.group(2)) if hunk_match else 0
            current_hunk = {
                "header": line,
                "old_start": old_start,
                "new_start": new_start,
                "added_lines": [],
                "removed_lines": [],
                "context_lines": [],
            }
        elif current_hunk is not None:
            if line.startswith("+"):
                current_hunk["added_lines"].append(line[1:])
            elif line.startswith("-"):
                current_hunk["removed_lines"].append(line[1:])
            else:
                current_hunk["context_lines"].append(line[1:] if line.startswith(" ") else line)

    if current_hunk:
        hunks.append(current_hunk)

    return hunks
