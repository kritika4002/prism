// PRISM Background Service Worker
// Handles network monitoring, tracker detection, and state management
// FIXED: Sync syntax, removed risk calculation spam, proper timing

importScripts('trackerList.js');
importScripts('riskEngine.js');
importScripts('entropyEngineWrapper.js');

// Global state per tab
const tabStates = new Map();

// Initialize state for a tab
function initTabState(tabId, domain) {
  return {
    domain: domain,
    trackers: new Set(),
    thirdPartyRequests: [],
    fingerprints: [],
    cookies: new Set(),
    riskScore: 0,
    events: [],
    timestamp: Date.now(),
    entropyAttributes: new Set(),
    entropyScore: 0,
    entropyBreakdown: {}
  };
}

// Get current tab state
function getTabState(tabId) {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, initTabState(tabId, 'unknown'));
  }
  return tabStates.get(tabId);
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// Check if request is third-party
function isThirdParty(requestDomain, pageDomain) {
  if (!requestDomain || !pageDomain) return false;
  
  const cleanRequest = requestDomain.replace(/^www\./, '');
  const cleanPage = pageDomain.replace(/^www\./, '');
  
  return !cleanRequest.endsWith(cleanPage) && cleanRequest !== cleanPage;
}

// Check if domain is a known tracker
function isTrackerDomain(domain) {
  if (!domain || !self.TRACKER_DOMAINS) return false;
  
  if (self.TRACKER_DOMAINS.has(domain)) return true;
  
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const parentDomain = parts.slice(i).join('.');
    if (self.TRACKER_DOMAINS.has(parentDomain)) return true;
  }
  
  return false;
}

// FIXED: Sync fingerprints from page localStorage
async function syncFingerprintsFromPage(tabId) {
  try {
    const state = getTabState(tabId);
    
    // Execute script in page context to read localStorage
    // FIXED: Correct syntax - target: { tabId } not target: { tabId: tabId }
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        try {
          const stored = localStorage.getItem('PRISMfingerprints');
          if (stored) {
            localStorage.removeItem('PRISMfingerprints');
            return JSON.parse(stored);
          }
          return [];
        } catch (e) {
          return [];
        }
      }
    });
    
    if (results && results[0] && results[0].result && results[0].result.length > 0) {
      const pageFingerprints = results[0].result;
      
      console.log(`[PRISM] Synced ${pageFingerprints.length} fingerprints from localStorage`);
      
      // Merge into state (deduplicate by api name)
      const existingApis = new Set(state.fingerprints.map(f => f.api));
      
      for (const fp of pageFingerprints) {
        if (!existingApis.has(fp.api)) {
          state.fingerprints.push({
            api: fp.api,
            timestamp: fp.timestamp
          });
          
          state.events.push({
            type: 'fingerprint',
            api: fp.api,
            description: `Browser fingerprinting detected: ${fp.api} API accessed`,
            timestamp: fp.timestamp
          });
          
          existingApis.add(fp.api);
          
          // Process entropy signal
          processEntropySignal(tabId, fp.api);
        }
      }
      
      // Recalculate risk score ONCE after all fingerprints synced
      state.riskScore = calculateRiskScoreWithEntropy(state);
      
      console.log(`[PRISM] Risk Score: ${state.riskScore}/100 (trackers:${state.trackers.size}, fingerprints:${state.fingerprints.length}, cookies:${state.cookies.size})`);
    }
  } catch (e) {
    // chrome.scripting may fail on some pages (chrome://, etc.) - silently ignore
    console.log('[PRISM] Sync failed (expected on some pages):', e.message);
  }
}

// Process entropy signal
function processEntropySignal(tabId, attribute) {
  const state = getTabState(tabId);
  
  const entropyAttr = self.mapAPIToEntropyAttribute ? 
    self.mapAPIToEntropyAttribute(attribute) : attribute;
  
  if (entropyAttr && !state.entropyAttributes.has(entropyAttr)) {
    state.entropyAttributes.add(entropyAttr);
    
    if (self.calculateEntropy) {
      const entropyResult = self.calculateEntropy(state.entropyAttributes);
      state.entropyScore = entropyResult.normalizedEntropy;
      state.entropyBreakdown = entropyResult.breakdown;
    }
  }
}

// Calculate risk score including entropy
function calculateRiskScoreWithEntropy(state) {
  // Base risk: 0-90 points (trackers + fingerprints + cookies)
  const baseRisk = calculateRiskScore(state);
  
  // Entropy contribution: 0-10 points (normalized)
  const entropyScore = state.entropyScore || 0;
  const entropyRisk = Math.min(10, entropyScore * 0.1);
  
  // Total risk: 0-100 points
  const totalRisk = baseRisk + entropyRisk;
  
  return Math.min(100, Math.round(totalRisk));
}

// Network request listener
// FIXED: Removed excessive risk recalculation spam
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { tabId, url, type } = details;
    
    if (tabId === -1) return;
    
    const requestDomain = extractDomain(url);
    if (!requestDomain) return;
    
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.url) return;
      
      const pageDomain = extractDomain(tab.url);
      if (!pageDomain) return;
      
      const state = getTabState(tabId);
      
      if (state.domain !== pageDomain) {
        tabStates.set(tabId, initTabState(tabId, pageDomain));
        return;
      }
      
      if (isThirdParty(requestDomain, pageDomain)) {
        state.thirdPartyRequests.push({
          domain: requestDomain,
          url: url,
          type: type,
          timestamp: Date.now()
        });
        
        if (isTrackerDomain(requestDomain)) {
          state.trackers.add(requestDomain);
          
          state.events.push({
            type: 'tracker',
            domain: requestDomain,
            description: `${requestDomain} attempted cross-site tracking via ${type} request`,
            timestamp: Date.now()
          });
        }
      }
      
      // REMOVED: state.riskScore = calculateRiskScoreWithEntropy(state);
      // Risk will be calculated when popup requests data or sync completes
    });
  },
  { urls: ["<all_urls>"] }
);

// Monitor cookies
async function monitorCookies(tabId, pageDomain) {
  try {
    if (!pageDomain) return;
    const state = getTabState(tabId);
    
    // ONLY count cookies from CURRENT SITE's 3rd party domains
    const thirdPartyDomains = new Set();
    for (const req of state.thirdPartyRequests) thirdPartyDomains.add(req.domain);
    for (const tracker of state.trackers) thirdPartyDomains.add(tracker);
    
    state.cookies.clear(); // Reset
    let cookieCount = 0;
    
    // ONLY check THESE domains (5-10 max)
    for (const domain of Array.from(thirdPartyDomains).slice(0, 10)) {
      try {
        const domainCookies = await chrome.cookies.getAll({domain});
        for (const cookie of domainCookies) {
          const cookieDomain = cookie.domain.replace(/^\./, '');
          if (isThirdParty(cookieDomain, pageDomain)) {
            state.cookies.add(cookieDomain);
            cookieCount++;
          }
        }
      } catch(e) {}
    }
    
    console.log(`[PRISM] Site cookies: ${cookieCount}`); // DEBUG: 5-20
    state.riskScore = calculateRiskScoreWithEntropy(state);
  } catch(e) {
    console.error('Cookie error:', e);
  }
}


// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const domain = extractDomain(tab.url);
    if (domain) {
      tabStates.set(tabId, initTabState(tabId, domain));
      monitorCookies(tabId, domain);
    }
  }
  
  // Sync fingerprints when page becomes complete
  if (changeInfo.status === 'complete') {
    syncFingerprintsFromPage(tabId);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  const { tabId } = activeInfo;
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    
    const domain = extractDomain(tab.url);
    if (domain && !tabStates.has(tabId)) {
      tabStates.set(tabId, initTabState(tabId, domain));
      monitorCookies(tabId, domain);
    }
  });
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;
  
  if (message.type === 'fingerprintdetected') {
    const state = getTabState(tabId);
    
    state.fingerprints.push({
      api: message.api,
      timestamp: Date.now()
    });
    
    state.events.push({
      type: 'fingerprint',
      api: message.api,
      description: `Browser fingerprinting detected: ${message.api} API accessed`,
      timestamp: Date.now()
    });
    
    // Calculate risk after fingerprint added
    state.riskScore = calculateRiskScoreWithEntropy(state);
    
    sendResponse({ success: true });
  }
  
  if (message.type === 'entropysignal') {
    processEntropySignal(tabId, message.attribute);
    sendResponse({ success: true });
  }
  
  if (message.type === 'get_privacy_data') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        // SYNC fingerprints from localStorage FIRST
        await syncFingerprintsFromPage(tabs[0].id);
        
        const state = getTabState(tabs[0].id);
        const domain = extractDomain(tabs[0].url);
        
        await monitorCookies(tabs[0].id, domain);
        
        const data = {
          domain: domain || state.domain,
          trackers: Array.from(state.trackers),
          trackerCount: state.trackers.size,
          fingerprintCount: state.fingerprints.length,
          thirdPartyCookieCount: state.cookies.size,
          thirdPartyRequestCount: state.thirdPartyRequests.length,
          riskScore: state.riskScore,
          events: state.events.slice(-20),
          entropyScore: state.entropyScore,
          entropyBreakdown: state.entropyBreakdown
        };
        
        sendResponse(data);
      } else {
        sendResponse({
          domain: 'unknown',
          trackers: [],
          trackerCount: 0,
          fingerprintCount: 0,
          thirdPartyCookieCount: 0,
          thirdPartyRequestCount: 0,
          riskScore: 0,
          events: [],
          entropyScore: 0,
          entropyBreakdown: {}
        });
      }
    });
    
    return true;
  }
  
  if (message.type === 'export_data') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const state = getTabState(tabs[0].id);
        
        // Sync before export
        await syncFingerprintsFromPage(tabs[0].id);
        
        const exportData = {
          timestamp: new Date().toISOString(),
          domain: state.domain,
          metrics: {
            trackerCount: state.trackers.size,
            fingerprintCount: state.fingerprints.length,
            thirdPartyCookieCount: state.cookies.size,
            thirdPartyRequestCount: state.thirdPartyRequests.length,
            riskScore: state.riskScore,
            entropyScore: state.entropyScore,
            entropyBreakdown: state.entropyBreakdown
          },
          trackers: Array.from(state.trackers),
          events: state.events,
          note: 'Research data export - no personal information included'
        };
        
        sendResponse({ data: exportData });
      }
    });
    
    return true;
  }
  
  return false;
});

// Cleanup old tab states
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000;
  
  for (const [tabId, state] of tabStates.entries()) {
    if (now - state.timestamp > maxAge) {
      tabStates.delete(tabId);
    }
  }
}, 5 * 60 * 1000);

console.log('PRISM background service worker initialized with entropy analysis');