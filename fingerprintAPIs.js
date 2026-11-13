// PRISM Fingerprinting API Reference
// Documentation of browser fingerprinting techniques and APIs
// Service worker compatible (no ES modules)

(function() {
  'use strict';
  
  const fingerprintAPIs = {
    // Canvas fingerprinting
    canvas: {
      apis: ['toDataURL', 'toBlob', 'getImageData'],
      description: 'Canvas fingerprinting extracts unique rendering signatures',
      risk: 'high',
      prevalence: 'common'
    },
    
    // WebGL fingerprinting
    webgl: {
      apis: ['getParameter', 'getSupportedExtensions', 'getShaderPrecisionFormat'],
      description: 'WebGL reveals GPU and driver information',
      risk: 'high',
      prevalence: 'common'
    },
    
    // Audio fingerprinting
    audio: {
      apis: ['AudioContext', 'OfflineAudioContext', 'createOscillator'],
      description: 'Audio fingerprinting uses audio processing variations',
      risk: 'high',
      prevalence: 'moderate'
    },
    
    // Font fingerprinting
    fonts: {
      apis: ['document.fonts', 'measureText'],
      description: 'Font enumeration reveals installed fonts',
      risk: 'medium',
      prevalence: 'common'
    },
    
    // Screen fingerprinting
    screen: {
      apis: ['screen.width', 'screen.height', 'screen.colorDepth'],
      description: 'Screen properties provide device identification',
      risk: 'low',
      prevalence: 'very common'
    },
    
    // Navigator fingerprinting
    navigator: {
      apis: ['userAgent', 'platform', 'hardwareConcurrency', 'deviceMemory'],
      description: 'Navigator properties reveal browser and device info',
      risk: 'medium',
      prevalence: 'very common'
    },
    
    // Battery API
    battery: {
      apis: ['getBattery'],
      description: 'Battery level can be used for tracking',
      risk: 'low',
      prevalence: 'rare'
    },
    
    // WebRTC fingerprinting
    webrtc: {
      apis: ['RTCPeerConnection', 'enumerateDevices'],
      description: 'WebRTC can leak local IP addresses',
      risk: 'high',
      prevalence: 'moderate'
    },
    
    // Timezone fingerprinting
    timezone: {
      apis: ['getTimezoneOffset', 'Intl.DateTimeFormat'],
      description: 'Timezone information aids in user identification',
      risk: 'low',
      prevalence: 'common'
    },
    
    // Plugin fingerprinting
    plugins: {
      apis: ['navigator.plugins', 'navigator.mimeTypes'],
      description: 'Plugin enumeration (deprecated in modern browsers)',
      risk: 'low',
      prevalence: 'legacy'
    }
  };

  // Severity levels for risk calculation
  const fingerprintSeverity = {
    'Canvas.toDataURL': 4,
    'Canvas.toBlob': 4,
    'Canvas.getImageData': 4,
    'WebGLRenderingContext': 4,
    'WebGL.getParameter': 4,
    'WebGL2.getParameter': 4,
    'AudioContext': 3,
    'OfflineAudioContext': 3,
    'FontList.check': 2,
    'Screen.properties': 1,
    'Navigator.properties': 2,
    'Battery.API': 1
  };
  
  // Export to global scope (works in both service worker and window contexts)
  const globalScope = typeof self !== 'undefined' ? self : window;
  
  globalScope.FINGERPRINT_APIS = fingerprintAPIs;
  globalScope.FINGERPRINT_SEVERITY = fingerprintSeverity;
  
})();