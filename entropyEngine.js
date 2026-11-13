// PRISM Entropy Engine
// Estimates browser identifiability based on accessed fingerprinting attributes
// This is NOT Shannon entropy - it's a weighted heuristic for uniqueness estimation

/**
 * Entropy weights for different fingerprinting attributes
 * Higher weight = more identifying power
 * Based on research on fingerprinting entropy contribution
 */
const ENTROPY_WEIGHTS = {
  // Canvas fingerprinting - highly identifying
  'Canvas.toDataURL': 8.5,
  'Canvas.toBlob': 8.5,
  'Canvas.getImageData': 8.0,
  
  // WebGL fingerprinting - very distinctive
  'WebGL.context': 7.5,
  'WebGL.getParameter': 7.0,
  'WebGL.vendor': 6.5,
  'WebGL.renderer': 6.5,
  
  // Audio fingerprinting - moderate to high
  'AudioContext': 6.0,
  'OfflineAudioContext': 6.0,
  'Audio.fingerprint': 5.5,
  
  // Font enumeration - moderate
  'Font.check': 4.5,
  'Font.enumerate': 5.0,
  
  // Screen properties - low (common values)
  'Screen.width': 2.0,
  'Screen.height': 2.0,
  'Screen.colorDepth': 1.5,
  'Screen.pixelDepth': 1.5,
  'Screen.availWidth': 1.8,
  'Screen.availHeight': 1.8,
  
  // Navigator properties - varies
  'Navigator.userAgent': 3.0,
  'Navigator.platform': 2.5,
  'Navigator.language': 1.5,
  'Navigator.languages': 2.0,
  'Navigator.hardwareConcurrency': 3.5,
  'Navigator.deviceMemory': 3.5,
  'Navigator.maxTouchPoints': 2.0,
  
  // Battery API - low but suspicious
  'Battery.level': 2.5,
  'Battery.charging': 1.5,
  
  // Timezone - moderate
  'Timezone.offset': 2.5,
  
  // Plugins (legacy) - low in modern browsers
  'Plugin.enumerate': 3.0
};

/**
 * Category groupings for explainability
 */
const ENTROPY_CATEGORIES = {
  'Canvas': ['Canvas.toDataURL', 'Canvas.toBlob', 'Canvas.getImageData'],
  'WebGL': ['WebGL.context', 'WebGL.getParameter', 'WebGL.vendor', 'WebGL.renderer'],
  'Audio': ['AudioContext', 'OfflineAudioContext', 'Audio.fingerprint'],
  'Font': ['Font.check', 'Font.enumerate'],
  'Screen': ['Screen.width', 'Screen.height', 'Screen.colorDepth', 'Screen.pixelDepth', 'Screen.availWidth', 'Screen.availHeight'],
  'Navigator': ['Navigator.userAgent', 'Navigator.platform', 'Navigator.language', 'Navigator.languages', 'Navigator.hardwareConcurrency', 'Navigator.deviceMemory', 'Navigator.maxTouchPoints'],
  'Battery': ['Battery.level', 'Battery.charging'],
  'Timezone': ['Timezone.offset'],
  'Plugins': ['Plugin.enumerate']
};

/**
 * Calculate entropy score from accessed attributes
 * @param {Set<string>} accessedAttributes - Set of unique attribute identifiers
 * @returns {Object} Entropy analysis result
 */
export function calculateEntropy(accessedAttributes) {
  if (!accessedAttributes || accessedAttributes.size === 0) {
    return {
      entropyScore: 0,
      normalizedEntropy: 0,
      breakdown: {},
      accessedCount: 0
    };
  }
  
  let totalEntropy = 0;
  const breakdown = {};
  
  // Initialize breakdown categories
  for (const category of Object.keys(ENTROPY_CATEGORIES)) {
    breakdown[category] = {
      entropy: 0,
      count: 0,
      attributes: []
    };
  }
  
  // Calculate entropy by summing weights of accessed attributes
  for (const attribute of accessedAttributes) {
    const weight = ENTROPY_WEIGHTS[attribute] || 0;
    
    if (weight > 0) {
      totalEntropy += weight;
      
      // Find category for this attribute
      for (const [category, attributes] of Object.entries(ENTROPY_CATEGORIES)) {
        if (attributes.includes(attribute)) {
          breakdown[category].entropy += weight;
          breakdown[category].count += 1;
          breakdown[category].attributes.push(attribute);
          break;
        }
      }
    }
  }
  
  // Normalize entropy to 0-100 scale
  // Maximum realistic entropy ~ 80-100 (accessing many high-weight attributes)
  const maxExpectedEntropy = 100;
  const normalizedEntropy = Math.min(100, (totalEntropy / maxExpectedEntropy) * 100);
  
  return {
    entropyScore: totalEntropy,
    normalizedEntropy: Math.round(normalizedEntropy),
    breakdown: breakdown,
    accessedCount: accessedAttributes.size
  };
}

/**
 * Map fingerprint API names to entropy attribute keys
 * @param {string} api - API name from fingerprint detection
 * @returns {string} Entropy attribute key
 */
export function mapAPIToEntropyAttribute(api) {
  const mappings = {
    'Canvas.toDataURL': 'Canvas.toDataURL',
    'Canvas.toBlob': 'Canvas.toBlob',
    'Canvas.getImageData': 'Canvas.getImageData',
    'WebGLRenderingContext': 'WebGL.context',
    'WebGL.getParameter': 'WebGL.getParameter',
    'WebGL2.getParameter': 'WebGL.getParameter',
    'AudioContext': 'AudioContext',
    'OfflineAudioContext': 'OfflineAudioContext',
    'FontList.check': 'Font.check',
    'Screen.properties': 'Screen.width', // Represents screen access
    'Navigator.properties': 'Navigator.userAgent', // Represents navigator access
    'Battery.API': 'Battery.level'
  };
  
  return mappings[api] || null;
}

/**
 * Generate human-readable entropy explanation
 * @param {Object} entropyResult - Result from calculateEntropy
 * @returns {string} Explanation text
 */
export function explainEntropy(entropyResult) {
  if (entropyResult.normalizedEntropy === 0) {
    return 'No fingerprinting attributes accessed. Browser identifiability: minimal.';
  }
  
  const { normalizedEntropy, breakdown } = entropyResult;
  
  let explanation = `Browser identifiability score: ${normalizedEntropy}/100. `;
  
  // Find top contributing categories
  const topCategories = Object.entries(breakdown)
    .filter(([_, data]) => data.entropy > 0)
    .sort((a, b) => b[1].entropy - a[1].entropy)
    .slice(0, 3);
  
  if (topCategories.length > 0) {
    explanation += 'Primary fingerprinting vectors: ';
    explanation += topCategories.map(([cat, data]) => 
      `${cat} (${data.count} attribute${data.count > 1 ? 's' : ''})`
    ).join(', ');
    explanation += '.';
  }
  
  return explanation;
}

/**
 * Get entropy contribution for risk scoring
 * Scales entropy to contribute proportionally to risk score
 * @param {number} normalizedEntropy - Normalized entropy (0-100)
 * @returns {number} Entropy risk contribution
 */
export function getEntropyRiskContribution(normalizedEntropy) {
  // Scale entropy to contribute 0-25 points to total risk
  // This ensures entropy is significant but doesn't dominate
  return Math.round((normalizedEntropy / 100) * 25);
}

/**
 * Check if entropy threshold is exceeded (for alerts)
 * @param {number} normalizedEntropy - Normalized entropy
 * @returns {Object} Threshold check result
 */
export function checkEntropyThreshold(normalizedEntropy) {
  if (normalizedEntropy >= 70) {
    return {
      exceeded: true,
      level: 'critical',
      message: 'Extensive fingerprinting detected - browser is highly identifiable'
    };
  } else if (normalizedEntropy >= 50) {
    return {
      exceeded: true,
      level: 'high',
      message: 'Significant fingerprinting detected - moderate identifiability risk'
    };
  } else if (normalizedEntropy >= 30) {
    return {
      exceeded: true,
      level: 'medium',
      message: 'Fingerprinting attempts detected - some identifiability risk'
    };
  }
  
  return {
    exceeded: false,
    level: 'low',
    message: 'Minimal fingerprinting detected'
  };
}