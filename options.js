import { getToken, setToken, clearToken, clearCache, getCache } from './utils/storage.js';

const tokenInput = document.getElementById('token');
const saveBtn = document.getElementById('saveBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const clearTokenBtn = document.getElementById('clearTokenBtn');
const statusEl = document.getElementById('status');

function setStatus(msg, type = 'info') {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + (type === 'error' ? 'error' : (type === 'success' ? 'success' : ''));
}

async function init() {
  const token = await getToken();
  if (token) tokenInput.value = token;
  const cache = await getCache();
  if (cache) {
    setStatus(`Cache loaded: project=${cache.projectName || cache.projectId}, section=${cache.sectionName || cache.sectionId}`);
  }
}

saveBtn.addEventListener('click', async () => {
  const val = tokenInput.value.trim();
  if (!val) { setStatus('Token cannot be empty.', 'error'); return; }
  await setToken(val);
  setStatus('Token saved.', 'success');
});

clearCacheBtn.addEventListener('click', async () => {
  await clearCache();
  setStatus('Project/Section cache cleared.', 'success');
});

clearTokenBtn.addEventListener('click', async () => {
  await clearToken();
  tokenInput.value = '';
  setStatus('Token cleared.', 'success');
});

init();
