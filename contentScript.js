// Content Script - Property Data Extraction (v2 UI)
(() => {
  'use strict';

  const extractPropertyData = () => {
    try {
      const url = window.location.href;

      // New v2 URL pattern: /de/v2/offer/<id>
      if (!/^https:\/\/www\.immometrica\.com\/de\/v2\/offer\/\d+/.test(url)) {
        return { valid: false, url, title: null, location: null };
      }

      // Title: new UI uses data-testid="v2-offer-title"
      const titleEl = document.querySelector('[data-testid="v2-offer-title"]');
      const title = titleEl?.textContent?.trim()
        || document.title.replace(/\s*[-|]\s*ImmoMetrica.*$/i, '').trim()
        || 'Untitled Property';

      // Address: data-testid="v2-offer-address" contains "12345 City"
      let location = null;
      const addressEl = document.querySelector('[data-testid="v2-offer-address"]');
      if (addressEl) {
        const addressText = addressEl.textContent.trim();
        const match = addressText.match(/\d{5}\s+(.+)/);
        if (match) location = match[1].trim();
      }

      // Fallback: scan body text with postal code patterns
      if (!location) {
        const bodyText = document.body.textContent;
        const patterns = [
          /\d{5}\s+[\wäöüÄÖÜß]+\s*-\s+([\wäöüÄÖÜß]+(?:\s+[\wäöüÄÖÜß]+)??)(?=\s+(?:\d|[A-ZÄÖÜ])|$)/,
          /\d{5},\s+([\wäöüÄÖÜß]+(?:\s+[\wäöüÄÖÜß]+)?)(?=\s*(?:<|\d{5}|$))/,
          /\d{5}\s+([\wäöüÄÖÜß]+(?:\s+[\wäöüÄÖÜß]+)?),\s+\1/,
          /\d{5}\s+([\wäöüÄÖÜß]+),\s+OT/i,
          /\d{5}\s+([\wäöüÄÖÜß]+(?:\s+[\wäöüÄÖÜß]+)?)(?=\s*(?:,|<|\d{5}|$))/,
        ];
        for (const pattern of patterns) {
          const match = bodyText.match(pattern);
          if (match?.[1]) {
            location = match[1].trim().replace(/^OT\s+/i, '');
            break;
          }
        }
      }

      return { valid: true, url, title: title.trim(), location };
    } catch (error) {
      console.error('Error extracting property data:', error);
      return { valid: false, url: window.location.href, title: null, location: null };
    }
  };

  const propertyData = extractPropertyData();
  chrome.runtime.sendMessage({ type: 'SCRAPE_RESULT', payload: propertyData });
})();
