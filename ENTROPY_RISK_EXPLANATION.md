# How Entropy Engine and Risk Score Engine Work Together

## Overview

PRISM uses **two complementary systems** to assess privacy risk:
1. **Risk Score Engine** - Calculates risk based on detected threats (trackers, fingerprints, cookies)
2. **Entropy Engine** - Estimates browser identifiability based on fingerprinting attributes accessed

These work together to provide a comprehensive privacy risk assessment.

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT SCRIPT (contentScript.js)            │
│                                                                 │
│  Detects fingerprinting API access:                            │
│  • Canvas.toDataURL()                                          │
│  • WebGL.getParameter()                                       │
│  • AudioContext()                                              │
│  • Navigator properties                                        │
│  • etc.                                                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ Sends 2 messages:
                        │ 1. 'fingerprint_detected' (for counting)
                        │ 2. 'entropy_signal' (for identifiability)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKGROUND SCRIPT (background.js)                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  processEntropySignal()                                  │  │
│  │  • Receives API name (e.g., "Canvas.toDataURL")         │  │
│  │  • Maps to entropy attribute via                        │  │
│  │    mapAPIToEntropyAttribute()                            │  │
│  │  • Adds to state.entropyAttributes Set                  │  │
│  │  • Calls calculateEntropy()                             │  │
│  │  • Updates state.entropyScore                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  calculateRiskScoreWithEntropy()                        │  │
│  │  • Gets baseRisk from calculateRiskScore()              │  │
│  │    (trackers × 2 + fingerprints × 4 + cookies × 1)     │  │
│  │  • Gets entropyRisk from getEntropyRiskContribution()   │  │
│  │    (entropyScore / 100 × 25, max 25 points)             │  │
│  │  • Combines: baseRisk + entropyRisk                      │  │
│  │  • Caps at 100                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              ENTROPY ENGINE (entropyEngineWrapper.js)          │
│                                                                 │
│  calculateEntropy(accessedAttributes):                          │
│  • Takes Set of accessed attributes                            │
│  • Looks up weight for each attribute                           │
│    - Canvas.toDataURL: 8.5                                     │
│    - WebGL.getParameter: 7.0                                   │
│    - AudioContext: 6.0                                          │
│    - Screen.width: 2.0                                          │
│    - etc.                                                       │
│  • Sums weights = totalEntropy                                  │
│  • Normalizes to 0-100 scale                                   │
│  • Returns normalizedEntropy + breakdown                       │
│                                                                 │
│  getEntropyRiskContribution(normalizedEntropy):                 │
│  • Converts entropy (0-100) to risk points (0-25)              │
│  • Formula: (entropy / 100) × 25                               │
│  • Example: entropy=80 → risk=20 points                        │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              RISK SCORE ENGINE (riskEngine.js)                  │
│                                                                 │
│  calculateRiskScore(state):                                      │
│  • Counts trackers, fingerprints, cookies                      │
│  • Calculates:                                                  │
│    baseRisk = (trackers × 2) + (fingerprints × 4) +            │
│               (cookies × 1)                                     │
│  • Returns baseRisk (capped at 100)                             │
│  • NOTE: Does NOT include entropy - that's added separately    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Risk Score Calculation Formula

### Step 1: Base Risk (from Risk Score Engine)
```
baseRisk = (trackers × 2) + (fingerprints × 4) + (cookies × 1)
```
- **Trackers**: Each tracker domain = 2 points
- **Fingerprints**: Each fingerprinting API call = 4 points  
- **Cookies**: Each third-party cookie = 1 point
- **Max contribution**: ~75 points (before entropy)

### Step 2: Entropy Risk (from Entropy Engine)
```
entropyRisk = (normalizedEntropy / 100) × 25
```
- **Entropy Score**: 0-100 (based on fingerprinting attributes accessed)
- **Risk Contribution**: 0-25 points
- **Example**: 
  - If entropy = 80 → entropyRisk = 20 points
  - If entropy = 40 → entropyRisk = 10 points

### Step 3: Final Risk Score
```
finalRiskScore = min(100, baseRisk + entropyRisk)
```
- Combines both base risk and entropy risk
- Capped at 100 maximum

---

## 🎯 Example Scenarios

### Scenario 1: Low Risk Site
- **Trackers**: 0
- **Fingerprints**: 0  
- **Cookies**: 0
- **Entropy**: 0 (no fingerprinting APIs accessed)

**Calculation:**
- baseRisk = (0 × 2) + (0 × 4) + (0 × 1) = **0**
- entropyRisk = (0 / 100) × 25 = **0**
- **Final Score: 0/100** ✅

### Scenario 2: Medium Risk Site
- **Trackers**: 5 domains
- **Fingerprints**: 2 API calls
- **Cookies**: 3 third-party cookies
- **Entropy**: 40 (some fingerprinting detected)

**Calculation:**
- baseRisk = (5 × 2) + (2 × 4) + (3 × 1) = **21**
- entropyRisk = (40 / 100) × 25 = **10**
- **Final Score: 31/100** ⚠️

### Scenario 3: High Risk Site
- **Trackers**: 15 domains
- **Fingerprints**: 8 API calls
- **Cookies**: 10 third-party cookies
- **Entropy**: 85 (extensive fingerprinting)

**Calculation:**
- baseRisk = (15 × 2) + (8 × 4) + (10 × 1) = **72**
- entropyRisk = (85 / 100) × 25 = **21**
- **Final Score: 93/100** 🔴

---

## 🔍 Key Functions

### Entropy Engine Functions

1. **`calculateEntropy(accessedAttributes)`**
   - Input: Set of fingerprinting attributes accessed
   - Output: `{ normalizedEntropy: 0-100, breakdown: {...} }`
   - Purpose: Estimates how uniquely identifiable the browser is

2. **`mapAPIToEntropyAttribute(api)`**
   - Maps API names from content script to entropy attribute names
   - Example: `"Canvas.toDataURL"` → `"Canvas.toDataURL"`
   - Example: `"WebGLRenderingContext"` → `"WebGL.context"`

3. **`getEntropyRiskContribution(normalizedEntropy)`**
   - Converts entropy score to risk points
   - Formula: `(entropy / 100) × 25`
   - Returns: 0-25 points

### Risk Score Engine Functions

1. **`calculateRiskScore(state)`**
   - Calculates base risk from trackers, fingerprints, cookies
   - Does NOT include entropy (that's added separately)
   - Returns: 0-100 (capped)

2. **`calculateRiskScoreWithEntropy(state)`** (in background.js)
   - Combines base risk + entropy risk
   - This is the main function that ties everything together
   - Returns: 0-100 (capped)

---

## 💡 Why Two Separate Engines?

1. **Separation of Concerns**
   - Risk Engine: Counts actual threats detected
   - Entropy Engine: Estimates identifiability potential

2. **Different Metrics**
   - Risk Score: "How many bad things happened?"
   - Entropy Score: "How unique/identifiable is my browser?"

3. **Complementary Information**
   - A site might have few trackers but high entropy (stealthy fingerprinting)
   - A site might have many trackers but low entropy (traditional tracking)
   - Together, they provide a complete picture

---

## 🎨 Entropy Weights Explained

The entropy engine assigns weights based on how identifying each attribute is:

**High Weight (6-8.5):** Very identifying
- Canvas fingerprinting (8.5)
- WebGL fingerprinting (7.0-7.5)
- Audio fingerprinting (6.0)

**Medium Weight (3-5):** Moderately identifying
- Font enumeration (4.5-5.0)
- Navigator properties (2.5-3.5)

**Low Weight (1.5-2.5):** Less identifying
- Screen properties (1.5-2.0)
- Battery API (1.5-2.5)
- Timezone (2.5)

The more high-weight attributes accessed, the higher the entropy score.

---

## 🔄 Real-Time Updates

1. **Content Script** detects fingerprinting API access
2. **Sends entropy signal** to background script
3. **Background script** processes signal:
   - Adds attribute to `entropyAttributes` Set
   - Recalculates entropy score
   - Recalculates total risk score
4. **Popup** displays updated score when opened

This happens in real-time as the user browses!

---

## 📈 Summary

- **Risk Score Engine**: Counts threats (trackers, fingerprints, cookies)
- **Entropy Engine**: Estimates browser identifiability
- **Together**: Provide comprehensive privacy risk assessment
- **Formula**: `Final Risk = Base Risk + Entropy Risk` (capped at 100)
- **Entropy Contribution**: 0-25 points (25% of total possible score)

The entropy engine adds an important dimension by measuring **how uniquely identifiable** your browser is, not just how many trackers are present. This helps detect stealthy fingerprinting that might not trigger traditional tracker detection.

