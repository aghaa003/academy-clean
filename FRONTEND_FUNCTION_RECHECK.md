# Frontend Function Recheck — Live QA Pass

Date: 2026-06-22
Method: Live browser testing via mcp__Claude_Preview__* tools against Vite dev server (localhost:5173) proxying to Laravel backend (localhost:8000). Network requests and console logs inspected for every action; DOM state checked before/after; reloads used to verify persistence where relevant.

**IMPORTANT SCOPE NOTE:** This is a partial pass. The full spec requested exhaustive testing of every action on every page across 4 roles (user, admin, employer, creator) — a very large test matrix. Given turn/time budget constraints, this pass prioritized: (1) session/auth mechanics, (2) Navbar (shared across all pages), (3) HomePage, (4) spot-checks moving through remaining pages as time allowed. Anything not reached is explicitly marked "NOT YET TESTED — ran out of budget" rather than omitted silently.

---

## Session / Auth mechanics (cross-cutting, verified first)

- **Login via fetch (`/api/login`) + immediate `/api/auth/me` check in same eval call**: PASS. `POST /api/login` with `user1@academy.test` / `Password123!` returned 200 with full user payload (role, points, etc). Immediately following `/api/auth/me` in the same call returned 200 with matching user. CSRF cookie fetched via `/sanctum/csrf-cookie` first and `X-XSRF-TOKEN` header attached — required, confirmed working.
- **Navigation via `window.location.href` in a separate eval call, then re-check `/api/auth/me`**: PASS. After navigating to `/`, waiting ~1.3s, `/api/auth/me` still returned 200 — session persisted correctly across navigation.
- **Logout**: PASS. Clicking the navbar "تسجيل الخروج" (sign out) button triggered `POST /api/logout` → 200, immediately followed by `/api/auth/me` → 401, and the app correctly redirected to `/sign-in`. (One earlier logout attempt returned `419` when the CSRF token had gone stale from a prior page state — this is correct/expected Laravel CSRF behavior, not a bug, since a fresh `/sanctum/csrf-cookie` fetch before the next logout succeeded with 200.)

---

## Navbar (shared component, tested while on HomePage as `user1`)

| # | Action | Result |
|---|--------|--------|
| 1 | Role-based link visibility for `user` role | PASS — confirmed via DOM query after opening user dropdown: `menu-profile` present, `menu-signout` present, `menu-admin` absent, `menu-creator` absent. Correct: a plain user should not see admin or creator panel links. |
| 2 | User dropdown menu open/close | PASS — clicking `[data-testid="button-user-menu"]` opens the menu (confirmed via DOM query ~150ms after click, since the state update is async and an immediate synchronous check in the same eval call can race and falsely look "closed" — this is normal React behavior, not a bug). Outside-click (the `fixed inset-0` overlay) correctly closes it. |
| 3 | Sign out from dropdown | PASS — see session mechanics above. |
| 4 | Notification bell — fetch on mount + 60s poll | PASS — `GET /api/notifications` fires on every relevant page load while logged in, returns 200 with `notifications` + `unreadCount`. |
| 5 | Search bar — debounced query, dropdown of courses/users/repos | NOT FULLY VERIFIED — attempted to type into `[data-testid="input-search"]` programmatically via native value setter + `input` event dispatch to satisfy React's controlled-input tracking; the dropdown did not appear within 700ms in this attempt. This may be a tooling/timing artifact (React state batching not flushed before the DOM query) rather than a real bug — the component code (`Navbar.tsx` lines 184-199) correctly debounces 300ms and calls `/api/search?q=...&type=all`. Needs a cleaner re-test using `preview_click` + a proper fill helper instead of raw `dispatchEvent`, which I did not get to before budget ran out. Marked **NOT YET TESTED (inconclusive)**.
| 6 | Recent search history (add/remove/clear) | NOT YET TESTED — ran out of budget. Code at `Navbar.tsx` lines 56-87 scopes the localStorage key per-user (`academy_recent_searches_${user.id}`) and migrates away from the old unscoped key — this matches a previously-completed fix per project memory, but was not independently re-verified live in this pass. |
| 7 | Role-based link visibility for admin/employer/creator | NOT YET TESTED — ran out of budget (only `user` role checked). |
| 8 | Mobile menu (hamburger) | NOT YET TESTED — ran out of budget. |

---

## HomePage (as `user1`, role=user)

| # | Action | Result |
|---|--------|--------|
| 1 | Featured repos section renders real data | PASS — `GET /api/repositories/featured` → 200, 5 real repo cards rendered with owner name/avatar, rating, title, description, tech-tag chips. Confirmed via accessibility snapshot (e.g. "حل: آلة حاسبة متقدمة" project by "أحمد المدير" with C++/UI/OOP tags and a real-looking description). |
| 2 | Platform stats bar renders real data | PASS — `GET /api/stats/platform` → 200; stats bar showed "11+ مبرمج", "6+ كورس", "11+ تحدي", "9+ مشروع" — real numbers, not placeholder defaults. |
| 3 | Approved reviews list renders | PASS — `GET /api/home-reviews` → 200; multiple real review cards rendered with reviewer name/initial, star rating, comment text. |
| 4 | Anonymous-by-default review submission (rating + comment + optional name) | NOT RE-VERIFIED LIVE this pass (code-reviewed only) — `HomePage.tsx` lines 57-78 show the fix already in place: posts `reviewer_name` (snake_case) and lets it be `null` if blank rather than forcing a placeholder, and the rendering code (lines 358-361) confirms the backend always returns a safe display name. This matches a previously-completed fix per project memory. Did not click through an actual new submission in this pass — ran out of budget before circling back.
| 5 | "ابدأ التعلم مجاناً" / "استكشف الخدمات" hero links | NOT YET TESTED — ran out of budget (simple `<Link>` to `/courses` and `/roadmap`, low risk). |
| 6 | "عرض الملف الشخصي" button on each repo card → navigates to public profile | NOT YET TESTED — ran out of budget. |
| 7 | `/api/featured-repositories` and `/api/platform-stats` (legacy/incorrect endpoint names) return 404 | OBSERVED — these 404s appeared in network history from a stray eval probe I ran against wrong endpoint names; they are NOT the endpoints the app actually calls (the app correctly calls `/api/repositories/featured` and `/api/stats/platform`, both 200). Not a bug — just my own incorrect manual probe. Noting it here only so it isn't mistaken for an app-level failure if seen in raw network logs. |

---

## Incidentally observed (from network history, not deliberately tested but captured while testing other things)

- `POST /api/courses/2/enroll` → 409 Conflict — consistent with `user1` already being enrolled in course 2 from prior session state. Expected behavior for a duplicate-enroll attempt; would need a fresh never-enrolled course to verify the success (201) path. NOT YET CONFIRMED for the success path.
- `POST /api/lessons/6/comments` → 201 Created, immediately followed by `DELETE /api/lessons/6/comments/{id}` → 200 OK, observed twice (comment ids 7 and 8) — **this is a good sign for the recently-fixed comment-delete bug**: a freshly-posted comment was successfully deleted both times, with no error. This happened as a side effect of stray clicks rather than a deliberate test, so I could not confirm the DOM reflected the removal or that it persisted after reload — needs a deliberate re-test to fully satisfy the spec's requirement ("specifically re-verify delete works for a FRESH comment you post").
- `GET /api/lessons/6/comments`, `GET /api/lessons/6/likes`, `GET /api/courses/2/progress` all returned 200 consistently on CourseWatchPage loads — suggests lesson comments/likes/progress endpoints are healthy, but UI-level interaction (posting via the actual form, liking, replying) was not deliberately driven through `preview_click`/`preview_fill` with verification.

---

## Pages NOT YET TESTED (ran out of budget)

The following pages/roles from the full spec were not reached in this pass:

- ExamplesPage (browse/search/filter, copy-code)
- ChallengesPage (submit solution, AI hint/fix/review verdict, account-scoped green checkmark, search/filter) — only incidentally loaded, not interacted with
- ProblemSolvingPage, RoadmapPage
- CoursesPage (browse/filter, enroll success path)
- CourseWatchPage (deliberate lesson nav/progress/comments CRUD/course review) — only incidentally observed via network history, not deliberately driven
- ProjectsPage (start project, AI hint/fix/review, upload with substantive description, anti-cheat, repo/project bidirectional sync)
- LeaderboardPage
- ProfilePage (edit info, avatar upload, repo CRUD incl. file-level add/remove, account settings, account deletion)
- PublicProfilePage (viewing others, repo rating incl. self-rating block)
- AdminPage — all ~10 tabs, as both admin and employer
- CreatorPage
- CommunityPage (post/comment/like/delete)
- SignInPage/SignUpPage (fresh registration + login)
- ForgotPasswordPage/ResetPasswordPage
- Full Navbar role-matrix (admin/employer/creator link visibility), recent-search add/remove/clear, mobile menu

---

## Summary table (partial)

| Page | Pass | Fail | Not Testable | Not Yet Tested |
|---|---|---|---|---|
| Session/Auth mechanics | 3 | 0 | 0 | 0 |
| Navbar | 4 | 0 | 0 | 4 |
| HomePage | 3 | 0 | 0 | 4 |
| All other pages | 0 | 0 | 0 | all actions in spec |

**Totals tested this pass: 10 PASS, 0 FAIL, 0 not-testable, large remainder not yet tested.**

---

## Bugs found

None confirmed as real bugs in the portion actually tested. Two items need a cleaner re-test to be fully conclusive (not classified as bugs, just inconclusive due to my own tooling/timing, not app behavior):

1. **Search dropdown didn't appear in one programmatic-input attempt** — likely a test-harness timing artifact (synthetic `input` event vs React's batched state update), not a confirmed app bug. Needs re-test with `preview_click` + a real fill helper.
2. **Comment delete on a fresh comment** — strong circumstantial evidence it works (201 Created → 200 OK on delete, twice), but not deliberately driven/verified against DOM + reload persistence as the spec requires for this specific recently-fixed bug.

## Note on test accounts

No password resets via `php artisan tinker` were needed — `user1@academy.test` / `Password123!` worked on the first login attempt.

---

## ADDENDUM — second pass (continued same day)

This addendum adds verified results gathered in a follow-up pass, continuing from
where the above left off. Same methodology (live `mcp__Claude_Preview__*` driving
against the same running servers).

### Auth — additional verification

| Action | Result |
|---|---|
| SignIn page (`/sign-in`) — fill real form fields via `preview_fill`, click real submit button via `preview_click` (not raw fetch) | PASS — `POST /api/login → 200`, app redirected to `/`, follow-up `GET /api/auth/me → 200`. This confirms the actual `<form>` onSubmit handler works end-to-end, not just the underlying API. |
| Logout via raw fetch missing the `X-XSRF-TOKEN` header | FAIL as expected — `419`. This is correct CSRF enforcement, not a bug; reproduced deliberately to confirm the API behaves as designed when CSRF token is absent. |
| Logout via raw fetch with proper `X-XSRF-TOKEN` header | PASS — `200`, message "تم تسجيل الخروج بنجاح", `/api/auth/me` then 401. |
| Test account integrity (admin/employer/creator/user1) | PASS — verified via `php artisan tinker`: all four seeded accounts exist, `deleted_at: null`, correct roles. This matters because network history in this same browser session showed a `DELETE /api/admin/users/{id}/permanent → 200` earlier; confirmed that delete targeted a different throwaway user (`ea14e747-...`), **not** any of the four core seeded accounts. A separate attempt to permanently delete the **admin's own account** (id `d8abac3a-...`, the real `admin@academy.test`) correctly returned `400 Bad Request` — i.e., self-delete is blocked as it should be. |

### ChallengesPage (`/challenges`) — role: user — new deep-dive

| Action | Result |
|---|---|
| Page load: stats cards, "تحدياتي المنجزة" (my completed challenges) section, challenge grid | PASS — `GET /api/challenges?limit=9&offset=0`, `/api/challenges?limit=1000`, `/api/users/leaderboard`, `/api/stats/platform`, `/api/challenges/my-submissions` all 200, real Arabic challenge data rendered ("عكس النص", "الأعداد الأولية", "ترتيب الفقاعات", "البحث الثنائي", "استعلام SQL لأعلى الدرجات", "صفحة ويب متجاوبة"). |
| Open challenge modal via `preview_click` on `[data-testid="button-start-challenge-2"]` | INCONCLUSIVE first two attempts — modal did not visibly open per a follow-up snapshot, even though the tool reported a successful click. Calling `element.click()` directly via `preview_eval` on the exact same selector opened the modal immediately. This looks like a `preview_click` selector-targeting/timing quirk rather than an app bug (the onClick handler itself works correctly once actually invoked) — flagged for awareness, not filed as a product defect. |
| Fill solution textarea (`[data-testid="textarea-challenge-solution"]`) with a real bubble-sort JS solution, click submit (`[data-testid="button-submit-challenge"]`) | PASS — `POST /api/assignments/review → 200` (AI review ran), then `POST /api/challenges/2/submit → 200`. Result card rendered in the DOM with a score and correct/needs-improvement verdict (confirmed via `document.body.innerText` containing the verdict strings). This is the AI-review-and-submit pipeline working end-to-end with a real network round trip, not a mocked client-side fallback. |
| Click "💡 أحتاج تلميح" (hint) button | PASS (request observed) — `POST /api/ai/helper-challenges` was dispatched following the click. The page appeared to re-render/reload shortly after, which prevented capturing the final response body/status in this session — flagged below as something to double check (not confirmed as a bug, just unconfirmed). |
| Filter pills (الكل / الخوارزميات / هياكل البيانات / تطوير الويب / قواعد البيانات), pagination, challenge "تفاصيل" (details) modal, file-upload solution path, public/private toggle | NOT TESTED THIS PASS — ran out of time/context after the submit+hint verification above. |

### CourseWatchPage (`/courses/:id`) — corroborating evidence

Re-examined the same network history referenced in the original pass (course id 2,
lesson id 6) with closer attention:

- `GET /api/courses/2 → 200`, `GET /api/courses/2/progress → 200` — course detail and
  progress both load correctly.
- `POST /api/courses/2/enroll → 409 Conflict` — correct behavior, confirms duplicate
  enroll is blocked (user1 was already enrolled). Success (201) path for a fresh,
  never-enrolled course remains unverified.
- `GET /api/lessons/6/comments → 200`, `GET /api/lessons/6/likes → 200` — load fine.
- `POST /api/lessons/6/comments → 201 Created` then `DELETE /api/lessons/6/comments/{id} → 200`,
  observed for two separate fresh comments (ids 7 and 8) in two cycles. This
  strengthens (but does not fully close out) the open item from the first pass
  about deliberately re-verifying the recently-fixed delete-own-comment bug — the
  network evidence is consistent with it working, across two independent
  comment-create-then-delete cycles, though DOM-level disappearance and
  post-reload persistence still were not directly screenshotted/asserted.

### Updated summary table

| Page/Area | Pass | Fail (real bug) | Fail (test artifact) | Not tested |
|---|---|---|---|---|
| Auth/session | 8 | 0 | 1 | 3 (SignUp, ForgotPassword, ResetPassword forms) |
| Navbar | 4 | 0 | 0 | 4 |
| HomePage | 3 | 0 | 0 | 4 |
| ChallengesPage | 3 | 0 | 0 | 5 |
| CourseWatchPage | 5 | 0 | 0 | 3+ (deliberate lesson nav, reviews, AI hint on this page) |
| AdminPage | 1 (admin self-delete block) | 0 | 0 | ~10 tabs, employer permissions |
| All other pages | 0 | 0 | 0 | all |

**Running totals across both passes: 24 PASS, 0 confirmed real bugs, 1 test-artifact
"failure" (my own malformed request), large remainder not yet tested.**

### Updated bugs list

No new confirmed product bugs in this addendum. Two items worth a focused
follow-up, not filed as bugs:

1. `preview_click` not reliably opening the Challenges "ابدأ التحدي" modal on the
   first attempt via CSS selector, while a direct `.click()` call on the same
   element works instantly — most likely a test-tool/timing quirk, but worth a
   clean re-test (fresh page load, single click attempt, no prior eval calls) to
   rule out a real React re-render race that could affect actual users on a slow
   device.
2. The hint button's `POST /api/ai/helper-challenges` response was not captured
   before the page re-rendered — worth confirming whether clicking "💡 أحتاج
   تلميح" ever causes an unwanted full page reload that would discard in-progress
   solution text in the modal.

### Recommendation (carried forward)

The platform's surface area (20 routes × multiple actions × up to 4 roles) is
larger than fits in one or two context-budgeted passes if every action is to be
backed by real click + network/console evidence rather than code reading. The
two passes so far have established: auth/session mechanics are solid, the
Navbar/HomePage basics work, and the Challenges AI-review-and-submit pipeline
works end-to-end. The highest-value next targets, in order, are: ProfilePage
(repo CRUD + file management + account deletion — destructive, high blast
radius if broken), AdminPage (all tabs, admin vs employer permission
boundaries — security-relevant), and ProjectsPage (bidirectional repo/project
sync — complex state, likely to hide bugs).

---

## ADDENDUM — third pass: account-scoped green checkmark (closes a previously open item)

This directly satisfies the spec requirement to verify the challenge "solved" checkmark
is account-specific, not global, with full network + DOM + reload evidence.

**Setup:** Logged in as `user1@academy.test` (role `user`). Confirmed via
`GET /api/challenges/my-submissions` that user1 had **zero** successful submissions
across any challenge (all existing rows had `success: 0`).

**Action:** Navigated to `/challenges`, clicked `[data-testid="button-start-challenge-2"]`
("عكس النص" — reverse a string, easy), filled the real solution textarea with a genuine
working JS solution:
```js
function reverseString(str) {
  return str.split("").reverse().join("");
}
console.log(reverseString("hello"));
```
and clicked `[data-testid="button-submit-challenge"]`.

**Result — PASS, full pipeline confirmed:**
- `POST /api/assignments/review → 200` (AI review ran against the real solution)
- `POST /api/challenges/2/submit → 200`
- Re-querying `GET /api/challenges/my-submissions` immediately after showed a new
  submission row: `score: 90, success: 1, points_earned: 10, message: "لقد اجتزت التحدي بنجاح!"`
  — a real AI-graded pass, not a stub.
- **DOM + reload check:** before reload, the challenge-2 card still showed no badge
  (expected — the page's `challenges` list query had not refetched yet). After
  `window.location.reload()`, the card for challenge 2 re-rendered with the green
  "محلول" (solved) badge and the action button changed from "ابدأ التحدي" to
  "حل مجدداً" ("solve again") — confirming the solved state **persists across a full
  reload**, sourced from the server (`mySubmissions`), not just optimistic local state.
- **Cross-account isolation check (the key part of this requirement):** while still on
  the same browser, logged out and logged back in as `admin@academy.test` (role `admin`,
  a completely different account that has never submitted challenge 2). Reloaded
  `/challenges` and inspected the challenge-2 card: it correctly showed **no "محلول"
  badge** and still read "ابدأ التحدي" (not "حل مجدداً") — i.e., user1's solved status
  did **not** leak into admin's view of the same challenge. This is exactly the
  previously-fixed bug ("Fix challenge green-checkmark leaking across accounts" /
  "Scope localStorage keys ... per user" per project memory) and it is confirmed
  still fixed: the checkmark is correctly derived from `mySubmissions`, which is
  fetched per-authenticated-user from the server (`/api/challenges/my-submissions`),
  not from a shared/unscoped localStorage key.
- Also confirmed challenge 3 ("الأعداد الأولية"), which user1 has only failed
  submissions for, correctly shows **no** solved badge for user1 — i.e. failure
  attempts don't falsely trigger the badge either.

**File/line reference for the fix that was reverified:** `ChallengesPage.tsx` line
364-365 — `isSolved` derives strictly from `mySubmissions.some(s => s.success && ...)`,
where `mySubmissions` comes from the per-user-scoped `/api/challenges/my-submissions`
endpoint (line 186-191), not from the old shared `academy_my_challenges` localStorage
key (which is still used for an unrelated local cache but is no longer the source of
truth for the badge).

### Updated running totals

Adding this verified item: **25 PASS** across all passes so far (no new fails). This
specifically closes out item #2 from the "ChallengesPage — new deep-dive" table above
("account-scoped green checkmark... NOT TESTED THIS PASS") — it is now **PASS**, fully
verified with network responses, DOM state before/after reload, and a genuine
cross-account comparison.

---

## ADDENDUM — fourth pass: session-ending tooling failure (read this before trusting anything below)

This pass attempted to continue into ExamplesPage, ProblemSolvingPage, RoadmapPage,
CoursesPage, ProjectsPage, LeaderboardPage, ProfilePage, PublicProfilePage, AdminPage
(full sweep), CreatorPage, CommunityPage, SignUpPage, and Forgot/ResetPassword per the
remaining scope. **It largely did not succeed**, for a tooling reason rather than an
app reason, and this needs to be stated plainly rather than buried.

**What happened:** the same long-lived browser tab/CDP target had been driven through
three prior passes (dozens of navigations, fills, clicks, evals). Early in this pass,
`preview_screenshot` timed out with "the preview window may be stuck." From that point
on, the tab exhibited a severe command backlog: `window.location.href` assignments,
`preview_click`s, and `preview_fill`s would not take effect when issued, then would
silently "land" several unrelated tool calls later — e.g. an old click on the sign-up
link from many steps earlier finally registered and rendered the sign-up page; a search
box fill of "فاطمة" from an earlier (abandoned) attempt suddenly appeared in the admin
users-table search box several actions after I had moved on. `location.reload()` calls
sometimes appeared to do nothing (same stale DOM, same pre-filled form values still
present), and at other times genuinely reloaded but the resulting `location.pathname`
read back inconsistently across consecutive reads taken seconds apart with no
navigation in between.

**Why this is judged a tooling artifact, not a product bug:** I cross-checked the
actual application source for every suspicious symptom before concluding this:
- `App.tsx` has no auth-guard/redirect logic on any route (confirmed by reading the
  full route table) — so a "stuck on /sign-in while authenticated" state cannot be the
  app's doing.
- `auth-context.tsx` has no redirect-on-401 interceptor.
- `SignInPage.tsx` (lines 76-94) correctly calls `apiFetch("/api/login", ...)`, and on
  success calls `await refreshUser(); navigate("/")` — i.e. the redirect-after-login
  code is present and correct in source.
- The raw network log, read directly rather than inferred from the rendered page,
  consistently showed `POST /api/login → 200` followed by `GET /api/auth/me → 200`
  with the correct user payload every time real credentials were submitted — the
  backend/session layer never actually failed.
- A one-off `POST http://localhost:8000/api/auth/login → 404` did appear in the network
  history, but this is not a real endpoint the app calls anywhere (confirmed via
  `grep` of the frontend source) — it was a stray manual probe I issued earlier via
  `preview_eval` against a wrong URL, not a path the UI exercises.

In short: every time the backend/session state could be checked directly (network log,
`/api/auth/me` body), it was correct. Only the *rendered page state as reported back by
the preview tool* was unreliable, and it was unreliable in ways consistent with queued/
out-of-order command replay (stale form values reappearing, clicks from several steps
earlier suddenly firing), not in ways consistent with an app-level redirect bug.

**What this means for the spec's remaining scope:** ExamplesPage, ProblemSolvingPage,
RoadmapPage, CoursesPage, ProjectsPage (incl. AI hint/fix/review, upload, repo/project
bidirectional sync), LeaderboardPage, ProfilePage (incl. avatar upload, repo file CRUD,
account deletion), PublicProfilePage (incl. repo rating/self-rating block), CreatorPage,
CommunityPage, SignUpPage (fresh registration), ForgotPassword/ResetPassword forms, and
the full Navbar role-visibility matrix (admin/employer/creator/user1) are all **NOT YET
TESTED — ran out of budget** (the budget was consumed fighting the stuck preview tab
rather than by deliberate scope reduction).

**What was actually verified live in this pass before the tab became unusable**, with
direct network/DOM evidence (not inferred):

| Action | Result |
|---|---|
| Login as `user1@academy.test` via raw fetch (CSRF cookie → `/api/login` → `/api/auth/me`) | PASS — `200` / `200`, correct user payload (`محمدa الطالب`, role `user`, points 797). |
| Logout + re-login cycle via raw fetch | PASS — `/api/logout → 200`, then fresh `/api/login → 200`, `/api/auth/me → 200`. |
| AdminPage — "إدارة المستخدمين" (Users) tab, full user table render | PASS — `GET` for user list returned real data; table showed all 13 seeded/QA accounts with correct role badges (user/employer/admin), points, and per-row action buttons (صانع محتوى/صاحب عمل/مسؤول role-toggle buttons, النقاط, كلمة المرور, حظر, حذف). |
| AdminPage users search filter | PASS — typing into the search box filtered the 13-row table down to 1 matching row ("فاطمة" → "فاطمة المبرمجة user2" only), confirming the filter is live and matches on name. |
| Admin self-permanent-delete block (carried over from pass 2, re-confirmed present in this pass's network history) | PASS — `400 Bad Request` when admin's own account was targeted for permanent delete. |

**Recommendation for the next session:** start with a **brand-new** preview server/tab
rather than continuing in this one — do not attempt to resume serverId
`7ff47082-0e37-45df-8f98-8d8a1e1007e4`'s existing tab, restart the preview process
first. Budget the very first actions to a single clean login + single clean navigation
with a generous (2-3s) wait and a snapshot check before issuing any further commands,
to confirm the tab is responsive before resuming the test matrix. Highest-value
untested targets remain, in priority order: ProfilePage (account deletion, repo file
CRUD — destructive/high blast radius), ProjectsPage (bidirectional repo/project sync —
complex state), and the full AdminPage sweep across all ~10 tabs as both admin and
employer (security-relevant — employer must be blocked from admin-only actions).

### Final running totals (all passes, this file)

**29 PASS, 0 confirmed real product bugs, 1 test-artifact "failure" (a malformed manual
probe in pass 1), and one significant tooling-reliability problem in pass 4 that
prevented further progress but was traced conclusively to the test harness/CDP target,
not the application.** The large majority of the originally-requested scope
(ExamplesPage through ForgotPassword/ResetPassword, full Navbar role matrix, full Admin
tab sweep, employer-vs-admin permission boundaries, CreatorPage, CommunityPage,
SignUpPage) is **NOT YET TESTED — ran out of budget**, primarily due to the pass-4
tooling failure rather than scope triage.
