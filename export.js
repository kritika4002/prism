// PRISM Data Export Module
// Handles exporting privacy data for research analysis

/**
 * Export privacy data as JSON file
 * @param {Object} data - Privacy data to export
 * @param {string} filename - Output filename
 */
function exportAsJSON(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `prism-export-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export privacy data as CSV file
 * @param {Object} data - Privacy data to export
 * @param {string} filename - Output filename
 */
function exportAsCSV(data, filename) {
  const rows = [];
  
  // Header
  rows.push(['Timestamp', 'Domain', 'Tracker Count', 'Fingerprint Count', 'Cookie Count', 'Risk Score']);
  
  // Data row
  rows.push([
    data.timestamp || new Date().toISOString(),
    data.domain || 'unknown',
    data.metrics?.trackerCount || 0,
    data.metrics?.fingerprintCount || 0,
    data.metrics?.thirdPartyCookieCount || 0,
    data.metrics?.riskScore || 0
  ]);
  
  // Events
  if (data.events && data.events.length > 0) {
    rows.push([]);
    rows.push(['Event Type', 'Description', 'Timestamp']);
    
    data.events.forEach(event => {
      rows.push([
        event.type || '',
        event.description || '',
        new Date(event.timestamp).toISOString()
      ]);
    });
  }
  
  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `prism-export-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Request export from background script
 */
async function requestExport() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'export_data' },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response && response.data) {
          resolve(response.data);
        } else {
          reject(new Error('No data received'));
        }
      }
    );
  });
}

/**
 * Export current session data
 * @param {string} format - Export format ('json' or 'csv')
 */
async function exportCurrentSession(format = 'json') {
  try {
    const data = await requestExport();
    
    const filename = `prism-${data.domain}-${Date.now()}`;
    
    if (format === 'csv') {
      exportAsCSV(data, filename + '.csv');
    } else {
      exportAsJSON(data, filename + '.json');
    }
    
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    return false;
  }
}

/**
 * Copy data to clipboard
 * @param {Object} data - Data to copy
 */
async function copyToClipboard(data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(jsonStr);
    return true;
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = JSON.stringify(data, null, 2);
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Generate anonymized research data
 * @param {Object} data - Raw privacy data
 * @returns {Object} Anonymized data suitable for research
 */
function anonymizeForResearch(data) {
  return {
    timestamp: data.timestamp,
    domainHash: hashString(data.domain || ''), // Hash domain for privacy
    metrics: data.metrics,
    trackerTypes: data.trackers ? data.trackers.map(t => getRootDomain(t)) : [],
    eventTypes: data.events ? data.events.map(e => e.type) : [],
    fingerprintMethods: data.events 
      ? data.events.filter(e => e.type === 'fingerprint').map(e => e.api)
      : [],
    note: 'Anonymized research data - no personal information'
  };
}

/**
 * Simple string hash function
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get root domain from full domain
 * @param {string} domain - Full domain
 * @returns {string} Root domain
 */
function getRootDomain(domain) {
  if (!domain) return '';
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

// Export for use in popup
if (typeof window !== 'undefined') {
  window.prismExport = {
    exportAsJSON,
    exportAsCSV,
    requestExport,
    exportCurrentSession,
    copyToClipboard,
    anonymizeForResearch
  };
}