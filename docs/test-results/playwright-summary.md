## Playwright results

| Passed | Failed | Flaky | Skipped | Duration |
|---|---|---|---|---|
| 84 | 0 | 0 | 0 | 55.1 s |

<details><summary><b>api</b> – 71/71 passed</summary>

| | Test | Time |
|---|---|---|
| ✅ | AI triage API › classifies "App crashes when saving a draft and all …" as CRITICAL | 0.4 s |
| ✅ | AI triage API › classifies "Customer was charged twice after the pay…" as CRITICAL | 0.3 s |
| ✅ | AI triage API › classifies "Export endpoint returns 500 Internal Ser…" as HIGH | 0.3 s |
| ✅ | AI triage API › classifies "Users are unable to upload attachments b…" as HIGH | 0.3 s |
| ✅ | AI triage API › classifies "The sprint report shows the wrong total …" as MEDIUM | 0.3 s |
| ✅ | AI triage API › classifies "Typo on the settings page: "Projcet" sho…" as LOW | 0.2 s |
| ✅ | AI triage API › classifies "Please review the onboarding copy for th…" as MEDIUM | 0.2 s |
| ✅ | AI triage API › the same input always produces the same result (deterministic mock) | 0.3 s |
| ✅ | AI triage API › reported reproduction steps become suggested test steps | 0.3 s |
| ✅ | AI triage API › instructions hidden in the bug report do not change the classification | 0.3 s |
| ✅ | AI triage API › 400 – description too short | 0.2 s |
| ✅ | AI triage API › 400 – description missing | 0.3 s |
| ✅ | AI triage API › 400 – unknown field | 0.3 s |
| ✅ | AI triage API › POST /issues/:id/triage stores the result, sets severity and creates AI test cases | 0.5 s |
| ✅ | Auth API › valid login returns a JWT, the user (no password hash) and an httpOnly session cookie | 0.2 s |
| ✅ | Auth API › email is case-insensitive | 0.2 s |
| ✅ | Auth API › wrong password and unknown user get the same 401 (no account enumeration) | 0.3 s |
| ✅ | Auth API › a tampered token is rejected | 0.2 s |
| ✅ | Auth API › protected endpoints › GET /projects without a token → 401 | 0.1 s |
| ✅ | Auth API › protected endpoints › GET /issues without a token → 401 | 0.1 s |
| ✅ | Auth API › protected endpoints › POST /issues without a token → 401 | 0.1 s |
| ✅ | Auth API › protected endpoints › POST /ai/triage without a token → 401 | 0.1 s |
| ✅ | Auth API › protected endpoints › GET /auth/me without a token → 401 | 0.1 s |
| ✅ | Issue API contract (JSON Schema) › POST /issues with the minimum payload returns 201, Location header and a schema-valid issue with defaults | 0.4 s |
| ✅ | Issue API contract (JSON Schema) › POST /issues with every field echoes the values back | 0.4 s |
| ✅ | Issue API contract (JSON Schema) › issue keys are sequential per project | 0.3 s |
| ✅ | Issue API contract (JSON Schema) › GET /issues/:id, GET /issues and GET /board all honour their contracts | 0.4 s |
| ✅ | Issue API contract (JSON Schema) › error responses share one contract (400, 401, 403, 404, 409) | 0.5 s |
| ✅ | Issue API contract (JSON Schema) › no response anywhere leaks password hashes | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – missing projectId | 0.3 s |
| ✅ | POST /issues – payload validation › 400 – missing title | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – empty body | 0.3 s |
| ✅ | POST /issues – payload validation › 400 – title too short (2 chars) | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – title only whitespace | 0.3 s |
| ✅ | POST /issues – payload validation › 400 – title too long (201 chars) | 0.3 s |
| ✅ | POST /issues – payload validation › 400 – title is a number | 0.3 s |
| ✅ | POST /issues – payload validation › 400 – title contains a control character | 0.3 s |
| ✅ | POST /issues – payload validation › 400 – description over 10,000 chars | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – unknown type | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – lower-case enum | 0.3 s |
| ✅ | POST /issues – payload validation › 400 – invalid severity | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – projectId not a UUID | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – status cannot be set on create | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – unknown field (mass assignment) | 0.3 s |
| ✅ | POST /issues – payload validation › 400 – references that do not exist or belong to another project | 0.4 s |
| ✅ | POST /issues – payload validation › 400 – malformed JSON body | 0.2 s |
| ✅ | POST /issues – payload validation › 413 – body larger than 64 KB | 0.4 s |
| ✅ | POST /issues – payload validation › boundaries that must be accepted › 201 – title of exactly 3 characters | 0.4 s |
| ✅ | POST /issues – payload validation › boundaries that must be accepted › 201 – title of exactly 200 characters | 0.3 s |
| ✅ | POST /issues – payload validation › boundaries that must be accepted › 201 – description of exactly 10,000 characters | 0.3 s |
| ✅ | POST /issues – payload validation › boundaries that must be accepted › 201 – multi-line description with tabs | 0.4 s |
| ✅ | POST /issues – payload validation › boundaries that must be accepted › 201 – emoji and non-Latin text | 0.3 s |
| ✅ | POST /issues – payload validation › boundaries that must be accepted › 201 – HTML / SQL-looking text is stored as plain text | 0.3 s |
| ✅ | POST /issues – payload validation › boundaries that must be accepted › 201 – title is trimmed | 0.3 s |
| ✅ | Role-based access control › DONE → VERIFIED as admin → 200 | 0.5 s |
| ✅ | Role-based access control › DONE → VERIFIED as qa → 200 | 0.5 s |
| ✅ | Role-based access control › DONE → VERIFIED as developer → 403 | 0.5 s |
| ✅ | Role-based access control › DONE → VERIFIED as viewer → 403 | 0.5 s |
| ✅ | Role-based access control › a developer cannot reopen a VERIFIED issue, QA can | 0.7 s |
| ✅ | Role-based access control › viewers are read-only | 0.5 s |
| ✅ | Role-based access control › only admins manage projects | 0.6 s |
| ✅ | Role-based access control › only the reporter or an admin can delete an issue | 0.5 s |
| ✅ | Issue workflow (state machine) › happy path BACKLOG → IN_PROGRESS → QA → DONE → VERIFIED is recorded in the history | 0.6 s |
| ✅ | Issue workflow (state machine) › 409 – cannot jump from BACKLOG to QA | 0.5 s |
| ✅ | Issue workflow (state machine) › 409 – cannot jump from BACKLOG to DONE | 0.4 s |
| ✅ | Issue workflow (state machine) › 409 – cannot jump from BACKLOG to VERIFIED | 0.3 s |
| ✅ | Issue workflow (state machine) › 409 – cannot jump from IN_PROGRESS to DONE | 0.3 s |
| ✅ | Issue workflow (state machine) › 409 – cannot jump from QA to BACKLOG | 0.4 s |
| ✅ | Issue workflow (state machine) › 409 – cannot jump from DONE to BACKLOG | 0.4 s |
| ✅ | Issue workflow (state machine) › 400 – unknown target status | 0.3 s |
| ✅ | Issue workflow (state machine) › drop index controls the card order inside a column | 0.4 s |

</details>

<details><summary><b>e2e-chromium</b> – 13/13 passed</summary>

| | Test | Time |
|---|---|---|
| ✅ | AI triage in the UI › AI suggests severity and test steps while filing a bug, and the suggestion can be applied | 2.5 s |
| ✅ | AI triage in the UI › running AI triage on an issue generates test cases | 1.6 s |
| ✅ | Login › admin can sign in and lands on the dashboard | 1.4 s |
| ✅ | Login › qa can sign in and lands on the dashboard | 1.4 s |
| ✅ | Login › developer can sign in and lands on the dashboard | 1.5 s |
| ✅ | Login › wrong password shows an error and stays on the login page | 1.2 s |
| ✅ | Login › a protected page redirects to login and returns there after signing in | 1.8 s |
| ✅ | Login › signing out ends the session | 1.6 s |
| ✅ | Issue lifecycle on the Kanban board › create an issue, drag it across the board, then QA verifies it | 4.6 s |
| ✅ | Issue lifecycle on the Kanban board › cards can also be moved with the keyboard-accessible "Move to" menu | 1.4 s |
| ✅ | Issue lifecycle on the Kanban board › an invalid jump (Backlog → Done) is rejected and the card snaps back | 1.9 s |
| ✅ | Role-based access in the UI › as a developer › dragging a Done issue to Verified is refused by the API and rolled back in the UI | 2.1 s |
| ✅ | Role-based access in the UI › as a viewer › the board is read-only: no New issue button, no drag, no move menu | 1.2 s |

</details>

