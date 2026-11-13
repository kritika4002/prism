PRISM - Privacy Risk Inspection and Surveillance Module
A research-grade browser extension for real-time web privacy leak detection and analysis.

Overview
PRISM is a comprehensive privacy monitoring system that detects, measures, and explains web privacy risks in real-time. Designed for cybersecurity researchers, privacy advocates, and security-conscious users.

Features
Core Capabilities
Network Request Monitoring
Intercepts all outgoing HTTP/HTTPS requests
Identifies third-party requests
Maintains per-site statistics
Real-time request tracking
Third-Party Tracker Detection
Detects 140+ known tracking domains
Based on EasyPrivacy-style lists
Flags advertising networks, analytics platforms, and data brokers
Per-domain tracker counting
Browser Fingerprinting Detection
Canvas fingerprinting (toDataURL, toBlob, getImageData)
WebGL fingerprinting (getParameter, renderer info)
Audio fingerprinting (AudioContext, OfflineAudioContext)
Font enumeration detection
Screen property access monitoring
Navigator property tracking
Battery API monitoring
Cookie Inspection
Third-party cookie detection
Cross-site cookie tracking
Domain-based cookie analysis
Privacy Risk Scoring
Weighted risk calculation: (trackers × 2) + (fingerprints × 4) + (cookies × 1)
Score range: 0-100
Dynamic risk levels: None, Low, Medium, High, Critical
Color-coded risk visualization
Explainable Security Alerts
Human-readable event descriptions
Timestamp tracking
Event categorization
Real-time event log
Dashboard Interface
Clean, modern UI
Real-time metrics display
Interactive risk visualization
Event timeline
Tracker list view
Research Data Export
JSON export for analysis
CSV export for spreadsheets
Anonymized data structure
No personal information stored
Installation
From Source
Clone or download this repository
Open Chrome/Edge and navigate to chrome://extensions/
Enable "Developer mode" (toggle in top right)
Click "Load unpacked"
Select the privacy-leak-detector folder
The extension icon should appear in your toolbar
Verify Installation
Click the PRISM icon in your toolbar
You should see the popup dashboard
Visit any website to start monitoring
Usage
Basic Monitoring
Install the extension following the steps above
Browse normally - PRISM works automatically in the background
Click the extension icon to view privacy metrics for the current site
Review the risk score and individual threat counts
Understanding the Dashboard
Risk Score
0: No privacy risks detected
1-10: Low risk (minimal tracking)
11-30: Medium risk (moderate tracking)
31-60: High risk (significant tracking)
61-100: Critical risk (extensive tracking)
Metrics
Trackers: Number of known tracking domains contacted
Fingerprints: Number of browser fingerprinting attempts
3rd Party Cookies: Cross-site cookies set
3rd Party Requests: Total external requests made
Events Tab
Shows real-time privacy events with:

Event type (tracker/fingerprint)
Detailed description
Timestamp
Trackers Tab
Lists all detected tracking domains for the current site

Exporting Data
Click the "Export" button in the popup
Data is saved as JSON file with:
Timestamp
Domain (anonymized)
All metrics and events
Research-ready format
Architecture
File Structure
privacy-leak-detector/
├── manifest.json          # Extension configuration
├── background/
│   └── background.js      # Service worker, network monitoring
├── content/
│   └── contentScript.js   # Fingerprinting detection
├── popup/
│   ├── popup.html         # Dashboard UI
│   ├── popup.js           # UI controller
│   └── popup.css          # Styles
├── data/
│   ├── trackerList.js     # Known tracker domains
│   └── fingerprintAPIs.js # Fingerprint API reference
├── engine/
│   └── riskEngine.js      # Risk scoring logic
├── utils/
│   └── utils.js           # Helper functions
├── export/
│   └── export.js          # Data export module
└── README.md
How It Works
Background Service Worker (background.js)
Monitors all network requests via webRequest API
Detects third-party requests and cookies
Maintains state per browser tab
Calculates risk scores in real-time
Content Script (contentScript.js)
Injects into every web page
Intercepts JavaScript API calls
Detects fingerprinting attempts
Reports to background worker
Popup Interface (popup.html/js)
Queries background for current tab data
Displays metrics and events
Auto-refreshes every 2 seconds
Handles user interactions
Risk Engine (riskEngine.js)
Implements weighted scoring algorithm
Classifies risk levels
Generates threat breakdowns
Privacy & Security
Privacy-by-Design Principles
No external servers: All processing is local
No data collection: Extension doesn't send data anywhere
No personal information: Export data is anonymized
Open source: All code is transparent and auditable
Minimal permissions: Only requests necessary browser APIs
What Data Is Stored
Per-tab privacy metrics (in memory)
Event logs for current session
NO browsing history
NO personal identifiers
NO cross-session tracking
Data Lifecycle
Data is tab-specific
Cleared when tab closes
Expired after 30 minutes of inactivity
Export is user-initiated only
Technical Details
API Detection Methods
Canvas Fingerprinting

Intercepts toDataURL(), toBlob(), getImageData()
Detects attempts to extract canvas rendering signatures
WebGL Fingerprinting

Monitors getParameter() calls
Tracks vendor/renderer queries
Detects GPU fingerprinting
Audio Fingerprinting

Proxies AudioContext and OfflineAudioContext constructors
Identifies audio processing fingerprinting
Network Tracking

Compares request domains to page domains
Checks against known tracker database
Monitors cookie scope
Risk Calculation Formula
javascript
riskScore = (trackers × 2) + (fingerprints × 4) + (cookies × 1)
// Capped at 100
Weights Rationale:

Fingerprinting (×4): Highly invasive, hard to prevent
Trackers (×2): Common but controllable
Cookies (×1): Traditional tracking method
Research Applications
Use Cases
Privacy Research: Analyze tracking prevalence across websites
Security Audits: Assess site privacy practices
Education: Demonstrate privacy risks to users
Compliance Testing: Verify GDPR/CCPA compliance
Comparative Analysis: Benchmark privacy across domains
Export Data Format
json
{
  "timestamp": "2024-12-17T10:30:00.000Z",
  "domain": "example.com",
  "metrics": {
    "trackerCount": 5,
    "fingerprintCount": 2,
    "thirdPartyCookieCount": 8,
    "riskScore": 26
  },
  "trackers": ["doubleclick.net", "google-analytics.com"],
  "events": [...]
}
Limitations
Detection Evasion: Sophisticated trackers may evade detection
False Positives: Legitimate CDNs may be flagged as third-party
First-Party Tracking: Cannot detect same-domain tracking
Network Only: Doesn't analyze loaded resources (except via fingerprinting)
Manifest V3: Some advanced monitoring limited by Chrome's API restrictions
Troubleshooting
Extension Not Working
Check that extension is enabled in chrome://extensions/
Verify "Developer mode" is on
Try disabling and re-enabling the extension
Check browser console for errors
No Data Showing
Refresh the page being monitored
Ensure you're on an HTTP/HTTPS page (not chrome://)
Click "Refresh" button in popup
Check that the extension has permissions
High False Positive Rate
Some CDNs and legitimate services may be flagged
Risk score weighs multiple factors, not just tracker count
Review individual events to understand specific detections
Development
Building From Source
No build process required - pure JavaScript implementation.

Testing
Load extension in Chrome
Visit test sites with known trackers
Verify metrics in popup
Check browser console for errors
Adding Trackers
Edit data/trackerList.js and add domains to the TRACKER_DOMAINS Set:

javascript
window.TRACKER_DOMAINS = new Set([
  'example-tracker.com',
  // ... more domains
]);
Modifying Risk Weights
Edit the formula in engine/riskEngine.js:

javascript
const trackerScore = trackerCount * YOUR_WEIGHT;
Contributing
This is a research tool. Contributions welcome:

Additional tracker domains
New fingerprinting detection methods
UI improvements
Bug fixes
Documentation
License
This code is provided for educational and research purposes.

Acknowledgments
Inspired by EasyPrivacy, Privacy Badger, and similar projects
Built for the privacy research community
Thanks to all contributors and testers
Contact
For research collaboration or questions, see GitHub issues.

⚠️ Disclaimer: This tool is for research and educational purposes. It provides insights into web tracking but cannot guarantee complete privacy protection. For comprehensive privacy, use additional tools like VPNs, content blockers, and privacy-focused browsers.

