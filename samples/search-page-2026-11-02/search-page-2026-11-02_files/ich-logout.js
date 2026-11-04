// The backend drops the visitor's cookie at logout; this starts the next visit.
// A file, not an inline script: htmx re-creates an inline one out of a swapped
// response without the page's nonce, and the CSP refuses it.
(function () {
  if (window.ichLogoutBound) return; // a swap that re-runs this binds nothing twice
  window.ichLogoutBound = true;
  const logout = document.currentScript.dataset.logout;
  document.addEventListener('submit', (event) => {
    const action = new URL(event.target.action, location.href).pathname;
    if (action === logout && typeof window.ich?.reset === 'function') {
      window.ich.reset();
    }
  }, true);
})();
