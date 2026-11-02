# ExamGuru Quest

A mobile-friendly, non-commercial CBSE learning and MCQ practice portal for multiple classes, hosted on GitHub Pages.

## Live portal

- Sign-in landing page: https://ai-hobbiest.github.io/ExamGuru-Quest/
- Learner subject hub and dashboard (after student sign-in): https://ai-hobbiest.github.io/ExamGuru-Quest/dashboard.html
- Learner dashboard, levels and rewards: https://ai-hobbiest.github.io/ExamGuru-Quest/dashboard.html
- Study Library: https://ai-hobbiest.github.io/ExamGuru-Quest/study.html
- Student profile, test history and JSON backup: https://ai-hobbiest.github.io/ExamGuru-Quest/profile.html
- Admin Workspace (local authoring and reports): https://ai-hobbiest.github.io/ExamGuru-Quest/admin.html
- Science: https://ai-hobbiest.github.io/ExamGuru-Quest/science.html
- Mathematics: https://ai-hobbiest.github.io/ExamGuru-Quest/practice.html?subject=mathematics
- English: https://ai-hobbiest.github.io/ExamGuru-Quest/practice.html?subject=english
- Social Science: https://ai-hobbiest.github.io/ExamGuru-Quest/practice.html?subject=social-science
- Hindi Course A/B starter practice: https://ai-hobbiest.github.io/ExamGuru-Quest/practice.html?subject=hindi

## Branding and navigation

The portal uses the **Midnight Indigo + Electric Coral + Mint** theme and the attribution **“Conceptualised by JP Ganathe.”** The landing page is now a sign-in screen. A successful student sign-in opens the dashboard, which includes subject launch cards and learning analytics. The responsive side menu changes according to guest, student or server-verified admin state. Guests see sign-in; signed-in students see learning and profile links; admins see the Admin Workspace only after server-side role verification.

- `css/branding.css`: shared theme tokens and styles.
- `css/app-shell.css` and `js/app-shell.js`: responsive navigation.

## What is available now?

| Subject | Coverage in this version | Starter questions |
|---|---|---:|
| Science | 14 chapter sets | 1,400 embedded MCQs |
| Mathematics | 14 chapters, 100 MCQs per chapter | 1,400 |
| English | All 37 prescribed literature, reading, grammar and writing topics | 3,700 |
| Social Science | All 22 topic sets, 100 MCQs per set | 2,200 |
| Hindi | General grammar/comprehension and selected Course A/B literature topics; partial starter set | 254 |

The English bank now contains 3,700 MCQs across all 37 topic sets, with 100 MCQs per set. The Class 6 track is available through the class-assigned student dashboard: NCERT Science (1,200 MCQs), Mathematics (1,000), English (1,600), Social Science (1,400), plus SOF Science/NSO (600), Mathematics/IMO (550) and English/IEO (600). The additional topic banks are maintained in `data/english-chapters-19-25.json`, `data/english-chapters-26-28.json`, `data/english-topics-29-33.json` and `data/english-topics-34-37.json`; all four are merged into `data/english.json` during the Pages build and checked by the deployment workflow. Hindi remains a starter set and is not yet at 100 questions per topic. Mathematics now contains 1,400 MCQs across the 14 Class 10 chapters, with compact SVG diagrams only where visuals help; the Pages workflow validates 100 MCQs per chapter and checks referenced diagram assets. The Science bank is generated from its existing compressed source during deployment. Social Science's 2,200 MCQs are maintained across four topic-override JSON files and merged into `data/social-science.json` during the Pages build. The deployment workflow checks all 22 topics and requires exactly 100 questions per topic. The Rise of Nationalism in India, Geography map skills and enrichment/project scope should be studied against the school's current assessment plan: for 2026–27, The Age of Industrialisation is periodic-assessment only, Lifelines of National Economy is map work only, and Consumer Rights is project work; the Globalisation chapter's board scope is narrower than its project themes. English prompts discuss literature themes and events without reproducing textbook passages. Social Science includes some enrichment/map/project-related topics; confirm which chapters are included in the student’s exam. Hindi literature coverage is a selection and should be matched to the student’s actual Hindi Course A or Course B syllabus.

## Admin Workspace

Open the Admin Workspace at https://ai-hobbiest.github.io/ExamGuru-Quest/admin.html. The page prepares local drafts and exports JSON. It has no in-app admin login or GitHub write token; only a trusted GitHub repository maintainer can publish changes.

For the starter phase, students can sign in with a **username and password** from `data/student-accounts.json`. Passwords are stored as salted PBKDF2-SHA-256 hashes, never as plaintext. For this phase, student accounts use the JSON flat-file database at `data/student-accounts.json`. An administrator creates an account in the Admin Workspace, exports the updated JSON, and commits it to GitHub; the account becomes available to all students after the Pages deployment. This is a deliberate MVP limitation: GitHub Pages is static and cannot write back to the repository. Central account storage and automated account publishing are tech debt for a later Cloudflare Auth or Google OAuth phase. Do not put personal, reused or confidential passwords in this MVP.

**Security limitation:** this repository and account file are public. Anyone can read usernames, salts and hashes and attempt offline password guesses. Verification happens in the browser and can be bypassed; this is not real authentication or a way to protect quiz content. Do not use personal, reused or confidential passwords, and do not store student profile data in the account file. Server-side authentication, private account storage, admin-only account management, cross-device sync and live reports are deferred. Cloudflare Worker and D1 source in `cloudflare/` is retained as future tech debt; no Cloudflare account is required for the current GitHub JSON MVP.

The login page offers username/password sign-in for the existing flat-file student MVP and a separate GitHub admin sign-in option. The GitHub option requires the Cloudflare Worker/API to be deployed and configured. Its `ADMIN_GITHUB_USERS` setting is a **server-side allowlist** (currently defaulted in the deployment template to `AI-Hobbiest`); add any other app-authorised GitHub usernames explicitly. Being a GitHub user or repository collaborator does not by itself grant admin access. The public Pages UI never decides admin eligibility on its own. Until the Worker, D1 database and GitHub OAuth client are configured, GitHub admin sign-in will explain that it is unavailable rather than accepting an unverified identity.

The local backup-import/reporting tools remain available, but student backups are processed in the browser and are not uploaded automatically. Do not commit student backups or private documents to this public repository. The `data/classes.json` file is the class catalogue. For flat-file accounts, the class assigned in `data/student-accounts.json` overrides the local profile class while signed in; only the administrator can promote or change it through the Admin Workspace. `data/knowledge-base.json` is a metadata manifest, not a document store.

## Practice engine

Class 10's five subjects and the class-specific Class 3 and Class 6 banks use the shared practice engine; Class 6 also includes SOF Science, Mathematics and English tracks. It supports chapter/topic selection, Learn mode, Test mode, Retry missed, Mixed practice and Timed Exam. Students can select no live timer, elapsed-time tracking, or a 10/20/30/60-minute countdown. Countdown sessions submit automatically when time expires. Answers and active attempts are saved locally; a same-browser refresh can restore a session. Completed records include score, duration, answer status and stable question/option IDs.

Science retains its existing compressed source payload so there is no manually maintained duplicate bank. During deployment, GitHub Actions validates the 14 chapter sets / 1,400 MCQs and generates the deployment copy of data/science.json, which is then consumed by the same question-bank normalizer, session ledger, local history and XP/levels/badges as the other subjects. The old science.html URL remains as a compatibility redirect to practice.html?subject=science.

### SOF Class 6 ISO / NSO Olympiad full mock

The Class 6 Science SOF track includes a blueprint-driven **Level 1 full mock** in addition to chapter practice. It uses the same saved-attempt engine, question palette, answer review and report downloads.

| Section | Questions | Marks per question | Maximum marks |
|---|---:|---:|---:|
| Logical Reasoning | 10 | 1 | 10 |
| Science | 35 | 1 | 35 |
| Achievers Section | 5 | 3 | 15 |
| **Total** | **50** | — | **60** |

The paper has a fixed 60-minute countdown, fixed section quotas, a fresh random selection without duplicates within the paper, and no question-level timer. A paper prefers questions not used in the previous three completed mocks, while the section pool has enough unseen questions. Students can revisit and change answers before submitting or until the overall timer expires. The question navigator shows section progress. Results and PDF/Excel reports include weighted marks and section-wise scores.

The 600-question pool currently contains 50 Logical Reasoning, 500 Science and 50 Achievers questions. The paper engine validates the section counts and mark totals before a paper can start. The official Level 1 syllabus also calls for 60% current-class and 40% previous-class coverage, with Achievers questions from the current class. The present question records do not yet carry a verified current/previous-class syllabus tag, so that 60/40 content balance is **not automatically enforced** by the paper generator. Treat this mock as matching the exam's section/count/time/mark structure, not as a syllabus-ratio-certified paper. The question bank needs grade-level tagging and a content audit before that final compliance claim can be made.

Implementation notes and checks: [docs/sof-olympiad-experience.md](docs/sof-olympiad-experience.md).

## Stage D — Study Library foundation

The student-facing Study Library turns the Admin Knowledge Base manifest into a class-aware learning-resource catalogue. Students can search and filter published notes, reading resources, question-bank PDFs and visual references; save items for later; and mark resources complete. Resources may be limited to selected class IDs or made available to all classes. Draft resources are hidden from students. The Admin Workspace requires a rights/source note and an explicit confirmation that the resource file has been committed at its repository path before the manifest entry can be marked published.

Study Library saved/completed state is stored locally per student and is included in the version 1 JSON backup as optional `studyLibraryProgress`. Older backups without this field remain valid. The current `data/knowledge-base.json` manifest is empty, so the page will show an empty-state message until permitted resources are published. This is the first content-beyond-MCQs slice; structured interactive lessons and non-MCQ activities follow as later Stage D increments. Cloud sync remains deferred.

## Stage C — Intelligent learning

The shared practice engine now builds a **consolidated Mistake Book** across the student's class subjects. Incorrect and skipped responses are collected by stable question ID. Changing an answer before the same attempt is submitted updates that attempt's response rather than creating a second mistake. A mistake from a completed earlier attempt remains in the history until the student marks it as mastered; a new incorrect or skipped response reopens it.

Students can save **personal bookmarks** from the question screen. These are separate from the existing exam-time “Mark for review” flag. Saved questions can be practised later through the Saved Questions mode or managed in the [My Learning Hub](https://ai-hobbiest.github.io/ExamGuru-Quest/learning.html).

**Difficulty-based practice** adds a selector for the difficulty labels already present in each bank (Easy, Medium, Hard and Challenge). It filters the available questions; it does not invent or relabel question difficulty. A subject with no questions at the chosen level returns an empty-selection message instead of silently substituting a different level.

**Topic mastery** groups the latest recorded response per distinct question by subject and chapter/topic. Small samples are labelled “Building evidence”; larger samples are classified from the observed accuracy. **Adaptive practice** weights question selection towards open mistakes, weaker topics, unseen questions and a difficulty suited to the topic's current evidence. Each question is selected at most once per adaptive session.

The Learning Hub also provides evidence-based **revision recommendations** from open mistakes, weaker topics and personal bookmarks. Recommendations update from the saved learning library as new responses are recorded.

The library is included in the version 1 student JSON backup as an optional `learningLibrary` field. Existing backups without that field remain valid. Restoring an older backup replaces the current learning library with an empty one, and the import confirmation warns about this.

**Storage boundary:** all Stage C learning data is stored locally in the current browser/device using the existing student-scoped storage boundary. It does not enable cross-device sync or add a cloud database. Export a backup before moving to another device.

### SOF Class 6 IMO and IEO Level 1 full mocks

The Class 6 Mathematics/IMO and English/IEO tracks now also offer blueprint-driven full mocks. Each paper has a fixed 60-minute countdown, 50 questions and 60 marks. Students can revisit questions, change answers, mark for review, navigate by section, and submit early; the Achievers Section awards 3 marks per correct answer.

**IMO blueprint**

| Section | Questions | Marks each | Total |
|---|---:|---:|---:|
| Logical Reasoning | 15 | 1 | 15 |
| Mathematical Reasoning | 20 | 1 | 20 |
| Everyday Mathematics | 10 | 1 | 10 |
| Achievers Section | 5 | 3 | 15 |
| **Total** | **50** | — | **60** |

The source bank contains 550 questions: 50 Logical Reasoning, 300 Mathematical Reasoning, 120 Everyday Mathematics and 80 Achievers questions.

**IEO blueprint**

| Section | Questions | Marks each | Total |
|---|---:|---:|---:|
| Word and Structure Knowledge | 30 | 1 | 30 |
| Reading | 10 | 1 | 10 |
| Spoken and Written Expression | 5 | 1 | 5 |
| Achievers Section | 5 | 3 | 15 |
| **Total** | **50** | — | **60** |

The IEO bank now contains 600 questions across 12 topic sets. Every question is tagged to an exam section; separate 50-question pools were added for Spoken and Written Expression and Achievers, while the original questions and IDs were retained.

For Level 1 IMO, SOF specifies 60% current-class and 40% previous-class syllabus coverage, with Achievers questions from the current class. Current/previous-class provenance is not yet tagged and audited in the bank, so the full mock enforces the section counts and marks but does **not** certify that syllabus split.

## Question images and diagrams

The shared question model now supports optional `images` metadata on each question. Each image has a source, meaningful alternative text and an optional caption. Sources may be a relative asset path (recommended for curated question banks) or a PNG/JPEG/WebP/GIF base64 data URI (useful when packaging a figure with an imported question). Text-only questions remain valid and unchanged.

The practice screen and answer review render the figures responsively, and students can open an enlarged view. Image metadata passes through the common normalizer, so shuffled answer options do not change which question owns its diagram. Unsafe schemes such as JavaScript URLs are rejected by the normalizer. The existing starter banks do not yet contain curated diagrams; this change establishes the capability and data contract before bulk question-bank creation.

### PDF builder scope

The planned question-bank builder will target **text-based PDFs with selectable text**. Scanned/image-only PDFs and OCR are out of scope for now. For Science and Mathematics, the workflow must let the author associate a relevant figure with the question and preview that association before approving a generated bank; it must not silently guess when a diagram/question match is uncertain.

## Phase 1 — data foundation

- Versioned JSON Schema contracts live in `data/contracts/v1/`.
- `js/question-bank.js` accepts both existing legacy chapter arrays and the canonical v1 bank structure.
- `js/storage.js` provides a replaceable browser-local persistence interface: load, save, clear, export and import.
- Stable subject/chapter/question IDs support migration away from the initial numeric question references.

## Phase 2 — timed sessions and results

- No live timer, elapsed-time mode and configurable countdown.
- Automatic timeout submission, early manual submission and distinction between skipped/unanswered questions.
- In-progress session autosave and recovery in the same browser.
- Versioned attempt and per-answer records.

## Phase 3 — student profile and history

The profile page collects only:
- Generated local Student ID (not school-issued)
- Display name/nickname
- School
- Class
- City
- Indian State / Union Territory (dropdown)

No email address, phone number, date of birth or section is requested. School and city/state can still help identify someone in combination, so the information remains in browser storage and should be treated as private.

The profile/history page displays completed attempts from the shared-engine subjects and supports versioned JSON backup/restore. Importing a backup replaces the local profile and data for the included subjects after confirmation. Keep backups private and do not upload them to this public repository.

## Phase 4 — dashboard, levels and rewards

- Level progression from **Curious Starter** through **Grand Scholar**, calculated from accumulated XP.
- XP from completed sessions and correct answers, with accuracy bonuses.
- Achievement badges for completion milestones, perfect scores, accuracy, subject exploration, practice streaks and levels.
- Score trend for the latest 10 completed tests, answered-question accuracy by subject, and a 7-day practice-activity chart.
- Current/best practice streaks derived from saved attempt dates.
- Responsive side-menu navigation across the app.

XP, levels, streaks and badges are **derived from saved completed attempts**, not separately accumulated on each page load. This prevents reopening the dashboard from awarding XP repeatedly.

## Local storage and privacy limits

Student profiles, attempts, XP, levels, streaks and badges remain in that browser's local storage, whether or not the student signs in. Clearing browser storage can remove records, so students should export JSON backups and keep them private. The starter account file verifies a username/password locally but does not sync data across devices. Import or reconcile backups deliberately when moving devices.

## Deployment and checks

GitHub Actions assembles and deploys the site to GitHub Pages. It validates the Science payload and generates/tests the shared Science bank when no committed `data/science.json` exists; when that file exists, it becomes the editable source of truth. It checks each subject question-bank structure and any referenced image assets, then runs automated tests for foundation migration, test-session calculations/recovery, Science normalization and routing, student profile validation, Admin Workspace data handling, JSON backup/restore, XP/levels/badges and responsive navigation.

## Syllabus and usage note

The practice sets are revision aids, not official CBSE publications or a guarantee of complete syllabus coverage. Verify the school’s current syllabus and assessment plan before relying on any topic for exam preparation. Official CBSE Class X sample-paper index: https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html


## Class 3 and Class 6 tracks

Class 3 Mathematics and English are routed through the shared practice engine. Class 6 has separate NCERT-aligned Science, Mathematics, English and Social Science banks, plus SOF practice banks for NSO, IMO and IEO. The Admin Question Bank Editor is organised by class and subject, and each class-specific bank remains separate from Class 10 content. The broader curriculum roadmap and quality gates are recorded in [Class 6 expansion roadmap](docs/class-6-expansion-plan.md).

## Family Mode — local-first

- Students sign in directly using their own username and password. There is no student profile picker.
- Parent accounts are managed by the administrator and sign in separately.
- `data/family-access.json` holds parent accounts and a many-to-many `parentStudentLinks` relationship list. A parent may be linked to several students, and the same student may be linked to multiple parents.
- The Admin Workspace's **Students & Reports → Family access** panel creates parent accounts and edits the selected parent's child links. The browser downloads an updated `family-access.json`; an authorised maintainer must publish it to GitHub Pages before the changes become active. The generated temporary parent password is shown once in the Admin Workspace; copy it and share it privately.
- Parents use the **same home-page sign-in form** as students: https://ai-hobbiest.github.io/ExamGuru-Quest/. Enter the parent username and temporary password. The account role is detected from `data/family-access.json`, and a successful sign-in opens `parent.html` (Family Dashboard) rather than the student dashboard. The Family Dashboard lists linked children and their locally available learning progress.
- Parent account records, salted password hashes and parent–student links are stored in `data/family-access.json`; student usernames and assigned classes remain in `data/student-accounts.json`. Never put plaintext passwords in either file.
- Student accounts use stable `studentId` values. `js/storage.js` namespaces local progress, attempts, XP inputs and profile records by the signed-in student's ID. The parent dashboard reads linked students' local attempt ledgers from this same device.
- Existing legacy progress without a student owner is not automatically assigned to the first child who signs in. It remains in the old unscoped local-storage keys and is hidden from the new student-specific views. Do not clear this browser's site data. An already-downloaded JSON backup can be imported under the intended student; a supervised legacy-data assignment/import utility is still needed for history that exists only in the old local keys.
- This is a convenience login for the local-first prototype, **not secure authentication**. The repository is public: parent usernames, pseudonymous student IDs, family links, salts and password hashes are visible. Do not use full legal names, email addresses, phone numbers, sensitive family details or passwords reused elsewhere. Treat classroom-only passwords as temporary.
- Student history remains on the browser/device where it was created. A parent can see linked children only when their local data is present on the same browser/device. No cross-device or cloud progress sync is enabled.
- The account and relationship model uses stable IDs so the final database migration can replace file-based lookup and local persistence without changing the parent–student relationship design.
