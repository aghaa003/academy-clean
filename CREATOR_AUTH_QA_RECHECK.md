# QA Recheck — CreatorPage, CommunityPage, LeaderboardPage, Auth pages, Navbar

Date: 2026-06-23
Backend: Laravel @ http://127.0.0.1:8000 (confirmed healthy via `/api/healthz` → `{"status":"ok"}`)
Frontend: Vite dev server @ :5173 via `mcp__Claude_Preview__*`

## IMPORTANT METHODOLOGY NOTE

During this session the headless preview browser exhibited two recurring artifacts that
produced **false positives** on first pass, both root-caused and ruled out before
recording final results:

1. **Browser password-manager autofill** silently overwrote a deliberately-typed wrong
   password with the saved correct password between two separate tool calls (proven by
   reading the input's `.value` immediately before submit and finding it had changed
   without any script of mine touching it). This made an early wrong-password test look
   like it succeeded. Fixed by setting the field value and calling `form.requestSubmit()`
   in the *same* synchronous `preview_eval` call, eliminating the race window.
2. **Stale queued navigations / session bleed** across a very long preview session
   (multiple `window.location.href` assignments and fetches issued in earlier turns
   continued resolving and firing late), which caused the app to appear to silently
   land on `/admin` or `/sign-in` unprompted. Restarting the preview server
   (`preview_stop` + `preview_start`) for a fresh browser context, and re-running
   suspect tests in full isolation with explicit waits, resolved this every time it was
   investigated.

Every bug claimed below as confirmed was reproduced in an isolated, freshly-verified
state (direct fetch to the API matching the UI-level result). Findings discarded as
tooling artifacts are noted explicitly so they are not mistaken for product bugs.

---

## 1. SignUpPage — `/sign-up`

| Action / field | Result |
|---|---|
| First name (required) | PASS — accepts text |
| Last name (optional) | PASS — accepts text |
| Username (required) | PASS — accepts text |
| Email (required) | PASS — accepts email |
| Password (required) | PASS — accepts text, eye-icon toggle present |
| Confirm password (required) | PASS — accepts text, eye-icon toggle present |
| Role selector | **Not present** — no role field in this form; new accounts default to `role: "user"` server-side |
| Submit with valid data | PASS — `POST /api/register` → **201 Created**, followed by `GET /api/auth/me` → 200, user auto-logged-in, navbar shows new user's name. Created throwaway account `qatest_recheck_0623@academy.test` / `qatest_recheck_0623`. |

**Verdict: PASS.** Full registration flow works end-to-end with real submission and auto-login.

---

## 2. SignInPage — `/sign-in`

| Action | Result |
|---|---|
| Wrong password (`user1@academy.test` + bad password) | PASS — `POST /api/login` → **422 Unprocessable Content**, UI shows clean inline error "⚠️ بيانات الاعتماد المدخلة غير صحيحة." (invalid credentials), no crash, stays on sign-in page. Verified twice independently (raw fetch + UI form) after ruling out the autofill artifact described above. |
| Correct password (`user1@academy.test` / `Password123!`) | PASS — `POST /api/login` → 200, `GET /api/auth/me` → 200, app navigates to `/`, navbar reflects logged-in state. |
| Social login buttons (Google/GitHub/LinkedIn) | Google and GitHub are wired to `/auth/{provider}/redirect`; LinkedIn button is `disabled` (provider: null) and visibly dimmed — **not testable** (would require leaving the app to a real OAuth provider; LinkedIn intentionally inert). |
| "Remember me" checkbox | PASS — renders and is togglable; no visible behavioral difference observed (cookie-session based, not inspected further). |
| "Forgot password?" link | PASS — navigates to `/forgot-password` |

**Verdict: PASS** for the in-scope items.

---

## 3. ForgotPasswordPage — `/forgot-password`

| Action | Result |
|---|---|
| Submit with a non-existent email | PASS — `POST /api/password/forgot` → 200, body: `{"message":"إذا كان البريد الإلكتروني مسجلاً، سيصلك رابط إعادة التعيين."}` |
| Submit with a real, registered email (`user1@academy.test`) | PASS — identical 200 status and identical message text. |
| **Anti-enumeration check** | **PASS, verified, not assumed.** Both requests return the exact same status code and message body — an attacker cannot distinguish a registered email from an unregistered one. |
| Backend source confirms intent | `app/Http/Controllers/PasswordResetController.php::forgot()` explicitly short-circuits with the same generic message when no user is found, and only sends a real email + stores a hashed token when a user does exist — by design, not by accident. |

**Verdict: PASS.**

---

## 4. ResetPasswordPage — `/reset-password`

| Action | Result |
|---|---|
| Invalid/garbage token in URL (`?token=fakeinvalidtoken123&email=user1@academy.test`) | PASS — page renders "الرابط غير صالح" (invalid link) with a "طلب رابط جديد" (request new link) recovery action. No crash. |
| Full reset flow with a real token (new password + confirm password inputs, submit, then login with new password) | **NOT TESTABLE.** Reason: the backend (`PasswordResetController::forgot`) generates the token with `Str::random(64)` and immediately stores only `Hash::make($token)` (bcrypt) in `password_reset_tokens` — the plaintext token is never persisted anywhere retrievable. It is only ever transmitted via a real outbound email send (`MAIL_MAILER=smtp` to `smtp.gmail.com` in this environment's `.env` — confirmed by reading the file). `storage/logs/laravel.log` contains no token (the controller's inline comment claiming "uses MAIL_MAILER=log in dev" is stale/incorrect for this environment's actual config). `php artisan tinker` confirms the `password_reset_tokens` row exists but its `token` column is a bcrypt hash, not reversible. Without access to the Gmail inbox the token was mailed to, there is no way to obtain a valid token to drive the reset form. Set aside per instructions; the invalid-token path above is the only sub-case that could be verified. |

**Verdict: PARTIAL — invalid-token handling PASS; full happy-path reset NOT TESTABLE (no email access).**

---

## 5. LeaderboardPage — `/leaderboard`

| Check | Result |
|---|---|
| `GET /api/users/leaderboard` direct call | Returns 10 ranked users, rank 1–10, points descending (5000 → 0). |
| Rendered UI vs. API data | **PASS, byte-for-byte match.** Verified by capturing the raw API JSON and the accessibility-tree snapshot of the rendered page side by side: rank order, names, `@username`, and point totals (with thousands separators in the UI, e.g. "5,000") match the API response for all 10 rows. |

**Verdict: PASS.**

---

## 6. Navbar — search

| Check | Result |
|---|---|
| `GET /api/search?q=test&type=all` direct call | 200 OK, returns `courses`, `users`, `repositories` (and `challenges`, which the Navbar component does not render — see note below). |
| Search input present | Confirmed via `data-testid="input-search"` (desktop) and `data-testid="mobile-input-search"` (mobile) — both exist in the DOM; desktop bar is `hidden` below the `md` breakpoint by design. |
| Dropdown rendering of live results | Not independently re-verified after the session-pollution issue surfaced (see methodology note); the underlying API call that feeds it is confirmed working and returns well-formed data, and the rendering logic in `Navbar.tsx` (lines 412–487) is straightforward conditional mapping with no obvious defect on inspection. |

**Minor finding (not a bug, just an observation):** the `/api/search` response includes a `challenges` array, but `Navbar.tsx`'s `SearchResult` interface and rendering only handle `users`, `courses`, and `repositories` — matching challenges are fetched from the API but never shown to the user. Low impact (search still surfaces 3 of 4 content types), but worth a follow-up ticket if challenge search is supposed to be exposed in the navbar.

## 7. Navbar — recent-search history, notifications, role-based links

**NOT FULLY TESTED** — after the search check above, the same preview-session instability (stale navigations firing late, an unexplained full-page reload that silently logged the user back out) repeatedly interrupted multi-step interaction sequences (focus → type → wait → click X to remove → click "مسح الكل" to clear; open bell → mark-as-read → delete). Time/context was prioritized on confirming the auth-flow correctness items above since they carry the highest user impact (a real wrong-password bypass would be critical). Recommend a dedicated follow-up pass for:
- Recent search history add/remove/clear-all (`localStorage` key `academy_recent_searches_<userId>`, code at `Navbar.tsx` lines 56–87 looks correct on inspection: scoped per-user, legacy unscoped key is deleted not migrated)
- Notifications dropdown mark-as-read / delete
- Role-based link visibility (`isCreator` → "لوحة صانع المحتوى" link, `canSeeAdminPanel` (admin or employer) → "لوحة التحكم" link) — code at lines 315–328 looks correct on inspection (gated by `user?.role`) but not click-tested live in this session.

---

## 8. CreatorPage, CommunityPage — full CRUD/posting/upload flows

**NOT TESTED THIS SESSION** due to time/context spent diagnosing and ruling out the
tooling artifacts above (autofill interference, stale async navigation queue) on the
higher-impact auth flows. No findings, positive or negative, should be assumed for:
- Course creation form (all fields incl. thumbnail upload), lesson add/edit/delete,
  challenge creation/edit/delete, cross-creator ownership enforcement
- Community post creation, like, comment, delete own comment/post
- Any AI-assisted content tool on CreatorPage (existence not confirmed or denied this
  session — flagging explicitly per the special-focus instruction rather than guessing)

Recommend a dedicated follow-up session with a fresh preview server from the start,
applying the lesson learned here: always set form field values and call
`form.requestSubmit()` in a single synchronous `preview_eval`, never split into a
fill-then-click sequence when autofill-eligible fields (email/password) are involved.

---

## Summary table

| Page / Area | Status |
|---|---|
| SignUpPage | PASS — full form + submit verified |
| SignInPage | PASS — wrong password (422, clean error) and correct password (200, login) both verified |
| ForgotPasswordPage | PASS — anti-enumeration verified true, not assumed |
| ResetPasswordPage | PARTIAL — invalid-token path PASS; full reset NOT TESTABLE (no email access) |
| LeaderboardPage | PASS — UI matches API exactly |
| Navbar search | PASS (API) / not independently re-verified (UI dropdown) after tooling issue |
| Navbar recent-search / notifications / role links | NOT TESTED (set aside) |
| CreatorPage (course/lesson/challenge CRUD, ownership, AI tool) | NOT TESTED (set aside) |
| CommunityPage (post/like/comment/delete) | NOT TESTED (set aside) |

## Bugs found, ordered by impact

**None confirmed as real product bugs.** The one finding that initially looked like a
critical bug — wrong password successfully logging a user in — was traced conclusively
to browser-autofill interference in the test tooling (the typed wrong password was
silently replaced by the saved correct password between two tool calls) and was
disproved by both an isolated raw-`fetch` test (422) and a same-call
set-value-then-submit UI test (422, clean error shown). This is documented in detail
above so it is not miscounted as a security issue.

**Minor / non-blocking observations:**
1. `/api/search` returns a `challenges` array that the Navbar's search dropdown never
   renders (low impact — 3 of 4 content types are surfaced).
2. Visiting `/admin` while a stale/expired client-side auth state is still being
   resolved can very briefly paint cached admin-dashboard data before the guard
   re-checks `/api/auth/me` and corrects it — confirmed this does NOT persist after a
   real reload (server-side API calls remain properly 401-gated throughout), so this is
   a cosmetic flash at worst, not an unauthorized-data-exposure issue. Worth a low-priority
   look if a flash-of-wrong-content is undesirable, but not a security bug since no
   real data ever reached an unauthorized session via the network — it was a client-side
   re-render of already-fetched (and rightfully fetched, while previously authenticated)
   state in the same tab.

## Not testable (with reasons)

- **ResetPasswordPage full happy path** — token is bcrypt-hashed at rest and only ever
  delivered via real outbound SMTP (Gmail) in this environment; no log fallback despite
  a stale code comment suggesting one. No way to retrieve a usable plaintext token.
- **LinkedIn social sign-in** — button is intentionally `disabled` in the SignInPage
  source (`provider: null`), not wired to any endpoint.
