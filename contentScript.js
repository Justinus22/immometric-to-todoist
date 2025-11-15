/**
 * Content Script - ImmoMetrica Listing Data Extractor
 * Extracts property title from listing pages
 */

(() => {
  'use strict';

  // Selectors for property listing elements
  const SELECTORS = {
    TITLE: 'header.page-header h2.no-margin-bottom',
  };

  /**
   * Check if current URL is a valid ImmoMetrica offer page
   */
  function isValidOfferPage() {
    return /^https:\/\/www\.immometrica\.com\/de\/offer\/\d+/.test(location.href);
  }

  /**
   * Extract property title from the page
   */
  function extractTitle() {
    const titleElement = document.querySelector(SELECTORS.TITLE);
    return titleElement?.textContent?.trim() || null;
  }

  /**
   * Send extracted data to background service worker
   */
  function sendData(data) {
    chrome.runtime.sendMessage({
      type: 'SCRAPE_RESULT',
      payload: data,
    });
  }

  // Main execution
  try {
    const valid = isValidOfferPage();
    const title = valid ? extractTitle() : null;
    
    sendData({
      valid: valid && !!title,
      title,
      url: location.href,
    });
    
  } catch (error) {
    console.error('Content script error:', error);
    sendData({
      valid: false,
      title: null,
      url: location.href,
    });
  }
})();
