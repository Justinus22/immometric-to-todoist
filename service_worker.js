// Background Service Worker - Immometrica to Todoist Extension
import { getToken, getCache, setCache } from './utils/storage.js';
import { getProjects, getSections, getLabels, createLabel, createTask, getTasks, findTaskByDescription, findTaskInProject, TodoistApiError } from './api/todoistApi.js';

// Tab state tracking
const tabStates = new Map(); // tabId -> { url, badgeType, isDuplicate, existingTask }

const CONFIG = {
  PROJECT_NAME: 'Akquise',
  SECTION_NAME: 'Noch nicht angefragt aber interessant',
  BADGE_TIMEOUT: 3000,
};

const BADGES = {
  OK: { text: 'OK', color: '#198754' },
  DUPLICATE: { text: 'DUP', color: '#28a745' },
  COMPLETED: { text: '✓DUP', color: '#6c757d' },
  ERROR: { text: 'ERR', color: '#dc3545' },
  NO_URL: { text: 'NO', color: '#dc3545' },
  NO_TOKEN: { text: 'TOK', color: '#ffc107' },
  INVALID: { text: 'BAD', color: '#dc3545' },
  PROJECT: { text: 'PRJ', color: '#dc3545' },
  SECTION: { text: 'SEC', color: '#dc3545' },
  AUTH: { text: 'AUTH', color: '#dc3545' },
  NETWORK: { text: 'NET', color: '#dc3545' },
};

function showBadge(type, persistent = false) {
  const badge = BADGES[type] || BADGES.ERROR;
  chrome.action.setBadgeText({ text: badge.text });
  chrome.action.setBadgeBackgroundColor({ color: badge.color });
  
  // Only set timeout if not persistent
  if (!persistent) {
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), CONFIG.BADGE_TIMEOUT);
  }
}

function clearBadge() {
  chrome.action.setBadgeText({ text: '' });
}

// Tab state management
function setTabState(tabId, url, badgeType = null, existingTask = null) {
  tabStates.set(tabId, { 
    url, 
    badgeType, 
    isDuplicate: badgeType === 'DUPLICATE',
    existingTask 
  });
}

function getTabState(tabId) {
  return tabStates.get(tabId) || null;
}

function removeTabState(tabId) {
  tabStates.delete(tabId);
}

async function updateBadgeForActiveTab() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      clearBadge();
      return;
    }

    const tabState = getTabState(activeTab.id);
    if (tabState?.badgeType) {
      showBadge(tabState.badgeType, true);
    } else {
      clearBadge();
    }
  } catch (error) {
    console.error('Failed to update badge for active tab:', error);
    clearBadge();
  }
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

// Check if task already exists for this URL
async function checkForDuplicate(token, projectId, url) {
  // Search entire project, not just target section
  const searchResult = await findTaskInProject(token, projectId, url);
  return searchResult.found ? searchResult : null; // Return the search result object if found, null if not
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

    // Check current tab state first
    const tabState = getTabState(tab.id);
    if (tabState?.isDuplicate && tabState?.existingTask) {
      // Open existing task in Todoist (works for both active and completed tasks)
      const todoistUrl = `https://app.todoist.com/app/task/${tabState.existingTask.id}`;
      await chrome.tabs.create({ url: todoistUrl });
      return; // Badge stays as is
    }

    // No duplicate found or state not yet determined, proceed with scraping
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js'],
    });
  } catch (error) {
    console.error('Icon click error:', error);
    showBadge('ERROR');
  }
}

// Check page automatically when tab is updated/loaded
async function handleTabUpdate(tabId, changeInfo, tab) {
  // Only process complete page loads with URLs
  if (changeInfo.status !== 'complete' || !tab.url) return;

  if (isOfferUrl(tab.url)) {
    // On ImmoMetrica offer page - check for duplicates
    try {
      const token = await getToken();
      if (!token) {
        setTabState(tabId, tab.url);
        await updateBadgeForActiveTab();
        return;
      }
      
      const { projectId } = await resolveProjectAndSection(token);
      const existingTask = await checkForDuplicate(token, projectId, tab.url);
      
      if (existingTask) {
        // Determine badge type based on task type from search result
        const badgeType = existingTask.type === 'COMPLETED' ? 'COMPLETED' : 'DUPLICATE';
        setTabState(tabId, tab.url, badgeType, existingTask.task);
      } else {
        setTabState(tabId, tab.url);
      }
    } catch (error) {
      console.error('Auto-check error:', error);
      setTabState(tabId, tab.url);
    }
  } else {
    // Not on ImmoMetrica offer page - clear state
    setTabState(tabId, tab.url);
  }

  await updateBadgeForActiveTab();
}

// Handle tab switching (activation)
async function handleTabActivation(activeInfo) {
  await updateBadgeForActiveTab();
}

// Handle tab removal (cleanup)
async function handleTabRemoval(tabId) {
  removeTabState(tabId);
  // No need to update badge here as the tab is being removed
}

// Handle content script messages
async function handleMessage(message, sender) {
  if (message.type !== 'SCRAPE_RESULT') return;

  const tabId = sender.tab?.id;
  if (!tabId) return;

  try {
    const { valid, title, url, location } = message.payload || {};
    
    if (!valid) {
      showBadge('INVALID');
      return;
    }

    const token = await getToken();
    if (!token) {
      showBadge('NO_TOKEN');
      return;
    }

    const { projectId, sectionId } = await resolveProjectAndSection(token);

    // Check for duplicate first
    const existingTask = await checkForDuplicate(token, projectId, url);
    if (existingTask) {
      const badgeType = existingTask.checked ? 'COMPLETED' : 'DUPLICATE';
      setTabState(tabId, url, badgeType, existingTask);
      showBadge(badgeType, true); // Persistent badge
      return;
    }

    await createListingTask({ title, url, location });
    showBadge('OK');
    
    // After successful creation, update tab state and show persistent DUP badge
    setTimeout(async () => {
      // Re-check to get the newly created task
      const newTask = await checkForDuplicate(token, projectId, url);
      setTabState(tabId, url, 'DUPLICATE', newTask);
      showBadge('DUPLICATE', true);
    }, CONFIG.BADGE_TIMEOUT);
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
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onActivated.addListener(handleTabActivation);
chrome.tabs.onRemoved.addListener(handleTabRemoval);
