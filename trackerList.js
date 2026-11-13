// PRISM Tracker Domain List
// Based on EasyPrivacy-style tracker identification
// This is a curated list of known tracking domains
// NOTE: This is a regular script (not an ES6 module) for service worker compatibility

const TRACKER_DOMAINS = new Set([
  // Major advertising networks
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  
  // Facebook tracking
  'facebook.com',
  'facebook.net',
  'fbcdn.net',
  'connect.facebook.net',
  
  // Analytics platforms
  'omniture.com',
  'scorecardresearch.com',
  'quantserve.com',
  'hotjar.com',
  'crazyegg.com',
  'mixpanel.com',
  'segment.com',
  'amplitude.com',
  'heap.io',
  'fullstory.com',
  
  // Ad networks
  'adsrvr.org',
  'adnxs.com',
  'advertising.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'mgid.com',
  
  // Social tracking
  'twitter.com',
  'twimg.com',
  'linkedin.com',
  'licdn.com',
  'pinterest.com',
  'pinimg.com',
  'instagram.com',
  'tiktok.com',
  'snapchat.com',
  
  // Content delivery with tracking
  'akamaihd.net',
  'cloudflare.com',
  
  // Affiliate tracking
  'shareasale.com',
  'impact.com',
  'awin1.com',
  'commission-junction.com',
  'linksynergy.com',
  'rakuten.com',
  
  // Marketing platforms
  'marketo.net',
  'eloqua.com',
  'pardot.com',
  'hubspot.com',
  'mailchimp.com',
  
  // Retargeting
  'rlcdn.com',
  'adroll.com',
  'perfectaudience.com',
  
  // Data brokers
  'liveramp.com',
  'neustar.biz',
  'acxiom.com',
  'experian.com',
  
  // Heatmap and session recording
  'mouseflow.com',
  'luckyorange.com',
  'inspectlet.com',
  'sessioncam.com',
  
  // A/B testing
  'optimizely.com',
  'vwo.com',
  'abtasty.com',
  
  // Customer data platforms
  'segment.io',
  'mparticle.com',
  'tealium.com',
  
  // Cross-device tracking
  'tapad.com',
  'drawbridge.com',
  
  // Real-time bidding
  'indexww.com',
  'contextweb.com',
  'smartadserver.com',
  
  // Mobile attribution
  'appsflyer.com',
  'adjust.com',
  'branch.io',
  'kochava.com',
  
  // Fingerprinting services
  'fingerprintjs.com',
  'iovation.com',
  'threatmetrix.com',
  
  // China-based trackers
  'baidu.com',
  'umeng.com',
  'cnzz.com',
  
  // Other known trackers
  'newrelic.com',
  'nr-data.net',
  'bugsnag.com',
  'sentry.io',
  'rollbar.com',
  
  // Additional common trackers
  'amazon-adsystem.com',
  'media.net',
  'yandex.ru',
  'bing.com',
  'yahoo.com',
  'chartbeat.com',
  'kissmetrics.com',
  'woopra.com',
  'clicky.com',
  'statcounter.com',
  'histats.com',
  'addthis.com',
  'sharethis.com'
]);

// Export to global scope for service worker compatibility
const globalScope = typeof self !== 'undefined' ? self : window;
globalScope.TRACKER_DOMAINS = TRACKER_DOMAINS;