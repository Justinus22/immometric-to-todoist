// ImmoMetrica property data extractor
(() => {
  'use strict';

  const SELECTORS = {
    TITLE: 'header.page-header h2.no-margin-bottom',
    LOCATION: '.statistic .flex-grow-1.text, .card-body .text, .flex-grow-1.text'
  };

  // Check if current URL is a valid ImmoMetrica offer page
  function isValidOfferPage() {
    return /^https:\/\/www\.immometrica\.com\/de\/offer\/\d+/.test(window.location.href);
  }

  // Extract property title from the page
  function extractTitle() {
    return document.querySelector(SELECTORS.TITLE)?.textContent?.trim() || null;
  }

  // Extract location from the page
  function extractLocation() {
    const elements = document.querySelectorAll(SELECTORS.LOCATION);
    
    for (const element of elements) {
      const text = element?.textContent?.trim();
      if (!text) continue;
      
      const lines = text.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean);
      
      for (const line of lines) {
        // Skip non-location data
        if (/erstmals online|Tage online|€|EUR|m²|Zimmer|Aktiv|Archiv/i.test(line)) {
          continue;
        }
        
        const city = extractCityFromText(line);
        if (city) return city;
      }
    }
    
    return extractLocationFallback();
  }

  // Brandenburg postal codes to city mapping
  const POSTAL_CODES = {
    '10115': 'Berlin', '10117': 'Berlin', '10119': 'Berlin', '10178': 'Berlin', '10179': 'Berlin',
    '10243': 'Berlin', '10245': 'Berlin', '10247': 'Berlin', '12619': 'Berlin', '13187': 'Berlin',
    '13189': 'Berlin', '14712': 'Rathenow', '14715': 'Nennhausen', '14974': 'Ludwigsfelde',
    '15517': 'Fürstenwalde/Spree', '16515': 'Oranienburg', '14467': 'Potsdam', '14469': 'Potsdam',
    '14471': 'Potsdam', '14473': 'Potsdam', '14476': 'Potsdam', '14478': 'Potsdam', '14480': 'Potsdam',
    '14482': 'Potsdam', '14532': 'Kleinmachnow', '14542': 'Werder', '14547': 'Beelitz',
    '14552': 'Michendorf', '14554': 'Seddiner See', '14558': 'Nuthetal', '14641': 'Nauen',
    '14943': 'Luckenwalde', '14947': 'Nuthe-Urstromtal', '15806': 'Zossen', '15827': 'Blankenfelde-Mahlow',
    '15831': 'Mahlow', '15834': 'Rangsdorf', '15838': 'Am Mellensee', '16259': 'Bad Freienwalde',
    '16321': 'Bernau', '16348': 'Wandlitz', '16356': 'Werneuchen', '16540': 'Hohen Neuendorf',
    '16547': 'Birkenwerder', '16552': 'Saalfeld', '16559': 'Liebenwalde'
  };

  // Common German cities in Brandenburg region
  const CITIES = [
    'Berlin', 'Potsdam', 'Cottbus', 'Brandenburg', 'Frankfurt (Oder)', 'Eberswalde',
    'Oranienburg', 'Rathenow', 'Fürstenwalde', 'Ludwigsfelde', 'Nennhausen', 'Senftenberg',
    'Finsterwalde', 'Eisenhüttenstadt', 'Neuruppin', 'Strausberg', 'Königs Wusterhausen',
    'Hennigsdorf', 'Teltow', 'Luckenwalde', 'Bernau', 'Werder', 'Beelitz', 'Nauen',
    'Zossen', 'Bad Freienwalde', 'Wittenberge', 'Prenzlau', 'Templin', 'Schwedt',
    'Guben', 'Spremberg', 'Forst', 'Fürstenwalde/Spree', 'Frankfurt/Oder',
    'Hohen Neuendorf', 'Blankenfelde-Mahlow', 'Seddiner See', 'Am Mellensee'
  ];

  // Extract city name from text using patterns and postal codes
  function extractCityFromText(text) {
    if (!text) return null;
    
    // Remove duplicates and clean
    text = text.replace(/^(.+?)\s+\1+$/, '$1').trim();
    
    // Try postal code lookup first
    const postalMatch = text.match(/(\d{5})/);
    if (postalMatch && POSTAL_CODES[postalMatch[1]]) {
      return POSTAL_CODES[postalMatch[1]];
    }
    
    // Try text patterns
    const patterns = [
      /\d{5}\s+([A-ZÄÖÜ][a-zäöüß\/\-\s]+?)(?:\s*,|\s*$)/,
      /(?:Brandenburg|Berlin)\s*[-–]\s*([A-ZÄÖÜ][a-zäöüß\/\-\s]+?)(?:\s*,|\s*\d|\s*$)/,
      /\d{5}\s*,\s*([A-ZÄÖÜ][a-zäöüß\/\-\s]+?)(?:\s*,|\s*$)/,
      /^([A-ZÄÖÜ][a-zäöüß\/\-\s]+?)(?:\s*,|\s*\d)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let candidate = match[1].trim()
          .replace(/\s+(Ortsteil|OT|Stadt).*$/, '')
          .replace(/\s*\([^)]+\)\s*$/, '');
        
        if (isValidCity(candidate)) return candidate;
      }
    }
    
    // Fallback: check for any known city in text
    for (const city of CITIES) {
      if (text.includes(city)) return city;
    }
    
    return null;
  }

  // Validate city name
  function isValidCity(candidate) {
    if (!candidate || candidate.length < 2) return false;
    if (CITIES.includes(candidate)) return true;
    
    // Fuzzy match
    const normalized = candidate.toLowerCase();
    return CITIES.some(city => {
      const cityLower = city.toLowerCase();
      return cityLower === normalized || 
             (cityLower.includes(normalized) && Math.abs(city.length - candidate.length) <= 6);
    });
  }

  // Fallback location extraction from URL, title, or page text
  function extractLocationFallback() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    
    // Check URL and title for cities
    for (const city of CITIES) {
      const cityLower = city.toLowerCase();
      if (url.includes(cityLower) || title.includes(cityLower)) {
        return city;
      }
    }
    
    // Search page text for postal codes
    const allText = document.body.textContent || '';
    const postalMatches = allText.match(/\b(\d{5})\b/g);
    
    if (postalMatches) {
      for (const postal of postalMatches) {
        if (POSTAL_CODES[postal]) return POSTAL_CODES[postal];
      }
    }
    
    // Final attempt: any city name in page text
    const textLower = allText.toLowerCase();
    for (const city of CITIES.sort((a, b) => b.length - a.length)) {
      if (textLower.includes(city.toLowerCase())) return city;
    }
    
    return null;
  }

  // Send data to background service worker
  function sendData(data) {
    chrome.runtime.sendMessage({ type: 'SCRAPE_RESULT', payload: data });
  }

  // Main execution
  try {
    const valid = isValidOfferPage();
    const title = valid ? extractTitle() : null;
    const location = valid ? extractLocation() : null;
    
    sendData({
      valid: valid && !!title,
      title,
      location,
      url: window.location.href,
    });
  } catch (error) {
    console.error('Content script error:', error);
    sendData({ valid: false, title: null, location: null, url: window.location.href });
  }
})();
