// PRISM Risk Scoring Engine
// Calculates privacy risk score based on detected threats
// MODIFIED: Extended to incorporate entropy-based identifiability
// Service worker compatible (no ES modules)

(function() {
  'use strict';
  
  /**
   * Calculate privacy risk score (0-100)
   * Higher score = more privacy risk
   * 
   * ORIGINAL Formula: Risk = (trackers * 2) + (fingerprints * 4) + (third_party_cookies * 1)
   * NEW Formula: Risk = trackerRisk + fingerprintRisk + cookieRisk + entropyRisk
   * 
   * Entropy contribution is calculated separately and added as supplementary risk factor
   * 
   * @param {Object} state - Tab state with privacy metrics
   * @returns {number} Risk score (0-100)
   */
  function calculateRiskScore(state) {
    if (!state) return 0;
    
    const trackerCount = state.trackers ? state.trackers.size : 0;
    const fingerprintCount = state.fingerprints ? state.fingerprints.length : 0;
    const cookieCount = Math.min(20, state.cookies ? state.cookies.size : 0);
    
    // Capped weighted scoring (max contribution: ~85 points)
    const trackerScore = Math.min(30, trackerCount * 2);
    const fingerprintScore = Math.min(40, fingerprintCount * 4);
    const cookieScore = Math.min(15, cookieCount * 1);
    
    const baseRisk = trackerScore + fingerprintScore + cookieScore;
    
    // Debug logging
    console.log(`Risk calc: T${trackerCount}(${trackerScore}) F${fingerprintCount}(${fingerprintScore}) C${cookieCount}(${cookieScore}) = ${baseRisk}`);
    
    // Note: Entropy risk is added externally via calculateRiskScoreWithEntropy
    // This maintains backward compatibility with existing code
    
    // Cap at 100
    return Math.min(100, baseRisk);
  }
  

  /**
   * Get risk level label based on score
   * @param {number} score - Risk score (0-100)
   * @returns {string} Risk level label
   */
  function getRiskLevel(score) {
    if (score === 0) return 'None';
    if (score <= 10) return 'Low';
    if (score <= 30) return 'Medium';
    if (score <= 60) return 'High';
    return 'Critical';
  }

  /**
   * Get color code for risk level
   * @param {number} score - Risk score (0-100)
   * @returns {string} Color hex code
   */
  function getRiskColor(score) {
    if (score === 0) return '#10b981'; // green
    if (score <= 10) return '#22c55e'; // light green
    if (score <= 30) return '#eab308'; // yellow
    if (score <= 60) return '#f97316'; // orange
    return '#ef4444'; // red
  }

  /**
   * Calculate individual threat breakdown
   * MODIFIED: Added entropy breakdown
   * @param {Object} state - Tab state
   * @returns {Object} Detailed threat breakdown
   */
  function calculateThreatBreakdown(state) {
    if (!state) return null;
    
    const trackerCount = state.trackers ? state.trackers.size : 0;
    const fingerprintCount = state.fingerprints ? state.fingerprints.length : 0;
    const cookieCount = state.cookies ? state.cookies.size : 0;
    
    // Original scores
    const trackerScore = trackerCount * 2;
    const fingerprintScore = fingerprintCount * 4;
    const cookieScore = cookieCount * 1;
    
    // NEW: Entropy score contribution
    const entropyScore = state.entropyScore || 0;
    const entropyRisk = Math.round((entropyScore / 100) * 25); // 0-25 points
    
    const total = trackerScore + fingerprintScore + cookieScore + entropyRisk;
    
    return {
      trackers: {
        count: trackerCount,
        score: trackerScore,
        percentage: total > 0 ? Math.round((trackerScore / total) * 100) : 0
      },
      fingerprints: {
        count: fingerprintCount,
        score: fingerprintScore,
        percentage: total > 0 ? Math.round((fingerprintScore / total) * 100) : 0
      },
      cookies: {
        count: cookieCount,
        score: cookieScore,
        percentage: total > 0 ? Math.round((cookieScore / total) * 100) : 0
      },
      // NEW: Entropy contribution
      entropy: {
        score: entropyScore,
        riskContribution: entropyRisk,
        percentage: total > 0 ? Math.round((entropyRisk / total) * 100) : 0
      },
      total: total
    };
  }

  /**
   * Generate privacy report summary
   * MODIFIED: Include entropy in summary
   * @param {Object} state - Tab state
   * @returns {string} Human-readable summary
   */
  function generatePrivacySummary(state) {
    if (!state) return 'No data available';
    
    const score = state.riskScore || 0;
    const level = getRiskLevel(score);
    
    const trackerCount = state.trackers ? state.trackers.size : 0;
    const fingerprintCount = state.fingerprints ? state.fingerprints.length : 0;
    const cookieCount = state.cookies ? state.cookies.size : 0;
    const entropyScore = state.entropyScore || 0;
    
    if (score === 0) {
      return 'This site appears to respect your privacy. No tracking detected.';
    }
    
    let summary = `Privacy Risk: ${level} (${score}/100). `;
    
    const threats = [];
    if (trackerCount > 0) threats.push(`${trackerCount} tracker${trackerCount > 1 ? 's' : ''}`);
    if (fingerprintCount > 0) threats.push(`${fingerprintCount} fingerprinting attempt${fingerprintCount > 1 ? 's' : ''}`);
    if (cookieCount > 0) threats.push(`${cookieCount} third-party cookie${cookieCount > 1 ? 's' : ''}`);
    
    summary += 'Detected: ' + threats.join(', ') + '.';
    
    // NEW: Add entropy assessment if significant
    if (entropyScore > 30) {
      summary += ` Browser identifiability: ${entropyScore}/100.`;
    }
    
    return summary;
  }

  /**
   * Compare risk across multiple sites
   * @param {Array} sites - Array of site states
   * @returns {Object} Comparison metrics
   */
  function compareSites(sites) {
    if (!sites || sites.length === 0) return null;
    
    const scores = sites.map(s => s.riskScore || calculateRiskScore(s));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    return {
      average: Math.round(avg),
      maximum: max,
      minimum: min,
      sites: sites.length
    };
  }

  // Export to service worker global scope (using 'self') or window (for popup)
  const globalScope = typeof self !== 'undefined' ? self : window;
  
  globalScope.calculateRiskScore = calculateRiskScore;
  globalScope.getRiskLevel = getRiskLevel;
  globalScope.getRiskColor = getRiskColor;
  globalScope.calculateThreatBreakdown = calculateThreatBreakdown;
  globalScope.generatePrivacySummary = generatePrivacySummary;
  globalScope.compareSites = compareSites;
  
})();