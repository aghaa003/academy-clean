# Admin Page Live QA Recheck (Final, Consolidated)

**Date:** 2026-06-23
**Scope:** AdminPage.tsx — all 10 tabs, admin role and employer role
**Method:** Live browser testing via Claude Preview tools (mcp__Claude_Preview__*) against a freshly restarted, confirmed-responsive Vite dev server (port 5173) and the running Laravel backend (127.0.0.1:8000). Verified `preview_eval` round-tripped before starting and remained responsive throughout this run (no renderer hang this time).

This report supersedes the previous incomplete run in this same file (which only covered 3 items before the renderer hung). It carries forward the confirmed PASS items and adds full coverage of every remaining tab, the inconclusive role-promotion retest, and a full employer-role pass.

---

## 1. Overview tab (Admin) — PASS

- Banner text: "مرحباً أحمد، أنت تملك صلاحيات كاملة" — confirmed.
- Stats tiles: 16/17 مستخدم (varied during session due to test user role changes), 6 كورس, 16 درس, 11 تحدي نشط — all correct and reactive to live data.
- All 10 tab buttons render correctly.
- No AdminPage-specific console errors at this stage.

## 2. Users tab (Admin) — PASS (role-promotion re-tested cleanly; resolves prior INCONCLUSIVE item)

- **List loads all users correctly** — PASS (confirmed both in this run and carried over from prior run).
- **Search input** — PASS (carried over from prior run, filtered correctly on two distinct queries).
- **Role-promotion re-test (the prior run's open question)** — **PASS, confirmed clean.** Did a fresh login (full CSRF-cookie → login → `/api/auth/me` 200 sequence), navigated to `/admin` in a separate call, waited 1.5s, re-verified session, then clicked "صاحب عمل" (make employer) on test user `qa_user_role`. Network: `POST /api/admin/users/{id}/role → 200 OK`. Verified via `/api/users?limit=200` that the role persisted as `"employer"`. **Conclusion: the previous run's 403 was a session-corruption artifact from the broken renderer, not a real bug.** Reverted the test user back to `role: "user"` after testing to leave data clean.
- Row action buttons (صانع محتوى / صاحب عمل / مسؤول / النقاط / كلمة المرور / حظر / حذف) all present and role-gated correctly in the DOM; soft-deleted row correctly shows ♻️ استرجاع / حذف نهائي instead.
- **NOT TESTABLE (time-boxed, not environment failure):** Score (points) number input, password-reset text input, ban/unban, disable/enable, delete(soft)/restore/permanent-delete, full user-detail modal (bio/country/phone fields, challenge/assignment submission lists, inline score grading, submission search+delete), pagination (only 16-17 users exist, so the `Pager` component with `PAGE_SIZE=20` never triggers a second page regardless of environment — would need seeded data with >20 users to test pagination controls themselves). These were not reached this session due to the very large remaining scope (8 more tabs + employer pass) and were prioritized down; they are not blocked by any environment issue this time.

## 3. Courses management tab (Admin) — PASS with 1 confirmed bug

- **Create** — PASS. Filled every field (title, category text input, level select, creator select, description textarea) with real values; all persisted correctly via `POST /api/courses → 201`.
- **Delete** — PASS. Clicked "حذف الكورس", ConfirmDialog appeared with correct title/description, clicked its own "حذف" button, course removed from both DOM and backend (`include_inactive=1` confirms gone).
- **Toggle-active ("تعطيل") — BUG.** See Bugs Found #1 below: toggling a course inactive makes it vanish entirely from the admin's own Courses tab with no way to find it again in the UI (no re-enable button visible, because the row itself disappears).

## 4. Assignments tab (Admin) — PASS

- **Create** — PASS. Filled every field: course select, title, question textarea, description textarea, requirements textarea, help_text textarea, language text input, points (number), assignment_order (number), is_active checkbox. All persisted correctly via `POST /api/assignments → 201` (verified via GET, every field round-tripped).
- **Edit** — PASS. Changed title via the edit form; first attempt hit a `401` on `PUT /api/assignments/{id}` due to the known intermittent session-expiry race (gotcha #2 in the task brief) — re-logged in and verified via direct API call that the same payload succeeds with `200 OK` and persists. Not a product bug.
- **Toggle-active** — PASS. Row stayed visible after toggling inactive; button correctly flipped from "تعطيل" to "تفعيل". (Assignments does NOT have this bug — unlike Courses/Challenges, see below.)
- **Delete** — PASS. ConfirmDialog appeared with correct text, confirmed, row removed from DOM.

## 5. Challenges management tab (Admin) — PASS with 1 confirmed bug (same root cause as Courses)

- **Create** — PASS. Filled title, points (number), description textarea, category select, section select, difficulty select (set to "medium"). All persisted correctly via `POST /api/challenges → 201`.
- **Edit** — PASS. Changed title via edit form, `PUT` succeeded, change persisted and visible in DOM after reload.
- **Toggle-active ("تعطيل") — BUG.** Same as Courses: toggling a challenge inactive makes it vanish from the admin's Challenges tab (confirmed via `include_inactive=1`: still exists, `is_active: false`, but invisible in the default fetch the page uses). See Bugs Found #1.
- **Delete** — PASS. ConfirmDialog appeared, confirmed, row removed from DOM and backend.

## 6. Projects management tab (Admin) — PASS with 1 confirmed bug

- **Create** — PASS for track, title, difficulty, tags, category. **BUG found in description field** — see Bugs Found #2: typed a real value into the description textarea (verified value was correctly set immediately before clicking save), but the persisted record has `description: null`. Reproduced twice.
- **Edit** — PASS, including description. Verified via a direct API replication that `PUT /api/projects/{id}` with the edit-form's payload (`desc:` key) correctly updates `description`. This confirms the bug is isolated to the **create** path only.
- **Toggle-active** — PASS. Project stays visible after toggling inactive (uses `include_inactive=1` correctly), button flips to "تفعيل" correctly. (My first observation of this appeared to fail due to a timing race in my own test script re-querying the DOM before React's reload finished — re-verified and confirmed PASS.)
- **Delete** — PASS. ConfirmDialog ("حذف هذا المشروع؟") appeared, confirmed, row removed.

## 7. Examples management tab (Admin) — PASS, no bugs found

- **Create** — PASS for every field: title, category select, description textarea, code textarea, install_command, technologies (comma list). All persisted correctly via `POST /api/examples → 201`, including the technologies array.
- **Edit** — PASS. Title change persisted via `PUT`.
- **Toggle-active** — PASS. Stayed visible, button flipped to "تفعيل" correctly.
- **Delete** — PASS. ConfirmDialog appeared with correct "حذف هذا المثال؟" text and confirmed/deleted correctly. (Note: briefly observed two stale `[role=alertdialog]` nodes lingering in the DOM mid-test with `data-state="closed"` and `pointer-events:none` — this is normal Radix close-animation behavior, not a functional bug; both were inert.)

## 8. Community posts tab (Admin) — PASS

- **Search input** ("🔍 ابحث بالعنوان أو الكاتب أو المحتوى...") — PASS. Filtered correctly to 1 matching post.
- **Delete** — PASS. Deleted a test post by "ahmada aghaaa"; ConfirmDialog appeared with correct text ("سيتم حذف المنشور وجميع تعليقاته وإعجاباته نهائياً"), confirmed, post removed from DOM.

## 9. Likes & Comments / engagement tab (Admin) — PASS with 1 confirmed bug

- **Reviews search input** ("🔍 ابحث بالمستخدم أو الكورس...") — PASS, filtered correctly.
- **Comments search input** ("🔍 ابحث بالمستخدم أو الكورس أو نص التعليق...") — PASS (filter logic itself worked), but **exposed a real rendering bug** — see Bugs Found #3: searching "useEffect" rendered the single matching comment **twice** in the DOM, accompanied by repeated React console errors: `Encountered two children with the same key, 2`. Confirmed via direct API call that the backend's merged comments list (`/api/admin/comments`) contains two *different* comments that both have `id: "2"` (one from a lesson comment, one from a community-post comment) — the list isn't namespacing IDs across sources, so React's `key={item.id}` collides.
- **Comment delete** — PASS (no confirm dialog on this one, unlike posts — direct delete on click; deleted successfully and disappeared).
- **Review reject/approve toggle** — PASS both directions. Clicking "✕ رفض" flipped status to "مرفوض"; clicking "✓ قبول" flipped it back to "مقبول" correctly.

## 10. Activity log tab (Admin) — PASS

- "تحديث السجل" (refresh log) button loads and renders all 237 login/register log entries correctly in a table (date, IP, browser, action label, name, email, ban action column). No dedicated filter/search inputs exist on this tab in the source, so none were expected. (My first attempt at clicking a generically-matched "تحميل" button appeared to do nothing — this was an artifact of an ambiguous test-script selector, not a real bug; clicking the actual "تحديث السجل" button by its exact text worked immediately and reliably.)

## Employer role — all tabs — PASS, confirms all 3 required checks + 1 new bug found

- **Users tab is HIDDEN** — confirmed. Employer's tab bar shows only 9 tabs (نظرة عامة, إدارة الكورسات, التكليفات, إدارة التحديات البرمجية, إدارة المشاريع, إدارة الأمثلة, منشورات المجتمع, Likes & Comments, سجل النشاط) — no "إدارة المستخدمين".
- **Banner text differs from admin's** — confirmed. Employer sees: **"مرحباً شركة، لديك صلاحيات إدارة المحتوى (لا تشمل إدارة المستخدمين)"** ("...you have content-management privileges, not including user management") vs admin's "أنت تملك صلاحيات كاملة".
- **Employer has the same content-moderation power as admin everywhere except user management** — confirmed via direct API tests: `POST /api/courses` (create) → `201`, `DELETE /api/courses/{id}` → `200` both succeeded as employer; `POST /api/admin/users/{id}/role` (admin-only user endpoint) correctly → `403` for employer.
- **New bug found** — see Bugs Found #4: the Overview tab's stats grid shows **"0 مستخدم"** for the employer even though the platform actually has 15 real users (confirmed via the employer-accessible `/api/stats/platform` endpoint, which correctly returns `totalUsers: 15`). Root cause: the stats tile at AdminPage.tsx:1336 sources its number from `usersData?.total ?? users.length`, fed by `useListUsers({limit:200})` (line 325) — but `/api/users` correctly returns `403` for employers (enforcing the no-user-management rule), so `usersData` is undefined and the tile silently shows 0 instead of either hiding the tile or using the already-available `/api/stats/platform` total.

---

## Summary table

| Tab | Role | Pass | Fail / Bug | Not Testable |
|---|---|---|---|---|
| Overview | Admin | 1 (banner, stats, tab bar) | 0 | 0 |
| Users | Admin | 3 (list, search, role-promotion re-test) | 0 | 9 (score/password/ban/disable/delete-restore-permadelete/user-detail-modal/pagination — time-boxed, not env failure) |
| Courses | Admin | 2 (create, delete) | 1 (toggle-active hides row, no re-enable path) | 0 |
| Assignments | Admin | 4 (create, edit, toggle-active, delete) | 0 | 0 |
| Challenges | Admin | 3 (create, edit, delete) | 1 (toggle-active hides row, same as Courses) | 0 |
| Projects | Admin | 3 (create-minus-description, edit, toggle-active, delete) | 1 (create silently drops description) | 0 |
| Examples | Admin | 4 (create, edit, toggle-active, delete) | 0 | 0 |
| Community | Admin | 2 (search, delete) | 0 | 0 |
| Likes & Comments | Admin | 4 (review search, comment search, comment delete, approve/reject) | 1 (duplicate React key / duplicate render in comments) | 0 |
| Activity log | Admin | 1 (refresh + table render) | 0 | 0 |
| All tabs | Employer | 3 (Users hidden, banner text, content-moderation parity) | 1 (stats tile shows 0 users instead of real count or hidden) | 0 |
| **Total** | | **30** | **5** | **9** |

---

## Bugs found (ordered by real user impact, most severe first)

### 1. Toggling a course or challenge inactive makes it permanently disappear from the admin's own management UI, with no way to re-enable it
**Severity: High.** Confirmed and reproduced for both Courses and Challenges tabs.

**Repro (Courses):** As admin, on the Courses tab, create any course, then click "تعطيل" on it. The card vanishes from the list entirely (network shows `POST /api/courses/{id}/toggle-active → 200 OK`, so the toggle succeeded server-side). A direct API check with `GET /api/courses?include_inactive=1` confirms the course still exists with `is_active` effectively `false` — but the admin's own page never requests `include_inactive=1`, so there is no way to see it, and therefore no way to click the "تفعيل" (re-enable) button that AdminPage.tsx is otherwise fully capable of rendering (the conditional label logic at AdminPage.tsx:1873 and :1449 already handles `is_active === false` correctly — it's simply never reached because the row is filtered out before it gets there).

**Repro (Challenges):** Identical steps/result on the Challenges tab.

**Root cause:**
- `AdminPage.tsx:326` — `useListCourses()` called with no parameters.
- `AdminPage.tsx:327` — `useListChallenges({ limit: 100 })` called without `include_inactive`.
- Compare with the correctly-working Projects/Examples tabs, which explicitly fetch `apiFetch("/api/projects?include_inactive=1")` (line 1067) and `apiFetch("/api/examples?include_inactive=1")` (line 1167) respectively.
- Backend: `app\Http\Controllers\Controller.php:20-37` (`applyActiveScope`) defaults to `where('is_active', true)` unless `include_inactive=1` is passed, or unless the request is already scoped for `employer`/`admin` roles in some endpoints (per the courses/challenges index methods) — but the **frontend never asks** for the inactive ones on these two specific tabs.

**Fix suggestion:** Pass `?include_inactive=1` in the `useListCourses()` / `useListChallenges()` calls used by AdminPage (or a dedicated admin variant of those hooks), matching what the Projects/Examples tabs already do correctly.

**Impact:** Any admin who disables a course or challenge by mistake (or to do scheduled maintenance) has no in-app path to re-enable it — they'd have to manually call the API or ask a developer to flip the database flag.

### 2. Creating a new Project silently drops the description field
**Severity: Medium.** Confirmed and reproduced twice with different test data.

**Repro:** As admin (or employer), open Projects tab → "إضافة مشروع جديد" → fill in title and description (e.g. "QA project description") → save. The project is created successfully (title, track, difficulty, tags, category all persist correctly) but `description` is always `null` in the database, regardless of what was typed.

**Root cause — confirmed exact location:**
- Frontend: `AdminPage.tsx:1090` sends `description: projectForm.description.trim() || null` in the create POST body.
- Backend: `app/Http/Controllers/ProjectController.php:36` validates `'desc' => 'nullable|string'` — it expects the key `desc`, not `description`. Since the request never contains a `desc` key, `$validated['desc']` is always unset, and line ~45 falls back to `'description' => $validated['desc'] ?? null` → always `null`.
- Confirms this is a **frontend/backend key-name mismatch isolated to create**: the **edit** path (`AdminPage.tsx:1143`, `desc: editProjectForm.description || null`) already correctly uses the `desc` key the backend expects, and editing a project's description was verified to work correctly.

**Fix suggestion:** Change `AdminPage.tsx:1090` from `description:` to `desc:` to match the edit path and the backend's actual validation key (or fix the backend to also accept `description`, and update both call sites consistently — either direction resolves it, but the frontend fix is the smaller, more localized change).

**Impact:** Every newly created project loses its description text, which then has to be added separately via Edit — easy to miss since the create form gives no error and looks successful.

### 3. Duplicate React key causes a comment to render twice in the Comments-moderation list
**Severity: Medium (data integrity / display bug, not destructive).**

**Repro:** As admin, on the Likes & Comments tab, type "useEffect" into the comments search box (placeholder "🔍 ابحث بالمستخدم أو الكورس أو نص التعليق..."). The single matching comment is rendered twice in the DOM, and the browser console logs repeated React errors: `Encountered two children with the same key, '2'. ... Non-unique keys may cause children to be duplicated and/or omitted`.

**Root cause:** `GET /api/admin/comments` returns a merged list combining lesson comments and community-post comments, and at least two different comments — one from "محمدQA الطالبQA" on lesson "مشكلة في useEffect مع React Query" and a different one from "ahmada aghaaa" on lesson "المتغيرات والأنواع" — both have `id: "2"` (confirmed via direct fetch of the endpoint). `AdminPage.tsx:2444` renders this list with `<div key={item.id}>`, and since `item.id` isn't unique across the merged sources, React's reconciliation gets confused, causing the rendering duplication observed. This is functionally the same class of bug as the previously-known, out-of-scope homepage "duplicate key" warning, but this instance is a different, in-scope occurrence inside AdminPage.tsx itself.

**Fix suggestion:** Either have the backend return a namespaced/prefixed unique id per comment (e.g. `lesson-2` vs `community-2`), or build a composite React key on the frontend, e.g. `key={`${item.courseTitle}-${item.id}-${item.createdAt}`}` at AdminPage.tsx:2444.

**Impact:** Cosmetic/display bug right now (the comment is harmless to view twice), but the underlying non-unique-id problem could cause a delete action to target the wrong comment if both id-colliding rows are ever shown together with delete buttons, since `handleDeleteComment(item.id)` (line 2447) only has the (non-unique) `id` to act on — this is worth a closer look from the backend.

### 4. Employer's Overview tab shows "0 مستخدم" (0 users) instead of hiding the tile or showing the real total
**Severity: Low (cosmetic/confusing, no functional impact).**

**Repro:** Log in as employer (`employer@academy.test`), go to `/admin`, view the Overview tab's stats grid. It shows "0 مستخدم" even though the platform has 15 real users (`GET /api/stats/platform` — accessible to the employer — correctly reports `totalUsers: 15`).

**Root cause:** `AdminPage.tsx:1336` — `{ icon: <Users .../>, value: usersData?.total ?? users.length, label: "مستخدم" }`, where `usersData` comes from `useListUsers({limit:200})` at line 325, called unconditionally for every role. `GET /api/users` correctly returns `403` for employer (since employers are not allowed to manage users), so `usersData` stays `undefined` and the fallback `users.length` (also `0`, since `users = usersData?.users ?? []`) gets used, silently displaying a misleading "0".

**Fix suggestion:** For non-admin roles, either hide the users stat tile entirely (it's somewhat redundant given the banner already says employers don't manage users), or source the number from the already-accessible `/api/stats/platform`'s `totalUsers` field instead of the admin-only `/api/users` endpoint.

**Impact:** Minor — could make an employer momentarily think the platform has 0 users, which is confusing but not destructive or blocking.

---

## What was set aside as not tested (time-boxed, not environment failure)

The renderer remained responsive for the entire session this time (verified `preview_eval` round-tripped reliably throughout, including after 30+ sequential actions). The following Users-tab items were deprioritized purely due to the size of the remaining test matrix (8 more full tabs + a full employer-role pass had to be completed in the same session) and were not reached:

- Score (points) number input edit
- Password-reset text input
- Ban / unban toggle
- Disable / enable toggle
- Delete (soft) / Restore / Permanent delete flows
- Full user-detail modal (bio, country, phone fields; challenge/assignment submission lists; inline score grading inputs; submission search + delete)
- Pagination controls (the `Pager` component) — with only 16-17 users in the current dataset there is only 1 page regardless, so this would need a seeded dataset with >20 users to exercise meaningfully even in a follow-up session.

These should be covered in a focused follow-up pass purely on the Users tab's remaining items.
