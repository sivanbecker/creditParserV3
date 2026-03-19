# Skill: GitHub CLI Issues

## Purpose

This skill lets the agent use the **GitHub CLI (`gh`) via the Shell tool** to work with GitHub issues for the current repository, starting with:

- **Listing issues**
- **Viewing a specific issue**
- **Creating an issue**
- **Editing an issue** (title, labels)
- **Closing / reopening an issue**
- **Commenting on an issue**

> Note: This skill is explicitly about `gh` usage. When the user asks for GitHub issue operations via `gh`, follow this skill.

---

## Preconditions

- The current workspace is a **git repo** with a GitHub remote configured (e.g. `origin`).
- The `gh` CLI is installed and authenticated (`gh auth status` works).
- Shell commands run from the **workspace root**.

If any of these fail, clearly report the problem and suggest what the user needs to do (install `gh`, run `gh auth login`, configure remote, etc.).

---

## When to use this skill

Use this skill when the user asks to:

- Work with **GitHub issues** and explicitly mentions `gh` / GitHub CLI, or
- Use a **keywords format** like:
  - `github issues: ...`
  - `gh issues: ...`

Examples that SHOULD trigger this skill:

- “Use `gh` to list open issues.”
- “github issues: open bugs assigned to me.”
- “gh issues: list all issues with label frontend.”
- “Use `gh` to view issue #123.”
- “Use `gh` to create an issue titled …”
- “Use `gh` to close issue #42 with a comment.”

If the user just says “list issues” or “create an issue” with no mention of `gh`, you may still use this skill (via `gh`) to perform the request.

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

## Examples of use (from the user’s perspective) for listing

- “Use `gh` to list all open issues.”
- “gh issues: open bugs assigned to me.”
- “github issues: list all closed issues with label backend, limit 10.”

The agent should respond by:

1. Building and running the appropriate `gh issue list ...` command via Shell.
2. Returning a readable summary of the matching issues or a clear explanation if none are found or an error occurs.

---

## Supported action: View a specific issue (`gh issue view`)

### Triggers

Use this action when the user asks to:

- View an issue by **number**, e.g. “View issue #123 with gh”.
- View an issue by **search criteria**, e.g. “gh issues: show the open bug about login timeout”.

### 1. Determine how to identify the issue

1. If the user gives an **explicit issue number** (e.g. `#123` or `123`), use that.
2. Otherwise, if the user gives a **query** (keywords, labels, state), do:
   - First use `gh issue list` with those filters (per the listing section) and a small limit, e.g. `--limit 5`.
   - If there is **exactly one** clear match, use its number.
   - If there are **multiple matches**, show them and ask the user which issue number they want.
   - If there are **no matches**, report that and stop.

### 2. Build and run `gh issue view`

For a known issue number `N`:

```bash
gh issue view N --json number,title,body,state,author,labels,comments --jq '.'
```

Call Shell with:

- **command**: the command above (where `N` is the issue number).
- **working_directory**: workspace root.
- **description**: e.g. `"View GitHub issue via gh CLI"`.

### 3. Summarize the issue

From the JSON output, extract and present:

- `number`, `title`, `state`.
- `labels` (names only).
- `body` (truncated if very long, but clearly indicate truncation).
- `comments`: for each comment, show author, created time (or relative), and body (possibly truncated).

Present it in a structured way, for example:

- Header: `#123 [open] Fix login bug`
- Labels: `bug,frontend`
- Body: short excerpt.
- Comments: numbered list.

If the command fails (e.g. issue not found), clearly report that.

---

## Supported action: Create an issue (`gh issue create`)

### Triggers

Use this action when the user asks to:

- “Use `gh` to create an issue…”
- “Create a GitHub issue with title … and labels …”

### 1. Parse required and optional fields

From the user’s request, extract:

- **Title** (required).
- **Body** (optional; if not provided, you may ask the user, or use a short description they gave).
- **Labels** (optional, comma-separated if multiple).
- **Assignees** (optional), if the user mentions who it should be assigned to (e.g. `@me` or a username).

### 2. Build the `gh issue create` command

Pseudocode:

```text
cmd = "gh issue create --title \"" + title + "\""

if bodyProvided:
  cmd += " --body \"" + body + "\""

if labelsProvided:
  cmd += " --label \"" + labelsCsv + "\""

if assigneesProvided:
  cmd += " --assignee \"" + assigneesCsv + "\""
```

Example:

```bash
gh issue create \
  --title "Login button is unresponsive" \
  --body "Steps to reproduce: …" \
  --label "bug,frontend" \
  --assignee "@me"
```

Run this via Shell from the workspace root with an appropriate description.

### 3. Report the result

- If successful, show:
  - Issue number, title, state.
  - URL returned by `gh`.
- If it fails (e.g. missing title, validation error), show the `gh` error and suggest corrections.

---

## Supported action: Edit an issue (`gh issue edit`)

### Triggers

Use when the user asks to:

- Change an issue **title**.
- Add or remove **labels**.

### 1. Identify the issue

- Prefer an explicit issue number when given (e.g. `#123`).
- If only a description is given, you may:
  - Use `gh issue list` to narrow candidates (similar to the view action).
  - If multiple possible matches, show them and ask the user which number they mean.

### 2. Build the `gh issue edit` command

`gh issue edit` supports:

- `--title "new title"`
- `--add-label "label1,label2"`
- `--remove-label "label1,label2"`

Pseudocode:

```text
cmd = "gh issue edit " + issueNumber

if newTitleProvided:
  cmd += " --title \"" + newTitle + "\""

if labelsToAddProvided:
  cmd += " --add-label \"" + labelsToAddCsv + "\""

if labelsToRemoveProvided:
  cmd += " --remove-label \"" + labelsToRemoveCsv + "\""
```

Example:

```bash
gh issue edit 123 --title "New title" --add-label "high-priority" --remove-label "low-priority"
```

Run via Shell from the workspace root.

### 3. Confirm changes

- On success, either:
  - Run `gh issue view <number> --json ...` to show the updated fields, or
  - Summarize at least the changed values (new title, labels added/removed).

---

## Supported action: Close or reopen an issue (`gh issue close` / `gh issue reopen`)

### Triggers

Use when the user asks to:

- Close an issue.
- Reopen a closed issue.

### 1. Identify the issue

- Prefer explicit issue number (`#123`).
- Otherwise, use the same disambiguation approach as “View an issue”:
  - `gh issue list` with filters to find candidate(s).
  - Ask user to pick if multiple matches.

### 2. Build and run the command

For closing:

```bash
gh issue close 123 --comment "Optional closing note from user"
```

For reopening:

```bash
gh issue reopen 123 --comment "Optional reopening note from user"
```

Include `--comment` only if the user provides a short reason; otherwise omit it.

Run via Shell with an appropriate description.

### 3. Confirm status

- On success, report that the issue is now **closed** or **open**.
- Optionally show a short `gh issue view` summary to confirm the new state.

---

## Supported action: Comment on an issue (`gh issue comment`)

### Triggers

Use when the user asks to:

- “Add a comment to issue #123 with body …”
- “Use `gh` to comment on this issue.”

### 1. Identify the issue

- Use the explicit number if given, otherwise disambiguate with `gh issue list` similar to prior actions.

### 2. Build and run `gh issue comment`

From the user’s request, extract:

- **Body** of the comment (required for this action).

Command:

```bash
gh issue comment 123 --body "Comment text from the user"
```

Run via Shell from the workspace root.

### 3. Confirm

- On success, state that the comment was added.
- Optionally run `gh issue view 123 --json comments --jq '.comments[-1]'` to show the most recent comment as confirmation.

# Skill: GitHub CLI Issues

## Purpose

This skill lets the agent use the **GitHub CLI (`gh`) via the Shell tool** to work with GitHub issues for the current repository, starting with **listing issues**.

> Note: This skill is explicitly about `gh` usage. When the user asks for GitHub issue operations via `gh`, follow this skill.

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

If the user just says “list issues” with no mention of `gh`, you may still use this skill (via `gh`) to perform the request.

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

