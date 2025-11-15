// Minimal Todoist API v1 wrapper (configurable base)
// NOTE: Base URL assumed from user input; adjust if official endpoints differ.
// Todoist unified API base (confirmed):
// Using https://api.todoist.com/api/v1 per user confirmation.
// Adjust with setApiBase() if future versioning changes.
export let API_BASE = 'https://api.todoist.com/api/v1';

export function setApiBase(newBase) {
  API_BASE = newBase;
  console.warn('[todoistApi] API_BASE changed to', API_BASE);
}

function buildHeaders(token, isJson = true) {
  const headers = {
    'Authorization': `Bearer ${token}`
  };
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
}

async function doFetch(path, { method = 'GET', token, body } = {}) {
  if (!token) throw new Error('MISSING_TOKEN');
  const url = API_BASE.replace(/\/$/, '') + path; // ensure single slash
  const options = {
    method,
    headers: buildHeaders(token, method !== 'GET')
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

function extractList(res, label) {
  if (!res) return [];
  if (Array.isArray(res)) return res; // pure array response
  if (Array.isArray(res.results)) return res.results; // cursor-based envelope
  if (label && Array.isArray(res[label])) return res[label]; // object label fallback
  return [];
}

async function pagedFetch(path, { token }) {
  let accumulated = [];
  let cursor = null;
  let first = true;
  do {
    const cursorSuffix = cursor ? (path.includes('?') ? `&cursor=${encodeURIComponent(cursor)}` : `?cursor=${encodeURIComponent(cursor)}`) : '';
    const res = await doFetch(path + cursorSuffix, { token });
    const batch = extractList(res);
    accumulated = accumulated.concat(batch);
    cursor = res && res.next_cursor ? res.next_cursor : null;
    first = false;
  } while (cursor);
  return accumulated;
}

export async function getProjects(token) {
  try {
    const list = await pagedFetch('/projects', { token });
    if (!list.length) console.warn('[todoistApi] Empty projects list');
    return list;
  } catch (e) {
    console.error('[todoistApi] getProjects failed', e);
    throw e;
  }
}

export async function getSections(token, projectId) {
  // Assuming sections endpoint supports project_id query param as in previous REST.
  const query = projectId ? `/sections?project_id=${encodeURIComponent(projectId)}` : '/sections';
  try {
    const list = await pagedFetch(query, { token });
    if (!list.length) console.warn('[todoistApi] Empty sections list for project', projectId);
    return list;
  } catch (e) {
    console.error('[todoistApi] getSections failed', e);
    throw e;
  }
}

export async function createTask(token, payload) {
  // Expecting /tasks POST.
  return await doFetch('/tasks', { method: 'POST', token, body: payload });
}

// Simple diagnostic helper to attempt a fallback chain of bases.
export async function testBases(token, path = '/projects') {
  const candidates = [API_BASE]; // simplified now that base is confirmed.
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
  console.warn('[todoistApi] testBases single-base result', results);
  return results;
}
