/**
 * Options Page - Todoist Extension Settings
 * Modern settings interface with improved UX
 */

import { 
  getToken, 
  setToken, 
  clearToken, 
  clearCache, 
  getCache,
  getStorageStats,
  clearAllData 
} from './utils/storage.js';

/**
 * DOM elements
 */
const elements = {
  tokenInput: document.getElementById('token'),
  saveBtn: document.getElementById('saveBtn'),
  clearTokenBtn: document.getElementById('clearTokenBtn'),
  clearCacheBtn: document.getElementById('clearCacheBtn'),
  status: document.getElementById('status'),
  cacheInfo: document.getElementById('cacheInfo'),
  cacheDetails: document.getElementById('cacheDetails'),
};

/**
 * Display status message with auto-hide
 */
function showStatus(message, type = 'info', duration = 5000) {
  const { status } = elements;
  
  status.textContent = message;
  status.className = `status ${type} show`;
  
  // Auto-hide after duration
  setTimeout(() => {
    status.classList.remove('show');
  }, duration);
}

/**
 * Format cache age for display
 */
function formatCacheAge(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const age = Date.now() - timestamp;
  const hours = Math.floor(age / (1000 * 60 * 60));
  const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  }
  return `${minutes}m ago`;
}

/**
 * Update cache information display
 */
async function updateCacheDisplay() {
  try {
    const cache = await getCache();
    const { cacheInfo, cacheDetails } = elements;
    
    if (cache) {
      const ageDisplay = formatCacheAge(cache.timestamp);
      
      cacheDetails.innerHTML = `
        <div><strong>Project:</strong> ${cache.projectName || cache.projectId}</div>
        <div><strong>Section:</strong> ${cache.sectionName || cache.sectionId}</div>
        <div><strong>Cached:</strong> ${ageDisplay}</div>
      `;
      cacheInfo.style.display = 'block';
    } else {
      cacheInfo.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to update cache display:', error);
  }
}

/**
 * Validate token format (basic check)
 */
function validateToken(token) {
  return token && 
         token.length >= 40 && 
         /^[a-f0-9]+$/i.test(token);
}

/**
 * Save token handler
 */
async function handleSaveToken() {
  const token = elements.tokenInput.value.trim();
  
  if (!token) {
    showStatus('Please enter a token', 'error');
    elements.tokenInput.focus();
    return;
  }
  
  if (!validateToken(token)) {
    showStatus('Token format appears invalid (should be 40+ hex characters)', 'error');
    elements.tokenInput.focus();
    return;
  }
  
  try {
    await setToken(token);
    showStatus('Token saved successfully', 'success');
  } catch (error) {
    console.error('Save token error:', error);
    showStatus('Failed to save token', 'error');
  }
}

/**
 * Clear token handler
 */
async function handleClearToken() {
  if (!confirm('Are you sure you want to clear the API token?')) {
    return;
  }
  
  try {
    await clearToken();
    elements.tokenInput.value = '';
    showStatus('Token cleared', 'success');
  } catch (error) {
    console.error('Clear token error:', error);
    showStatus('Failed to clear token', 'error');
  }
}

/**
 * Clear cache handler
 */
async function handleClearCache() {
  if (!confirm('Are you sure you want to clear the project/section cache?')) {
    return;
  }
  
  try {
    await clearCache();
    await updateCacheDisplay();
    showStatus('Cache cleared successfully', 'success');
  } catch (error) {
    console.error('Clear cache error:', error);
    showStatus('Failed to clear cache', 'error');
  }
}

/**
 * Initialize page
 */
async function init() {
  try {
    // Load existing token
    const token = await getToken();
    if (token) {
      elements.tokenInput.value = token;
    }
    
    // Update cache display
    await updateCacheDisplay();
    
    // Set up event listeners
    elements.saveBtn.addEventListener('click', handleSaveToken);
    elements.clearTokenBtn.addEventListener('click', handleClearToken);
    elements.clearCacheBtn.addEventListener('click', handleClearCache);
    
    // Handle Enter key in token input
    elements.tokenInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleSaveToken();
      }
    });
    
    // Focus token input if empty
    if (!token) {
      elements.tokenInput.focus();
    }
    
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus('Failed to initialize settings', 'error');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
