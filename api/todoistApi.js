// Minimal Todoist API v1 wrapper (configurable base)
// NOTE: Base URL assumed from user input; adjust if official endpoints differ.
// IMPORTANT: The current base URL was provided by user; real production API commonly uses https://api.todoist.com/rest.
// If you keep seeing network/HTTP errors, try switching to: 'https://api.todoist.com/rest/v2' or any unified v1 path.
// Keep it configurable for quick experiments.
export let API_BASE = 'https://developer.todoist.com/api/v1'; // User-specified placeholder.

export function setApiBase(newBase) {
  API_BASE = newBase;
  console.warn('[todoistApi] API_BASE changed to', API_BASE);
}

function buildHeaders(token, isJson = true, requestId) {
  const headers = {
    'Authorization': `Bearer ${token}`
  };
  if (isJson) headers['Content-Type'] = 'application/json';
  if (requestId) headers['X-Request-Id'] = requestId;
  return headers;
}

async function doFetch(path, { method = 'GET', token, body, requestId } = {}) {
  if (!token) throw new Error('MISSING_TOKEN');
  const url = API_BASE.replace(/\/$/, '') + path; // ensure single slash
  const options = {
    method,
    headers: buildHeaders(token, method !== 'GET', requestId)
  };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    console.error('[todoistApi] NETWORK error', { url, method, message: e.message });
    throw { type: 'NETWORK', message: e.message };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[todoistApi] HTTP error', { url, method, status: res.status, response: text });
    throw { type: 'HTTP', status: res.status, message: text || res.statusText, url };
  }
  if (res.status === 204) return null;
  // attempt json
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function getProjects(token) {
  return await doFetch('/projects', { token });
}

export async function getSections(token, projectId) {
  // Assuming sections endpoint supports project_id query param as in previous REST.
  const query = projectId ? `/sections?project_id=${encodeURIComponent(projectId)}` : '/sections';
  return await doFetch(query, { token });
}

export async function createTask(token, payload) {
  // Expecting /tasks POST.
  return await doFetch('/tasks', { method: 'POST', token, body: payload, requestId: generateRequestId() });
}

export function generateRequestId() {
  // Lightweight UUID-ish; sufficient for idempotency header.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Simple diagnostic helper to attempt a fallback chain of bases.
export async function testBases(token, path = '/projects') {
  const candidates = [
    API_BASE,
    'https://api.todoist.com/rest/v2',
    'https://api.todoist.com/rest/v1',
    'https://api.todoist.com/sync/v9'
  ];
  const results = [];
  for (const base of candidates) {
    const full = base.replace(/\/$/, '') + path;
    try {
      const res = await fetch(full, { headers: buildHeaders(token, false) });
      results.push({ base, status: res.status });
    } catch (e) {
      results.push({ base, error: e.message });
    }
  }
  console.warn('[todoistApi] testBases results', results);
  return results;
}
