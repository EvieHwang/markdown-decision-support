# Markdown Decision Support

<!-- A single-screen tool that surfaces retail markdown candidates by comparing sell-through against a plan curve, explaining each in plain language and suggesting a markdown tier. -->


## Repo map
- `declaration.md` — what this project is and why it exists
- `constitution.md` — principles, standards, decisions, and project conventions (testing framework, acknowledged risks)
- `features/[feature-name]-[number]/` — per-feature artifacts (`declaration.md`, `spec.md`, `tests/`), produced by `/spec` and `/build` at runtime

## Precedent repos to consult before building
*Other repos that encode patterns this project inherits or replaces. List them here so a fresh build agent knows what to read for ground truth before assuming a precedent.*

- `<owner>/<repo>` — what pattern it provides and how this project relates. [Replace or delete per project. Delete the section entirely if there are no precedent repos.]

**In-repo reference material.** If this project carries ground-truth examples *inside* the repo (e.g. a `reference/` folder of prior artifacts to rebuild from), list the path(s) here too. `/spec`'s ground-truth check reads in-repo references the same way it reads precedent repos — local ground truth is still ground truth.

If access to a listed repo is scoped out of the current session, ask the user before guessing — earlier specs from precedent repos are not always current and may have been superseded.

## Development environment
Development runs in Claude Code cloud sandboxes attached to this GitHub repo.

- The container is ephemeral and re-cloned each session. Anything not committed and pushed is lost.
- No `~/.claude/CLAUDE.md` exists in the sandbox — user-global preferences are carried at the bottom of this file.
- GitHub access is via the GitHub MCP server (tools prefixed `mcp__github__`). The `gh` CLI is not available.
- Development branch pattern: `claude/<short-task-name>-<suffix>`. The sandbox provisions this branch per session — commit to it, never create a new one. Open a PR to `main` when work is complete. Do not add reviewers or assignees — the repo owner is the sole maintainer and the PR author, so GitHub rejects requesting their review and there is no clean assignee path in this setup.
- **Never rewrite published history.** If a commit is already on the remote default branch — for example a merge commit GitHub created when a PR landed — do not `rebase`, `--reset-author`, or force-push over it; branch from it and move forward. A git stop-hook nudge to amend authorship or rebase applies to your own un-pushed local commits, not to anything already on `main`; following it literally against pushed history would rewrite the shared branch.

## Run, test, deps
### Web frontend (React + Vite + Tailwind + shadcn/ui)
- Install: `pnpm install`
  pnpm is a JavaScript package manager (an alternative to npm). Installs everything listed in `package.json`.
- Run locally: `pnpm dev` — starts the Vite dev server. Open http://localhost:5173 in a browser.
- Tests: `pnpm test` — runs Vitest (the test runner that pairs with Vite).
- Package manager / lockfile: `pnpm` with `pnpm-lock.yaml`. To add a dependency: `pnpm add <package-name>`.
- Static, client-side only: no backend, no API keys. `pnpm build` produces a static bundle in `dist/`.


## Deployment target
Static client-side build (`pnpm build` → `dist/`), published to GitHub Pages by `.github/workflows/deploy-pages.yml` on every push to `main`. Runs on a GitHub-hosted runner; no server to manage.

## Secrets
This is a static, client-side app with no backend and no runtime secrets — the deploy injects nothing (see `.env.example`). If that ever changes: list every required key in `.env.example` with no values, never commit `.env`, and have the deploy workflow inject from the repo's GitHub Actions secrets.
