// Storage utilities for token and project/section cache.
// Uses chrome.storage.local; all functions return Promises.

const TOKEN_KEY = 'todoistToken';
const CACHE_KEY = 'todoistCache'; // { projectId, projectName, sectionId, sectionName, cacheTimestamp }

export async function getToken() {
  const data = await chrome.storage.local.get([TOKEN_KEY]);
  return data[TOKEN_KEY] || null;
}

export async function setToken(token) {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function getCache() {
  const data = await chrome.storage.local.get([CACHE_KEY]);
  return data[CACHE_KEY] || null;
}

export async function setCache(cacheObj) {
  await chrome.storage.local.set({ [CACHE_KEY]: cacheObj });
}

export async function clearCache() {
  await chrome.storage.local.remove([CACHE_KEY]);
}

export async function clearToken() {
  await chrome.storage.local.remove([TOKEN_KEY]);
}
