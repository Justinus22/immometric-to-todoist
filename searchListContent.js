// ImmoMetrica Search List - Todoist Integration (v2 UI)
(() => {
  'use strict';

  const CONFIG = {
    BATCH_SIZE: 3,
    BATCH_DELAY: 200,
    MUTATION_DEBOUNCE: 500,
    CACHE_TTL: 5 * 60 * 1000,
    TABLE_WAIT_INTERVAL: 500,
    TABLE_WAIT_TIMEOUT: 15000,
  };

  const CSS_CLASSES = {
    BUTTON: 'todoist-add-btn',
    STATUS_CONTAINER: 'todoist-status',
  };

  const STATUS = {
    LOADING: 'loading',
    EXISTS: 'exists',
    COMPLETED: 'completed',
    NOT_FOUND: 'not_found',
    ERROR: 'error',
  };

  const MESSAGE_TYPES = {
    LOAD_ALL_TASKS: 'LOAD_ALL_TASKS',
    TASK_STATUS_UPDATE: 'TASK_STATUS_UPDATE',
    INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  };

  // State
  let tableObserver = null;
  let processingDebounceTimer = null;
  let allTasksCache = null;
  let taskCachePromise = null;
  const statusCheckCache = new Map();
  const pendingStatusChecks = new Map();

  // URL helpers — v2 paths
  const isSearchPage = () => /^https:\/\/www\.immometrica\.com\/de\/v2\/search/.test(window.location.href);
  const buildOfferUrl = (offerId) => `https://www.immometrica.com/de/v2/offer/${offerId}`;
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const safeQuerySelector = (parent, selector) => {
    try { return parent.querySelector(selector); }
    catch (e) { return null; }
  };

  const safeQuerySelectorAll = (parent, selector) => {
    try { return parent.querySelectorAll(selector); }
    catch (e) { return []; }
  };

  // Extract offer ID from a search result row.
  // In the v2 UI, the first icon TD contains a <form action="/de/v2/search/offers/<id>/favorite">.
  const extractOfferIdFromRow = (row) => {
    if (!row) return null;

    // Primary: form action in the first icon cell
    const form = safeQuerySelector(row, 'form[action*="/offers/"]');
    if (form) {
      const match = form.getAttribute('action')?.match(/\/offers\/(\d+)\//);
      if (match?.[1]) return match[1];
    }

    // Fallback: any link pointing to a v2 offer
    const link = safeQuerySelector(row, 'a[href*="/de/v2/offer/"]');
    if (link) {
      const match = link.href.match(/\/de\/v2\/offer\/(\d+)/);
      if (match?.[1]) return match[1];
    }

    return null;
  };

  // Messaging
  const sendMessageWithTimeout = (message, timeout = 5000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });

  // Cache management
  const invalidateTaskCache = () => {
    allTasksCache = null;
    taskCachePromise = null;
    statusCheckCache.clear();
  };

  const invalidateBackgroundCache = async () => {
    try {
      await sendMessageWithTimeout({ type: MESSAGE_TYPES.INVALIDATE_CACHE }, 3000);
    } catch (e) { /* ignore */ }
  };

  const loadAllTasks = async (forceRefresh = false) => {
    if (!forceRefresh && allTasksCache) {
      if (Date.now() - allTasksCache.timestamp < CONFIG.CACHE_TTL) return allTasksCache;
    }
    if (taskCachePromise) return taskCachePromise;

    taskCachePromise = (async () => {
      try {
        const response = await sendMessageWithTimeout(
          { type: MESSAGE_TYPES.LOAD_ALL_TASKS, payload: {} },
          15000
        );
        if (!response?.success) throw new Error(response?.error || 'Failed to load tasks');
        allTasksCache = {
          activeTasks: response.activeTasks || [],
          completedTasks: response.completedTasks || [],
          timestamp: Date.now(),
          projectId: response.projectId,
        };
        return allTasksCache;
      } catch (e) {
        console.error('Error loading tasks:', e);
        allTasksCache = { activeTasks: [], completedTasks: [], timestamp: Date.now(), projectId: null };
        return allTasksCache;
      } finally {
        taskCachePromise = null;
      }
    })();
    return taskCachePromise;
  };

  const checkOfferStatus = async (offerId) => {
    const cached = statusCheckCache.get(offerId);
    if (cached) return cached;

    const pending = pendingStatusChecks.get(offerId);
    if (pending) return pending;

    const checkPromise = (async () => {
      try {
        const taskCache = await loadAllTasks();
        if (!taskCache) return { status: STATUS.ERROR, task: null };

        const offerUrl = buildOfferUrl(offerId);

        const activeTask = taskCache.activeTasks.find(t => t.description?.includes(offerUrl));
        if (activeTask) {
          const result = { status: STATUS.EXISTS, task: activeTask };
          statusCheckCache.set(offerId, result);
          return result;
        }

        const completedTask = taskCache.completedTasks.find(t => t.description?.includes(offerUrl));
        if (completedTask) {
          const result = { status: STATUS.COMPLETED, task: completedTask };
          statusCheckCache.set(offerId, result);
          return result;
        }

        const result = { status: STATUS.NOT_FOUND, task: null };
        statusCheckCache.set(offerId, result);
        return result;
      } catch (e) {
        console.error(`Error checking status for offer ${offerId}:`, e);
        return { status: STATUS.ERROR, task: null };
      } finally {
        pendingStatusChecks.delete(offerId);
      }
    })();

    pendingStatusChecks.set(offerId, checkPromise);
    return checkPromise;
  };

  // --- UI ---

  // Create the status button container for a given offerId
  const createStatusContainer = (offerId) => {
    const container = document.createElement('span');
    container.className = CSS_CLASSES.STATUS_CONTAINER;
    container.setAttribute('data-offer-id', offerId);
    container.setAttribute('data-status', STATUS.LOADING);
    container.innerHTML = '<span class="todoist-spinner" role="status" aria-label="Loading"></span>';
    return container;
  };

  const updateCellStatus = (container, status, taskData = null) => {
    if (!container) return;
    container.setAttribute('data-status', status);
    if (taskData) {
      container.setAttribute('data-task-id', taskData.id || '');
      container.setAttribute('data-task-url', taskData.url || '');
    }
    container.innerHTML = '';

    if (status === STATUS.LOADING) {
      container.innerHTML = '<span class="todoist-spinner" role="status"></span>';
      return;
    }

    const btn = document.createElement('button');
    btn.className = `${CSS_CLASSES.BUTTON} todoist-btn--${status}`;
    btn.type = 'button';

    switch (status) {
      case STATUS.EXISTS:
        btn.title = 'In Todoist vorhanden – klicken zum Öffnen';
        btn.setAttribute('aria-label', 'In Todoist vorhanden');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>';
        btn.addEventListener('click', () => handleTaskClick(container), { once: true });
        break;
      case STATUS.COMPLETED:
        btn.title = 'In Todoist abgeschlossen – klicken zum Öffnen';
        btn.setAttribute('aria-label', 'In Todoist abgeschlossen');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>';
        btn.addEventListener('click', () => handleTaskClick(container), { once: true });
        break;
      case STATUS.NOT_FOUND:
        btn.title = 'Noch nicht in Todoist – Objekt öffnen zum Hinzufügen';
        btn.setAttribute('aria-label', 'Nicht in Todoist');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>';
        btn.addEventListener('click', () => handleViewClick(container), { once: true });
        break;
      case STATUS.ERROR:
        btn.title = 'Fehler beim Abrufen des Status';
        btn.setAttribute('aria-label', 'Fehler');
        btn.disabled = true;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>';
        break;
    }

    container.appendChild(btn);
  };

  const handleViewClick = (container) => {
    const offerId = container.getAttribute('data-offer-id');
    if (offerId) window.open(buildOfferUrl(offerId), '_blank');
  };

  const handleTaskClick = (container) => {
    const taskUrl = container.getAttribute('data-task-url');
    const taskId = container.getAttribute('data-task-id');
    if (taskUrl) window.open(taskUrl, '_blank');
    else if (taskId) window.open(`https://todoist.com/app/task/${taskId}`, '_blank');
  };

  // Find the injection target for a row: the TD that contains the fav button.
  // In v2: first icon TD has class "table-sticky-0 table-col-icon" and holds the fav form.
  // We insert a new <td> BEFORE that first icon TD.
  const getInjectionTarget = (row) => {
    // Look for the fav button cell by form presence or class
    const favCell = safeQuerySelector(row, 'td.table-sticky-0')
      || safeQuerySelector(row, 'td.table-col-icon');
    return favCell || null;
  };

  const processRow = async (row) => {
    if (!row) return;
    // Skip if already injected
    if (safeQuerySelector(row, `.${CSS_CLASSES.STATUS_CONTAINER}`)) return;

    const offerId = extractOfferIdFromRow(row);
    if (!offerId) return;

    const favCell = getInjectionTarget(row);
    if (!favCell) return;

    // Create a new TD for our button, inserted before the fav cell
    const ourCell = document.createElement('td');
    ourCell.className = 'table-cell table-left table-col-icon todoist-col';
    const container = createStatusContainer(offerId);
    ourCell.appendChild(container);
    row.insertBefore(ourCell, favCell);

    try {
      const result = await checkOfferStatus(offerId);
      updateCellStatus(container, result.status, result.task);
    } catch (e) {
      console.error(`Error processing row for offer ${offerId}:`, e);
      updateCellStatus(container, STATUS.ERROR);
    }
  };

  // Find all result rows in the v2 search table
  const getResultRows = () => {
    // v2 uses tr[data-result-row] or data-testid="v2-result-row"
    const rows = safeQuerySelectorAll(document, 'tr[data-result-row]');
    if (rows.length) return Array.from(rows);
    return Array.from(safeQuerySelectorAll(document, '[data-testid="v2-result-row"]'));
  };

  const processAllRows = async () => {
    const rows = getResultRows();
    if (!rows.length) return;

    for (let i = 0; i < rows.length; i += CONFIG.BATCH_SIZE) {
      const batch = rows.slice(i, i + CONFIG.BATCH_SIZE);
      await Promise.allSettled(batch.map(row => processRow(row)));
      if (i + CONFIG.BATCH_SIZE < rows.length) await delay(CONFIG.BATCH_DELAY);
    }
  };

  const debouncedProcessAllRows = () => {
    if (processingDebounceTimer) clearTimeout(processingDebounceTimer);
    processingDebounceTimer = setTimeout(() => {
      processAllRows();
      processingDebounceTimer = null;
    }, CONFIG.MUTATION_DEBOUNCE);
  };

  // Observe tbody for new rows (pagination / lazy load)
  const setupTableObserver = () => {
    // In v2, rows are in a plain tbody — watch document body if no explicit table id
    const tbody = safeQuerySelector(document, 'tbody')
      || safeQuerySelector(document, '[data-testid="v2-search-results"]')
      || document.body;

    if (tableObserver) tableObserver.disconnect();

    tableObserver = new MutationObserver((mutations) => {
      const hasNewRows = mutations.some(m =>
        m.type === 'childList' &&
        Array.from(m.addedNodes).some(n =>
          n.nodeType === Node.ELEMENT_NODE && (
            n.hasAttribute('data-result-row') ||
            n.getAttribute('data-testid') === 'v2-result-row' ||
            n.tagName === 'TR'
          )
        )
      );
      if (hasNewRows) debouncedProcessAllRows();
    });

    tableObserver.observe(tbody, { childList: true, subtree: true });
  };

  // Handle status pushes from the service worker
  const handleBackgroundMessage = (message) => {
    if (message?.type !== MESSAGE_TYPES.TASK_STATUS_UPDATE) return;
    const { url, exists, type } = message.payload || {};
    if (!url) return;

    // v2 URL pattern for matching
    const match = url.match(/\/de\/v2\/offer\/(\d+)/);
    if (!match) return;

    const offerId = match[1];
    statusCheckCache.delete(offerId);

    const container = safeQuerySelector(
      document,
      `.${CSS_CLASSES.STATUS_CONTAINER}[data-offer-id="${offerId}"]`
    );
    if (container) {
      const status = exists
        ? (type === 'COMPLETED' ? STATUS.COMPLETED : STATUS.EXISTS)
        : STATUS.NOT_FOUND;
      updateCellStatus(container, status, message.payload?.task || null);
    }
  };

  // Initialization: poll until rows are present
  const initialize = async () => {
    if (!isSearchPage()) return;

    invalidateTaskCache();
    await invalidateBackgroundCache();

    let attempts = 0;
    const maxAttempts = CONFIG.TABLE_WAIT_TIMEOUT / CONFIG.TABLE_WAIT_INTERVAL;

    const waitForRows = setInterval(() => {
      attempts++;
      const rows = getResultRows();
      if (rows.length) {
        clearInterval(waitForRows);
        processAllRows();
        setupTableObserver();
      } else if (attempts >= maxAttempts) {
        clearInterval(waitForRows);
        console.warn('[Todoist] Search result rows not found within timeout');
      }
    }, CONFIG.TABLE_WAIT_INTERVAL);
  };

  const cleanup = () => {
    if (tableObserver) { tableObserver.disconnect(); tableObserver = null; }
    if (processingDebounceTimer) { clearTimeout(processingDebounceTimer); processingDebounceTimer = null; }
    allTasksCache = null;
    taskCachePromise = null;
    statusCheckCache.clear();
    pendingStatusChecks.clear();
  };

  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  window.addEventListener('beforeunload', cleanup);

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      invalidateTaskCache();
      await invalidateBackgroundCache();
      setTimeout(() => processAllRows(), 100);
    }
  });

  initialize();
})();
