# Declaration — Shareable Static Deploy

*Feature 6 — normal mode (the final Roadmap item; an ops slice, not an engine change).*

## What
Publish the finished static app to **GitHub Pages** so the tool becomes a live URL a
hiring manager can open — `https://eviehwang.github.io/markdown-decision-support/`. Two
moving parts: **(a)** a **deploy workflow** that, on push to `main`, builds the production
bundle and publishes it to Pages via GitHub's official Pages actions on a GitHub-hosted
runner; **(b)** a **`base` path** in the Vite config so every asset URL resolves under the
project subpath instead of the domain root (the single change without which Pages serves a
blank page). The live URL is captured in `README.md` so it is a durable, handable link.

## Why
F1–F5 produced a coherent, polished, self-explaining demo — but it only runs on
`localhost`. The project declaration names a *secondary* audience, hiring managers
evaluating product judgment, and the entire point of the demo is to be a link you can send
them. This is the last Roadmap item and the one that turns a working local app into a
shareable artifact. It changes nothing about the deterministic engine the prior features
froze; it only makes the built bundle reachable on the public internet.

## Success
- A push to `main` triggers a workflow that builds the production bundle and publishes it
  to GitHub Pages; the workflow runs on a GitHub-hosted runner using GitHub's official
  Pages publish mechanism (artifact upload + deploy), with the `pages: write` /
  `id-token: write` permissions and the `github-pages` environment that mechanism requires.
- The deployed site loads correctly at the project subpath: the production build emits
  asset references prefixed with `/markdown-decision-support/`, so CSS/JS resolve and the
  page renders the working app rather than a blank screen.
- The existing CI quality gate (test + production build on push and PR to `main`) continues
  to run unchanged; the deploy is additive, not a replacement.
- `README.md` carries the live Pages URL so the link is durable and handable.
- The entire F1–F5 envelope — the engine, tier mapping, floor cap, the lockstep, the
  trajectory chart, the framing/empty-state/polish pass — continues to pass and to build
  unchanged. No source under `src/` changes.

## Shape touched
- **Build / deploy configuration** — a new concern outside the app's component Shape: a
  GitHub Actions deploy workflow and a Vite `base` setting. This is the project's first
  deployment wiring; nothing in the engine, generator, tier recommender, explanation
  composer, or candidate surface is touched.
- **No app source change.** `src/` is untouched. The only repo-code change is the Vite
  `base` config value (build-time, not app logic).

## Out of scope
- A custom domain — the free project-path URL (`eviehwang.github.io/markdown-decision-support/`)
  is the target; no DNS, no `CNAME`.
- Any change to the decision engine, tier recommender, explanation composer, synthetic data
  generator, or candidate surface — and any change to the frozen `Candidate` shape, tier↔
  percentage mapping, floor cap, or the F1↔F2↔F3↔F4 lockstep.
- Routing the deploy through the Eviebot self-hosted runner — Eviebot hosts Mac-mini
  services, not a CDN-served static site; a GitHub-hosted runner is the right and standard
  vehicle for a Pages publish (recorded as a conscious deviation in the spec).
- Migrating the deployment target to Fly.io — the project's deployment-target convention is
  being revised separately; this feature ships the static-fit target the Roadmap names.
- The one-time repo setting that points Pages' source at "GitHub Actions" — a manual console
  prerequisite, not a committable artifact; named in the spec, not automated here.
- Keeping the repo private — Pages-from-public is free; if the repo ever goes private, Pages
  requires a paid plan. Out of scope to change, surfaced as a constraint.
