// PRISM Popup Controller
// Manages the popup UI and communicates with background script

let currentData = null;

// DOM elements
const elements = {
  domain: document.getElementById('currentDomain'),
  riskScore: document.getElementById('riskScore'),
  riskLevel: document.getElementById('riskLevel'),
  riskCircle: document.getElementById('riskCircle'),
  trackerCount: document.getElementById('trackerCount'),
  fingerprintCount: document.getElementById('fingerprintCount'),
  cookieCount: document.getElementById('cookieCount'),
  requestCount: document.getElementById('requestCount'),
  eventsList: document.getElementById('eventsList'),
  trackersList: document.getElementById('trackersList'),
  refreshBtn: document.getElementById('refreshBtn'),
  exportBtn: document.getElementById('exportBtn')
};

// Initialize popup
async function init() {
  // Wait a bit for scripts to load
  if (!window.prismExport) {
    console.warn('Export module not loaded yet, waiting...');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (!window.prismExport) {
    console.error('Export module failed to load!');
  }
  
  await loadPrivacyData();
  setupEventListeners();
  
  // Auto-refresh every 2 seconds
  setInterval(loadPrivacyData, 2000);
}

// Load privacy data from background
async function loadPrivacyData() {
  try {
    const data = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'get_privacy_data' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to get data:', chrome.runtime.lastError);
            resolve(getEmptyData());
          } else {
            console.log('Popup received data:', {
              riskScore: response?.riskScore,
              trackerCount: response?.trackerCount,
              fingerprintCount: response?.fingerprintCount,
              cookieCount: response?.thirdPartyCookieCount,
              domain: response?.domain,
              fullResponse: response
            });
            resolve(response || getEmptyData());
          }
        }
      );
    });
    
    currentData = data;
    updateUI(data);
  } catch (error) {
    console.error('Error loading data:', error);
    updateUI(getEmptyData());
  }
}

// Get empty data structure
function getEmptyData() {
  return {
    domain: 'No active page',
    trackerCount: 0,
    fingerprintCount: 0,
    thirdPartyCookieCount: 0,
    thirdPartyRequestCount: 0,
    riskScore: 0,
    events: [],
    trackers: []
  };
}

// Update UI with data
function updateUI(data) {
  // Update domain
  elements.domain.textContent = data.domain || 'Unknown';
  
  // Update risk score
  updateRiskScore(data.riskScore);
  
  // Update metrics
  elements.trackerCount.textContent = data.trackerCount || 0;
  elements.fingerprintCount.textContent = data.fingerprintCount || 0;
  elements.cookieCount.textContent = data.thirdPartyCookieCount || 0;
  elements.requestCount.textContent = data.thirdPartyRequestCount || 0;
  
  // Update events list
  updateEventsList(data.events || []);
  
  // Update trackers list
  updateTrackersList(data.trackers || []);
}

// Update risk score display
function updateRiskScore(score) {
  console.log('updateRiskScore called with:', score, 'Type:', typeof score);
  
  // Validate and clamp score to 0-100
  if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) {
    console.warn('Invalid risk score received:', score, 'Type:', typeof score);
    score = 0;
  }
  
  const originalScore = score;
  score = Math.max(0, Math.min(100, score));
  
  if (originalScore !== score) {
    console.warn('Score was clamped:', originalScore, '->', score);
  }
  
  console.log('Setting risk score display to:', score);
  elements.riskScore.textContent = score;
  
  // Update circle progress
  const circumference = 314; // 2 * PI * 50
  const offset = circumference - (score / 100) * circumference;
  elements.riskCircle.style.strokeDashoffset = offset;
  
  // Update color based on risk level
  let color, level, levelClass;
  
  if (score === 0) {
    color = '#10b981';
    level = 'No Risk';
    levelClass = '';
  } else if (score <= 10) {
    color = '#22c55e';
    level = 'Low Risk';
    levelClass = 'low';
  } else if (score <= 30) {
    color = '#eab308';
    level = 'Medium Risk';
    levelClass = 'medium';
  } else if (score <= 60) {
    color = '#f97316';
    level = 'High Risk';
    levelClass = 'high';
  } else {
    color = '#ef4444';
    level = 'Critical Risk';
    levelClass = 'critical';
  }
  
  elements.riskCircle.style.stroke = color;
  elements.riskLevel.textContent = level;
  elements.riskLevel.className = 'risk-level ' + levelClass;
}

// Update events list
function updateEventsList(events) {
  if (!events || events.length === 0) {
    elements.eventsList.innerHTML = '<div class="empty-state">No privacy events detected yet</div>';
    return;
  }
  
  // Sort by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);
  
  elements.eventsList.innerHTML = sortedEvents.map(event => {
    const timeStr = window.prismUtils ? 
      window.prismUtils.formatTimestamp(event.timestamp) : 
      new Date(event.timestamp).toLocaleTimeString();
    
    return `
      <div class="event-item ${event.type}">
        <div class="event-type ${event.type}">${event.type}</div>
        <div class="event-description">${escapeHtml(event.description)}</div>
        <div class="event-time">${timeStr}</div>
      </div>
    `;
  }).join('');
}

// Update trackers list
function updateTrackersList(trackers) {
  if (!trackers || trackers.length === 0) {
    elements.trackersList.innerHTML = '<div class="empty-state">No trackers detected</div>';
    return;
  }
  
  elements.trackersList.innerHTML = trackers.map(tracker => `
    <div class="tracker-item">
      <div class="tracker-domain">${escapeHtml(tracker)}</div>
      <div class="tracker-info">Known tracking domain</div>
    </div>
  `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      switchTab(targetTab);
    });
  });
  
  // Refresh button
  elements.refreshBtn.addEventListener('click', async () => {
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.innerHTML = '<span>⟳</span> Refreshing...';
    
    await loadPrivacyData();
    
    setTimeout(() => {
      elements.refreshBtn.disabled = false;
      elements.refreshBtn.innerHTML = '<span>↻</span> Refresh';
    }, 500);
  });
  
  // Export button
  elements.exportBtn.addEventListener('click', handleExport);
}

// Switch between tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    }
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const targetContent = document.getElementById(tabName + 'Tab');
  if (targetContent) {
    targetContent.classList.add('active');
  }
}

// Handle export
async function handleExport() {
  if (!window.prismExport) {
    alert('Export module not loaded');
    return;
  }
  
  try {
    elements.exportBtn.disabled = true;
    elements.exportBtn.innerHTML = '<span>⤓</span> Exporting...';
    
    const success = await window.prismExport.exportCurrentSession('json');
    
    if (success) {
      showNotification('Data exported successfully!');
    } else {
      showNotification('Export failed', 'error');
    }
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Export failed', 'error');
  } finally {
    setTimeout(() => {
      elements.exportBtn.disabled = false;
      elements.exportBtn.innerHTML = '<span>⤓</span> Export';
    }, 1000);
  }
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);