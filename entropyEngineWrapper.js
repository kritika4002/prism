// PRISM Entropy Engine Wrapper
// Service worker compatibility wrapper for entropyEngine
// Uses 'self' for service worker global scope

(function() {
  'use strict';
  
  // Entropy weights for different fingerprinting attributes
  const ENTROPY_WEIGHTS = {
    'Canvas.toDataURL': 8.5,
    'Canvas.toBlob': 8.5,
    'Canvas.getImageData': 8.0,
    'WebGL.context': 7.5,
    'WebGL.getParameter': 7.0,
    'WebGL.vendor': 6.5,
    'WebGL.renderer': 6.5,
    'AudioContext': 6.0,
    'OfflineAudioContext': 6.0,
    'Audio.fingerprint': 5.5,
    'Font.check': 4.5,
    'Font.enumerate': 5.0,
    'Screen.width': 2.0,
    'Screen.height': 2.0,
    'Screen.colorDepth': 1.5,
    'Screen.pixelDepth': 1.5,
    'Screen.availWidth': 1.8,
    'Screen.availHeight': 1.8,
    'Navigator.userAgent': 3.0,
    'Navigator.platform': 2.5,
    'Navigator.language': 1.5,
    'Navigator.languages': 2.0,
    'Navigator.hardwareConcurrency': 3.5,
    'Navigator.deviceMemory': 3.5,
    'Navigator.maxTouchPoints': 2.0,
    'Battery.level': 2.5,
    'Battery.charging': 1.5,
    'Timezone.offset': 2.5,
    'Plugin.enumerate': 3.0
  };

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

  // Calculate entropy from accessed attributes
  self.calculateEntropy = function(accessedAttributes) {
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
    
    for (const category of Object.keys(ENTROPY_CATEGORIES)) {
      breakdown[category] = {
        entropy: 0,
        count: 0,
        attributes: []
      };
    }
    
    for (const attribute of accessedAttributes) {
      const weight = ENTROPY_WEIGHTS[attribute] || 0;
      
      if (weight > 0) {
        totalEntropy += weight;
        
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
    
    const maxExpectedEntropy = 100;
    const normalizedEntropy = Math.min(100, (totalEntropy / maxExpectedEntropy) * 100);
    
    return {
      entropyScore: totalEntropy,
      normalizedEntropy: Math.round(normalizedEntropy),
      breakdown: breakdown,
      accessedCount: accessedAttributes.size
    };
  };

  // Map API names to entropy attributes
  self.mapAPIToEntropyAttribute = function(api) {
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
      'Screen.properties': 'Screen.width',
      'Navigator.properties': 'Navigator.userAgent',
      'Battery.API': 'Battery.level'
    };
    
    return mappings[api] || null;
  };

  // Get entropy risk contribution (0-25 points)
  self.getEntropyRiskContribution = function(normalizedEntropy) {
    return Math.round((normalizedEntropy / 100) * 25);
  };

  // Generate entropy explanation
  self.explainEntropy = function(entropyResult) {
    if (entropyResult.normalizedEntropy === 0) {
      return 'No fingerprinting attributes accessed. Browser identifiability: minimal.';
    }
    
    const { normalizedEntropy, breakdown } = entropyResult;
    let explanation = `Browser identifiability score: ${normalizedEntropy}/100. `;
    
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
  };

  console.log('PRISM entropy engine loaded');
})();