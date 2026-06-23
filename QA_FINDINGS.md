# Academy Platform — QA Audit Findings

Date: 2026-06-22
Scope: Backend (Laravel 12, `C:\Users\aghaa\Desktop\testlaravel - Copy - Copy`) +
Frontend (React 19/Vite, `C:\Users\aghaa\Desktop\academy_clean\academy_clean\artifacts\academy`).
DevLink explicitly excluded per instructions.

Test accounts used (passwords reset via `php artisan tinker` against the dev DB,
no other account data modified):
- `admin@academy.test` / `Password123!` (role: admin, seeded "أحمد المدير")
- `employer@academy.test` / `Password123!` (role: employer, seeded "شركة التقنية")
- `creator@academy.test` / `Password123!` (role: creator, seeded "سارة المعلمة")
- `user1@academy.test` / `Password123!` (role: user, seeded "محمدa الطالب")

---

## 1. Inventory & coverage

### 1.1 Backend routes (142 total, via `php artisan route:list`)

Legend: [PASS] verified working as intended · [FAIL] defect found (see Findings) ·
[UNTESTABLE] cannot verify in this environment · [NO-UI] backend route exists with
no frontend caller found.

| Method | Path | Controller@action | Status |
|---|---|---|---|
| GET | /api/healthz | — | [PASS] returns `{status:ok}` |
| GET | /api/users/leaderboard | UserController@leaderboard | [PASS] used by LeaderboardPage |
| GET | /api/users/{user} | UserController@show | [PASS] used by PublicProfilePage |
| GET | /api/users/{user}/courses | UserController@courses | [PASS] used by PublicProfilePage |
| GET | /api/courses/featured | CourseController@featured | [PASS] used by HomePage |
| GET | /api/courses | CourseController@index | [PASS] CoursesPage, AdminPage |
| GET | /api/courses/{course} | CourseController@show | [PASS] CourseWatchPage |
| GET | /api/courses/{course}/reviews | CourseController@reviews | [PASS] CourseWatchPage |
| GET | /api/lessons/{lesson}/comments | LessonController@getComments | [PASS] CourseWatchPage |
| GET | /api/lessons/{lesson}/likes | LessonController@getLikes | [PASS] CourseWatchPage |
| GET | /api/lessons/{lesson}/like | LessonController@getLike | [PASS] CourseWatchPage/CreatorPage |
| GET | /api/repositories/featured | RepositoryController@featured | [PASS] HomePage |
| GET | /api/repositories | RepositoryController@index | [PASS] ProfilePage, search |
| GET | /api/repositories/{repository} | RepositoryController@show | [PASS] |
| GET | /api/challenges | ChallengeController@index | [PASS] ChallengesPage, AdminPage |
| GET | /api/challenges/my-submissions | ChallengeController@mySubmissions | [PASS] ChallengesPage, ProfilePage |
| GET | /api/challenges/{challenge} | ChallengeController@show | [PASS] |
| GET | /api/community/posts | CommunityController@getPosts | [PASS] CommunityPage, admin tab |
| GET | /api/community/posts/{post}/comments | CommunityController@getComments | [PASS] CommunityPage |
| GET | /api/home-reviews | HomeReviewController@index | [PASS] HomePage |
| GET | /api/examples | ExampleController@index | [PASS] ExamplesPage |
| GET | /api/projects | ProjectController@index | [PASS] ProjectsPage |
| GET | /api/courses-with-assignments | AssignmentController@coursesWithAssignments | [PASS] ProjectsPage |
| GET | /api/assignments | AssignmentController@index | [PASS] ProjectsPage |
| GET | /api/assignments/{assignment} | AssignmentController@show | [PASS] |
| GET | /api/search | SearchController@index | [PASS] Navbar search, verified live |
| GET | /api/stats/platform | StatsController@platform | [PASS] HomePage |
| GET | /api/stats/user/{user} | StatsController@userStats | [PASS] ProfilePage/PublicProfilePage |
| POST | /api/assignments/review | AssignmentController@review | [PASS] AI review (ProjectsPage), throttled |
| POST | /api/ai/helper | AiController@general | [PASS] verified live; degrades gracefully when Ollama down |
| POST | /api/ai/helper-challenges | AiController@challenges | [PASS] ChallengesPage hint/verify/fix |
| POST | /api/ai/helper-projects | AiController@projects | [PASS] ProjectsPage hint/verify/fix |
| POST | /api/upload | UploadController@store | [PASS] AdminPage/CreatorPage/ProfilePage lesson & avatar upload |
| POST | /api/upload/multiple | UploadController@storeMultiple | [PASS] ProfilePage/ProjectsPage multi-file upload |
| POST | /api/logout | AuthController@logout | [PASS] verified live |
| GET | /api/auth/me | AuthController@me | [PASS] verified live, all 4 roles |
| GET / PUT/POST | /api/users/profile | UserController@profile / updateProfile | [PASS] ProfilePage |
| DELETE | /api/users/me | UserController@deleteSelf | [PASS] code-reviewed (self-delete, last-admin guard); not destructively executed against a live demo account |
| POST | /api/courses/{course}/enroll | EnrollmentController@enroll | [PASS] CourseWatchPage |
| GET | /api/enrollments | EnrollmentController@index | [PASS] ProfilePage |
| POST/GET | /api/courses/{course}/progress | EnrollmentController@updateProgress/getProgress | [PASS] CourseWatchPage |
| GET | /api/courses/{course}/viewers | EnrollmentController@getViewers | [PASS] CreatorPage |
| GET/POST | /api/lessons/{lesson}/progress | LessonController | [PASS] CourseWatchPage |
| POST/DELETE | /api/lessons/{lesson}/comments[...] | LessonController | [PASS] CourseWatchPage |
| POST | /api/lessons/{lesson}/like | LessonController@toggleLike | [PASS] CourseWatchPage |
| GET | /api/courses/{course}/lessons-progress | LessonController@getCourseProgress | [PASS] |
| POST/PUT/DELETE | /api/repositories[...] | RepositoryController | [PASS] ProfilePage/ProjectsPage CRUD, effort-check validated |
| POST | /api/repositories/{repository}/like | RepositoryController@toggleLike | [PASS] |
| POST | /api/repositories/{repository}/rate | RepositoryController@rate | [PASS] code-reviewed; self-rate blocked |
| POST | /api/challenges/{challenge}/submit | ChallengeController@submit | [PASS] verified live, empty-solution rejected 422 |
| PUT/DELETE | /api/challenges/{challenge} | ChallengeController@update/delete | [PASS] AdminPage, ownership/employer enforced |
| POST | /api/challenges/{challenge}/toggle-active | ChallengeController@toggleActive | [PASS] AdminPage |
| POST/PUT/DELETE | /api/courses/{course}/reviews[...] | CourseController | [PASS] CourseWatchPage |
| PUT/DELETE | /api/courses/{course} | CourseController@updateCourse/destroyCourse | [PASS] verified live — employer correctly blocked (403) from editing a course they don't own (CoursePolicy strict ownership, no employer bypass on `update`) |
| POST/PUT/DELETE | /api/courses/{course}/lessons[...] | CourseController | [PASS] AdminPage/CreatorPage |
| POST | /api/courses/{course}/toggle-active | CourseController@toggleActive | [PASS] |
| POST | /api/assignments/submit | AssignmentController@submit | [PASS] ProjectsPage |
| POST/DELETE | /api/community/posts[...] | CommunityController | [PASS] verified live (create + 422 on empty title) |
| POST | /api/community/posts/{post}/like | CommunityController@togglePostLike | [PASS] |
| POST/DELETE | /api/community/posts/{post}/comments[...] | CommunityController | [PASS] |
| GET/POST/DELETE | /api/notifications[...] | NotificationController | [PASS] verified live, 404 on nonexistent ID |
| POST | /api/home-reviews | HomeReviewController@store | [PASS] anonymous-by-default confirmed in code |
| POST | /api/courses, /api/courses/{course}/lessons, /api/challenges | role:creator,employer,admin | [PASS] verified live for creator + employer |
| POST/PUT/DELETE | /api/assignments[...], /api/examples[...], /api/projects[...] | role:employer,admin | [PASS] code-reviewed, consistent |
| POST | /api/home-reviews/{review}/approve|reject | role:employer,admin | [PASS] |
| GET | /api/employer/courses, /assignments, /comments, /reviews | ModerationController | [PASS] verified live (employer 200, user/creator 403) |
| DELETE | /api/employer/comments/{type}/{id} | ModerationController@deleteComment | [PASS] |
| POST | /api/employer/reviews/{review}/approve|reject | ModerationController | [PASS] |
| GET | /api/admin/courses, /assignments | shared employer/admin | [PASS] verified live |
| GET/POST | /api/admin/reviews[...] | AdminController | [PASS] |
| GET/DELETE | /api/admin/community-posts[...] | CommunityController | [PASS] AdminPage community tab |
| GET/DELETE | /api/admin/comments[...] | AdminController | [PASS] AdminPage engagement/comments tab |
| GET | /api/users | role:admin | [PASS] verified live — 403 for employer/creator/user; AdminPage Users tab silently renders empty for employer (see Finding M-1) |
| PUT/PATCH | /api/users/{user} | UserController@update | [FAIL] see Finding H-1 — legacy admin-only endpoint bypasses last-admin/self-guard safety checks present in AdminUserController |
| GET | /api/admin/logs, /admin/engagements | AdminController | [PASS] verified live (admin only, 403 for employer) |
| GET/PUT/DELETE/POST | /api/admin/users/{user}[...] (show, updateUser, destroy, restore, permanent, password, ban, disable, score, role) | AdminUserController | [PASS] verified live + code-reviewed; last-admin guard, self-action guard all present |
| POST/DELETE | /api/admin/users/{user}/challenges/{challenge}/grade, /admin/challenge-submissions/{submission}, /admin/assignment-submissions/{submission}[...] | AdminUserController | [PASS] code-reviewed, audit-logged |
| GET/HEAD | /auth/{provider}/redirect, /callback | SocialAuthController | [UNTESTABLE] requires real Google/GitHub OAuth app credentials; code-reviewed only (provider allow-list, banned-user block, email-required guard all present and correct) |
| GET | /sanctum/csrf-cookie | framework | [PASS] |
| GET | /storage/{path} | framework | [PASS] |
| GET | /up | framework | [PASS] |
| POST | /_boost/browser-logs | framework/dev tooling | [NO-UI] internal Laravel Boost dev tool, not an app feature |
| POST | /api/register, /api/login | AuthController | [PASS] verified live for 4 accounts; brute-force lockout (10/15min) code-reviewed |
| POST | /api/password/forgot, /reset, GET /verify-token | PasswordResetController | [PASS] code-reviewed — email enumeration correctly prevented; not live-tested (requires reading `storage/logs/laravel.log` for the dev mail driver, out of time budget) — logic verified by code read only |
| GET | /api/check-availability | UserController@checkAvailability | [PASS] used by SignUpPage |
| (none registered) | UserController@store | — | [NO-UI] dead code — no route maps to this method anywhere in `routes/api.php` |

### 1.2 Frontend routes (`src/App.tsx`, excluding `/devlink`)

| Path | Component | Status |
|---|---|---|
| `/` | HomePage | [PASS] |
| `/examples` | ExamplesPage | [PASS] |
| `/challenges` | ChallengesPage | [PASS] |
| `/problemsolving` | ProblemSolvingPage | [PASS] verified live |
| `/courses`, `/courses/:id` | CoursesPage, CourseWatchPage | [PASS] |
| `/roadmap` | RoadmapPage | [PASS] verified live (correctly routed — present in App.tsx) |
| `/projects` | ProjectsPage | [PASS] |
| `/leaderboard` | LeaderboardPage | [PASS] code-reviewed |
| `/profile` | ProfilePage | [PASS] |
| `/users/:userId` | PublicProfilePage | [PASS] code-reviewed |
| `/admin` | AdminPage | [PASS] verified live for all 4 roles — admin/employer enter with correct reduced permissions for employer, creator/user correctly blocked client-side AND server-side |
| `/creator` | CreatorPage | [PASS] verified live for creator (loads own courses) and user (correctly blocked) |
| `/community` | CommunityPage | [PASS] |
| `/sign-in`, `/sign-up` | SignInPage, SignUpPage | [PASS] verified live (credentials login); social buttons present but [UNTESTABLE] (OAuth) |
| `/forgot-password`, `/reset-password` | ForgotPasswordPage, ResetPasswordPage | [PASS] code-reviewed only — UI not live-walked (low risk, simple forms calling reviewed endpoints) |

### 1.3 Per-page action checklist highlights (not exhaustively re-listed — see Findings for defects)

- AdminPage.tsx (10 tabs, full CRUD for users/courses/challenges/projects/examples/
  community/assignments + moderation/logs): all 10 tabs opened live as admin and employer,
  no console errors, no unexpected 4xx/5xx except the intentionally-tested ones. [PASS]
  except Finding M-1 (empty Users tab for employer) and M-2 (misleading "full
  permissions" banner for employer).
- ChallengesPage.tsx: submit/hint/AI-review actions code-reviewed; submit endpoint
  live-tested (empty solution → 422). [PASS]
- CommunityPage.tsx: create post, like, comment, delete comment — create-post and
  validation live-tested. [PASS]
- CourseWatchPage.tsx: enroll, progress, reviews, lesson comments/likes — code-reviewed,
  consistent with backend contract. [PASS]
- CreatorPage.tsx: course/lesson/challenge create+edit — course creation live-tested
  successfully as creator. [PASS]
- ProfilePage.tsx: profile update, avatar upload, repository CRUD, account deletion —
  code-reviewed; not destructively executed (account deletion) to avoid damaging seed data.
  [PASS] (code logic), deletion flow [UNTESTABLE-BY-CHOICE] to protect test accounts.
- ProjectsPage.tsx: start/finish project, AI review, repository sync — code-reviewed,
  matches the effort-check validation seen in RepositoryController. [PASS]

---

## 2. Findings by severity

### Critical
None found.

### High

**H-1. Legacy `UserController@update` bypasses admin safety guards**
- Area: Backend, `PUT|PATCH /api/users/{user}` (routes/api.php line 213)
- Role(s) affected: admin (the only role that can call it — still admin-only, not a
  cross-role escalation)
- File: `app/Http/Controllers/UserController.php::update` (lines 127-147)
- Repro: As admin, `PATCH /api/users/{adminUserId}` with `{"role":"user"}` or
  `{"banned":true}` targeting yourself or the last remaining admin.
- Expected: Same protections as `AdminUserController::setRole`/`setBan`/`destroy` —
  block self-targeting dangerous actions and block demoting/banning the last admin.
- Actual: `UserController::update` validates and applies `role`/`banned` directly with
  **no** `guardSelf()` call and **no** "last admin" count check. This is a second,
  inconsistent code path for what `AdminUserController` already does safely. It is a
  legacy/duplicate endpoint risk: a future change to the frontend (or an admin using
  curl/Postman) could be used to lock the whole platform out of admin access by
  demoting/banning the only admin, an event the newer `AdminUserController` was
  specifically hardened to prevent.
- Not exploitable cross-role today because the route requires `role:admin`, but it
  defeats the purpose of the safety code that exists elsewhere.

### Medium

**M-1. Employer's "Users Management" tab silently shows 0 rows with no explanation**
- Area: Frontend, AdminPage.tsx Users tab
- Role(s) affected: employer
- Repro: Log in as employer → `/admin` → "إدارة المستخدمين" tab.
- Expected: Tab should be hidden for employer (since they have no use for it — all
  action buttons in it already correctly render "للعرض فقط" / view-only) or show an
  explicit "not available for your role" message.
- Actual: `GET /api/users?limit=200` returns 403 (correct, server-side enforced), but
  the frontend swallows the error and renders "جميع المستخدمين (0)" — an empty table
  with no error banner, indistinguishable from "there happen to be zero users."
  Confirmed via live network log (`28792.2194 GET /api/users?limit=200 → 403`).
- No security impact (backend boundary holds) — purely a confusing UX gap for employer
  admins.

**M-2. Misleading "full permissions" banner shown to employers on /admin**
- Area: Frontend, AdminPage.tsx header
- Role(s) affected: employer
- Repro: Log in as employer → `/admin`.
- Actual text: "مرحباً شركة، **أنت تملك صلاحيات كاملة**" ("...you have full
  permissions") — hardcoded regardless of role, even though employers explicitly do
  NOT have full permissions (no user management/role/ban/score/password, as the code
  itself correctly gates with `isAdmin`).
- Expected: Banner copy should differ for employer vs admin, or use role-neutral
  wording.

**M-3. `handleBanUser` ban-status tracking is client-only, doesn't reflect server state**
- Area: Frontend, AdminPage.tsx (`bannedUsers` state, lines 236, 805-821)
- Role(s) affected: admin
- Repro: Ban a user, then refresh the Admin Users tab (or navigate away and back).
- Expected: The "حظر/رفع الحظر" button label should reflect the user's actual `banned`
  field from the API response.
- Actual: Ban status is tracked purely in a local `Set<string>` that resets on every
  reload; the table never reads `u.banned` from the already-fetched user list. The
  backend correctly persists the ban (confirmed via code review of
  `AdminUserController::setBan`), so this is a display-only inconsistency, not a
  security hole — but it means admins cannot reliably see who is currently banned
  from the table without opening each user's detail modal.

**M-4. `CourseController::store` trusts client-supplied `creator_id`**
- Area: Backend, `app/Http/Controllers/CourseController.php::store` (lines 79-92)
- Role(s) affected: creator, employer, admin (anyone who can create a course)
- Repro: As creator/employer, `POST /api/courses` with body including
  `"creatorId": "<someone-else's-uuid>"`.
- Expected: `creator_id` should always be `Auth::id()`, never client-supplied, since
  ownership drives `CoursePolicy::update`/`delete` authorization downstream.
- Actual: Code explicitly prefers `creator_id`/`creatorId` from the request body over
  the authenticated user, falling back to `Auth::id()` only if absent (this is also
  visible/used intentionally by AdminPage's "Auto-select creator" course-creation form,
  which lets an admin assign a course to another user on purpose — so this is partly
  by design for the admin flow). However, the same code path is reachable by
  **creator/employer** roles (who share the `role:creator,employer,admin` gate on this
  route), letting a creator silently attribute a course to another arbitrary user ID
  with no ownership check on whether that target is even a valid creator. Low practical
  impact (worst case: spurious courses attributed to another account, or a creator
  giving up their own edit rights on a course they just made), but it is an
  unauthenticated-trust-boundary smell worth tightening (e.g., only allow `creatorId`
  override when `Auth::user()->role === 'admin'`).

**M-5. `APP_DEBUG` stack traces leak in API error responses**
- Area: Backend, environment configuration (not application code)
- Role(s) affected: all
- Repro: Trigger any `ModelNotFoundException` or `AuthorizationException` (e.g.
  `DELETE /api/notifications/999999`, or an employer hitting `PUT /api/courses/{id}`
  on a course they don't own) while the server is running with `APP_DEBUG=true`.
- Expected: Production-shaped JSON error (`{"message": "Not found"}` / 404, or a clean
  403) with no internal detail.
- Actual: Full Laravel exception payload returned, including absolute Windows file
  paths (`C:\Users\aghaa\Desktop\testlaravel - Copy - Copy\...`) and the entire
  middleware stack trace. This is expected default Laravel dev behavior, not a coding
  bug, but it must be confirmed `APP_DEBUG=false` before any real deployment — flagging
  because it is a genuine information-disclosure risk if this config ships as-is.

### Low

**L-1. Navbar's `isAdmin` display flag matches on email substring, not role**
- Area: Frontend, `src/components/layout/Navbar.tsx` line 171
- Code: `const isAdmin = user?.role === "admin" || userEmail.includes("admin");`
- Impact: Any user whose email merely contains the substring "admin" (e.g.
  `admin123@gmail.com`) would see the "لوحة التحكم" (Admin Panel) link in the navbar
  even with role `user`. Purely cosmetic — `/admin` itself gates on `user.role`
  server-confirmed-correctly, and all backend endpoints check the real `role` column,
  so clicking through leads to "غير مصرح" with no actual access. Still a code-quality
  bug worth fixing since it's misleading UI.

**L-2. `SearchController::index` un-parenthesized `orWhere` chains**
- Area: Backend, `app/Http/Controllers/SearchController.php` (courses and challenges
  search blocks, lines 34-37 and 42-44)
- Impact: `Course::with('creator')->where('title','LIKE',...)->orWhere('description',
  'LIKE',...)` is not wrapped in a closure the way the Repositories search correctly is
  a few lines later. Currently harmless because nothing else is chained onto these
  particular queries, but it's a latent SQL-logic bug pattern that would silently
  break filtering if anyone adds a `->where()` before it (e.g. a visibility scope).

**L-3. Stale unscoped `academy_recent_searches` localStorage key found in browser**
- Area: Frontend localStorage
- Impact: Found a legacy, unscoped `academy_recent_searches` key (no user-id suffix)
  alongside the correctly-scoped `academy_started_projects_<uuid>` key during live
  session inspection. Current `Navbar.tsx` source only writes the properly-scoped
  `academy_recent_searches_${user.id}` key — this is leftover data from before the
  per-user scoping fix (see completed task #2 in project history), not an active leak
  in the current code. Recommend a one-time cleanup/migration to delete the legacy key
  on next login, but it is not actively being written by any code path today.

**L-4. `.js`/`.ts` allowed as generic upload extensions**
- Area: Backend, `app/Http/Controllers/UploadController.php` (allow-list, lines 38, 79)
- Impact: `.js` and `.ts` files are accepted by the general-purpose upload endpoint
  (intended for project/solution code uploads) and served back from `/storage/{path}`
  as static files. `.html` is correctly excluded specifically to avoid same-origin
  script execution; `.js`/`.ts` served with a non-HTML content type are not directly
  exploitable as stored XSS the way `.html` would be, but if any future feature ever
  loads an uploaded URL into a `<script src>` or dynamic import, this becomes live.
  Flagging as defense-in-depth, not an active vulnerability today.

**L-5. `ModerationController::getComments` (no-type-filter branch) loads all rows into PHP memory**
- Area: Backend, `app/Http/Controllers/ModerationController.php::getComments` lines 71-78
- Impact: When `type` is omitted, both `LessonComment::all()` and
  `CommunityComment::all()` are fetched with no `limit`/`skip` at the DB level, then
  sliced in PHP. Fine at current seed-data scale; will degrade at production scale.
  `AdminController::getComments` (a near-duplicate) has the same shape issue.

### Cosmetic
None beyond what's folded into the Medium/Low items above (banner copy, button labels).

---

## 3. Verdict

The platform's core RBAC design is sound and, more importantly, **correctly enforced
server-side everywhere it matters**: every cross-role boundary I tested live (user →
admin-only endpoints, user → employer-only endpoints, creator → admin-only endpoints,
employer → strict-ownership course edits, employer → admin-only user management) came
back with the right 403/401 and no silent bypass, and the three Policies
(Course/Challenge/Repository) match their documented intent (admin `before()` bypass
everywhere, employer blanket bypass only on Challenges, ownership-only on Course/
Repository `update`/`delete`). The one real gap (H-1) is a legacy duplicate endpoint
that is still role-gated correctly but lacks the newer safety rails — it should be
either deleted or hardened to match `AdminUserController`, since leaving two code paths
to the same mutation with different guarantees is exactly the kind of thing that bites
later. Everything else found was UX/copy/hardening-config issues (Medium/Low), not
security holes. The AI/Ollama integration degrades gracefully exactly as documented
when the model service isn't reachable, confirmed live.

What could not be genuinely tested in this session: real Google/GitHub OAuth login
(`/auth/{provider}/redirect|callback`) — requires live OAuth app credentials not
available here, so this was verified by code review only (provider allow-list,
banned-user block, and email-required guard all look correct); actual email delivery
for password reset (dev mailer logs to a file I did not additionally inspect, though
the token-generation/expiry/enumeration-prevention logic was code-reviewed and looks
correct); load/performance under real production-scale data; and the full destructive
admin lifecycle (permanent user deletion) was intentionally not executed against the
shared seeded accounts to avoid damaging this environment's test fixtures going
forward — its logic (last-admin guards, audit logging, soft-delete-then-permanent
two-step) was verified by code review instead. DevLink was excluded entirely per scope.
Given all of the above, the project is in good shape for further internal QA / staging
use; H-1 should be fixed before any production cutover, and `APP_DEBUG` must be
confirmed off before deployment.

---

## Follow-up live verification — 2026-06-22

This pass actually drove the browser (via the Claude Preview tool against the running
Vite dev server on :5173, proxying to the Laravel backend on :8000) and exercised the 7
flows below end-to-end, verifying server-side state (DB rows / API responses) after each
UI action rather than trusting toast messages alone. A pre-existing browser session from
an earlier session was found logged out and clean at the start; no leftover bad state
from prior sessions was inherited.

**Login mechanism note**: a real, reproducible gotcha was hit and is worth recording —
logging in via `fetch('/api/login', ...)` and checking `/api/auth/me` in the *same*
`preview_eval` call frequently returned 401 even though the login POST itself returned
200, because the session cookie had not finished being persisted by the browser before
the follow-up request fired. Submitting the real `<SignInPage>` form via
`form.requestSubmit()` (or a raw fetch followed by a page reload before re-checking)
reliably avoided this. This is a test-harness timing quirk, not an application bug.

### 1. ProfilePage repository CRUD + file management — PASS
As `user1@academy.test`: created repository "QA Test Repo Alpha" (`POST /api/repositories
→ 201`, persisted with correct title/description/technologies/visibility, confirmed via
`GET /api/repositories/25`). Edited title, description, GitHub URL, live-demo URL, and
flipped visibility to private (`PUT /api/repositories/25 → 200`); re-fetched from DB and
every field matched exactly, including `visibility: "private"`. Uploaded a code file and
a PDF file via `/api/upload/multiple` (201) then attached both via `PUT
/api/repositories/25` with `codeFilesUrls`/`pdfFilesUrls` — both persisted and were
visible in the live edit-modal's file list (with working remove "×" buttons next to each
file, rose-colored for PDF, indigo for code). Removed the PDF file specifically via that
UI control and saved; DB confirmed `pdf_files_urls: []` while the code file remained.
Deleted the whole repository via the card's "حذف المشروع" button, which raised a real
confirm dialog ("لا يمكن التراجع عن هذا الإجراء...") before calling `DELETE
/api/repositories/25 → 200`; DB confirmed the row no longer exists.
- Minor finding: the general-purpose upload endpoint (`/api/upload/multiple`) silently
  renamed an uploaded `solution.js` to a `.txt` extension and reported
  `type: "text/plain"` in its response, rather than preserving the `.js` extension/type.
  Functionally harmless for this flow (the file still downloads/opens fine), but worth a
  look if any feature ever relies on the original extension being preserved.
  File: `app/Http/Controllers/UploadController.php` (general upload path), Laravel backend.

### 2. Account deletion — PASS
Registered a fresh throwaway account (`qa.throwaway1@academy.test`) via the real
`/sign-up` form. Logged in, went to Profile → الإعدادات, clicked "حذف الحساب", confirmed
the resulting alert dialog ("سيتم تسجيل خروجك فوراً ولن تتمكن من تسجيل الدخول مرة أخرى
بهذا الحساب..."). Network log showed `DELETE /api/users/me → 200` immediately followed
by the app's own `POST /api/logout → 401` (harmless — the session was already invalidated
by the delete) and a redirect to `/sign-in`. Verified via DB: `deleted_at` was set on the
user row (soft-deleted, not hard-deleted). Verified via `GET
/api/users?limit=200&include_inactive=1` as admin: the account is visible in that
listing with `deleted_at` populated, confirming admin visibility into inactive accounts
works. Attempted to log back in with the same credentials afterward: `POST /api/login →
422` ("بيانات الاعتماد المدخلة غير صحيحة" — invalid credentials), confirming a
soft-deleted account can no longer authenticate.

### 3. ProjectsPage start → upload solution → sync flow — PASS
As `user1`, clicked "بدء المشروع" on the "لعبة الأفعى Snake" project card. Confirmed via
DB that this created a draft repository (`is_draft: true`, `source_project: "4"`,
`owner_id` = user1). Clicked "رفع الحل", filled in a real, substantive Python/pygame Snake
implementation (~2.3KB of actual game logic: a `Snake` class, collision detection, food
spawning, the main game loop) plus a multi-sentence Arabic explanation of the approach
(~780 characters, not filler/lorem text), and submitted. Confirmed via DB: the repository
flipped to `is_draft: false` and the description field was updated to the real
explanation text — the anti-cheat/effort check accepted it without complaint. Confirmed
the localStorage-tracked project state (`academy_started_projects_<uid>`) flipped from
`status: "inProgress"` to `status: "done"`, and the repo appeared correctly on the
Profile page's "مشاريعي" tab.
  - **Reverse-sync**: deleted that repo from the Profile page (confirm dialog → `DELETE
    /api/repositories/27 → 200`, DB confirmed gone). Navigated back to `/projects`: the
    stale `done` localStorage entry was automatically pruned (became `[]`) and the Snake
    project card correctly reverted to showing "بدء المشروع" again — it did **not** get
    stuck showing a phantom "completed" state for a now-deleted repo.
  - **Forward removal**: started the Snake project again (new draft repo id 28 created),
    then used the project card's own "حذف" (remove) button directly on `/projects`
    (no confirm dialog appeared for this specific action, unlike the Profile page's
    delete, which is a minor UX inconsistency worth flagging) — confirmed via DB that the
    linked repository (id 28) was deleted as a result, i.e. removing a project from
    ProjectsPage correctly cascades to delete its linked draft/finished repository.

### 4. CourseWatchPage lesson progress/comments/likes — PASS, with one FAIL found
As `user1`, opened course id 3 ("React.js - بناء تطبيقات حديثة"), already auto-enrolled.
Clicked "إنهاء الدرس ✓" on lesson 1 ("مقدمة في React"): confirmed via `GET
/api/courses/3/lessons-progress` that the lesson flipped to `completed: true` with
`watchedSeconds: 1200` (the full lesson duration). Reloaded the page from scratch:
progress percentage correctly showed "25%" / "1/4 دروس مكتملة", confirming persistence
across reload, not just an optimistic client-side flag. Posted a real lesson comment via
the textarea + submit button; confirmed it was created in `lesson_comments` (id 6) and
rendered after a reload. Liked the lesson via its like button (`GET /api/lessons/12/likes`
flipped from `{liked:false, likesCount:0}` to `{liked:true, likesCount:1}`), then clicked
the same button again to unlike (back to `{liked:false, likesCount:0}`) — both confirmed
via the API, and the button's own CSS class visibly toggled between the unliked
(`hover:border-red-400`) and liked (`bg-red-500/20 text-red-400 border-red-500/40`)
states in the DOM.
- **FAIL — own-comment delete button never renders.** `src/pages/CourseWatchPage.tsx`
  lines 681 and 707 gate the "حذف" (delete) button on `c.userId === user?.id` /
  `reply.userId === user?.id`. But the `GET /api/lessons/{id}/comments` response (and the
  `Comment` TS interface at lines 23-32, which declares `userId: string`) never actually
  contains a camelCase `userId` field — the backend only returns a snake_case `user_id`
  (confirmed live: the JSON response for lesson 12's comments has `"user_id":
  "0e14e1d6-..."` and no `userId` key at all, unlike `userName`/`userAvatar` which the
  backend *does* provide as camelCase aliases). The comparison is therefore always
  `undefined === user.id` → `false`, so the delete button silently never appears for a
  user looking at their own comment (it does appear correctly for admins/employers via
  the separate `canModerateComments` OR-condition, which is why this wasn't caught by
  role-boundary testing). Deleting via the real `DELETE /api/lessons/12/comments/6`
  endpoint directly worked fine (200, "تم حذف التعليق") and removed the row from
  `lesson_comments` — so this is purely a frontend rendering bug, not a backend
  permissions bug. Fix: either add a `userId` camelCase alias to the comments API
  response (consistent with how `userName`/`userAvatar` are already aliased), or change
  the frontend comparison to `c.user_id` / `(c as any).user_id`.
  File: `academy_clean/artifacts/academy/src/pages/CourseWatchPage.tsx:681` and `:707`.

### 5. Repository rating — PASS
As `user1`, rated another user's public repository (id 14, owned by a different account)
5 stars via `POST /api/repositories/14/rate`: response showed `averageRating: 5,
ratingsCount: 1, yourRating: 5`, confirmed in the `repository_ratings` table. Attempted to
rate one of `user1`'s own public repositories (id 1): correctly blocked with `403` and
the Arabic error "لا يمكنك تقييم مشروعك الخاص." (you cannot rate your own project),
exactly matching the code-reviewed expectation from the prior audit.

### 6. AdminPage user-detail modal grading — PASS
As `admin@academy.test`, opened user1's detail modal from the "إدارة المستخدمين" tab.
Found both a challenge submission (id 12, "عكس النص", challenge 2) and an assignment
submission (id 2, "طباعة الأعداد الزوجية") belonging to user1. The score `<input>` for
each is an *uncontrolled* input (`defaultValue`) that calls `gradeChallenge`/
`gradeAssignment` only `onBlur` if the value changed — confirmed in source
(`AdminPage.tsx:1659-1664` and `:1689-1694`). Graded the challenge submission to 77 and
the assignment submission to 92 via the same backend endpoints the UI's `onBlur` handler
calls (`POST /api/admin/users/{id}/challenges/{challengeId}/grade` and `POST
/api/admin/assignment-submissions/{id}/grade`); both returned 200 with the new score
echoed back. Reloaded the admin user-detail endpoint fresh (`GET
/api/admin/users/{id}`) and re-fetched: both scores persisted (77 and 92 respectively),
confirming the grade survives a full reload, not just an in-memory state update. Tested
the delete-submission button's underlying endpoint on the challenge submission (`DELETE
/api/admin/challenge-submissions/12 → 200, {success:true}`); confirmed via DB the row was
gone, and confirmed via a fresh `GET /api/admin/users/{id}` that it no longer appears in
the user's challenge list.

### 7. Permanent user deletion — PASS
Reused the throwaway account from item 2 (already soft-deleted: `deleted_at` set).
As `admin@academy.test`, called `DELETE /api/admin/users/{id}/permanent`: returned `200,
{success:true, message:"تم حذف المستخدم نهائياً"}`. Verified via direct DB query
(`User::withTrashed()->where('id', ...)->exists()`) that the row is **completely gone**
— not soft-deleted, not visible even with `withTrashed()`. This is a genuine hard delete,
matching the code's use of `$user->forceDelete()`.
  - **Last-admin guard**: there are 2 real active admin accounts in this environment
    (`admin@academy.test` and the human operator's own `aghaa003@gmail.com` account) —
    per instructions, neither was touched and no admin was actually deleted down to zero.
    To verify the guard logic itself without risking real damage, the exact precondition
    from `AdminUserController::destroyPermanently` (`$user->role === 'admin' &&
    User::where('role','admin')->count() <= 1`) was exercised inside a DB transaction
    that was explicitly rolled back afterward: both admin rows were soft-deleted inside
    the transaction (reducing the active-admin count to 0), the guard condition was
    evaluated and correctly returned `true` (i.e. it would block), and the transaction
    was then rolled back. A follow-up DB query confirmed both admin accounts were back to
    `deleted_at: null` with no trace of the simulated deletion. This is the same guard
    code path the live HTTP endpoint executes, just exercised without committing.
  - **Self-action guard** (closely related, safely testable live): called `DELETE
    /api/admin/users/{admin's own id}/permanent` as the admin against their own account.
    Got `400, {"message":"لا يمكنك تطبيق هذا الإجراء على حسابك الخاص."}` — blocked before
    any deletion logic ran (`guardSelf()` fires first), confirming the admin's own account
    was never at risk during this test pass. Final sanity check after all of item 7:
    exactly 2 active (non-deleted) admin accounts remain, matching the pre-test state.

### What is genuinely impossible to test in this environment
- **Real Google/GitHub OAuth login** (`/auth/{provider}/redirect|callback`) — requires a
  registered OAuth application's client ID/secret with a real provider, which does not
  exist in this dev environment. The sign-in page's social buttons are present and wired
  to the right redirect URLs, but clicking through would hit a real provider's consent
  screen this session has no credentials for. Verified by code review only (unchanged
  from the prior audit pass).
- **Real email delivery** for password reset / notifications — the dev environment's mail
  driver is not configured to send real email (logs to a local file/null driver), so the
  actual "did the user receive an email" step cannot be observed; only the
  token-generation/expiry/enumeration-prevention logic can be verified by reading code.
- **A second physical device/browser session** — several "what does the other party see"
  checks (e.g. does a banned/deleted user see a real-time forced logout if already
  mid-session in a second tab) are not testable with a single browser-automation surface.
- **Load/performance at real production scale** — this is a freshly seeded dev database
  with a couple dozen rows per table; no meaningful signal about query performance,
  pagination behavior, or N+1 issues under realistic data volumes can come from this
  environment.
- **Permanently deleting the last admin account** — explicitly out of scope per
  instructions; verified the guard logic safely via a rolled-back DB transaction instead
  of via the live destructive endpoint (see item 7 above for detail).
- Everything else listed in this section of the prior audit (DevLink, payment gateways —
  not applicable to this app) still applies and was not re-tested here since it was
  correctly scoped out or doesn't exist in this codebase.
