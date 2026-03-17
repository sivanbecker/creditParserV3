---
description: Enforce branching and issue-based workflow for all development tasks
globs: ["**/*"]
---

# Workflow & Branching Protocol

## 1. Requirement: Active Issue
- Before starting any task, verify that there is a documented issue or clear task description. (try finding an issue opened before using github mcp. Use the github search_issues tool. Explicitly pass the argument query: 'is:issue is:open <a word or two fro querying>' in the tool call)
- if not matching issue found on github, first help creating an issue.
- If no issue is provided, ask the user: "What is the Issue ID or description for this work?". 

## 2. Requirement: Branch Validation
- **Main Branch Protection:** You are strictly forbidden from making edits or running build commands while on the `main` or `master` branch.
- **Action:** If the current branch is `main`, you must:
    1. Read the current issue context.
    2. Suggest (or execute) a branch creation using the naming convention: `<issue#>/<short-descriptive-name>`.
    3. Switch to that branch before proceeding with any code changes.

## 3. Naming Convention
- All feature/fix branches must follow: `[0-9]+/[a-z-]+` (e.g., `102/fix-database-latency`).