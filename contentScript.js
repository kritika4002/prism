// PRISM Content Script
// Detects browser fingerprinting attempts by monitoring JavaScript API access
// FIXED: Removed early exit, fixed localStorage key, fixed message types

(function() {
  'use strict';
  
  // Track already detected APIs to avoid duplicate reports
  const detectedAPIs = new Set();
  
  // localStorage key for fingerprints (NO underscore to match background)
  const STORAGE_KEY = 'PRISMfingerprints';
  
  // Send fingerprint detection to background
  function reportFingerprint(apiName) {
    if (detectedAPIs.has(apiName)) return;
    
    detectedAPIs.add(apiName);
    
    console.log(`[PRISM] Detected: ${apiName}`);
    
    // ALWAYS store to localStorage (works on localhost)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const fingerprints = stored ? JSON.parse(stored) : [];
      
      fingerprints.push({
        api: apiName,
        timestamp: Date.now()
      });
      
      // Keep only last 20 to avoid bloat
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fingerprints.slice(-20)));
    } catch (e) {
      // localStorage may fail in some contexts (e.g., private browsing)
    }
    
    // TRY to send via chrome.runtime (works on HTTPS, fails silently on localhost)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'fingerprintdetected',
          api: apiName
        });
        
        chrome.runtime.sendMessage({
          type: 'entropysignal',
          attribute: apiName
        });
      } catch (e) {
        // Silently ignore - localStorage is primary on localhost
      }
    }
  }
  
  // ============================================================================
  // 1. CANVAS FINGERPRINTING DETECTION
  // ============================================================================
  try {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      reportFingerprint('Canvas.toDataURL');
      return originalToDataURL.apply(this, args);
    };
    
    HTMLCanvasElement.prototype.toBlob = function(...args) {
      reportFingerprint('Canvas.toBlob');
      return originalToBlob.apply(this, args);
    };
    
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      reportFingerprint('Canvas.getImageData');
      return originalGetImageData.apply(this, args);
    };
    
    console.log('[PRISM] Canvas fingerprinting detection installed');
  } catch (e) {
    console.error('PRISM: Canvas interception failed:', e);
  }
  
  // ============================================================================
  // 2. WEBGL FINGERPRINTING DETECTION
  // ============================================================================
  try {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
      if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
        reportFingerprint('WebGLRenderingContext');
      }
      return originalGetContext.apply(this, [contextType, ...args]);
    };
    
    if (window.WebGLRenderingContext) {
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      
      WebGLRenderingContext.prototype.getParameter = function(param) {
        const fingerprintParams = [0x1F00, 0x1F01, 0x9245, 0x9246];
        
        if (fingerprintParams.includes(param)) {
          reportFingerprint('WebGL.getParameter');
        }
        
        return originalGetParameter.apply(this, arguments);
      };
    }
    
    if (window.WebGL2RenderingContext) {
      const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
      
      WebGL2RenderingContext.prototype.getParameter = function(param) {
        const fingerprintParams = [0x1F00, 0x1F01, 0x9245, 0x9246];
        
        if (fingerprintParams.includes(param)) {
          reportFingerprint('WebGL2.getParameter');
        }
        
        return originalGetParameter2.apply(this, arguments);
      };
    }
    
    console.log('[PRISM] WebGL fingerprinting detection installed');
  } catch (e) {
    console.error('PRISM: WebGL interception failed:', e);
  }
  
  // ============================================================================
  // 3. AUDIO FINGERPRINTING DETECTION
  // ============================================================================
  try {
    if (typeof AudioContext !== 'undefined') {
      const OriginalAudioContext = AudioContext;
      
      window.AudioContext = new Proxy(OriginalAudioContext, {
        construct(target, args) {
          reportFingerprint('AudioContext');
          return new target(...args);
        }
      });
    }
    
    if (typeof webkitAudioContext !== 'undefined') {
      const OriginalWebkitAudioContext = webkitAudioContext;
      
      window.webkitAudioContext = new Proxy(OriginalWebkitAudioContext, {
        construct(target, args) {
          reportFingerprint('AudioContext');
          return new target(...args);
        }
      });
    }
    
    if (typeof OfflineAudioContext !== 'undefined') {
      const OriginalOfflineAudioContext = OfflineAudioContext;
      
      window.OfflineAudioContext = new Proxy(OriginalOfflineAudioContext, {
        construct(target, args) {
          reportFingerprint('OfflineAudioContext');
          return new target(...args);
        }
      });
    }
    
    if (typeof webkitOfflineAudioContext !== 'undefined') {
      const OriginalWebkitOfflineAudioContext = webkitOfflineAudioContext;
      
      window.webkitOfflineAudioContext = new Proxy(OriginalWebkitOfflineAudioContext, {
        construct(target, args) {
          reportFingerprint('OfflineAudioContext');
          return new target(...args);
        }
      });
    }
    
    console.log('[PRISM] Audio fingerprinting detection installed');
  } catch (e) {
    console.error('PRISM: AudioContext interception failed:', e);
  }
  
  // ============================================================================
  // 4. FONT FINGERPRINTING DETECTION
  // ============================================================================
  (function installFontDetection() {
    try {
      if (document.fonts && document.fonts.check) {
        const originalCheck = document.fonts.check;
        
        document.fonts.check = function(...args) {
          reportFingerprint('FontList.check');
          return originalCheck.apply(this, args);
        };
        
        console.log('[PRISM] Font fingerprinting detection installed');
      } else {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', installFontDetection);
        }
      }
    } catch (e) {
      console.error('PRISM: Font interception failed:', e);
    }
  })();
  
  // ============================================================================
  // 5. SCREEN FINGERPRINTING DETECTION
  // ============================================================================
  try {
    let screenAccessCount = 0;
    const screenProps = ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'];
    
    const originalScreen = window.screen;
    const screenHandler = {
      get(target, prop) {
        if (screenProps.includes(prop)) {
          screenAccessCount++;
          if (screenAccessCount === 5) {
            reportFingerprint('Screen.properties');
          }
        }
        
        return Reflect.get(target, prop);
      }
    };
    
    try {
      window.screen = new Proxy(originalScreen, screenHandler);
      console.log('[PRISM] Screen fingerprinting detection installed (proxy)');
    } catch (e) {
      console.log('[PRISM] Screen proxy failed, using descriptor override');
      
      screenProps.forEach(prop => {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(Screen.prototype, prop);
          
          if (descriptor && descriptor.get) {
            const originalGetter = descriptor.get;
            
            Object.defineProperty(Screen.prototype, prop, {
              get: function() {
                screenAccessCount++;
                if (screenAccessCount === 5) {
                  reportFingerprint('Screen.properties');
                }
                return originalGetter.call(originalScreen);
              },
              configurable: true,
              enumerable: descriptor.enumerable
            });
          }
        } catch (err) {
          // Silently skip
        }
      });
      
      console.log('[PRISM] Screen fingerprinting detection installed (descriptors)');
    }
  } catch (e) {
    console.error('PRISM: Screen interception failed:', e);
  }
  
  // ============================================================================
  // 6. NAVIGATOR FINGERPRINTING DETECTION
  // ============================================================================
  try {
    const navigatorProps = [
      'userAgent', 'platform', 'language', 'languages', 
      'hardwareConcurrency', 'deviceMemory', 'maxTouchPoints'
    ];
    
    let navAccessCount = 0;
    const originalNavigator = window.navigator;
    
    try {
      const navigatorHandler = {
        get(target, prop) {
          if (navigatorProps.includes(prop)) {
            navAccessCount++;
            if (navAccessCount === 5) {
              reportFingerprint('Navigator.properties');
            }
          }
          
          return Reflect.get(target, prop);
        }
      };
      
      window.navigator = new Proxy(originalNavigator, navigatorHandler);
      console.log('[PRISM] Navigator fingerprinting detection installed (proxy)');
      
    } catch (proxyError) {
      console.log('[PRISM] Navigator proxy failed, using descriptor override');
      
      navigatorProps.forEach(prop => {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, prop);
          
          if (descriptor && descriptor.get) {
            const originalGetter = descriptor.get;
            
            Object.defineProperty(Navigator.prototype, prop, {
              get: function() {
                navAccessCount++;
                if (navAccessCount === 5) {
                  reportFingerprint('Navigator.properties');
                }
                return originalGetter.call(originalNavigator);
              },
              configurable: true,
              enumerable: descriptor.enumerable
            });
          }
        } catch (err) {
          // Silently skip
        }
      });
      
      console.log('[PRISM] Navigator fingerprinting detection installed (descriptors)');
    }
  } catch (e) {
    console.error('PRISM: Navigator interception failed:', e);
  }
  
  // ============================================================================
  // 7. BATTERY API FINGERPRINTING DETECTION
  // ============================================================================
  try {
    if (navigator.getBattery) {
      const originalGetBattery = navigator.getBattery;
      
      navigator.getBattery = function() {
        reportFingerprint('Battery.API');
        return originalGetBattery.apply(this, arguments);
      };
      
      console.log('[PRISM] Battery API fingerprinting detection installed');
    }
    
    if ('battery' in navigator || 'mozBattery' in navigator || 'webkitBattery' in navigator) {
      const batteryProp = navigator.battery || navigator.mozBattery || navigator.webkitBattery;
      if (batteryProp) {
        reportFingerprint('Battery.API');
      }
    }
  } catch (e) {
    console.error('PRISM: Battery API interception failed:', e);
  }
  
  // ============================================================================
  // ADDITIONAL FINGERPRINTING VECTORS
  // ============================================================================
  
  try {
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {
      if (!detectedAPIs.has('Timezone.offset')) {
        reportFingerprint('Timezone.offset');
      }
      return originalGetTimezoneOffset.apply(this);
    };
  } catch (e) {
    console.error('PRISM: Timezone interception failed:', e);
  }
  
  try {
    if (navigator.plugins) {
      const originalPlugins = navigator.plugins;
      
      Object.defineProperty(navigator, 'plugins', {
        get: function() {
          if (!detectedAPIs.has('Plugin.enumerate')) {
            reportFingerprint('Plugin.enumerate');
          }
          return originalPlugins;
        },
        configurable: true
      });
    }
  } catch (e) {
    console.error('PRISM: Plugin interception failed:', e);
  }
  
  console.log('[PRISM] Content script fully initialized');
  console.log('[PRISM] Monitoring: Canvas, WebGL, Audio, Fonts, Screen, Navigator, Battery');
  
})();