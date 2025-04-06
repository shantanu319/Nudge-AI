(function() {
  // This script runs as soon as the page starts loading (due to 'run_at': 'document_start' in manifest)
  // Check if current domain is blocked as early as possible
  chrome.storage.local.get(['blockedSites'], function(result) {
    // Get current domain without www prefix
    const currentHost = window.location.hostname;
    const currentDomain = currentHost.replace(/^www\./, '');
    const blockedSites = result.blockedSites || [];
    
    // Check if the current domain or any parent domain is blocked
    const isBlocked = blockedSites.some(site => 
      currentDomain === site || currentDomain.endsWith('.' + site)
    );
    
    if (isBlocked) {
      console.log(`Domain ${currentDomain} is blocked. Loading overlay from blocked.html`);
      
      // Prevent the default page from rendering fully
      document.documentElement.innerHTML = '';
      
      // Create an iframe to load the blocked.html content
      const iframe = document.createElement('iframe');
      
      // Set up the styling to make it a full screen overlay
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.zIndex = '2147483647'; // Maximum z-index
      
      // Get the chrome-extension:// URL for the blocked.html page
      const blockedPageUrl = chrome.runtime.getURL('blocked.html') + `?domain=${encodeURIComponent(currentDomain)}`;
      iframe.src = blockedPageUrl;
      
      // Create a minimal page with only our iframe
      document.body = document.createElement('body');
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.width = '100vw';
      document.body.appendChild(iframe);
      
      // Listen for messages from the iframe
      window.addEventListener('message', function(event) {
        // Handle any messages that might come from the blocked.html page
        // For example, if the "Back" button is clicked
        if (event.data && event.data.action === 'goBack') {
          window.history.back();
        }
      });
    }
  });
})();
