// Background Service Worker
import { getToken, getCache, setCache, getProjectConfig } from './utils/storage.js';
import { getProjects, getSections, getLabels, createLabel, createTask, getTasks, getCompletedTasks, findTaskInProject, TodoistApiError } from './api/todoistApi.js';

// State
const tabStates = new Map();
const processingTabs = new Set();
const duplicateCheckCache = new Map();
const pendingDuplicateChecks = new Map();
const tabUpdateDebounceTimers = new Map();

// Configuration
const CONFIG = {
  PROJECT_NAME: 'Akquise', // Legacy fallback
  SECTION_NAME: 'Noch nicht angefragt aber interessant', // Legacy fallback
  BADGE_TIMEOUT: 3000,
  TAB_UPDATE_DEBOUNCE: 300,
  DUPLICATE_CHECK_CACHE_TTL: 5 * 60 * 1000,
  CHECK_COMPLETED_TASKS: true,
};

// Badge definitions
const BADGES = {
  SUCCESS: { text: '✓', color: '#22c55e', title: 'Task created successfully' },
  EXISTS: { text: '✓', color: '#22c55e', title: 'Already in your Todoist' },
  COMPLETED: { text: '✓', color: '#64748b', title: 'Already completed in Todoist' },
  ERROR: { text: '✕', color: '#ef4444', title: 'An error occurred' },
  NO_URL: { text: '🔗', color: '#ef4444', title: 'Not on a valid offer page' },
  NO_TOKEN: { text: '🔑', color: '#f97316', title: 'Please configure your Todoist token' },
  PROCESSING: { text: '⏳', color: '#6b7280', title: 'Adding to Todoist...' },
};

// Badge management
const showBadge = (type, persistent = false, { tabId } = {}) => {
  const badge = BADGES[type] || BADGES.ERROR;

  chrome.action.setBadgeText({ text: badge.text, tabId });
  chrome.action.setBadgeBackgroundColor({ color: badge.color, tabId });
  chrome.action.setTitle({ title: `ImmoMetrica → Todoist: ${badge.title}`, tabId });

  if (!persistent) {
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId });
      chrome.action.setTitle({ title: 'ImmoMetrica → Todoist', tabId });
    }, CONFIG.BADGE_TIMEOUT);
  }
};

const clearBadge = (tabId = null) => {
  chrome.action.setBadgeText({ text: '', tabId });
  chrome.action.setTitle({ title: 'ImmoMetrica → Todoist', tabId });
};

// Tab state management
const setTabState = (tabId, url, badgeType = null, existingTask = null) => {
  tabStates.set(tabId, {
    url,
    badgeType,
    isDuplicate: ['EXISTS', 'COMPLETED'].includes(badgeType),
    existingTask,
  });
};

const getTabState = (tabId) => tabStates.get(tabId) || null;

const removeTabState = (tabId) => {
  tabStates.delete(tabId);
  clearBadge(tabId);
};

const updateBadgeForActiveTab = async () => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;

    const tabState = getTabState(activeTab.id);
    if (tabState?.badgeType) {
      showBadge(tabState.badgeType, true, { tabId: activeTab.id });
    } else if (!isOfferUrl(activeTab.url)) {
      showBadge('NO_URL', true, { tabId: activeTab.id });
    } else {
      clearBadge(activeTab.id);
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
};

// URL validation
const isOfferUrl = (url) => /^https:\/\/www\.immometrica\.com\/de\/offer\/\d+/.test(url);

// Project/section resolution
const resolveProjectAndSection = async (token) => {
  const cache = await getCache();
  if (cache?.projectId !== undefined && cache?.sectionId !== undefined) {
    return { projectId: cache.projectId, sectionId: cache.sectionId };
  }

  const config = await getProjectConfig();

  if (config?.projectId) {
    try {
      const projects = await getProjects(token);
      const project = projects.find(p => p.id === config.projectId);
      if (!project) throw new Error('Configured project not found');

      let sectionName = 'No section';
      if (config.sectionId) {
        const sections = await getSections(token, config.projectId);
        const section = sections.find(s => s.id === config.sectionId);
        if (!section) throw new Error('Configured section not found');
        sectionName = section.name;
      }

      await setCache({
        projectId: config.projectId,
        sectionId: config.sectionId || null,
        projectName: project.name,
        sectionName,
        timestamp: Date.now(),
      });

      return { projectId: config.projectId, sectionId: config.sectionId || null };
    } catch (error) {
      console.warn('Falling back to legacy config:', error);
      return resolveLegacyProjectAndSection(token);
    }
  }

  // Default to Inbox
  await setCache({
    projectId: null,
    sectionId: null,
    projectName: 'Inbox',
    sectionName: 'No section',
    timestamp: Date.now(),
  });

  return { projectId: null, sectionId: null };
};

const resolveLegacyProjectAndSection = async (token) => {
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
};

// Label resolution
const resolveLocationLabel = async (token, location) => {
  if (!location) return false;

  try {
    const labels = await getLabels(token);
    const existingLabel = labels.find(l => l.name === location);

    if (existingLabel) return true;

    const newLabel = await createLabel(token, { name: location });
    return !!newLabel;
  } catch (error) {
    console.error(`Failed to resolve label "${location}":`, error);
    return false;
  }
};

// Duplicate checking with caching and deduplication
const checkForDuplicate = async (token, projectId, url) => {
  if (!token || !url) {
    console.error('Invalid parameters for checkForDuplicate');
    return null;
  }

  const cached = duplicateCheckCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < CONFIG.DUPLICATE_CHECK_CACHE_TTL) {
    return cached.found ? cached : null;
  }

  const pending = pendingDuplicateChecks.get(url);
  if (pending) return pending;

  const checkPromise = (async () => {
    try {
      const searchResult = await findTaskInProject(token, projectId, url, CONFIG.CHECK_COMPLETED_TASKS);

      if (!searchResult || typeof searchResult.found !== 'boolean') {
        console.error('Invalid search result:', searchResult);
        return null;
      }

      const cacheEntry = {
        found: searchResult.found,
        type: searchResult.type || null,
        task: searchResult.task || null,
        timestamp: Date.now(),
      };

      duplicateCheckCache.set(url, cacheEntry);
      return searchResult.found ? searchResult : null;
    } catch (error) {
      console.error('Error in checkForDuplicate:', error);
      return null;
    } finally {
      pendingDuplicateChecks.delete(url);
    }
  })();

  pendingDuplicateChecks.set(url, checkPromise);
  return checkPromise;
};

// Task creation
const createListingTask = async ({ title, url, location }) => {
  if (!title || !url) throw new Error('Missing title or URL');

  const token = await getToken();
  if (!token) throw new Error('API token not configured');

  const { projectId, sectionId } = await resolveProjectAndSection(token);

  const taskData = { content: title, description: url };

  if (projectId) taskData.project_id = projectId;
  if (sectionId) taskData.section_id = sectionId;

  // Add labels: static "Angebot" label + location label
  const labels = [];

  // Always add "Angebot" label
  if (await resolveLocationLabel(token, 'Angebot')) {
    labels.push('Angebot');
  }

  // Add location label if available
  if (location && await resolveLocationLabel(token, location)) {
    labels.push(location);
  }

  if (labels.length > 0) {
    taskData.labels = labels;
  }

  await createTask(token, taskData);
  duplicateCheckCache.delete(url);
};

// Broadcast updates to search list pages
const broadcastTaskUpdate = async (url, exists, type, task) => {
  try {
    const tabs = await chrome.tabs.query({});
    const searchListTabs = tabs.filter(tab =>
      tab.url?.match(/^https:\/\/www\.immometrica\.com\/de\/search/)
    );

    for (const tab of searchListTabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TASK_STATUS_UPDATE',
        payload: { url, exists, type, task }
      }).catch(() => {}); // Ignore errors
    }
  } catch (error) {
    console.error('Error broadcasting update:', error);
  }
};

// Icon click handler
const handleIconClick = async (tab) => {
  try {
    if (!tab?.url || !isOfferUrl(tab.url)) {
      showBadge('NO_URL');
      return;
    }

    if (processingTabs.has(tab.id)) return;

    const token = await getToken();
    if (!token) {
      showBadge('NO_TOKEN');
      return;
    }

    const tabState = getTabState(tab.id);
    if (tabState?.isDuplicate && tabState?.existingTask) {
      await chrome.tabs.create({ url: `https://app.todoist.com/app/task/${tabState.existingTask.id}` });
      return;
    }

    processingTabs.add(tab.id);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js'],
    });
  } catch (error) {
    console.error('Icon click error:', error);
    showBadge('ERROR');
    processingTabs.delete(tab.id);
  }
};

// Tab update handler with debouncing
const handleTabUpdate = async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  const existingTimer = tabUpdateDebounceTimers.get(tabId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(async () => {
    tabUpdateDebounceTimers.delete(tabId);

    if (isOfferUrl(tab.url)) {
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
          const badgeType = existingTask.type === 'COMPLETED' ? 'COMPLETED' : 'EXISTS';
          setTabState(tabId, tab.url, badgeType, existingTask.task);
        } else {
          setTabState(tabId, tab.url);
        }
      } catch (error) {
        console.error('Auto-check error:', error);
        setTabState(tabId, tab.url);
      }
    } else {
      setTabState(tabId, tab.url, 'NO_URL');
    }

    await updateBadgeForActiveTab();
  }, CONFIG.TAB_UPDATE_DEBOUNCE);

  tabUpdateDebounceTimers.set(tabId, timer);
};

const handleTabActivation = async () => updateBadgeForActiveTab();

const handleTabRemoval = async (tabId) => {
  removeTabState(tabId);
  const timer = tabUpdateDebounceTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    tabUpdateDebounceTimers.delete(tabId);
  }
};

// Message handler
function handleMessage(message, sender, sendResponse) {
  if (message.type === 'INVALIDATE_CACHE') {
    duplicateCheckCache.clear();
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'LOAD_ALL_TASKS') {
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          sendResponse({ success: false, error: 'API token not configured' });
          return;
        }

        const { projectId } = await resolveProjectAndSection(token);
        const activeTasks = await getTasks(token, projectId, null);
        const completedTasks = CONFIG.CHECK_COMPLETED_TASKS
          ? await getCompletedTasks(token, projectId)
          : [];

        sendResponse({ success: true, activeTasks, completedTasks, projectId });
      } catch (error) {
        console.error('Error loading tasks:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'SCRAPE_RESULT') {
    const tabId = sender.tab?.id;
    if (!tabId) return false;

    (async () => {
      try {
        const { valid, title, url, location } = message.payload || {};

        if (!valid) {
          showBadge('NO_URL');
          return;
        }

        const token = await getToken();
        if (!token) {
          showBadge('NO_TOKEN');
          return;
        }

        const { projectId } = await resolveProjectAndSection(token);

        showBadge('PROCESSING');

        const existingTask = await checkForDuplicate(token, projectId, url);
        if (existingTask) {
          const badgeType = existingTask.type === 'COMPLETED' ? 'COMPLETED' : 'EXISTS';
          setTabState(tabId, url, badgeType, existingTask.task);
          showBadge(badgeType, true);
          return;
        }

        await createListingTask({ title, url, location });
        showBadge('SUCCESS', false, { tabId });

        setTimeout(async () => {
          const newTask = await checkForDuplicate(token, projectId, url);
          if (newTask) {
            setTabState(tabId, url, 'EXISTS', newTask.task);
            showBadge('EXISTS', true, { tabId });
            broadcastTaskUpdate(url, true, 'ACTIVE', newTask.task);
          }
        }, CONFIG.BADGE_TIMEOUT);
      } catch (error) {
        console.error('Message handling error:', error);

        if (error instanceof TodoistApiError) {
          showBadge(error.type === 'AUTH' ? 'NO_TOKEN' : 'ERROR');
        } else if (error.message.includes('token')) {
          showBadge('NO_TOKEN');
        } else {
          showBadge('ERROR');
        }
      } finally {
        processingTabs.delete(tabId);
      }
    })();

    return false;
  }

  return false;
}

// Event listeners
chrome.action.onClicked.addListener(handleIconClick);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onActivated.addListener(handleTabActivation);
chrome.tabs.onRemoved.addListener(handleTabRemoval);
