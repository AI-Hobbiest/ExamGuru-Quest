# M8 — Role-bound Natural Language Assistant

## Product boundary

The assistant is a site-level ExamGuru Quest capability. Its entry point may be visible across authenticated workspaces, but the commands, data and results are restricted to the active authenticated role, institution, membership, department, branch, class and student context.

The assistant is not a new identity provider and does not create or grant permissions.

## Architecture

1. **Browser UI:** shared assistant panel integrated with the existing application shell.
2. **Local model:** Transformers.js runs inference on the user's device. Model output is treated as untrusted input.
3. **Intent contract:** model output must validate against a versioned, allowlisted command schema. No arbitrary URLs, SQL, JavaScript, function names or tool descriptions are accepted.
4. **Command service:** validates the command and parameters, derives actor and active workspace from the authenticated session, and invokes only a registered service operation.
5. **Authorization:** the server authenticates the actor and applies the existing provider-neutral authorization policy to the requested resource and operation. The model and browser role label are never authorization evidence.
6. **Repository adapter:** the service reads/writes only through provider-neutral repository contracts. Storage provider selection remains independent of the assistant.

## Role binding

- Platform Admin: platform-level operations explicitly registered for platform administration.
- Institution Admin: operations restricted to the authenticated institution and its permitted branches.
- HOD: operations restricted to appointed department scope; cross-department teaching assignments are shown only where the existing policy permits.
- Teacher: assigned class/subject scope only.
- Institution Viewer: read-only operations only, within granted institution scope.
- Parent: linked children only.
- Student: own learning data only.
- Guest: no private data or management commands.

This is a command-catalogue design guide, not a replacement for the server's authoritative permission policy. Exact permission names and scope rules must be taken from the existing authorization module and backend route implementation; do not invent additional restrictions.

## Response quality and safe failure

- Use structured model output with a strict schema and version.
- Validate command identifier, parameter types, required fields, allowed enum values and bounds.
- Ask a single clarification question when required parameters are missing or more than one supported intent matches.
- Refuse unsupported requests without fabricating a capability.
- Ground factual answers in returned service data. Do not generate counts, statuses, names or summaries unsupported by the response payload.
- On empty results, say no matching records were returned.
- On partial results, label the result partial and explain the known limitation.
- On timeout, model-load failure, unsupported device runtime or API failure, show a clear error and offer the deterministic Command Centre.
- Never claim a write succeeded until the service returns a successful result and, where appropriate, a read-after-write verification.
- Confirm consequential writes before execution. Protect retryable writes with idempotency keys.
- Never silently fall back from an unavailable server operation to browser-local mutation.

## Model fallback

1. Try WebGPU when supported.
2. Use the Transformers.js WASM/CPU backend when available and within configured resource limits.
3. If loading or inference fails, timeouts, or exceeds memory/runtime budget, disable AI for the current session and expose the deterministic Command Centre.
4. A rules-based parser may handle only explicitly registered, unambiguous commands. It must not fabricate a successful interpretation.
5. Do not call a hosted LLM as a hidden fallback. Prompts and model inference remain local.

## Privacy and telemetry

- Do not send prompt text or student records to an external inference provider.
- Avoid logging raw prompts, passwords, tokens, student answers or personal data.
- Operational diagnostics should use non-sensitive error codes and aggregate counters.
- Model assets may be cached by the browser; provide versioned asset URLs and a model download/loading state.

## Hosting boundary

- GitHub Pages remains the static application host and can host versioned model assets subject to repository and bandwidth constraints.
- The secured API is a separate portable service. GitHub Pages cannot execute server-side API code.
- No Cloudflare services or Cloudflare-specific runtime dependencies are permitted.
- Do not enable persistent management writes until a server-side authentication provider and a secure persistence adapter are configured and verified.
- Cloud database adoption remains outside M8 and deferred until after M11.

## Acceptance gates

1. Guest cannot access private assistant data.
2. Every authenticated role sees only commands registered for its workspace; server-side authorization remains decisive.
3. Switching workspace changes the assistant context and clears prior workspace-specific conversation context.
4. Prompt injection, fake role claims and requests for arbitrary endpoints cannot bypass server authorization.
5. Ambiguous, unsupported, malformed and low-confidence outputs never execute.
6. Model download, WebGPU, WASM, CPU, memory and timeout failures all reach a usable non-AI fallback.
7. API 401/403/404/409/429/5xx and network failures are handled distinctly without false success.
8. Factual responses are grounded in service results and include clear empty/partial/error states.
9. Consequential writes require confirmation and use idempotency protection.
10. Tests cover every role and negative scope cases using the existing policy fixtures; no new permission rule is invented merely for the assistant.
