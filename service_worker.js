// Background service worker (MV3) orchestrating task creation.
import { getToken, getCache, setCache } from './utils/storage.js';
import { getProjects, getSections, createTask, testBases, setApiBase } from './api/todoistApi.js';

const PROJECT_NAME = 'Akquise';
const SECTION_NAME = 'Noch nicht angefragt aber interessant';

chrome.action.onClicked.addListener(async (tab) => {
  // Basic validation for active tab.
  try {
    await handleActionClick(tab);
  } catch (e) {
    console.error('Unhandled error', e);
    setBadge('ERR');
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === 'SCRAPE_RESULT') {
    processScrapeResult(msg.payload).catch(err => {
      console.error('Processing error', err);
      setBadge('ERR');
    });
  }
});

function setBadge(text, success = false) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: success ? '#198754' : '#dc3545' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
}

function validateOfferUrl(url) {
  return /^https:\/\/www\.immometrica\.com\/de\/offer\/\d+/.test(url);
}

async function handleActionClick(tab) {
  if (!tab || !tab.url) { setBadge('NO', false); return; }
  const url = tab.url;
  if (!validateOfferUrl(url)) {
    console.warn('Not an offer page:', url);
    setBadge('NO');
    return;
  }
  const token = await getToken();
  if (!token) {
    console.warn('Missing token');
    setBadge('TOK');
    return;
  }
  // Inject content script to extract title.
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['contentScript.js']
  });
  // Actual processing continues in onMessage listener.
}

async function processScrapeResult(payload) {
  const { valid, title, url } = payload || {};
  if (!valid || !title) {
    console.warn('Invalid scrape result', payload);
    setBadge('BAD');
    return;
  }
  const token = await getToken();
  if (!token) { setBadge('TOK'); return; }

  // Resolve project/section IDs (use cache if available)
  let cache = await getCache();
  let projectId, sectionId;

  if (cache?.projectId && cache?.sectionId) {
    projectId = cache.projectId;
    sectionId = cache.sectionId;
  } else {
    const projects = await getProjects(token);
    const project = projects.find(p => p.name === PROJECT_NAME);
    if (!project) { console.warn('Project not found'); setBadge('PRJ'); return; }

    const sections = await getSections(token, project.id);
    const section = sections.find(s => s.name === SECTION_NAME);
    if (!section) { console.warn('Section not found'); setBadge('SEC'); return; }

    projectId = project.id;
    sectionId = section.id;

    cache = {
      projectId,
      sectionId,
      projectName: project.name,
      sectionName: section.name,
      cacheTimestamp: Date.now()
    };
    await setCache(cache);
  }

  // Create task
  try {
    const task = await createTask(token, {
      content: title,
      description: url,
      project_id: projectId,
      section_id: sectionId
    });
    console.log('Task created', task);
    setBadge('OK', true);
  } catch (err) {
    console.error('Task creation error', err);
    if (err?.status === 401) setBadge('AUTH');
    else if (err?.type === 'NETWORK') setBadge('NET');
    else setBadge('ERR');
    // Provide quick hint if base may be wrong.
    if (err?.type === 'HTTP' && err.status === 404) {
      console.warn('404 from current base; consider testing alternate API bases.');
    }
  }
}

// Optional command-style messages to run diagnostics from DevTools.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'RUN_API_BASE_TEST') {
    getToken().then(token => {
      if (!token) { console.warn('No token for base test'); return; }
      testBases(token).catch(e => console.error('Base test error', e));
    });
  } else if (msg?.type === 'SET_API_BASE' && msg.base) {
    setApiBase(msg.base);
  }
});
