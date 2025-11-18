// Options Page - Settings
import { getToken, setToken, clearToken, clearCache, getCache, getProjectConfig, setProjectConfig, clearProjectConfig } from './utils/storage.js';
import { getProjects, getSections } from './api/todoistApi.js';

// DOM elements
const el = {
  tokenInput: document.getElementById('token'),
  saveBtn: document.getElementById('saveBtn'),
  clearTokenBtn: document.getElementById('clearTokenBtn'),
  clearCacheBtn: document.getElementById('clearCacheBtn'),
  projectSelect: document.getElementById('project'),
  sectionSelect: document.getElementById('section'),
  saveProjectBtn: document.getElementById('saveProjectBtn'),
  resetProjectBtn: document.getElementById('resetProjectBtn'),
  status: document.getElementById('status'),
  cacheInfo: document.getElementById('cacheInfo'),
  cacheDetails: document.getElementById('cacheDetails'),
};

// Show status message
const showStatus = (message, type = 'success') => {
  el.status.textContent = message;
  el.status.className = `status ${type} show`;
  setTimeout(() => el.status.classList.remove('show'), 3000);
};

// Format cache age
const formatCacheAge = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const age = Date.now() - timestamp;
  const hours = Math.floor(age / (1000 * 60 * 60));
  const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m ago` : `${minutes}m ago`;
};

// Update cache display
const updateCacheDisplay = async () => {
  try {
    const cache = await getCache();
    if (cache) {
      el.cacheDetails.innerHTML = `
        <div><strong>Project:</strong> ${cache.projectName || cache.projectId}</div>
        <div><strong>Section:</strong> ${cache.sectionName || cache.sectionId}</div>
        <div><strong>Cached:</strong> ${formatCacheAge(cache.timestamp)}</div>
      `;
      el.cacheInfo.style.display = 'block';
    } else {
      el.cacheInfo.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to update cache display:', error);
  }
};

// Validate token format
const validateToken = (token) => token && token.length >= 40 && /^[a-f0-9]+$/i.test(token);

// Token handlers
const handleSaveToken = async () => {
  const token = el.tokenInput.value.trim();

  if (!token) {
    showStatus('Please enter a token', 'error');
    el.tokenInput.focus();
    return;
  }

  if (!validateToken(token)) {
    showStatus('Token format appears invalid', 'error');
    el.tokenInput.focus();
    return;
  }

  try {
    await setToken(token);
    showStatus('Token saved successfully');
    await loadProjects();
  } catch (error) {
    console.error('Save token error:', error);
    showStatus('Failed to save token', 'error');
  }
};

const handleClearToken = async () => {
  if (!confirm('Clear the API token?')) return;

  try {
    await clearToken();
    el.tokenInput.value = '';
    showStatus('Token cleared');
    await resetProjectConfiguration();
  } catch (error) {
    console.error('Clear token error:', error);
    showStatus('Failed to clear token', 'error');
  }
};

const handleClearCache = async () => {
  if (!confirm('Clear the project/section cache?')) return;

  try {
    await clearCache();
    await updateCacheDisplay();
    showStatus('Cache cleared');
  } catch (error) {
    console.error('Clear cache error:', error);
    showStatus('Failed to clear cache', 'error');
  }
};

// Project/Section management
const loadProjects = async () => {
  try {
    const token = await getToken();
    if (!token) {
      await resetProjectConfiguration();
      return;
    }

    showStatus('Loading projects...', 'success');

    const projects = await getProjects(token);

    el.projectSelect.innerHTML = '';

    // Add inbox option
    const inboxOption = document.createElement('option');
    inboxOption.value = '';
    inboxOption.textContent = 'Inbox (Default)';
    el.projectSelect.appendChild(inboxOption);

    // Add projects
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      el.projectSelect.appendChild(option);
    });

    // Load saved configuration
    const config = await getProjectConfig();
    if (config) {
      el.projectSelect.value = config.projectId || '';
      await loadSections(config.projectId);
      if (config.sectionId) {
        el.sectionSelect.value = config.sectionId;
      }
    } else {
      await loadSections(null);
    }

    // Enable controls
    el.projectSelect.disabled = false;
    el.saveProjectBtn.disabled = false;
    el.resetProjectBtn.disabled = false;

    showStatus('Projects loaded successfully', 'success');
  } catch (error) {
    console.error('Failed to load projects:', error);
    showStatus('Failed to load projects. Check your API token.', 'error');
    await resetProjectConfiguration();
  }
};

const loadSections = async (projectId) => {
  try {
    el.sectionSelect.innerHTML = '<option value="">Loading sections...</option>';
    el.sectionSelect.disabled = true;

    if (!projectId) {
      el.sectionSelect.innerHTML = '<option value="">No sections (Inbox)</option>';
      return;
    }

    const token = await getToken();
    const sections = await getSections(token, projectId);

    el.sectionSelect.innerHTML = '';

    // Add no section option
    const noSectionOption = document.createElement('option');
    noSectionOption.value = '';
    noSectionOption.textContent = 'No section';
    el.sectionSelect.appendChild(noSectionOption);

    // Add sections
    sections.forEach(section => {
      const option = document.createElement('option');
      option.value = section.id;
      option.textContent = section.name;
      el.sectionSelect.appendChild(option);
    });

    el.sectionSelect.disabled = false;
  } catch (error) {
    console.error('Failed to load sections:', error);
    el.sectionSelect.innerHTML = '<option value="">Failed to load sections</option>';
  }
};

const handleProjectChange = async () => {
  const selectedProjectId = el.projectSelect.value;
  await loadSections(selectedProjectId);
  el.sectionSelect.value = '';
};

const handleSaveProject = async () => {
  try {
    const projectId = el.projectSelect.value || null;
    const sectionId = el.sectionSelect.value || null;

    await setProjectConfig({ projectId, sectionId });

    const projectName = projectId
      ? el.projectSelect.options[el.projectSelect.selectedIndex].text
      : 'Inbox';
    const sectionName = sectionId
      ? el.sectionSelect.options[el.sectionSelect.selectedIndex].text
      : 'No section';

    showStatus(`Configuration saved: ${projectName} → ${sectionName}`, 'success');
    await clearCache();
  } catch (error) {
    console.error('Failed to save project configuration:', error);
    showStatus('Failed to save configuration', 'error');
  }
};

const handleResetProject = async () => {
  if (!confirm('Reset to Inbox with no section?')) return;

  try {
    await clearProjectConfig();
    el.projectSelect.value = '';
    el.sectionSelect.value = '';
    await loadSections(null);
    showStatus('Configuration reset to Inbox', 'success');
    await clearCache();
  } catch (error) {
    console.error('Failed to reset project configuration:', error);
    showStatus('Failed to reset configuration', 'error');
  }
};

const resetProjectConfiguration = async () => {
  el.projectSelect.innerHTML = '<option value="">Add API token to configure projects</option>';
  el.projectSelect.disabled = true;
  el.sectionSelect.innerHTML = '<option value="">Select a project first</option>';
  el.sectionSelect.disabled = true;
  el.saveProjectBtn.disabled = true;
  el.resetProjectBtn.disabled = true;
};

// Initialize
const init = async () => {
  try {
    const token = await getToken();
    if (token) {
      el.tokenInput.value = token;
      await loadProjects();
    } else {
      await resetProjectConfiguration();
    }

    await updateCacheDisplay();

    // Event listeners
    el.saveBtn.addEventListener('click', handleSaveToken);
    el.clearTokenBtn.addEventListener('click', handleClearToken);
    el.clearCacheBtn.addEventListener('click', handleClearCache);
    el.saveProjectBtn.addEventListener('click', handleSaveProject);
    el.resetProjectBtn.addEventListener('click', handleResetProject);
    el.projectSelect.addEventListener('change', handleProjectChange);
    el.tokenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSaveToken();
    });

    if (!token) el.tokenInput.focus();
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus('Failed to initialize settings', 'error');
  }
};

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
