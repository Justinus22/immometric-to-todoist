// Content Script - Property Data Extraction
(() => {
  'use strict';

  // Extract property data from current page
  const extractPropertyData = () => {
    try {
      const url = window.location.href;

      // Validate URL
      if (!/^https:\/\/www\.immometrica\.com\/de\/offer\/\d+/.test(url)) {
        return { valid: false, url, title: null, location: null };
      }

      // Extract title from page header (ImmoMetrica's extracted title)
      const pageHeader = document.querySelector('header.page-header h2.no-margin-bottom');
      const title = pageHeader?.textContent?.trim() || document.title.replace(/\s*[-|]\s*ImmoMetrica.*$/i, '').trim() || 'Untitled Property';

      // Extract location (city name) from the address line
      let location = null;
      const bodyText = document.body.textContent;

      // Match various address formats:
      // Format 1: "Street, 12345 State - City" → extract City
      // Format 2: "12345 State - City" → extract City
      // Format 3: "Street, 12345, City" → extract City
      // Format 4: "12345 City" → extract City
      // Format 5: "12345 City, City" → extract first City (dedupe)
      // Format 6: "12345 City, OT District (District)" → extract City

      const addressPatterns = [
        // Pattern 1: "State - City" (captures city after dash, stops at space+digit or space+duplicate)
        /\d{5}\s+[\wäöüÄÖÜß]+\s*-\s+([\wäöüÄÖÜß]+(?:\s+[\wäöüÄÖÜß]+)??)(?=\s+(?:\d|[A-ZÄÖÜ])|$)/,
        // Pattern 2: ", City" (after postal code, stops at HTML or whitespace before duplicate)
        /\d{5},\s+([\wäöüÄÖÜß]+(?:\s+[\wäöüÄÖÜß]+)?)(?=\s*(?:<|\d{5}|$))/,
        // Pattern 3: "PostalCode City, City" (deduplicated format)
        /\d{5}\s+([\wäöüÄÖÜß]+(?:\s+[\wäöüÄÖÜß]+)?),\s+\1/,
        // Pattern 4: "PostalCode City, OT District" (extract main city before comma)
        /\d{5}\s+([\wäöüÄÖÜß]+),\s+OT/i,
        // Pattern 5: "PostalCode City" (simple, stops at comma/space+capital/digit/end)
        /\d{5}\s+([\wäöüÄÖÜß]+(?:\s+[\wäöüÄÖÜß]+)?)(?=\s*(?:,|<|\d{5}|$))/,
      ];

      for (const pattern of addressPatterns) {
        const match = bodyText.match(pattern);
        if (match && match[1]) {
          location = match[1].trim();
          // Clean up: remove "OT" prefix if present
          location = location.replace(/^OT\s+/i, '');
          // Stop at first successful match
          break;
        }
      }

      return {
        valid: true,
        url,
        title: title.trim(),
        location,
      };
    } catch (error) {
      console.error('Error extracting property data:', error);
      return {
        valid: false,
        url: window.location.href,
        title: null,
        location: null,
      };
    }
  };

  // Extract and send data to background script
  const propertyData = extractPropertyData();
  chrome.runtime.sendMessage({
    type: 'SCRAPE_RESULT',
    payload: propertyData,
  });
})();
