# Skill: GitHub CLI Issues

## Purpose

This skill lets the agent use the **GitHub CLI (`gh`) via the Shell tool** to work with GitHub issues for the current repository, starting with **listing issues**.

> Note: This skill is explicitly about `gh` usage. In this workspace there is also a GitHub MCP server configured; the agent should still respect any higher‑priority rules about when to use MCP vs CLI. When the user explicitly asks to use `gh`, follow this skill.

---

## Preconditions

- The current workspace is a **git repo** with a GitHub remote configured (e.g. `origin`).
- The `gh` CLI is installed and authenticated (`gh auth status` works).
- Shell commands run from the **workspace root**.

If any of these fail, clearly report the problem and suggest what the user needs to do (install `gh`, run `gh auth login`, configure remote, etc.).

---

## When to use this skill

Use this skill when the user asks to:

- “List GitHub issues” or similar **and** they mention `gh` / GitHub CLI, or
- Use a **keywords format** like:
  - `github issues: ...`
  - `gh issues: ...`

Examples that SHOULD trigger this skill:

- “Use `gh` to list open issues.”
- “github issues: open bugs assigned to me.”
- “gh issues: list all issues with label frontend.”

If the user just says “list issues” with no mention of `gh`, you may instead prefer the GitHub MCP tools configured for this repo (per workspace rules).

---

## Supported action: List issues via `gh issue list`

### 1. Parse user intent

From the user’s request, extract:

- **State**: `open`, `closed`, or `all`.  
  - Default: `open` if not specified.
- **Labels**: one or more labels (e.g. `bug`, `frontend`).  
  - Join multiple labels as comma‑separated, e.g. `bug,frontend`.
- **Assignee**:
  - If user says “assigned to me” → use `@me`.
  - Otherwise, use the explicit username if given.
- **Limit**: maximum number of issues to list.  
  - Default: `20` if not specified.

### 2. Build the `gh issue list` command

Pseudocode for building the command string:

```text
base = "gh issue list"
state = userState || "open"
limit = userLimit || 20

cmd = base + " --state " + state + " --limit " + limit

if labelsProvided:
  cmd += " --label \"" + labelsCsv + "\""

if assigneeProvided:
  cmd += " --assignee \"" + assignee + "\""
```

Concrete examples:

- Open issues, default limit:

  ```bash
  gh issue list --state open --limit 20
  ```

- Open bugs assigned to current user:

  ```bash
  gh issue list --state open --label "bug" --assignee "@me" --limit 20
  ```

- All issues with multiple labels and custom limit:

  ```bash
  gh issue list --state all --label "bug,frontend" --limit 50
  ```

### 3. Run via Shell tool

Invoke the Shell tool with:

- **command**: the `cmd` string built above.
- **working_directory**: the workspace root (e.g. `/Users/.../creditParserV3`).
- **description**: short explanation, e.g. `"List GitHub issues via gh CLI"`.

Example Shell payload:

```json
{
  "command": "gh issue list --state open --limit 20",
  "working_directory": "<workspace-root>",
  "description": "List open GitHub issues via gh CLI"
}
```

### 4. Summarize results for the user

After running `gh issue list`:

- If there is **no output**, say there are no matching issues.
- Otherwise:
  - Present a concise list of issues, one per line, for example:
    - `#123 [open] Fix login bug (labels: bug,frontend; assignee: @me)`
  - If there are many results, show only the first N (e.g. 20) and mention that the list is truncated.
- Optionally include the exact `gh` command used so the user can re‑run it locally if they wish.

### 5. Handle errors gracefully

If the Shell command fails:

- **`gh: command not found`**:
  - Explain that GitHub CLI is not installed and suggest installing it from the official docs.
- **Authentication errors** (e.g. prompts to run `gh auth login`):
  - Tell the user they need to run `gh auth login` once in their environment.
- **Repository not linked to GitHub**:
  - Suggest checking `git remote -v` and/or running `gh repo view` to verify the repo is connected.

In all error cases, clearly state that the listing action did not complete and what the user needs to do next.

---

## Examples of use (from the user’s perspective)

- “Use `gh` to list all open issues.”
- “gh issues: open bugs assigned to me.”
- “github issues: list all closed issues with label backend, limit 10.”

The agent should respond by:

1. Building and running the appropriate `gh issue list ...` command via Shell.
2. Returning a readable summary of the matching issues or a clear explanation if none are found or an error occurs.

