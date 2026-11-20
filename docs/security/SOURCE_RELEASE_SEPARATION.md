# Source and public release separation — M6 design

Status: Design approved for implementation planning; repository split not yet executed  
Date: 2026-11-20

## Current deployment constraint

The existing ExamGuru Quest repository is public and GitHub Pages serves the current portal from it. Making this repository private or changing its Pages source without a validated replacement could interrupt every current learner. This is not an acceptable M6 action.

The source code and static files in a public Pages repository are inspectable and downloadable. Minification, obfuscation, disabled developer tools, hidden routes and right-click blocking are not meaningful confidentiality controls.

## Target topology

- **Private source repository:** authoritative application source, authoring tools, unreleased content, internal documentation and development history.
- **Public release repository:** only the verified static release artifact and content intentionally approved for public delivery.
- **GitHub Actions:** tests, static analysis, secret scanning, release packaging, artifact inventory, integrity manifest and deployment orchestration.
- **Current Pages URL:** retained. The public release repository continues to publish to the existing domain/path so bookmarks, app shortcuts and cached routes remain valid.
- **Future protected API:** delivers institution-owned, assessment-sensitive and master content only after server-side authorization. Those records are never packaged into public Pages output.

## Staged cutover — zero interruption

### Stage 0 — Current state (now)
- Keep the existing public repository and Pages deployment unchanged.
- Develop and review M6 changes on feature branches and PRs.
- Do not place new secrets or private content in the public repository.
- Inventory existing routes, asset paths, service worker caches, static account files, question banks and downloads.

### Stage 1 — Prepare the private source repository
- Create a separate private source repository; do not flip the visibility of the current Pages repository.
- Preserve full source history where possible and verify all branches/tags needed for rollback.
- Keep the current public repository as the release target.
- Configure least-privilege deployment authentication as a GitHub Actions secret; never put it in the frontend or release artifact.
- Verify that the GitHub plan and Pages configuration support the chosen private-source/public-release workflow before moving the authoritative source.

### Stage 2 — Reproducible release build
- Build from a tagged, reviewed source commit.
- Run the complete existing LMS, learner, institution, question-bank, Paper Studio and browser regression suites.
- Produce a deterministic release directory with stable relative URLs.
- Minify production JavaScript and remove development-only diagnostics and source maps.
- Generate a manifest with source commit, release version, file hashes, build time and content classification.
- Verify that no credentials, private source files, C2/C3/C4 content or local test data entered the artifact.
- Keep source maps and authoring maps in the private repository only.

### Stage 3 — Staging and compatibility verification
- Deploy to a non-production preview URL first.
- Test existing student and parent sign-in, session restore, profile, Learn, Practice, timed tests, reports, backup/restore, parent-child linking and mobile/PWA behavior.
- Verify old deep links and asset paths, service-worker cache versioning and offline behavior.
- Compare current and candidate release record counts and checksums for representative local backup fixtures.
- Run a rollback rehearsal to the prior known-good artifact.

### Stage 4 — Controlled production cutover
- Publish the verified artifact to the existing Pages target.
- Keep the previous release artifact and manifest available for immediate rollback.
- Do not change the public URL or force users to clear caches/reinstall.
- Monitor smoke tests and learner-facing error rates.
- If any critical journey regresses, restore the prior artifact without migrating or deleting local user data.

## Release artifact security policy

1. A release artifact may contain only files required by the browser for the approved public product experience.
2. No GitHub token, API secret, signing private key, production account export, student PII, private institution data or unreleased master content may be included.
3. Public question banks are treated as downloadable. Only approved released learner content may be packaged.
4. Source maps, authoring scripts, internal prompts, generation logs and internal review notes stay private.
5. Build-time secrets must be injected only into trusted CI steps and must never be copied into the public artifact.
6. Integrity manifests use hashes and public verification metadata; signing keys remain private.
7. The browser never receives a privileged deployment token or private signing key.
8. Build obfuscation is a deterrent against casual reuse, not a substitute for server-side IP protection.

## Decisions intentionally deferred

- Creating the private source repository and transferring the source-of-truth role.
- Changing GitHub Pages publishing configuration.
- Choosing any paid plan or external hosting provider.
- Moving protected content to a backend.
- Removing existing public account JSON before a replacement authentication service and a verified migration path are ready.

These are separate release decisions because they can affect current users or introduce recurring cost. The current portal remains operational until the full sequence has passed validation.
