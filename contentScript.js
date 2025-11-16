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
   * German postal code to city mapping for major cities in Brandenburg/Berlin area
   * This helps us validate and correct city names extracted from postal codes
   */
  const POSTAL_CODE_CITIES = {
    // Berlin area
    '10115': 'Berlin', '10117': 'Berlin', '10119': 'Berlin', '10178': 'Berlin',
    '10179': 'Berlin', '10243': 'Berlin', '10245': 'Berlin', '10247': 'Berlin',
    '12619': 'Berlin', '13187': 'Berlin', '13189': 'Berlin',
    
    // Brandenburg cities from our samples
    '14712': 'Rathenow',
    '14715': 'Nennhausen', 
    '14974': 'Ludwigsfelde',
    '15517': 'Fürstenwalde/Spree',  // Use the full city name with district
    '16515': 'Oranienburg',
    
    // Additional major Brandenburg cities
    '14467': 'Potsdam',
    '14469': 'Potsdam',
    '14471': 'Potsdam',
    '14473': 'Potsdam',
    '14476': 'Potsdam',
    '14478': 'Potsdam',
    '14480': 'Potsdam',
    '14482': 'Potsdam',
    '14532': 'Kleinmachnow',
    '14542': 'Werder',
    '14547': 'Beelitz',
    '14552': 'Michendorf',
    '14554': 'Seddiner See',
    '14558': 'Nuthetal',
    '14641': 'Nauen',
    '14943': 'Luckenwalde',
    '14947': 'Nuthe-Urstromtal',
    '15806': 'Zossen',
    '15827': 'Blankenfelde-Mahlow',
    '15831': 'Mahlow',
    '15834': 'Rangsdorf',
    '15838': 'Am Mellensee',
    '16259': 'Bad Freienwalde',
    '16321': 'Bernau',
    '16348': 'Wandlitz',
    '16356': 'Werneuchen',
    '16540': 'Hohen Neuendorf',
    '16547': 'Birkenwerder',
    '16552': 'Saalfeld',
    '16559': 'Liebenwalde'
  };

  /**
   * Known German cities - comprehensive list for fallback matching
   */
  const KNOWN_CITIES = [
    // Major cities
    'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
    'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg',
    
    // Brandenburg cities from samples and surroundings
    'Oranienburg', 'Rathenow', 'Fürstenwalde', 'Ludwigsfelde', 'Nennhausen', 
    'Potsdam', 'Cottbus', 'Brandenburg', 'Frankfurt (Oder)', 'Eberswalde',
    'Senftenberg', 'Finsterwalde', 'Eisenhüttenstadt', 'Neuruppin', 'Strausberg',
    'Königs Wusterhausen', 'Hennigsdorf', 'Teltow', 'Luckenwalde', 'Bernau',
    'Werder', 'Beelitz', 'Nauen', 'Zossen', 'Bad Freienwalde', 'Wittenberge',
    'Prenzlau', 'Templin', 'Schwedt', 'Guben', 'Spremberg', 'Forst',
    
    // Common compound city names
    'Fürstenwalde/Spree', 'Frankfurt/Oder', 'Bad Freienwalde', 'Königs Wusterhausen',
    'Hohen Neuendorf', 'Blankenfelde-Mahlow', 'Seddiner See', 'Am Mellensee'
  ];

  /**
   * Extract city name from text using postal codes and city name matching
   */
  function extractCityFromText(text) {
    if (!text) return null;
    
    // Clean up the text - remove duplicates and extra whitespace
    text = text.trim();
    
    // Remove duplicate patterns like "14712 Brandenburg - Rathenow 14712 Brandenburg - Rathenow"
    const duplicatePattern = /^(.+?)\s+\1+$/;
    if (duplicatePattern.test(text)) {
      text = text.replace(duplicatePattern, '$1').trim();
      console.log(`DEBUG: Removed duplicate pattern, cleaned text: "${text}"`);
    }
    
    console.log(`DEBUG: Extracting city from: "${text}"`);
    
    // Method 1: Extract postal code and look it up directly
    const postalMatch = text.match(/(\d{5})/);
    if (postalMatch) {
      const postalCode = postalMatch[1];
      const cityFromPostal = POSTAL_CODE_CITIES[postalCode];
      if (cityFromPostal) {
        console.log(`DEBUG: Found city via postal code ${postalCode}: "${cityFromPostal}"`);
        return cityFromPostal;
      }
      console.log(`DEBUG: Postal code ${postalCode} not in database, trying text extraction`);
    }
    
    // Method 2: Extract city after postal code using flexible patterns
    const patterns = [
      // "12345 CityName" - simple format
      /\d{5}\s+([A-ZÄÖÜ][a-zäöüß\/\-\s]+?)(?:\s*,|\s*$)/,
      
      // "Brandenburg - CityName" or "State - City" format  
      /(?:Brandenburg|Berlin)\s*[-–]\s*([A-ZÄÖÜ][a-zäöüß\/\-\s]+?)(?:\s*,|\s*\d|\s*$)/,
      
      // "12345, CityName" - postal code with comma
      /\d{5}\s*,\s*([A-ZÄÖÜ][a-zäöüß\/\-\s]+?)(?:\s*,|\s*$)/,
      
      // Just city name at start of text
      /^([A-ZÄÖÜ][a-zäöüß\/\-\s]+?)(?:\s*,|\s*\d)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let candidate = match[1].trim();
        
        // Clean up common suffixes
        candidate = candidate.replace(/\s+(Ortsteil|OT|Stadt).*$/, '');
        candidate = candidate.replace(/\s*\([^)]+\)\s*$/, ''); // Remove parentheses
        
        // Validate against known cities
        if (isValidCityName(candidate)) {
          console.log(`DEBUG: Pattern matched and validated: "${candidate}"`);
          return candidate;
        }
      }
    }
    
    // Method 3: Fallback - search for any known city name in the text
    for (const city of KNOWN_CITIES) {
      if (text.includes(city)) {
        console.log(`DEBUG: Found known city in text: "${city}"`);
        return city;
      }
    }
    
    console.log(`DEBUG: No city found in text: "${text}"`);
    return null;
  }

  /**
   * Validate if a candidate string is a valid German city name
   */
  function isValidCityName(candidate) {
    if (!candidate || candidate.length < 2) return false;
    
    // Direct match with known cities
    if (KNOWN_CITIES.includes(candidate)) return true;
    
    // Fuzzy match for slight variations
    const normalized = candidate.toLowerCase();
    for (const city of KNOWN_CITIES) {
      if (city.toLowerCase() === normalized) return true;
      
      // Handle common variations
      if (city.toLowerCase().includes(normalized) || normalized.includes(city.toLowerCase())) {
        // Only accept if length difference is small (handles "Fürstenwalde" vs "Fürstenwalde/Spree")
        if (Math.abs(city.length - candidate.length) <= 6) {
          return true;
        }
      }
    }
    
    // Basic validation - starts with capital, reasonable length, German chars
    const basicValidation = /^[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\s\-\/]{1,25}$/.test(candidate);
    if (basicValidation && candidate.length >= 4) {
      console.log(`DEBUG: Candidate "${candidate}" passed basic validation`);
      return true;
    }
    
    return false;
  }

  /**
   * Fallback method to extract location from title, URL, or broader page search
   */
  function extractLocationFallback() {
    console.log(`DEBUG: Starting fallback location extraction...`);
    
    // Check URL for city names - use the comprehensive KNOWN_CITIES list
    const url = window.location.href.toLowerCase();
    for (const city of KNOWN_CITIES) {
      if (url.includes(city.toLowerCase())) {
        console.log(`DEBUG: Found city in URL: "${city}"`);
        return city;
      }
    }
    
    // Check page title for city names
    const pageTitle = document.title.toLowerCase();
    for (const city of KNOWN_CITIES) {
      if (pageTitle.includes(city.toLowerCase())) {
        console.log(`DEBUG: Found city in title: "${city}"`);
        return city;
      }
    }
    
    // Search page text for postal codes and try to map them
    const allText = document.body.textContent || '';
    const postalMatches = allText.match(/\b(\d{5})\b/g);
    
    if (postalMatches) {
      for (const postal of postalMatches) {
        const cityFromPostal = POSTAL_CODE_CITIES[postal];
        if (cityFromPostal) {
          console.log(`DEBUG: Found city via postal code in page text ${postal}: "${cityFromPostal}"`);
          return cityFromPostal;
        }
      }
    }
    
    // Final attempt: broad text search for any known city name
    const textLower = allText.toLowerCase();
    for (const city of KNOWN_CITIES.sort((a, b) => b.length - a.length)) { // Sort by length desc to match longer names first
      if (textLower.includes(city.toLowerCase())) {
        console.log(`DEBUG: Found city in page text: "${city}"`);
        return city;
      }
    }
    
    console.log(`DEBUG: No location found in fallback methods`);
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
