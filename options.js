// Options Page - Todoist Extension Settings
import { getToken, setToken, clearToken, clearCache, getCache, getProjectConfig, setProjectConfig, clearProjectConfig } from './utils/storage.js';
import { getProjects, getSections } from './api/todoistApi.js';

const elements = {
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

function showStatus(message, type = 'success') {
  const { status } = elements;
  status.textContent = message;
  status.className = `status ${type} show`;
  setTimeout(() => status.classList.remove('show'), 3000);
}

function formatCacheAge(timestamp) {
  if (!timestamp) return 'Unknown';
  const age = Date.now() - timestamp;
  const hours = Math.floor(age / (1000 * 60 * 60));
  const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m ago` : `${minutes}m ago`;
}

async function updateCacheDisplay() {
  try {
    const cache = await getCache();
    if (cache) {
      elements.cacheDetails.innerHTML = `
        <div><strong>Project:</strong> ${cache.projectName || cache.projectId}</div>
        <div><strong>Section:</strong> ${cache.sectionName || cache.sectionId}</div>
        <div><strong>Cached:</strong> ${formatCacheAge(cache.timestamp)}</div>
      `;
      elements.cacheInfo.style.display = 'block';
    } else {
      elements.cacheInfo.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to update cache display:', error);
  }
}

function validateToken(token) {
  return token && token.length >= 40 && /^[a-f0-9]+$/i.test(token);
}

async function handleSaveToken() {
  const token = elements.tokenInput.value.trim();
  
  if (!token) {
    showStatus('Please enter a token', 'error');
    elements.tokenInput.focus();
    return;
  }
  
  if (!validateToken(token)) {
    showStatus('Token format appears invalid', 'error');
    elements.tokenInput.focus();
    return;
  }
  
  try {
    await setToken(token);
    showStatus('Token saved successfully');
    await loadProjects(); // Load projects after saving token
  } catch (error) {
    console.error('Save token error:', error);
    showStatus('Failed to save token', 'error');
  }
}

async function handleClearToken() {
  if (!confirm('Clear the API token?')) return;
  
  try {
    await clearToken();
    elements.tokenInput.value = '';
    showStatus('Token cleared');
    await resetProjectConfiguration(); // Reset project config when token cleared
  } catch (error) {
    console.error('Clear token error:', error);
    showStatus('Failed to clear token', 'error');
  }
}

async function handleClearCache() {
  if (!confirm('Clear the project/section cache?')) return;
  
  try {
    await clearCache();
    await updateCacheDisplay();
    showStatus('Cache cleared');
  } catch (error) {
    console.error('Clear cache error:', error);
    showStatus('Failed to clear cache', 'error');
  }
}

async function init() {
  try {
    const token = await getToken();
    if (token) {
      elements.tokenInput.value = token;
      await loadProjects();
    } else {
      await resetProjectConfiguration();
    }
    
    await updateCacheDisplay();
    
    elements.saveBtn.addEventListener('click', handleSaveToken);
    elements.clearTokenBtn.addEventListener('click', handleClearToken);
    elements.clearCacheBtn.addEventListener('click', handleClearCache);
    elements.saveProjectBtn.addEventListener('click', handleSaveProject);
    elements.resetProjectBtn.addEventListener('click', handleResetProject);
    
    elements.projectSelect.addEventListener('change', handleProjectChange);
    
    elements.tokenInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') handleSaveToken();
    });
    
    if (!token) elements.tokenInput.focus();
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus('Failed to initialize settings', 'error');
  }
}

// Project/Section Management Functions
async function loadProjects() {
  try {
    const token = await getToken();
    if (!token) {
      await resetProjectConfiguration();
      return;
    }

    showStatus('Loading projects...', 'success');
    
    const projects = await getProjects(token);
    
    // Clear and populate project dropdown
    elements.projectSelect.innerHTML = '';
    
    // Add inbox option (no project)
    const inboxOption = document.createElement('option');
    inboxOption.value = '';
    inboxOption.textContent = 'Inbox (Default)';
    elements.projectSelect.appendChild(inboxOption);
    
    // Add all projects
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      elements.projectSelect.appendChild(option);
    });
    
    // Load saved configuration
    const config = await getProjectConfig();
    if (config) {
      elements.projectSelect.value = config.projectId || '';
      await loadSections(config.projectId);
      if (config.sectionId) {
        elements.sectionSelect.value = config.sectionId;
      }
    } else {
      await loadSections(null); // Load inbox sections
    }
    
    // Enable controls
    elements.projectSelect.disabled = false;
    elements.saveProjectBtn.disabled = false;
    elements.resetProjectBtn.disabled = false;
    
    showStatus('Projects loaded successfully', 'success');
  } catch (error) {
    console.error('Failed to load projects:', error);
    showStatus('Failed to load projects. Check your API token.', 'error');
    await resetProjectConfiguration();
  }
}

async function loadSections(projectId) {
  try {
    elements.sectionSelect.innerHTML = '<option value="">Loading sections...</option>';
    elements.sectionSelect.disabled = true;
    
    if (!projectId) {
      // Inbox has no sections
      elements.sectionSelect.innerHTML = '<option value="">No sections (Inbox)</option>';
      return;
    }
    
    const token = await getToken();
    const sections = await getSections(token, projectId);
    
    // Clear and populate section dropdown
    elements.sectionSelect.innerHTML = '';
    
    // Add no section option
    const noSectionOption = document.createElement('option');
    noSectionOption.value = '';
    noSectionOption.textContent = 'No section';
    elements.sectionSelect.appendChild(noSectionOption);
    
    // Add all sections
    sections.forEach(section => {
      const option = document.createElement('option');
      option.value = section.id;
      option.textContent = section.name;
      elements.sectionSelect.appendChild(option);
    });
    
    elements.sectionSelect.disabled = false;
  } catch (error) {
    console.error('Failed to load sections:', error);
    elements.sectionSelect.innerHTML = '<option value="">Failed to load sections</option>';
  }
}

async function handleProjectChange() {
  const selectedProjectId = elements.projectSelect.value;
  await loadSections(selectedProjectId);
  elements.sectionSelect.value = ''; // Reset section selection
}

async function handleSaveProject() {
  try {
    const projectId = elements.projectSelect.value || null;
    const sectionId = elements.sectionSelect.value || null;
    
    const config = { projectId, sectionId };
    await setProjectConfig(config);
    
    const projectName = projectId ? 
      elements.projectSelect.options[elements.projectSelect.selectedIndex].text : 
      'Inbox';
    const sectionName = sectionId ? 
      elements.sectionSelect.options[elements.sectionSelect.selectedIndex].text : 
      'No section';
    
    showStatus(`Configuration saved: ${projectName} → ${sectionName}`, 'success');
    await clearCache(); // Clear cache when config changes
  } catch (error) {
    console.error('Failed to save project configuration:', error);
    showStatus('Failed to save configuration', 'error');
  }
}

async function handleResetProject() {
  if (!confirm('Reset to Inbox with no section?')) return;
  
  try {
    await clearProjectConfig();
    elements.projectSelect.value = '';
    elements.sectionSelect.value = '';
    await loadSections(null);
    showStatus('Configuration reset to Inbox', 'success');
    await clearCache();
  } catch (error) {
    console.error('Failed to reset project configuration:', error);
    showStatus('Failed to reset configuration', 'error');
  }
}

async function resetProjectConfiguration() {
  elements.projectSelect.innerHTML = '<option value="">Add API token to configure projects</option>';
  elements.projectSelect.disabled = true;
  elements.sectionSelect.innerHTML = '<option value="">Select a project first</option>';
  elements.sectionSelect.disabled = true;
  elements.saveProjectBtn.disabled = true;
  elements.resetProjectBtn.disabled = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
