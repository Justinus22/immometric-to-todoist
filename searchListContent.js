// ImmoMetrica Search List - Todoist Integration
(() => {
  'use strict';

  // Configuration
  const CONFIG = {
    TABLE_SELECTOR: '#offertable',
    TABLE_WAIT_INTERVAL: 500,
    TABLE_WAIT_TIMEOUT: 10000,
    BATCH_SIZE: 3,
    BATCH_DELAY: 200,
    MUTATION_DEBOUNCE: 500,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
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

  // Utility functions
  const isSearchPage = () => /^https:\/\/www\.immometrica\.com\/de\/search/.test(window.location.href);
  const buildOfferUrl = (offerId) => `https://www.immometrica.com/de/offer/${offerId}`;
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const safeQuerySelector = (parent, selector) => {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.error(`Error querying selector "${selector}":`, error);
      return null;
    }
  };

  const safeQuerySelectorAll = (parent, selector) => {
    try {
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.error(`Error querying selector "${selector}":`, error);
      return [];
    }
  };

  // Extract offer ID from table row
  const extractOfferIdFromRow = (row) => {
    if (!row) return null;

    // Try data-id attribute on favorite icon
    const favoriteIcon = safeQuerySelector(row, '[data-id]');
    if (favoriteIcon) {
      const offerId = favoriteIcon.getAttribute('data-id');
      if (offerId && /^\d+$/.test(offerId)) return offerId;
    }

    // Fallback: extract from link href
    const link = safeQuerySelector(row, 'a[href*="/de/offer/"]');
    if (link) {
      const match = link.href.match(/\/de\/offer\/(\d+)/);
      if (match?.[1]) return match[1];
    }

    return null;
  };

  // Message communication
  const sendMessageWithTimeout = (message, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);

      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  };

  // Cache management
  const invalidateTaskCache = () => {
    allTasksCache = null;
    taskCachePromise = null;
    statusCheckCache.clear();
  };

  const invalidateBackgroundCache = async () => {
    try {
      await sendMessageWithTimeout({ type: MESSAGE_TYPES.INVALIDATE_CACHE }, 3000);
    } catch (error) {
      console.error('Error invalidating background cache:', error);
    }
  };

  // Load all tasks for the page
  const loadAllTasks = async (forceRefresh = false) => {
    if (!forceRefresh && allTasksCache) {
      const age = Date.now() - allTasksCache.timestamp;
      if (age < CONFIG.CACHE_TTL) return allTasksCache;
    }

    if (taskCachePromise) return taskCachePromise;

    taskCachePromise = (async () => {
      try {
        const response = await sendMessageWithTimeout(
          { type: MESSAGE_TYPES.LOAD_ALL_TASKS, payload: {} },
          15000
        );

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to load tasks');
        }

        allTasksCache = {
          activeTasks: response.activeTasks || [],
          completedTasks: response.completedTasks || [],
          timestamp: Date.now(),
          projectId: response.projectId,
        };

        return allTasksCache;
      } catch (error) {
        console.error('Error loading tasks:', error);
        allTasksCache = {
          activeTasks: [],
          completedTasks: [],
          timestamp: Date.now(),
          projectId: null,
        };
        return allTasksCache;
      } finally {
        taskCachePromise = null;
      }
    })();

    return taskCachePromise;
  };

  // Check offer status using cached tasks
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

        const activeTask = taskCache.activeTasks.find(task =>
          task.description?.includes(offerUrl)
        );

        if (activeTask) {
          const result = { status: STATUS.EXISTS, task: activeTask };
          statusCheckCache.set(offerId, result);
          return result;
        }

        const completedTask = taskCache.completedTasks.find(task =>
          task.description?.includes(offerUrl)
        );

        if (completedTask) {
          const result = { status: STATUS.COMPLETED, task: completedTask };
          statusCheckCache.set(offerId, result);
          return result;
        }

        const result = { status: STATUS.NOT_FOUND, task: null };
        statusCheckCache.set(offerId, result);
        return result;
      } catch (error) {
        console.error(`Error checking status for offer ${offerId}:`, error);
        return { status: STATUS.ERROR, task: null };
      } finally {
        pendingStatusChecks.delete(offerId);
      }
    })();

    pendingStatusChecks.set(offerId, checkPromise);
    return checkPromise;
  };

  // UI creation
  const createStatusIndicator = (offerId) => {
    const container = document.createElement('span');
    container.className = CSS_CLASSES.STATUS_CONTAINER;
    container.setAttribute('data-offer-id', offerId);
    container.setAttribute('data-status', STATUS.LOADING);
    container.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-label="Loading"></span>';
    return container;
  };

  const createButton = (className, icon, title) => {
    const button = document.createElement('button');
    button.className = `${CSS_CLASSES.BUTTON} btn btn-sm ${className}`;
    button.title = title;
    button.setAttribute('aria-label', title);

    if (icon.startsWith('spinner')) {
      button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
      button.disabled = true;
    } else {
      button.innerHTML = `<i class="${icon}"></i>`;
    }

    return button;
  };

  // Update status UI
  const updateCellStatus = (containerOrCell, status, taskData = null) => {
    if (!containerOrCell) return;

    const statusDiv = containerOrCell.classList?.contains(CSS_CLASSES.STATUS_CONTAINER)
      ? containerOrCell
      : safeQuerySelector(containerOrCell, `.${CSS_CLASSES.STATUS_CONTAINER}`);

    if (!statusDiv) return;

    statusDiv.setAttribute('data-status', status);
    statusDiv.innerHTML = '';

    if (taskData) {
      statusDiv.setAttribute('data-task-id', taskData.id || '');
      statusDiv.setAttribute('data-task-url', taskData.url || '');
    }

    let button;

    switch (status) {
      case STATUS.LOADING:
        statusDiv.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
        break;

      case STATUS.EXISTS:
        button = createButton('btn-success', 'fas fa-check', 'View in Todoist');
        button.addEventListener('click', () => handleTaskClick(statusDiv), { once: true });
        statusDiv.appendChild(button);
        break;

      case STATUS.COMPLETED:
        button = createButton('btn-secondary', 'fas fa-check-circle', 'View in Todoist');
        button.addEventListener('click', () => handleTaskClick(statusDiv), { once: true });
        statusDiv.appendChild(button);
        break;

      case STATUS.NOT_FOUND:
        button = createButton('btn-primary', 'fas fa-external-link-alt', 'View details to add');
        button.addEventListener('click', () => handleViewClick(statusDiv), { once: true });
        statusDiv.appendChild(button);
        break;

      case STATUS.ERROR:
        button = createButton('btn-danger', 'fas fa-exclamation-triangle', 'Error checking status');
        button.disabled = true;
        statusDiv.appendChild(button);
        break;
    }
  };

  // Click handlers
  const handleViewClick = (cell) => {
    const offerId = cell.getAttribute('data-offer-id');
    if (offerId) window.open(buildOfferUrl(offerId), '_blank');
  };

  const handleTaskClick = (cell) => {
    const taskUrl = cell.getAttribute('data-task-url');
    const taskId = cell.getAttribute('data-task-id');

    if (taskUrl) {
      window.open(taskUrl, '_blank');
    } else if (taskId) {
      window.open(`https://todoist.com/app/task/${taskId}`, '_blank');
    }
  };

  // Row processing
  const processRow = async (row) => {
    if (!row) return;

    const favCell = safeQuerySelector(row, 'td:first-child');
    if (!favCell) return;

    if (safeQuerySelector(favCell, `.${CSS_CLASSES.STATUS_CONTAINER}`)) return;

    const offerId = extractOfferIdFromRow(row);
    if (!offerId) return;

    const statusIndicator = createStatusIndicator(offerId);
    favCell.insertBefore(statusIndicator, favCell.firstChild);

    try {
      const result = await checkOfferStatus(offerId);
      updateCellStatus(statusIndicator, result.status, result.task);
    } catch (error) {
      console.error(`Error processing row for offer ${offerId}:`, error);
      updateCellStatus(statusIndicator, STATUS.ERROR);
    }
  };

  const processAllRows = async () => {
    const table = safeQuerySelector(document, CONFIG.TABLE_SELECTOR);
    if (!table) return;

    const tbody = safeQuerySelector(table, 'tbody');
    if (!tbody) return;

    const rows = safeQuerySelectorAll(tbody, 'tr[role="row"]');
    if (!rows.length) return;

    for (let i = 0; i < rows.length; i += CONFIG.BATCH_SIZE) {
      const batch = Array.from(rows).slice(i, i + CONFIG.BATCH_SIZE);
      await Promise.allSettled(batch.map(row => processRow(row)));

      if (i + CONFIG.BATCH_SIZE < rows.length) {
        await delay(CONFIG.BATCH_DELAY);
      }
    }
  };

  const debouncedProcessAllRows = () => {
    if (processingDebounceTimer) clearTimeout(processingDebounceTimer);

    processingDebounceTimer = setTimeout(() => {
      processAllRows();
      processingDebounceTimer = null;
    }, CONFIG.MUTATION_DEBOUNCE);
  };

  // Table observation
  const setupTableObserver = () => {
    const tbody = safeQuerySelector(document, `${CONFIG.TABLE_SELECTOR} tbody`);
    if (!tbody) return;

    if (tableObserver) tableObserver.disconnect();

    tableObserver = new MutationObserver((mutations) => {
      const hasNewRows = mutations.some(mutation =>
        mutation.type === 'childList' &&
        Array.from(mutation.addedNodes).some(node =>
          node.nodeType === Node.ELEMENT_NODE && node.tagName === 'TR'
        )
      );

      if (hasNewRows) debouncedProcessAllRows();
    });

    tableObserver.observe(tbody, { childList: true, subtree: false });
  };

  // Message handling
  const handleBackgroundMessage = (message) => {
    if (!message?.type) return;

    if (message.type === MESSAGE_TYPES.TASK_STATUS_UPDATE) {
      const { url, exists, type } = message.payload || {};
      if (!url) return;

      const match = url.match(/\/de\/offer\/(\d+)/);
      if (!match) return;

      const offerId = match[1];
      statusCheckCache.delete(offerId);

      const statusContainer = safeQuerySelector(
        document,
        `.${CSS_CLASSES.STATUS_CONTAINER}[data-offer-id="${offerId}"]`
      );

      if (statusContainer) {
        const status = exists
          ? (type === 'COMPLETED' ? STATUS.COMPLETED : STATUS.EXISTS)
          : STATUS.NOT_FOUND;

        const taskData = message.payload?.task || null;
        updateCellStatus(statusContainer, status, taskData);
      }
    }
  };

  // Initialization
  const initialize = async () => {
    if (!isSearchPage()) return;

    invalidateTaskCache();
    await invalidateBackgroundCache();

    let attempts = 0;
    const maxAttempts = CONFIG.TABLE_WAIT_TIMEOUT / CONFIG.TABLE_WAIT_INTERVAL;

    const waitForTable = setInterval(() => {
      attempts++;

      const table = safeQuerySelector(document, CONFIG.TABLE_SELECTOR);
      const hasRows = table && safeQuerySelector(table, 'tbody tr');

      if (hasRows) {
        clearInterval(waitForTable);
        processAllRows();
        setupTableObserver();
      } else if (attempts >= maxAttempts) {
        clearInterval(waitForTable);
        console.warn('Table not found within timeout period');
      }
    }, CONFIG.TABLE_WAIT_INTERVAL);
  };

  // Cleanup
  const cleanup = () => {
    if (tableObserver) {
      tableObserver.disconnect();
      tableObserver = null;
    }
    if (processingDebounceTimer) {
      clearTimeout(processingDebounceTimer);
      processingDebounceTimer = null;
    }
    allTasksCache = null;
    taskCachePromise = null;
    statusCheckCache.clear();
    pendingStatusChecks.clear();
  };

  // Event listeners
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  window.addEventListener('beforeunload', cleanup);

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      invalidateTaskCache();
      await invalidateBackgroundCache();
      setTimeout(() => processAllRows(), 100);
    }
  });

  // Start
  initialize();
})();
