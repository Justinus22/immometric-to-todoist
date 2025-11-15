/**
 * Storage Utilities - Chrome Extension Local Storage
 * Modern wrapper for chrome.storage.local with type safety and validation
 */

// Storage keys
const KEYS = {
  TOKEN: 'todoistToken',
  CACHE: 'todoistCache',
};

// Cache expiration time (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Generic storage getter with optional validation
 */
async function getStorageItem(key, validator = null) {
  try {
    const result = await chrome.storage.local.get([key]);
    const value = result[key] || null;
    
    if (value && validator && !validator(value)) {
      console.warn(`Invalid data for key ${key}, removing`);
      await chrome.storage.local.remove([key]);
      return null;
    }
    
    return value;
  } catch (error) {
    console.error(`Failed to get storage item ${key}:`, error);
    return null;
  }
}

/**
 * Generic storage setter
 */
async function setStorageItem(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error(`Failed to set storage item ${key}:`, error);
    throw new Error(`Storage write failed: ${error.message}`);
  }
}

/**
 * Generic storage remover
 */
async function removeStorageItem(key) {
  try {
    await chrome.storage.local.remove([key]);
  } catch (error) {
    console.error(`Failed to remove storage item ${key}:`, error);
  }
}

/**
 * Validate cache object structure and freshness
 */
function validateCache(cache) {
  return (
    cache &&
    typeof cache === 'object' &&
    cache.projectId &&
    cache.sectionId &&
    cache.timestamp &&
    (Date.now() - cache.timestamp) < CACHE_DURATION
  );
}

/**
 * Validate token (basic non-empty string check)
 */
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

/**
 * Clear all extension data
 */
export async function clearAllData() {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    console.error('Failed to clear all data:', error);
  }
}

/**
 * Get storage usage stats
 */
export async function getStorageStats() {
  try {
    const data = await chrome.storage.local.get(null);
    return {
      totalItems: Object.keys(data).length,
      hasToken: !!data[KEYS.TOKEN],
      hasCache: !!data[KEYS.CACHE],
      cacheAge: data[KEYS.CACHE]?.timestamp 
        ? Date.now() - data[KEYS.CACHE].timestamp 
        : null,
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return null;
  }
}
