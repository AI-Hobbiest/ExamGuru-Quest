# M8 — Role-aware Ask ExamGuru

## Product direction

M8 replaces the traditional universal search entry point with one shared conversational interface: **Ask ExamGuru**. The same UI is mounted in every authenticated workspace, but the assistant profile and searchable knowledge are resolved from the active role. It is not a collection of separate role-specific chat applications.

## GitHub-only delivery boundary

GitHub Pages serves the static application and versioned learning catalogues. GitHub Actions validates and deploys repository changes. Runtime retrieval and conversation state stay in the browser. No Cloudflare, Supabase, Firebase, hosted LLM, API secret, or external database is used.

This is not a secure multi-user server boundary. Browser-local role state can be modified by the user, and static GitHub-hosted files are public. Do not place confidential student records, private institutional data, payments, credentials or authoritative permissions in the public catalogue.

## Role profiles and intended scopes

| Active role | Intended assistant scope |
|---|---|
| Student | Active-class curriculum, Study Library, practice, revision and own learning guidance |
| Parent / Guardian | Linked-child learning guidance, assigned tests and reports |
| Teacher | Assigned classes/subjects, lesson resources, assessments and class performance |
| HOD | Appointed department, teacher workload, department performance and approved cross-department teaching assignments |
| Institution Admin | Institution operations, users, academic structure, content and institution reports |
| Institution Viewer | Institution information and reports, read-only |
| Platform Admin | Platform documentation, question banks, institutions, demo management and operational guidance |

The assistant resolves the active role/workspace from the shared app-shell authentication context. A workspace switch causes the page/session to be reloaded with the new role context; the assistant must not reuse the previous workspace's retrieval index.

## Retrieval and publication rules

- Student Visual Revision Board cards are indexed only for the student's active class.
- Knowledge Base manifest entries must have \`status: "published"\`.
- Optional \`audienceRoles\` restricts a resource to explicitly listed roles. Resources with no audience list are general published resources.
- Optional \`classIds\`, \`institutionId\` and \`departmentIds\` narrow retrieval scope when those dimensions are available in the active context.
- HOD and Institution Viewer do not inherit Institution Admin scope.
- Every result links to its published source. Empty matches are explicit; the assistant does not fabricate an answer.
- Resource content is rendered as text, never executable HTML.
- Conversation messages exist only in the current page session. No prompt, identity or learning record is sent to an AI service.

## Fallback and browser support

The chat uses standard browser capabilities (DOM, modern JavaScript, \`fetch\` and \`Promise\`) supported by current mainstream desktop and mobile browsers. Feature detection and script-load error handling provide a persistent **Knowledge & Help** link to the existing Study Library/help pages if the assistant cannot initialise or the catalogue cannot load. The traditional navigation and destination pages remain available; chat is the primary universal discovery entry, not a hard dependency for using the LMS.

## GitHub-only security and capability limits

The role profiles define the intended retrieval boundary for this static/local-first phase; they are not server-enforced authorization. Do not represent local role checks as secure RBAC. No private cross-user data or management writes are exposed through chat. Parent-child records, teacher assignment data, HOD departmental records, institutional reports and platform operations can only be surfaced when they are already available from a trusted source with the appropriate scope. Until a trusted backend is selected after M11, the assistant is limited to public/published knowledge and local guidance.

The current Knowledge Base manifest is empty until content is published. Student Visual Revision Board cards can already be searched for the matching class. Other roles will see an empty-result response until role-tagged Knowledge Base resources are published.

## Deferred capabilities

A generative local model (for example, Transformers.js) is not enabled in this delivery. Retrieval-first search is the dependable baseline. A future local model may summarise retrieved passages but must never add unsupported facts or bypass source citations.

Trusted management commands, secure role enforcement, private shared storage, parent/child record retrieval, cross-device synchronisation and institutional analytics require a trusted backend/persistence boundary. GitHub Pages and GitHub Actions do not provide an interactive authenticated application API. These capabilities remain deferred to the post-M11 infrastructure decision.

## Acceptance gates

1. One shared Ask ExamGuru interface is available to every authenticated supported role.
2. The active role determines greeting, workspace label and intended retrieval profile.
3. Student Visual Revision Board search is class-scoped.
4. Published Knowledge Base resources respect role, class, institution and department metadata.
5. HOD and Institution Viewer do not inherit Institution Admin permissions.
6. Search is deterministic, bounded and browser-local.
7. Every returned result links to its source; no-result responses do not fabricate content.
8. Unsupported browser/script/catalogue cases retain a conventional Knowledge & Help fallback.
9. Existing navigation and direct Study Library/help pages remain available.
10. No external inference, analytics, API token or network write is used.
11. Unit tests cover role profiles, class isolation, audience filtering, institution/department filtering, source links and empty results.
12. GitHub Actions runs the M8 tests before merge/deployment.


## Expanded published question-bank retrieval

Ask ExamGuru reads the active class catalogue at `data/classes.json` and resolves the matching published question-bank files by class and subject. Question-count requests aggregate all matching banks, list curriculum and SOF/Olympiad banks separately, and support both chapter-grouped MCQ files and flat Exam Paper Studio pools. Topic searches index question prompts, options, explanations and chapter/topic metadata from the matching published bank files. Platform Admin can inspect the published catalogue across classes; student retrieval is constrained to the student's active class. Only files present in the GitHub repository are considered. A catalogue entry without a corresponding published file is omitted from results rather than guessed.
