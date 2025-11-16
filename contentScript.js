/**
 * Content Script - ImmoMetrica Listing Data Extractor
 * Extracts property title from listing pages
 */

(() => {
  'use strict';

  // Selectors for property listing elements
  const SELECTORS = {
    TITLE: 'header.page-header h2.no-margin-bottom',
    LOCATION_INFO: '.card-body .text, .statistic .text',
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
   * Handles various location formats from ImmoMetrica pages based on 6 sample patterns
   */
  function extractLocation() {
    console.log(`DEBUG: Starting location extraction...`);
    
    // Look for location in various sections of the page
    const selectors = [
      '.statistic .flex-grow-1.text',
      '.card-body .text', 
      '.flex-grow-1.text',
      '.property-details .text',
      '.info-section .text'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        const text = element?.textContent?.trim();
        if (!text) continue;
        
        console.log(`DEBUG: Processing element with selector "${selector}": "${text}"`);
        
        // Split by line breaks and process each line
        const lines = text.split(/[\n\r]+/).map(line => line.trim()).filter(line => line);
        
        for (const line of lines) {
          console.log(`DEBUG: Processing line: "${line}"`);
          
          // Skip lines that are clearly not location data
          if (line.match(/erstmals online|Tage online|€|EUR|m²|Zimmer|Aktiv|Archiv/i)) {
            continue;
          }
          
          // Try to extract city from this line
          const city = extractCityFromText(line);
          if (city) {
            console.log(`DEBUG: Successfully extracted city: "${city}"`);
            return city;
          }
        }
      }
    }
    
    // Fallback: search more broadly in the page
    console.log(`DEBUG: No location found in main elements, trying fallback...`);
    return extractLocationFallback();
  }

  /**
   * Extract city name from a single text string using pattern matching
   * Based on 6 tested ImmoMetrica sample patterns
   */
  function extractCityFromText(text) {
    if (!text) return null;
    
    text = text.trim();
    console.log(`DEBUG: Extracting city from: "${text}"`);
    
    // Pattern 1: Simple "postal city" format (Sample 1: "16515 Oranienburg")
    const pattern1 = /^\d{5}\s+([^,]+)$/.exec(text);
    if (pattern1) {
      console.log(`DEBUG: Pattern 1 matched: "${pattern1[1].trim()}"`);
      return pattern1[1].trim();
    }
    
    // Pattern 2: "postal city, district" format (Sample 2: "14712 Rathenow, Havelland")  
    const pattern2 = /^\d{5}\s+([^,]+),/.exec(text);
    if (pattern2) {
      console.log(`DEBUG: Pattern 2 matched: "${pattern2[1].trim()}"`);
      return pattern2[1].trim();
    }
    
    // Pattern 3: "postal city, ortsteil detail" format (Sample 3: "15517 Fürstenwalde/Spree, Ortsteil Ketschendorf")
    const pattern3 = /^\d{5}\s+([^,]+),\s*Ortsteil/.exec(text);
    if (pattern3) {
      console.log(`DEBUG: Pattern 3 matched: "${pattern3[1].trim()}"`);
      return pattern3[1].trim();
    }
    
    // Pattern 5: "postal city, city" duplicate format (Sample 5: "12619 Berlin, Berlin")
    const pattern5 = /^\d{5}\s+([^,]+),\s*\1$/.exec(text);
    if (pattern5) {
      console.log(`DEBUG: Pattern 5 matched: "${pattern5[1].trim()}"`);
      return pattern5[1].trim();
    }
    
    // Pattern 6: "postal city, OT subdivision (subdivision)" format (Sample 6: "14715 Nennhausen, OT Bamme (Bamme)")
    const pattern6 = /^\d{5}\s+([^,]+),/.exec(text);
    if (pattern6) {
      console.log(`DEBUG: Pattern 6 matched: "${pattern6[1].trim()}"`);
      return pattern6[1].trim();
    }
    
    // Fallback: Extract anything after 5 digits and space, before comma or end
    const fallback = /^\d{5}\s+([^,\n]+)/.exec(text);
    if (fallback) {
      console.log(`DEBUG: Fallback pattern matched: "${fallback[1].trim()}"`);
      return fallback[1].trim();
    }
    
    console.log(`DEBUG: No pattern matched for text: "${text}"`);
    return null;
  }

  /**
   * Fallback method to extract location from title, URL, or broader page search
   */
  function extractLocationFallback() {
    // Extended list of cities including new samples
    const knownCities = [
      'Fürstenwalde', 'Oranienburg', 'Rathenow', 'Storkow', 'Bad Saarow', 
      'Ludwigsfelde', 'Berlin', 'Nennhausen', 'Bamme'
    ];
    
    // Check URL for city names
    const url = window.location.href.toLowerCase();
    for (const city of knownCities) {
      if (url.includes(city.toLowerCase())) {
        console.log(`DEBUG: Found city in URL: "${city}"`);
        return city;
      }
    }
    
    // Check page title
    const pageTitle = document.title.toLowerCase();
    for (const city of knownCities) {
      if (pageTitle.includes(city.toLowerCase())) {
        console.log(`DEBUG: Found city in title: "${city}"`);
        return city;
      }
    }
    
    // Final attempt: search entire page for postal code + city patterns
    const allText = document.body.textContent || '';
    const postalMatches = allText.match(/\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*/g);
    
    if (postalMatches) {
      for (const match of postalMatches) {
        const city = match.replace(/^\d{5}\s+/, '').trim();
        if (city && city !== 'Brandenburg' && city.length > 2 && !city.match(/\d/)) {
          console.log(`DEBUG: Found city in page text: "${city}"`);
          return city;
        }
      }
    }
    
    console.log(`DEBUG: No location found with any method`);
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
    
    console.log('DEBUG: Content script results:', { valid, title, location: locationCity, url: location.href });
    
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
