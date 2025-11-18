// ImmoMetrica Search List UI Injection
(() => {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const CONFIG = {
    TABLE_SELECTOR: '#offertable',
    TABLE_WAIT_INTERVAL: 500,
    TABLE_WAIT_TIMEOUT: 10000,
    BATCH_SIZE: 3, // Reduced from 5 to 3 for better performance
    BATCH_DELAY: 200, // Increased from 100 to 200ms for less aggressive checking
    MUTATION_DEBOUNCE: 500, // Increased from 300 to 500ms
    STATUS_RECHECK_DELAY: 2000,
    COLUMN_WIDTH: '50px',
  };

  const CSS_CLASSES = {
    COLUMN: 'todoist-status-column',
    COLUMN_HEADER: 'todoist-status-column-header',
    BUTTON: 'todoist-add-btn',
    STATUS_CONTAINER: 'todoist-status',
  };

  const STATUS_TYPES = {
    LOADING: 'loading',
    EXISTS: 'exists',
    COMPLETED: 'completed',
    NOT_FOUND: 'not_found',
    ADDING: 'adding',
    ERROR: 'error',
  };

  const MESSAGE_TYPES = {
    LOAD_ALL_TASKS: 'LOAD_ALL_TASKS',
    CHECK_STATUS: 'CHECK_OFFER_STATUS',
    TASK_ADDED: 'TASK_ADDED',
    TASK_STATUS_UPDATE: 'TASK_STATUS_UPDATE',
    INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  let tableObserver = null;
  let processingDebounceTimer = null;

  // Global task cache - loaded once per page
  let allTasksCache = null; // { activeTasks: [], completedTasks: [], timestamp, projectId }
  let taskCachePromise = null; // Promise for loading tasks
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Per-offer status cache
  const statusCheckCache = new Map(); // offerId -> {status, timestamp}
  const pendingStatusChecks = new Map(); // offerId -> Promise

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Check if current URL is a search page
   * @returns {boolean}
   */
  function isSearchPage() {
    return /^https:\/\/www\.immometrica\.com\/de\/search/.test(window.location.href);
  }

  /**
   * Build offer URL from ID
   * @param {string} offerId
   * @returns {string}
   */
  function buildOfferUrl(offerId) {
    return `https://www.immometrica.com/de/offer/${offerId}`;
  }

  /**
   * Delay execution
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe querySelector with error handling
   * @param {Element|Document} parent
   * @param {string} selector
   * @returns {Element|null}
   */
  function safeQuerySelector(parent, selector) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.error(`Error querying selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * Safe querySelectorAll with error handling
   * @param {Element|Document} parent
   * @param {string} selector
   * @returns {NodeListOf<Element>}
   */
  function safeQuerySelectorAll(parent, selector) {
    try {
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.error(`Error querying selector "${selector}":`, error);
      return [];
    }
  }

  // ============================================================================
  // DATA EXTRACTION
  // ============================================================================

  /**
   * Extract offer ID from a table row
   * @param {Element} row
   * @returns {string|null}
   */
  function extractOfferIdFromRow(row) {
    if (!row) return null;

    // Try to find data-id on favorite star icon
    const favoriteIcon = safeQuerySelector(row, '[data-id]');
    if (favoriteIcon) {
      const offerId = favoriteIcon.getAttribute('data-id');
      if (offerId && /^\d+$/.test(offerId)) {
        return offerId;
      }
    }

    // Fallback: extract from link href
    const link = safeQuerySelector(row, 'a[href*="/de/offer/"]');
    if (link) {
      const match = link.href.match(/\/de\/offer\/(\d+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract property data from a table row
   * @param {Element} row
   * @returns {Object|null}
   */
  function extractPropertyDataFromRow(row) {
    if (!row) return null;

    const offerId = extractOfferIdFromRow(row);
    if (!offerId) return null;

    const cells = row.querySelectorAll('td');
    if (cells.length < 3) return null;

    // Extract location (typically in 3rd column after injection)
    const locationCell = cells[2]; // Adjusted for our injected column
    const location = locationCell?.textContent?.trim() || null;

    // Extract title from the details link
    const detailsLink = safeQuerySelector(row, 'a[href*="/de/offer/"]');
    const title = detailsLink?.textContent?.trim() || `Property ${offerId}`;

    return {
      offerId,
      url: buildOfferUrl(offerId),
      location,
      title: `${location || 'Unknown'} - ${title}`,
    };
  }

  // ============================================================================
  // COMMUNICATION WITH BACKGROUND SCRIPT
  // ============================================================================

  /**
   * Send message to background script with timeout
   * @param {Object} message
   * @param {number} timeout
   * @returns {Promise<any>}
   */
  function sendMessageWithTimeout(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeout);

      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(response);
      });
    });
  }

  /**
   * Load all tasks once for the entire page
   * @param {boolean} forceRefresh - Force reload even if cached
   * @returns {Promise<Object>}
   */
  async function loadAllTasks(forceRefresh = false) {
    // Check if cache is still valid
    if (!forceRefresh && allTasksCache) {
      const age = Date.now() - allTasksCache.timestamp;
      if (age < CACHE_TTL) {
        return allTasksCache;
      }
    }

    // Check if already loading
    if (taskCachePromise) {
      return taskCachePromise;
    }

    // Load tasks from background script
    taskCachePromise = (async () => {
      try {
        const response = await sendMessageWithTimeout({
          type: 'LOAD_ALL_TASKS',
          payload: {}
        }, 15000); // Long timeout for initial load

        if (!response || !response.success) {
          throw new Error(response?.error || 'Failed to load tasks');
        }

        allTasksCache = {
          activeTasks: response.activeTasks || [],
          completedTasks: response.completedTasks || [],
          timestamp: Date.now(),
          projectId: response.projectId
        };

        return allTasksCache;
      } catch (error) {
        console.error('Error loading all tasks:', error);
        // Return empty cache on error
        allTasksCache = {
          activeTasks: [],
          completedTasks: [],
          timestamp: Date.now(),
          projectId: null
        };
        return allTasksCache;
      } finally {
        taskCachePromise = null;
      }
    })();

    return taskCachePromise;
  }

  /**
   * Invalidate task cache (call this after changes in Todoist)
   */
  function invalidateTaskCache() {
    allTasksCache = null;
    taskCachePromise = null;
    statusCheckCache.clear();
  }

  /**
   * Invalidate background script cache
   * @returns {Promise<void>}
   */
  async function invalidateBackgroundCache() {
    try {
      await sendMessageWithTimeout({
        type: MESSAGE_TYPES.INVALIDATE_CACHE,
        payload: {}
      }, 3000);
    } catch (error) {
      console.error('Error invalidating background cache:', error);
    }
  }

  /**
   * Check offer status using pre-loaded task cache
   * @param {string} offerId
   * @returns {Promise<Object>} Returns {status, task}
   */
  async function checkOfferStatus(offerId) {
    // Check per-offer cache first
    const cached = statusCheckCache.get(offerId);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending check for this offer
    const pending = pendingStatusChecks.get(offerId);
    if (pending) {
      return pending;
    }

    // Create new check and deduplicate
    const checkPromise = (async () => {
      try {
        // Ensure tasks are loaded
        const taskCache = await loadAllTasks();
        if (!taskCache) {
          return { status: STATUS_TYPES.ERROR, task: null };
        }

        const offerUrl = buildOfferUrl(offerId);

        // Search in active tasks
        const activeTask = taskCache.activeTasks.find(task =>
          task.description && task.description.includes(offerUrl)
        );

        if (activeTask) {
          const result = { status: STATUS_TYPES.EXISTS, task: activeTask };
          statusCheckCache.set(offerId, result);
          return result;
        }

        // Search in completed tasks
        const completedTask = taskCache.completedTasks.find(task =>
          task.description && task.description.includes(offerUrl)
        );

        if (completedTask) {
          const result = { status: STATUS_TYPES.COMPLETED, task: completedTask };
          statusCheckCache.set(offerId, result);
          return result;
        }

        // Not found
        const result = { status: STATUS_TYPES.NOT_FOUND, task: null };
        statusCheckCache.set(offerId, result);
        return result;

      } catch (error) {
        console.error(`Error checking status for offer ${offerId}:`, error);
        return { status: STATUS_TYPES.ERROR, task: null };
      } finally {
        // Remove from pending checks
        pendingStatusChecks.delete(offerId);
      }
    })();

    // Store pending promise
    pendingStatusChecks.set(offerId, checkPromise);

    return checkPromise;
  }

  // Removed: scrapeAndAddOffer function (no longer adding directly from list)

  // ============================================================================
  // UI CREATION AND UPDATES
  // ============================================================================

  /**
   * Create the Todoist status indicator (not a cell, just the content)
   * @param {string} offerId
   * @returns {Element}
   */
  function createTodoistStatusIndicator(offerId) {
    const container = document.createElement('span');
    container.className = `${CSS_CLASSES.STATUS_CONTAINER}`;
    container.setAttribute('data-offer-id', offerId);
    container.setAttribute('data-status', STATUS_TYPES.LOADING);

    const spinner = document.createElement('span');
    spinner.className = 'spinner-border spinner-border-sm';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Loading');

    container.appendChild(spinner);

    return container;
  }

  /**
   * Create button element
   * @param {string} className
   * @param {string} icon
   * @param {string} title
   * @param {boolean} disabled
   * @returns {Element}
   */
  function createButton(className, icon, title, disabled = false) {
    const button = document.createElement('button');
    button.className = `${CSS_CLASSES.BUTTON} btn btn-sm ${className}`;
    button.title = title;
    button.setAttribute('aria-label', title);
    if (disabled) {
      button.disabled = true;
    }

    if (icon.startsWith('spinner')) {
      const spinner = document.createElement('span');
      spinner.className = 'spinner-border spinner-border-sm';
      spinner.setAttribute('role', 'status');
      button.appendChild(spinner);
    } else {
      const iconElement = document.createElement('i');
      iconElement.className = icon;
      button.appendChild(iconElement);
    }

    return button;
  }

  /**
   * Update status container with status
   * @param {Element} containerOrCell - Either the status container itself or a cell containing it
   * @param {string} status
   * @param {Object|null} taskData - The task object with id, url, etc.
   */
  function updateCellStatus(containerOrCell, status, taskData = null) {
    if (!containerOrCell) return;

    // Check if this IS the status container or if we need to find it
    let statusDiv;
    if (containerOrCell.classList.contains(CSS_CLASSES.STATUS_CONTAINER)) {
      statusDiv = containerOrCell;
    } else {
      statusDiv = safeQuerySelector(containerOrCell, `.${CSS_CLASSES.STATUS_CONTAINER}`);
    }

    if (!statusDiv) return;

    statusDiv.setAttribute('data-status', status);
    statusDiv.innerHTML = ''; // Clear existing content

    // Store task data for click handlers on the container
    if (taskData) {
      statusDiv.setAttribute('data-task-id', taskData.id || '');
      statusDiv.setAttribute('data-task-url', taskData.url || '');
    }

    let button;

    switch (status) {
      case STATUS_TYPES.LOADING:
        const spinner = document.createElement('span');
        spinner.className = 'spinner-border spinner-border-sm';
        spinner.setAttribute('role', 'status');
        statusDiv.appendChild(spinner);
        break;

      case STATUS_TYPES.EXISTS:
        button = createButton('btn-success', 'fas fa-check', 'View in Todoist', false);
        button.addEventListener('click', () => handleTaskClick(statusDiv), { once: true });
        statusDiv.appendChild(button);
        break;

      case STATUS_TYPES.COMPLETED:
        button = createButton('btn-secondary', 'fas fa-check-circle', 'View in Todoist', false);
        button.addEventListener('click', () => handleTaskClick(statusDiv), { once: true });
        statusDiv.appendChild(button);
        break;

      case STATUS_TYPES.NOT_FOUND:
        button = createButton('btn-primary', 'fas fa-external-link-alt', 'View details to add', false);
        button.addEventListener('click', () => handleViewClick(statusDiv), { once: true });
        statusDiv.appendChild(button);
        break;

      case STATUS_TYPES.ADDING:
        button = createButton('btn-primary', 'spinner', 'Adding to Todoist...', true);
        statusDiv.appendChild(button);
        break;

      case STATUS_TYPES.ERROR:
        button = createButton('btn-danger', 'fas fa-exclamation-triangle', 'Error checking status', true);
        statusDiv.appendChild(button);
        break;

      default:
        console.warn(`Unknown status: ${status}`);
    }
  }

  /**
   * Handle view button click - opens detail page
   * @param {Element} cell
   */
  function handleViewClick(cell) {
    const offerId = cell.getAttribute('data-offer-id');
    if (!offerId) {
      console.error('No offer ID found on cell');
      return;
    }

    // Open detail page in new tab
    window.open(buildOfferUrl(offerId), '_blank');
  }

  /**
   * Handle task button click - opens Todoist task
   * @param {Element} cell
   */
  function handleTaskClick(cell) {
    const taskId = cell.getAttribute('data-task-id');
    const taskUrl = cell.getAttribute('data-task-url');

    // Prefer task URL if available
    if (taskUrl) {
      window.open(taskUrl, '_blank');
      return;
    }

    // Fallback to task ID
    if (taskId) {
      const todoistUrl = `https://todoist.com/app/task/${taskId}`;
      window.open(todoistUrl, '_blank');
      return;
    }

    console.error('No task ID or URL found on cell');
  }

  // ============================================================================
  // TABLE MANIPULATION
  // ============================================================================

  /**
   * No header injection needed - we'll use the existing Fav column
   * @returns {boolean}
   */
  function injectColumnHeader() {
    // No header injection - using existing Fav column
    return true;
  }

  /**
   * Process a single row - inject into existing Fav column
   * @param {Element} row
   * @returns {Promise<void>}
   */
  async function processRow(row) {
    if (!row) return;

    // Find the first cell (Fav column)
    const favCell = safeQuerySelector(row, 'td:first-child');
    if (!favCell) {
      console.warn('Could not find Fav column in row');
      return;
    }

    // Check if already processed
    if (safeQuerySelector(favCell, `.${CSS_CLASSES.STATUS_CONTAINER}`)) {
      return;
    }

    const offerId = extractOfferIdFromRow(row);
    if (!offerId) {
      console.warn('Could not extract offer ID from row');
      return;
    }

    // Create and prepend status indicator to the Fav cell
    const statusIndicator = createTodoistStatusIndicator(offerId);
    favCell.insertBefore(statusIndicator, favCell.firstChild);

    // Check status in background
    try {
      const result = await checkOfferStatus(offerId);
      updateCellStatus(statusIndicator, result.status, result.task);
    } catch (error) {
      console.error(`Error processing row for offer ${offerId}:`, error);
      updateCellStatus(statusIndicator, STATUS_TYPES.ERROR);
    }
  }

  /**
   * Process all rows in the table
   * @returns {Promise<void>}
   */
  async function processAllRows() {
    const table = safeQuerySelector(document, CONFIG.TABLE_SELECTOR);
    if (!table) return;

    const tbody = safeQuerySelector(table, 'tbody');
    if (!tbody) return;

    const rows = safeQuerySelectorAll(tbody, 'tr[role="row"]');
    if (rows.length === 0) return;

    // Process rows in batches
    for (let i = 0; i < rows.length; i += CONFIG.BATCH_SIZE) {
      const batch = Array.from(rows).slice(i, i + CONFIG.BATCH_SIZE);
      await Promise.allSettled(batch.map(row => processRow(row)));

      // Small delay between batches
      if (i + CONFIG.BATCH_SIZE < rows.length) {
        await delay(CONFIG.BATCH_DELAY);
      }
    }
  }

  /**
   * Debounced process all rows
   */
  function debouncedProcessAllRows() {
    if (processingDebounceTimer) {
      clearTimeout(processingDebounceTimer);
    }

    processingDebounceTimer = setTimeout(() => {
      processAllRows();
      processingDebounceTimer = null;
    }, CONFIG.MUTATION_DEBOUNCE);
  }

  // ============================================================================
  // OBSERVERS
  // ============================================================================

  /**
   * Set up MutationObserver to watch for new rows
   */
  function setupTableObserver() {
    const tbody = safeQuerySelector(document, `${CONFIG.TABLE_SELECTOR} tbody`);
    if (!tbody) return;

    // Clean up existing observer
    if (tableObserver) {
      tableObserver.disconnect();
    }

    tableObserver = new MutationObserver((mutations) => {
      let hasNewRows = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'TR') {
              hasNewRows = true;
              break;
            }
          }
        }
        if (hasNewRows) break;
      }

      if (hasNewRows) {
        debouncedProcessAllRows();
      }
    });

    tableObserver.observe(tbody, {
      childList: true,
      subtree: false
    });
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  /**
   * Handle messages from background script
   * @param {Object} message
   */
  function handleBackgroundMessage(message) {
    if (!message || !message.type) return;

    if (message.type === MESSAGE_TYPES.TASK_ADDED ||
        message.type === MESSAGE_TYPES.TASK_STATUS_UPDATE) {

      const { url, exists, type } = message.payload || {};
      if (!url) return;

      // Extract offer ID from URL
      const match = url.match(/\/de\/offer\/(\d+)/);
      if (!match) return;

      const offerId = match[1];

      // Invalidate cache
      statusCheckCache.delete(offerId);

      // Find and update the status container
      const statusContainer = safeQuerySelector(document, `.${CSS_CLASSES.STATUS_CONTAINER}[data-offer-id="${offerId}"]`);
      if (statusContainer) {
        const status = exists
          ? (type === 'COMPLETED' ? STATUS_TYPES.COMPLETED : STATUS_TYPES.EXISTS)
          : STATUS_TYPES.NOT_FOUND;

        // Get task data from message payload if available
        const taskData = message.payload?.task || null;
        updateCellStatus(statusContainer, status, taskData);
      }
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the search list UI injection
   */
  async function initialize() {
    if (!isSearchPage()) {
      return;
    }

    // Invalidate all caches on page load to ensure fresh data
    invalidateTaskCache();
    await invalidateBackgroundCache();

    // Wait for table to be ready
    let attempts = 0;
    const maxAttempts = CONFIG.TABLE_WAIT_TIMEOUT / CONFIG.TABLE_WAIT_INTERVAL;

    const waitForTable = setInterval(() => {
      attempts++;

      const table = safeQuerySelector(document, CONFIG.TABLE_SELECTOR);
      const hasRows = table && safeQuerySelector(table, 'tbody tr');

      if (hasRows) {
        clearInterval(waitForTable);

        // Inject header and process rows
        if (injectColumnHeader()) {
          processAllRows();
          setupTableObserver();
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(waitForTable);
        console.warn('Table not found within timeout period');
      }
    }, CONFIG.TABLE_WAIT_INTERVAL);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Clean up resources before page unload
   */
  function cleanup() {
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
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  // Listen for updates from background script
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);

  // Clean up on page unload
  window.addEventListener('beforeunload', cleanup);

  // Refresh cache when page becomes visible (user returns to tab)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      // Invalidate all caches (both local and background)
      invalidateTaskCache();
      await invalidateBackgroundCache();

      // Reprocess all rows with fresh data
      setTimeout(() => {
        processAllRows();
      }, 100);
    }
  });

  // Start initialization
  initialize();
})();
