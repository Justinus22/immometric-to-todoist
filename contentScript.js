/**
 * Content Script - ImmoMetrica Listing Data Extractor
 * Extracts property title from listing pages
 */

(() => {
  'use strict';

  // Selectors for property listing elements
  const SELECTORS = {
    TITLE: 'header.page-header h2.no-margin-bottom',
    LOCATION_INFO: '.card-body .text',
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
   * Extract location (city) from the page
   * Looks for patterns like "Brandenburg - Oranienburg" and extracts "Oranienburg"
   */
  function extractLocation() {
    const locationElements = document.querySelectorAll(SELECTORS.LOCATION_INFO);
    
    for (const element of locationElements) {
      const text = element?.textContent?.trim();
      if (!text) continue;
      
      // Look for pattern: "Brandenburg - CityName" 
      const brandenburgMatch = text.match(/Brandenburg\s*-\s*([^,\n\r]+)/);
      if (brandenburgMatch) {
        return brandenburgMatch[1].trim();
      }
      
      // Look for postal code + city pattern: "12345 CityName"
      const postalMatch = text.match(/\b\d{5}\s+([^,\n\r-]+)/);
      if (postalMatch) {
        const city = postalMatch[1].trim();
        // Skip if it's just "Brandenburg" (state, not city)
        if (city !== 'Brandenburg') {
          return city;
        }
      }
    }
    
    return null;
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
    const locationCity = valid ? extractLocation() : null;
    
    sendData({
      valid: valid && !!title,
      title,
      location: locationCity,
      url: location.href,
    });
    
  } catch (error) {
    console.error('Content script error:', error);
    sendData({
      valid: false,
      title: null,
      location: null,
      url: location.href,
    });
  }
})();
