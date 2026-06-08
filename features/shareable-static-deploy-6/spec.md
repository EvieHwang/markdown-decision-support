# Spec — Shareable Static Deploy (Feature 6)

Publish the finished static app to GitHub Pages so it becomes a live, handable URL:
`https://eviehwang.github.io/markdown-decision-support/`. The deliverable is deployment
wiring — a GitHub Actions workflow and a Vite `base` setting — not any app-source change.

**Ground truth (verified live this session, not assumed from CLAUDE.md):**
- Repo `EvieHwang/markdown-decision-support` is **public** (GitHub API) → Pages and Actions
  minutes are free; no plan change.
- Pages site URL for a public project repo is `https://eviehwang.github.io/<repo>/`; the
  served subpath is `/markdown-decision-support/`. Hence the required Vite `base`.
- `package.json` `build` is `tsc -b && vite build`, emitting a static bundle to `dist/`.
- `.github/workflows/ci.yml` already runs `pnpm install --frozen-lockfile` → `pnpm test`
  → `pnpm build` on push and PR to `main` (the constitution quality gate). This feature
  must leave that gate intact and add deployment alongside it.
- The app is static, client-side only (project declaration): no server, no secrets, no
  API keys. Nothing about the workload needs a running process.

---

## Behavioral requirements

### Story 1 — A hiring manager opens a live link and sees the working app
*As the builder, I want the deployed site to render the real app at its public URL, so the
link I hand a hiring manager shows the tool, not a blank page.*

The single, classic GitHub-Pages-for-a-project-repo failure is asset paths resolving to the
domain root (`/assets/…`) when the site is actually served under `/markdown-decision-support/`
— the HTML loads but CSS/JS 404 and the page is blank. The contract that prevents it:

- **AC1.1** — The production build is configured with a base public path of
  `/markdown-decision-support/`, so emitted asset references are prefixed with that subpath.
- **AC1.2** — The base path equals the repo's Pages subpath exactly (leading and trailing
  slash). It is derived from the repo name, which is the external contract: the live URL.
- **AC1.3** — Setting the base must not break local development or the test run: `pnpm dev`
  and `pnpm test` continue to work. (Implementation latitude: the base may be applied only
  for the production build, e.g. a command-conditional config, since the dev server and the
  Vitest run do not serve from the subpath.)

### Story 2 — A push to `main` publishes the current build
*As the builder, I want merging to `main` to publish the latest bundle automatically, so I
never hand-deploy and the live site always reflects `main`.*

- **AC2.1** — A GitHub Actions workflow triggers on push to `main` and publishes the built
  bundle to GitHub Pages.
- **AC2.2** — The workflow builds the production bundle with the same toolchain the gate
  uses (pnpm install → production build) before publishing, so what deploys is what CI
  validates.
- **AC2.3** — The workflow publishes via GitHub's official Pages mechanism: it uploads the
  build output as a Pages artifact and deploys it with the Pages deploy action, declaring
  the `github-pages` deployment environment. This mechanism is GitHub-imposed, not a project
  choice — it is the only supported path for an Actions-driven Pages deploy.
- **AC2.4** — The workflow grants exactly the permissions the Pages deploy mechanism
  requires and no more: `pages: write` and `id-token: write` (least privilege — not
  `contents: write` or a broad `write-all`). `contents: read` for checkout is acceptable.
- **AC2.5** — The workflow runs on a **GitHub-hosted** runner (`ubuntu-latest`), not the
  Eviebot self-hosted runner. This is a conscious, recorded deviation from the
  constitution's "prefer self-hosted runners" preference (see Design → Deviations).

### Story 3 — The existing quality gate keeps running
*As the maintainer, I want the deploy to be additive, so the test+build gate that guards
`main` is unchanged.*

- **AC3.1** — `ci.yml` continues to run `pnpm test` and `pnpm build` on both push to `main`
  and pull requests to `main`. The deploy is a separate workflow; CI is not replaced or
  weakened.

### Story 4 — The link is durable
*As the builder, I want the live URL written down where it won't get lost, so it's a link I
can hand over without hunting for it.*

- **AC4.1** — `README.md` contains the live Pages URL
  `https://eviehwang.github.io/markdown-decision-support/`.

### Edge cases and failure modes
- **Wrong/absent base path** → blank deployed page (assets 404). Guarded by AC1.1–1.2.
- **Missing Pages permissions** → the deploy step fails at runtime with a permissions error.
  Guarded by AC2.4 (and visible: a red workflow run, not a silent miss).
- **Pages source not set to "GitHub Actions"** → the workflow's deploy step errors until the
  repo setting is changed. This is a one-time manual console prerequisite (Settings → Pages
  → Source: GitHub Actions), not a committable artifact. Named here; not automated. The
  first deploy run failing for this reason is expected and self-explaining, not silent.
- **Repo made private later** → Pages-from-private requires a paid plan; the public-repo
  free path no longer applies. Out of scope to change; surfaced as a standing constraint.
- **Base set globally breaking `vite preview` at root** → acceptable; `preview` is a local
  convenience, and serving it at the subpath mirrors production. Not a failure mode that
  blocks the feature.

### Out of scope
- Custom domain / DNS / `CNAME` — the free project-path URL is the target.
- Any change to `src/` or to the engine, tier mapping, floor cap, generator, explanation
  composer, candidate surface, or the F1↔F4 lockstep.
- Routing the deploy through Eviebot; migrating the target to Fly.io.
- Automating the one-time "Pages source = GitHub Actions" repo setting.
- Changing repo visibility.

---

## Design

### Components and seams
1. **Vite base configuration** (`vite.config.ts`) — sets the production base public path to
   `/markdown-decision-support/`. Behavioral property: when the config is resolved for a
   production build, its `base` equals `/markdown-decision-support/`; resolving it for the
   dev/test context does not break (dev server and Vitest still load). The *value* is the
   contract (it equals the Pages subpath); whether it is applied unconditionally or only for
   `command === 'build'` is implementation latitude, provided AC1.3 holds.

2. **Pages deploy workflow** (`.github/workflows/<name>.yml`, e.g. `deploy-pages.yml`) — a
   new workflow, separate from `ci.yml`. Behavioral properties it must hold:
   - triggers on push to `main`;
   - installs deps and runs the production build with pnpm (same toolchain as the gate);
   - uploads `dist/` as a Pages artifact and deploys it via the official Pages deploy action,
     under the `github-pages` environment;
   - permissions limited to `pages: write` + `id-token: write` (plus `contents: read`);
   - `runs-on: ubuntu-latest`.
   The workflow filename is not part of the contract — it is discovered by what it does
   (a Pages deploy), not by its name.

3. **CI workflow** (`.github/workflows/ci.yml`) — *unchanged*. Reuses the existing gate
   wholesale; this feature adds the deploy workflow beside it.

4. **README** (`README.md`) — gains the live URL. Presentation only.

### Constraint discipline
Every constraint above is behavioral: the deployed site renders (base path), a push
publishes (trigger + publish mechanism), the gate still runs (CI intact), the link is
findable (README). The action identifiers `actions/upload-pages-artifact` /
`actions/deploy-pages` and the `github-pages` environment are named not as a code-shape
preference but because they are GitHub's sole supported mechanism for an Actions-driven
Pages deploy — naming them is naming the external contract, the spec's stated exception.

### Pattern reuse
- **CI quality gate** — genuine, complete reuse: `ci.yml` is consumed as-is and not
  modified. The deploy workflow mirrors its pnpm install + production-build steps (same
  toolchain) but is a distinct workflow with a distinct trigger and job graph; that is
  parallel construction, not reuse of a shared file, and is described as new.

### Deviations (surfaced, not silent)
- **GitHub-hosted runner over Eviebot self-hosted.** constitution.md: "Prefer self-hosted
  runners (Eviebot) over SSH-based deploy steps." A GitHub Pages publish runs on GitHub's
  infrastructure via the official Pages actions and has no Eviebot involvement (Eviebot
  hosts Mac-mini *services*, not a CDN-served static site). Using `ubuntu-latest` is the
  standard, supported vehicle; routing it through Eviebot would add machinery for zero
  benefit. Recorded here as a conscious deviation; the owner accepted it during `/backlog`.

### Standards check
- **OWASP** — the only attack surface this feature introduces is the workflow's token
  permissions. AC2.4 pins least privilege (`pages: write` + `id-token: write`, not broad
  write), which is the relevant control. No secrets are introduced (static app, no API
  keys).
- **WCAG 2.1 AA / Apple HIG** — no new UI; the F5-acknowledged AA deferral is unchanged and
  not re-opened. HIG is N/A (web platform).

### Deploy sequencing
No asynchronously-updating cloud resource is mutated across dependent steps (no Lambda /
CloudFront / RDS). Within the workflow, `deploy-pages` consumes the artifact produced by
`upload-pages-artifact` in the same run; that ordering is the standard two-job (build →
deploy) or single-job sequence GitHub documents and needs no custom polling.

---

## Coverage

| Requirement / seam | Test(s) | Strength |
|---|---|---|
| AC1.1 / AC1.2 — production base path = `/markdown-decision-support/` | `vite-base.test.ts` | @frozen |
| AC1.3 — base does not break dev/test | covered implicitly: the whole Vitest suite (incl. all prior features) runs under the same config; CI also runs `pnpm build` | @frozen (existing gate) |
| AC2.1 — triggers on push to `main` | `deploy-workflow.test.ts` | @frozen |
| AC2.2 — builds with pnpm before publishing | `deploy-workflow.test.ts` | @frozen |
| AC2.3 — official Pages publish mechanism + `github-pages` env | `deploy-workflow.test.ts` | @frozen |
| AC2.4 — least-privilege permissions | `deploy-workflow.test.ts` | @frozen |
| AC2.5 — GitHub-hosted runner (not self-hosted) | `deploy-workflow.test.ts` | @frozen |
| AC3.1 — CI gate intact (test+build on push & PR) | `ci-intact.test.ts` | @frozen |
| AC4.1 — README carries the live URL | `readme-url.test.ts` | @frozen |

---

## Adversarial gate

**Mode:** independent clean-context sub-agent (no build, no defend), run once against the
drafted spec and tests. Security lens found nothing, so no security re-gate was triggered.

**Findings and disposition:**

| # | Sev | Lens | Finding | Disposition |
|---|-----|------|---------|-------------|
| 1 | HIGH | Coverage/tests | `deploy-workflow.test.ts` "builds the bundle" asserted `pnpm` and `build` as independent substrings — a workflow that installs deps but never runs the build (word "build" satisfied by a job name/comment) would publish a never-built `dist/` (blank site) while green. | **Fixed** — the test now pins an actual build command (`pnpm build` / `pnpm run build` / `vite build`). |
| 2 | MEDIUM | Coverage/tests | "triggers on push to main" regex is unanchored over the whole file, so a wrong-branch trigger (`push: branches: [release]`) false-passes whenever the token `main` appears elsewhere. Failure mode: live site silently never updates. | **Proceeded** — owner opted not to fix this pass. Recorded as a known test-weakness; not a product risk, so no acknowledged-risks row. |
| 3 | LOW | Failure modes/spec | The one-time "Settings → Pages → Source: GitHub Actions" prerequisite lives only in spec.md; when the first deploy goes red for it, the operator isn't reading the spec. | **Proceeded** — owner opted not to add a README operator note this pass. Failure is visible (red run), recoverable. |
| 4 | LOW | Coverage/tests | Permission/environment/runner assertions are file-wide substring matches (could pass on a token in a comment or a mis-scoped block). | **Proceeded** — a mis-scoped permission produces a *visible* red deploy run, and tighter YAML-scoped regexes risk false-negatives on valid workflows. |

No findings were **acknowledged** (the proceeded findings are test-quality / operability notes,
not product or security risk), so constitution.md's Acknowledged-risks table is unchanged.
