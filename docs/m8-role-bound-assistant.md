# M8 — Browser-local Assistant and Student Knowledge Search

## M8 delivery boundary

M8 is implemented for the GitHub-only, local-first phase. GitHub Pages serves the static application and versioned learning catalogues. GitHub Actions validates and deploys repository changes. Runtime search and conversation state stay in the browser. No Cloudflare, Supabase, Firebase, hosted LLM, API secret, or external database is used.

This is not a secure multi-user server boundary. Browser-local role state can be modified by the user, and static GitHub-hosted account files are public. Do not use this phase for confidential student records, private institutional data, payments, or authoritative cross-device permissions.

## Student Knowledge Assistant

- A floating conversational search entry is mounted for authenticated student sessions only.
- The active class scopes the index. The assistant indexes matching Visual Revision Board cards and published entries from \`data/knowledge-base.json\`.
- Draft resources and resources for other classes are excluded.
- Retrieval is deterministic and runs entirely in the browser. It ranks matches using title, chapter, subject and content terms.
- Responses quote/condense only indexed source text and provide links back to the Study Library or published resource. Empty matches are explicit; the assistant does not invent an answer.
- No prompt, student identity, answer history or learning record is sent to an AI service.
- Conversation messages exist only in the current page session. Student data is not persisted by the assistant.
- The current knowledge manifest is empty by design until administrators publish resources. Existing class-scoped Visual Revision Boards are searchable immediately.

## Architecture

1. GitHub Pages serves the app, the visual-revision catalogue and the knowledge-base manifest.
2. The shared app shell identifies the current browser session and mounts the student assistant only for student workspaces.
3. \`js/knowledge-assistant-model.js\` validates the catalogue shape at the boundary and builds a class-scoped, in-memory retrieval index.
4. \`js/knowledge-assistant.js\` renders the conversation panel, retrieves matching sources and presents citations/links.
5. The retrieval model is provider-neutral and isolated from future model or database adapters.

## Assistant boundaries by role

- Student: class-scoped published learning content only.
- Parent: no student assistant entry in this milestone; existing parent-linked Study Library views remain unchanged.
- Teacher/HOD/Institution Admin/Institution Viewer: no management-command execution is exposed in M8's GitHub-only mode.
- Platform Admin: existing deterministic Admin workspace remains the management interface.
- Guest: no assistant entry and no private learning data.

## Deferred capabilities

A generative local model (for example, a small Transformers.js model) is not enabled in this delivery. It would add significant model download, memory, CPU/WebGPU compatibility and answer-quality costs. Retrieval-first search is the dependable baseline; a local model may later rephrase retrieved passages, but must never add unsupported facts or bypass source citations.

Trusted management commands, secure role enforcement, private shared storage, and cross-device synchronization require a trusted server/persistence boundary. GitHub Pages and GitHub Actions do not provide an interactive authenticated application API. These capabilities remain deferred to the post-M11 infrastructure decision.

## Acceptance gates

1. Only a student session mounts the assistant.
2. Search index includes only Visual Revision Board content for the active class.
3. Knowledge-base resources must be published and class-compatible.
4. Search is deterministic, bounded and browser-local.
5. Every returned result links to its source; no-result responses do not fabricate content.
6. Assistant content is inserted as text, not executable HTML.
7. No external inference, analytics, API token or network write is used.
8. The existing Study Library, parent views, Admin workspace and navigation remain unaffected.
9. Unit tests cover class isolation, publication filtering, retrieval ranking, source links and empty results.
10. GitHub Actions runs the M8 tests before merge/deployment.
