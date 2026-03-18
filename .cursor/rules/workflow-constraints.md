---
description: Enforce branching and issue-based workflow for all development tasks
globs: ["**/*"]
alwaysApply: true
---

# Workflow & Branching Protocol

## 1. Requirement: Active Issue
- Before starting any task, verify that there is an open github issue. (try finding an issue using github issues skill)
- if not matching issue found on github, first help creating an issue using same skill.

## 2. Requirement: Branch Validation
- **Main Branch Protection:** You are strictly forbidden from making edits or running build commands while on the `main` or `master` branch.
- **Action:** If the current branch is `main`, you must:
    1. Read the current issue context.
    2. Suggest (or execute) a branch creation using the naming convention: `<issue#>/<short-descriptive-name>`.
    3. Switch to that branch before proceeding with any code changes.

## 3. Naming Convention
- All feature/fix branches must follow: `[0-9]+/[a-z-]+` (e.g., `102/fix-database-latency`).

## 4. Enforcement Summary (Mandatory Behavior)
- The agent must **never** continue working on a task unless:
  - A corresponding GitHub issue exists (create one with an elaborated description if none is found via `search_issues`).
  - The current Git branch is **not** `main` or `master` (create/switch to a feature branch based on the active issue before doing any work).
- These constraints apply to **all** agents and to **all** operations (code edits, commands, refactors, and other automated changes).