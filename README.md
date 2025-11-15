# ImmoMetrica → Todoist Chrome Extension (MVP Specification)

## 1. Vision & Scope
A minimal Manifest V3 Chrome extension that lets you add the currently viewed ImmoMetrica offer as a Todoist task with one click. Task content = listing title. Task description = listing URL. Task is placed into Todoist project `Akquise` and its section `Noch nicht angefragt aber interessant`.

Out of scope for MVP: OAuth, duplicate detection, labels, due dates, metadata enrichment (price/address), automatic project/section creation, popup configuration UI, editing tasks.

## 2. Functional Requirements
User story: While viewing a valid ImmoMetrica offer page, clicking the extension’s toolbar icon creates a Todoist task populated from the page. If not on a valid offer page, show an error instead.

Details:
1. Trigger: Toolbar action click (no popup).
2. Page validation: Must be an offer page; else fail fast.
3. Data extraction:
   - Title: From `header.page-header h2.no-margin-bottom`.
   - URL: `location.href`.
   - (Optional future) Offer ID: from URL `/de/offer/{id}` or hidden `#offerfeedback_offer`.
4. Todoist task creation body:
   ```json
   {
     "content": "<listing title>",
     "description": "<page url>",
     "project_id": "<Akquise project id>",
     "section_id": "<section id>"
   }
   ```
5. Project and section resolution (lazy): If cached IDs absent:
   - GET projects → match name `Akquise`.
   - GET sections → match name `Noch nicht angefragt aber interessant`.
6. Caching: Store resolved IDs in `chrome.storage.local`.
7. Feedback: Success notification/badge; meaningful error messages for failure cases.
8. Settings (MVP): Manual token entry (options page). Cache reset optionally.
9. Error on invalid page: Show “Not an ImmoMetrica offer page”.

## 3. Non-Functional Requirements
- Simplicity: No frameworks; ES modules.
- Performance: Only inject content script on action click; cache IDs permanently until manual reset.
- Security: Personal token in local storage only; min permissions; no remote code.
- Reliability: Graceful network and auth error handling. Idempotency header on POST.
- Maintainability: Clear separation (service worker vs content vs API wrapper).
- Extensibility: Future features easily attached without rewriting core flow.
- Internationalization: English UI copy (neutral) for MVP.

## 4. Constraints & Assumptions
- Unified Todoist API v1 used (base URL TBD — placeholder configurable).
- Project `Akquise` and section `Noch nicht angefragt aber interessant` exist beforehand.
- Offer pages always include `header.page-header h2.no-margin-bottom`.
- Manual token entry acceptable.
- Domain pattern: `https://www.immometrica.com/*` (only offer pages targeted).

## 5. Offer Page Classification Logic
Page considered valid if:
1. URL matches: `^https://www\.immometrica\.com/de/offer/\d+`
2. Selector `header.page-header h2.no-margin-bottom` yields an element.
3. (Optional) Hidden input `#offerfeedback_offer` exists; not strictly required for MVP.
If conditions fail → error feedback and no API calls.

## 6. Data Model
```ts
TodoistProject { id: string; name: string; }
TodoistSection { id: string; project_id: string; name: string; }
TodoistTaskCreateRequest {
  content: string; description: string; project_id: string; section_id: string;
}
Cache {
  todoistToken: string;
  cachedProject: { id: string; name: string };
  cachedSection: { id: string; name: string };
  cacheTimestamp: number; // epoch ms
}
```

## 7. Architecture Overview
Components:
- `manifest.json` (MV3 configuration)
- `service_worker.js` (background logic)
- `contentScript.js` (scrapes page when requested)
- `options.html` + `options.js` (token entry & cache reset)
- `api/todoistApi.js` (Todoist API abstraction)
- `utils/storage.js` (token + cache persistence)
- (Optional) `utils/validation.js`

Flow Summary:
1. User clicks toolbar icon.
2. Service worker validates tab URL; ensures token is present.
3. Inject content script via `chrome.scripting.executeScript`.
4. Content script extracts title + URL, sends them back.
5. Service worker resolves project & section IDs (using cache or API).
6. Creates task via `POST /tasks` (API v1 base path configurable).
7. Displays success or error notification.

## 8. Module Responsibilities
- `service_worker.js`: Entry point, event listeners, orchestration, notifications.
- `contentScript.js`: DOM scraping & minimal validation.
- `api/todoistApi.js`: fetch wrappers (`getProjects`, `getSections`, `createTask`), error normalization.
- `utils/storage.js`: CRUD for token and cached IDs.
- `options.js`: UI for token input & clearing cache.

## 9. Manifest Draft
```json
{
  "manifest_version": 3,
  "name": "ImmoMetrica → Todoist",
  "version": "0.1.0",
  "description": "One-click add ImmoMetrica offer to Todoist Akquise board.",
  "action": { "default_title": "Add to Todoist" },
  "permissions": ["storage", "tabs", "scripting", "notifications"],
  "host_permissions": ["https://www.immometrica.com/*"],
  "background": { "service_worker": "service_worker.js", "type": "module" },
  "options_page": "options.html"
}
```
(If using only badge feedback, we can remove `notifications` permission.)

## 10. Error Handling Matrix
| Case | Detection | Feedback | Recovery |
|------|-----------|----------|----------|
| Missing token | storage lookup null | "Token not set" | User enters token |
| Invalid page | URL / selector fail | "Not an ImmoMetrica offer page" | None |
| Project missing | No name match | "Project ‘Akquise’ not found" | Create project manually |
| Section missing | No name match | "Section not found" | Create section manually |
| 401 Unauthorized | Response status 401 | "Invalid Todoist token" | Replace token |
| 5xx / network | Fetch error/status >= 500 | "Todoist error – retry later" | Retry next click |
| Timeout | Promise rejection | "Network timeout" | Retry |
| Unexpected schema | Parsing failure | Generic error + console log | Adjust code later |

## 11. Logging & Observability
- Minimal console logs behind a `DEBUG` flag.
- Never log the raw token.
- Use lightweight codes in error messages (e.g., `AKQ-PROJECT-NOT-FOUND`).

## 12. Selector Strategy
Primary: `document.querySelector('header.page-header h2.no-margin-bottom')`
Fallback (future): `document.title` sanitized (remove trailing branding). Not part of MVP unless primary fails unexpectedly.

## 13. Caching Strategy
- Cache project & section IDs indefinitely until user manually clears via options page.
- Simplest approach favored; future TTL can be added easily.

## 14. API v1 Abstraction Plan
Configurable base URL constant (placeholder until confirmed), e.g.:
```js
const API_BASE = 'https://api.todoist.com/api/v1'; // VERIFY THIS PATH
```
Endpoints mapping:
```js
ENDPOINTS = {
  projects: '/projects',
  sections: '/sections',
  tasks: '/tasks'
};
```
Wrapper examples:
```js
async function getProjects(token) { /* GET projects */ }
async function getSections(token, projectId) { /* GET sections?project_id=... */ }
async function createTask(token, payload) { /* POST tasks */ }
```
Idempotency: Add `X-Request-Id` header with a UUID (or timestamp-random string).

## 15. State Diagram (Textual)
Idle → Click → Validate Page → (invalid → Error → Idle) → Load Cache → (Cache Miss → Resolve IDs → Cache) → Create Task → (Success/Error) → Idle.

## 16. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Wrong API base path | All calls fail | Central configurable constant |
| DOM changes | Extraction fails | Add fallback & log warning |
| Project/section renamed | Tasks misrouted or fail | Manual cache reset; add refresh later |
| Token leaked via log | Security breach | Never log token |
| Over-permission | Store rejection (future) | Keep minimal permissions |

## 17. Future Enhancements (Backlog)
- Metadata enrichment (address, price, cashflow snippet).
- Duplicate detection (search existing tasks by URL substring).
- Labels (e.g., `Immometrica`).
- Popup UI with manual refresh and advanced options.
- Bulk capture/history of added offers.
- Priority/due date heuristics.
- OAuth for broader distribution.

## 18. Acceptance Criteria
1. Clicking action on a valid offer page creates the intended task with correct title & URL.
2. Invalid page results in a clear error without network calls.
3. Missing/invalid token produces guided error message.
4. Project/section resolution works once and then uses cached IDs.
5. No unhandled promise rejections in console during normal flow.

## 19. UX Copy (English)
- Success: "Task added to Akquise"
- Missing token: "Todoist token not set"
- Invalid page: "Not an ImmoMetrica offer page"
- Project missing: "Project 'Akquise' not found"
- Section missing: "Section not found"
- Auth error: "Invalid Todoist token"
- Network error: "Todoist request failed"

## 20. Implementation Phases (Summary)
A. Confirm API base path.
B. Scaffold manifest + service worker + options page.
C. Implement API wrapper + storage utilities.
D. Implement on-demand content script extraction.
E. Integrate task creation flow & notifications.
F. Manual testing and adjustments.
G. README / packaging.

## 21. Open Item
- Exact unified Todoist API v1 base URL still needs confirmation; adjust `API_BASE` accordingly before coding.

---
This README captures the complete MVP specification. Adjust the open API base item before implementation. After confirmation we proceed with scaffolding.
