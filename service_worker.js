// Background Service Worker - Immometrica to Todoist Extension
import { getToken, getCache, setCache, getProjectConfig } from './utils/storage.js';
import { getProjects, getSections, getLabels, createLabel, createTask, getTasks, findTaskByDescription, findTaskInProject, TodoistApiError } from './api/todoistApi.js';

// Tab state tracking
const tabStates = new Map(); // tabId -> { url, badgeType, isDuplicate, existingTask }
const processingTabs = new Set(); // Track tabs currently being processed

const CONFIG = {
  PROJECT_NAME: 'Akquise', // Fallback for legacy configs  
  SECTION_NAME: 'Noch nicht angefragt aber interessant', // Fallback for legacy configs
  BADGE_TIMEOUT: 3000,
};

// Enhanced badge system with better visual design
const BADGES = {
  // Success states - Green palette
  OK: { text: '✓', color: '#22c55e', bgColor: '#22c55e' }, // Modern green
  SAVED: { text: '✓', color: '#22c55e', bgColor: '#22c55e' }, // Darker green for saved
  
  // Already added states - Same green as success for seamless UX
  ALREADY_ADDED: { text: '✓', color: '#22c55e', bgColor: '#22c55e' }, // Same green checkmark as OK
  COMPLETED_TASK: { text: '✓', color: '#ffffff', bgColor: '#64748b' }, // Same checkmark for completed
  
  // Error states - Red palette
  ERROR: { text: '✕', color: '#ef4444', bgColor: '#ef4444' }, // Modern red
  NO_URL: { text: '🔗', color: '#ef4444', bgColor: '#ef4444' }, // Link icon for URL issues
  NO_TOKEN: { text: '🔑', color: '#f97316', bgColor: '#f97316' }, // Key icon for auth
  
  // Configuration issues - Orange palette
  PROJECT: { text: '📁', color: '#f97316', bgColor: '#f97316' }, // Folder for project issues
  SECTION: { text: '📋', color: '#f97316', bgColor: '#f97316' }, // List for section issues
  
  // Network/API issues - Purple palette
  NETWORK: { text: '🌐', color: '#8b5cf6', bgColor: '#8b5cf6' }, // Globe for network
  AUTH: { text: '🚫', color: '#8b5cf6', bgColor: '#8b5cf6' }, // Prohibition for auth errors
  
  // Processing states - Subtle gray (not warning!)
  PROCESSING: { text: '⏳', color: '#6b7280', bgColor: '#6b7280' }, // Subtle gray hourglass
};

// Enhanced badge display with better visual feedback
function showBadge(type, persistent = false, options = {}) {
  const badge = BADGES[type] || BADGES.ERROR;
  
  // Set badge with enhanced styling
  chrome.action.setBadgeText({ 
    text: badge.text,
    tabId: options.tabId 
  });
  
  chrome.action.setBadgeBackgroundColor({ 
    color: badge.bgColor,
    tabId: options.tabId 
  });
  
  // Add title tooltip for better UX
  const tooltips = {
    OK: 'Task created successfully',
    SAVED: 'Task saved to Todoist',
    ALREADY_ADDED: 'This offer is already in your Todoist',
    COMPLETED_TASK: 'This offer was already completed in Todoist',
    ERROR: 'An error occurred',
    NO_URL: 'Not on a valid offer page',
    NO_TOKEN: 'Please configure your Todoist token',
    PROJECT: 'Project configuration needed',
    SECTION: 'Section configuration needed',
    NETWORK: 'Network connection issue',
    AUTH: 'Authentication failed',
    PROCESSING: 'Adding to Todoist...',
  };
  
  if (tooltips[type]) {
    chrome.action.setTitle({ 
      title: `Immometrica → Todoist: ${tooltips[type]}`,
      tabId: options.tabId 
    });
  }
  
  // Auto-clear temporary badges (but keep persistent ones)
  if (!persistent) {
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: options.tabId });
      chrome.action.setTitle({ 
        title: 'Immometrica → Todoist Extension',
        tabId: options.tabId 
      });
    }, CONFIG.BADGE_TIMEOUT);
  }
}

function clearBadge(tabId = null) {
  chrome.action.setBadgeText({ text: '', tabId });
  chrome.action.setTitle({ 
    title: 'Immometrica → Todoist Extension',
    tabId 
  });
}

// Enhanced tab state management with better badge handling
function setTabState(tabId, url, badgeType = null, existingTask = null) {
  tabStates.set(tabId, { 
    url, 
    badgeType, 
    isDuplicate: ['ALREADY_ADDED', 'COMPLETED_TASK'].includes(badgeType),
    existingTask 
  });
}

function getTabState(tabId) {
  return tabStates.get(tabId) || null;
}

function removeTabState(tabId) {
  tabStates.delete(tabId);
  clearBadge(tabId);
}

// Update badge for currently active tab
async function updateBadgeForActiveTab() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;
    
    const tabState = getTabState(activeTab.id);
    if (tabState?.badgeType) {
      showBadge(tabState.badgeType, true, { tabId: activeTab.id });
    } else if (!isOfferUrl(activeTab.url)) {
      // Show NO_URL badge for non-property pages
      showBadge('NO_URL', true, { tabId: activeTab.id });
    } else {
      clearBadge(activeTab.id);
    }
  } catch (error) {
    console.error('Error updating badge for active tab:', error);
  }
}

function isOfferUrl(url) {
  return /^https:\/\/www\.immometrica\.com\/de\/offer\/\d+/.test(url);
}

// Find or retrieve cached project/section IDs based on user configuration
async function resolveProjectAndSection(token) {
  // Check for existing cache
  const cache = await getCache();
  if (cache?.projectId !== undefined && cache?.sectionId !== undefined) {
    return { projectId: cache.projectId, sectionId: cache.sectionId };
  }

  // Get user configuration
  const config = await getProjectConfig();
  
  let projectId = null;
  let sectionId = null;
  let projectName = 'Inbox';
  let sectionName = 'No section';
  
  if (config && config.projectId) {
    // User has configured a specific project
    projectId = config.projectId;
    sectionId = config.sectionId || null;
    
    // Get project and section names for caching
    try {
      const projects = await getProjects(token);
      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error(`Configured project not found`);
      
      projectName = project.name;
      
      if (sectionId) {
        const sections = await getSections(token, projectId);
        const section = sections.find(s => s.id === sectionId);
        if (!section) throw new Error(`Configured section not found`);
        sectionName = section.name;
      }
    } catch (error) {
      // Fall back to legacy behavior if configured project/section not found
      console.warn('Configured project/section not found, falling back to legacy config:', error);
      return await resolveLegacyProjectAndSection(token);
    }
  } else {
    // No configuration - use inbox (projectId = null, sectionId = null)
    projectId = null;
    sectionId = null;
  }

  // Cache the resolved configuration
  await setCache({
    projectId,
    sectionId,
    projectName,
    sectionName,
    timestamp: Date.now(),
  });

  return { projectId, sectionId };
}

// Legacy fallback for existing users
async function resolveLegacyProjectAndSection(token) {
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
  };

  // Only add project_id if not using inbox (null means inbox)
  if (projectId) {
    taskData.project_id = projectId;
  }

  // Only add section_id if specified (null means no section)
  if (sectionId) {
    taskData.section_id = sectionId;
  }

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

    // Prevent double-processing
    if (processingTabs.has(tab.id)) {
      console.log('Tab already being processed, skipping...');
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
      console.log('Redirecting to existing task:', tabState.existingTask.id);
      const todoistUrl = `https://app.todoist.com/app/task/${tabState.existingTask.id}`;
      await chrome.tabs.create({ url: todoistUrl });
      return; // Badge stays as is
    }

    // Mark tab as being processed
    processingTabs.add(tab.id);

    // No duplicate found or state not yet determined, proceed with scraping
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js'],
    });
  } catch (error) {
    console.error('Icon click error:', error);
    showBadge('ERROR');
    // Clean up processing state on error
    processingTabs.delete(tab.id);
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
        const badgeType = existingTask.type === 'COMPLETED' ? 'COMPLETED_TASK' : 'ALREADY_ADDED';
        setTabState(tabId, tab.url, badgeType, existingTask.task);
      } else {
        setTabState(tabId, tab.url);
      }
    } catch (error) {
      console.error('Auto-check error:', error);
      setTabState(tabId, tab.url);
    }
  } else {
    // Not on ImmoMetrica offer page - show NO_URL badge
    setTabState(tabId, tab.url, 'NO_URL');
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
      showBadge('NO_URL');
      return;
    }

    const token = await getToken();
    if (!token) {
      showBadge('NO_TOKEN');
      return;
    }

    const { projectId, sectionId } = await resolveProjectAndSection(token);

    // Show processing state
    showBadge('PROCESSING');
    
    // Check for duplicate first
    const existingTask = await checkForDuplicate(token, projectId, url);
    if (existingTask) {
      const badgeType = existingTask.type === 'COMPLETED' ? 'COMPLETED_TASK' : 'ALREADY_ADDED';
      setTabState(tabId, url, badgeType, existingTask.task);
      showBadge(badgeType, true); // Persistent badge
      return;
    }

    await createListingTask({ title, url, location });
    
    // Show saved confirmation with a nice effect
    showBadge('SAVED', false, { tabId });
    
    // After successful creation, update tab state and show persistent badge
    setTimeout(async () => {
      // Re-check to get the newly created task
      const newTask = await checkForDuplicate(token, projectId, url);
      if (newTask) {
        setTabState(tabId, url, 'ALREADY_ADDED', newTask.task);
        showBadge('ALREADY_ADDED', true, { tabId });
      }
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
  } finally {
    // Always clean up processing state
    processingTabs.delete(tabId);
  }
}

// Event listeners
chrome.action.onClicked.addListener(handleIconClick);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onActivated.addListener(handleTabActivation);
chrome.tabs.onRemoved.addListener(handleTabRemoval);
chrome.tabs.onRemoved.addListener(handleTabRemoval);
