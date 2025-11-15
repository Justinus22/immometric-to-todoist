// Content script injected on demand to extract listing data.
(() => {
  function isOfferUrl(url) {
    return /^https:\/\/www\.immometrica\.com\/de\/offer\/\d+/.test(url);
  }

  const url = window.location.href;
  const titleEl = document.querySelector('header.page-header h2.no-margin-bottom');
  const valid = isOfferUrl(url) && !!titleEl;
  const title = titleEl ? titleEl.textContent.trim() : null;

  // Return data to the service worker via messaging.
  chrome.runtime.sendMessage({
    type: 'SCRAPE_RESULT',
    payload: { valid, title, url }
  });
})();
