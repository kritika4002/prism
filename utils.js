// PRISM Utility Functions
// Common helper functions used throughout the extension

/**
 * Format timestamp to readable string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time string
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }
  
  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Format as date
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Truncate domain for display
 * @param {string} domain - Full domain name
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated domain
 */
function truncateDomain(domain, maxLength = 30) {
  if (!domain) return '';
  if (domain.length <= maxLength) return domain;
  
  return domain.substring(0, maxLength - 3) + '...';
}

/**
 * Get domain favicon URL
 * @param {string} domain - Domain name
 * @returns {string} Favicon URL
 */
function getFaviconUrl(domain) {
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Format large numbers with K/M suffix
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeHTML(text) {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Check if URL is valid
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Extract root domain from subdomain
 * @param {string} domain - Full domain
 * @returns {string} Root domain
 */
function getRootDomain(domain) {
  if (!domain) return '';
  
  const parts = domain.split('.');
  
  // Handle special TLDs like co.uk
  if (parts.length >= 3 && ['co', 'com', 'gov', 'net', 'org'].includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  
  // Return last two parts
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  
  return domain;
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
function calculatePercentage(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Sort array by property
 * @param {Array} arr - Array to sort
 * @param {string} prop - Property name
 * @param {boolean} desc - Sort descending
 * @returns {Array} Sorted array
 */
function sortBy(arr, prop, desc = false) {
  return arr.sort((a, b) => {
    const aVal = a[prop];
    const bVal = b[prop];
    
    if (aVal < bVal) return desc ? 1 : -1;
    if (aVal > bVal) return desc ? -1 : 1;
    return 0;
  });
}

/**
 * Group array by property
 * @param {Array} arr - Array to group
 * @param {string} prop - Property name
 * @returns {Object} Grouped object
 */
function groupBy(arr, prop) {
  return arr.reduce((groups, item) => {
    const key = item[prop];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.prismUtils = {
    formatTimestamp,
    truncateDomain,
    getFaviconUrl,
    formatNumber,
    sanitizeHTML,
    deepClone,
    debounce,
    generateId,
    isValidUrl,
    getRootDomain,
    calculatePercentage,
    sortBy,
    groupBy
  };
}