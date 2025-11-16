// Background Service Worker - Immometrica to Todoist Extension
import { getToken, getCache, setCache } from './utils/storage.js';
import { getProjects, getSections, getLabels, createLabel, createTask, TodoistApiError } from './api/todoistApi.js';

const CONFIG = {
  PROJECT_NAME: 'Akquise',
  SECTION_NAME: 'Noch nicht angefragt aber interessant',
  BADGE_TIMEOUT: 3000,
};

const BADGES = {
  OK: { text: 'OK', color: '#198754' },
  ERROR: { text: 'ERR', color: '#dc3545' },
  NO_URL: { text: 'NO', color: '#dc3545' },
  NO_TOKEN: { text: 'TOK', color: '#ffc107' },
  INVALID: { text: 'BAD', color: '#dc3545' },
  PROJECT: { text: 'PRJ', color: '#dc3545' },
  SECTION: { text: 'SEC', color: '#dc3545' },
  AUTH: { text: 'AUTH', color: '#dc3545' },
  NETWORK: { text: 'NET', color: '#dc3545' },
};

function showBadge(type) {
  const badge = BADGES[type] || BADGES.ERROR;
  chrome.action.setBadgeText({ text: badge.text });
  chrome.action.setBadgeBackgroundColor({ color: badge.color });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), CONFIG.BADGE_TIMEOUT);
}

function isOfferUrl(url) {
  return /^https:\/\/www\.immometrica\.com\/de\/offer\/\d+/.test(url);
}

// Find or retrieve cached project/section IDs
async function resolveProjectAndSection(token) {
  const cache = await getCache();
  if (cache?.projectId && cache?.sectionId) {
    return { projectId: cache.projectId, sectionId: cache.sectionId };
  }

  const projects = await getProjects(token);
  const project = projects.find(p => p.name === CONFIG.PROJECT_NAME);
  if (!project) throw new Error(`Project "${CONFIG.PROJECT_NAME}" not found`);

  const sections = await getSections(token, project.id);
  const section = sections.find(s => s.name === CONFIG.SECTION_NAME);
  if (!section) throw new Error(`Section "${CONFIG.SECTION_NAME}" not found`);

  await setCache({
    projectId: project.id,
    sectionId: section.id,
    projectName: project.name,
    sectionName: section.name,
    timestamp: Date.now(),
  });

  return { projectId: project.id, sectionId: section.id };
}

// Find or create location label
async function resolveLocationLabel(token, location) {
  if (!location) return false;
  
  try {
    const labels = await getLabels(token);
    const existingLabel = labels.find(l => l.name === location);
    
    if (existingLabel) return true;
    
    const newLabel = await createLabel(token, { name: location });
    return !!newLabel;
  } catch (error) {
    console.error(`Failed to resolve location label "${location}":`, error);
    return false;
  }
}

// Create Todoist task from listing data
async function createListingTask({ title, url, location }) {
  if (!title || !url) throw new Error('Missing title or URL');

  const token = await getToken();
  if (!token) throw new Error('API token not configured');

  const { projectId, sectionId } = await resolveProjectAndSection(token);

  const taskData = {
    content: title,
    description: url,
    project_id: projectId,
    section_id: sectionId,
  };

  if (location && await resolveLocationLabel(token, location)) {
    taskData.labels = [location];
  }

  await createTask(token, taskData);
}

// Handle extension icon click
async function handleIconClick(tab) {
  try {
    if (!tab?.url || !isOfferUrl(tab.url)) {
      showBadge('NO_URL');
      return;
    }

    const token = await getToken();
    if (!token) {
      showBadge('NO_TOKEN');
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js'],
    });
  } catch (error) {
    console.error('Icon click error:', error);
    showBadge('ERROR');
  }
}

// Handle content script messages
async function handleMessage(message) {
  if (message.type !== 'SCRAPE_RESULT') return;

  try {
    const { valid, title, url, location } = message.payload || {};
    
    if (!valid) {
      showBadge('INVALID');
      return;
    }

    await createListingTask({ title, url, location });
    showBadge('OK');
  } catch (error) {
    console.error('Message handling error:', error);
    
    if (error instanceof TodoistApiError) {
      showBadge(error.type === 'AUTH' ? 'AUTH' : 
                error.type === 'NETWORK' ? 'NETWORK' : 'ERROR');
    } else if (error.message.includes('Project')) {
      showBadge('PROJECT');
    } else if (error.message.includes('Section')) {
      showBadge('SECTION');
    } else if (error.message.includes('token')) {
      showBadge('NO_TOKEN');
    } else {
      showBadge('ERROR');
    }
  }
}

// Event listeners
chrome.action.onClicked.addListener(handleIconClick);
chrome.runtime.onMessage.addListener(handleMessage);
