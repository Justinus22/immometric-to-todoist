// Options Page - Todoist Extension Settings
import { getToken, setToken, clearToken, clearCache, getCache } from './utils/storage.js';

const elements = {
  tokenInput: document.getElementById('token'),
  saveBtn: document.getElementById('saveBtn'),
  clearTokenBtn: document.getElementById('clearTokenBtn'),
  clearCacheBtn: document.getElementById('clearCacheBtn'),
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
    if (token) elements.tokenInput.value = token;
    
    await updateCacheDisplay();
    
    elements.saveBtn.addEventListener('click', handleSaveToken);
    elements.clearTokenBtn.addEventListener('click', handleClearToken);
    elements.clearCacheBtn.addEventListener('click', handleClearCache);
    
    elements.tokenInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') handleSaveToken();
    });
    
    if (!token) elements.tokenInput.focus();
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus('Failed to initialize settings', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
