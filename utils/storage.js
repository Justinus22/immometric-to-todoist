// Chrome Extension Storage Utilities
const KEYS = {
  TOKEN: 'todoistToken',
  CACHE: 'todoistCache',
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Generic storage operations
async function getStorageItem(key, validator) {
  try {
    const result = await chrome.storage.local.get([key]);
    const value = result[key] || null;
    
    if (value && validator && !validator(value)) {
      await chrome.storage.local.remove([key]);
      return null;
    }
    
    return value;
  } catch (error) {
    console.error(`Failed to get storage item ${key}:`, error);
    return null;
  }
}

async function setStorageItem(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error(`Failed to set storage item ${key}:`, error);
    throw new Error(`Storage write failed: ${error.message}`);
  }
}

async function removeStorageItem(key) {
  try {
    await chrome.storage.local.remove([key]);
  } catch (error) {
    console.error(`Failed to remove storage item ${key}:`, error);
  }
}

// Validators
function validateCache(cache) {
  return cache &&
         typeof cache === 'object' &&
         cache.projectId &&
         cache.sectionId &&
         cache.timestamp &&
         (Date.now() - cache.timestamp) < CACHE_DURATION;
}

function validateToken(token) {
  return typeof token === 'string' && token.length > 0;
}

// Public API
export const getToken = () => getStorageItem(KEYS.TOKEN, validateToken);
export const setToken = (token) => setStorageItem(KEYS.TOKEN, token);
export const clearToken = () => removeStorageItem(KEYS.TOKEN);

export const getCache = () => getStorageItem(KEYS.CACHE, validateCache);
export const setCache = (cache) => setStorageItem(KEYS.CACHE, { ...cache, timestamp: Date.now() });
export const clearCache = () => removeStorageItem(KEYS.CACHE);

export async function clearAllData() {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    console.error('Failed to clear all data:', error);
  }
}

export async function getStorageStats() {
  try {
    const data = await chrome.storage.local.get(null);
    return {
      totalItems: Object.keys(data).length,
      hasToken: !!data[KEYS.TOKEN],
      hasCache: !!data[KEYS.CACHE],
      cacheAge: data[KEYS.CACHE]?.timestamp ? Date.now() - data[KEYS.CACHE].timestamp : null,
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return null;
  }
}
