#!/usr/bin/env python3
"""
PRISM testcases report generator.

Reads all JSON files in TESTCASES/ produced by the extension export,
and generates:
  - report.md : Markdown suitable for inclusion in a paper
  - report.csv: Raw per-site metrics for further analysis

Usage:
    python build_report.py
"""

import json
import os
import glob
import csv
from collections import Counter
from datetime import datetime

TESTCASE_DIR = "TESTCASES"
OUTPUT_MD = "report.md"
OUTPUT_CSV = "report.csv"


def load_testcases(folder):
    """Load all testcase JSON files into a list of normalized records."""
    records = []
    for path in sorted(glob.glob(os.path.join(folder, "*.json"))):
        with open(path, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                print(f"Skipping {path}: invalid JSON ({e})")
                continue

        metrics = data.get("metrics", {})
        trackers = data.get("trackers", [])
        events = data.get("events", [])

        # Count event types for richer reporting
        tracker_events = sum(1 for e in events if e.get("type") == "tracker")
        fingerprint_events = sum(1 for e in events if e.get("type") == "fingerprint")

        record = {
            "file": os.path.basename(path),
            "domain": data.get("domain", "unknown"),
            "timestamp": data.get("timestamp", ""),
            "tracker_count": int(metrics.get("trackerCount", 0)),
            "fingerprint_count": int(metrics.get("fingerprintCount", 0)),
            "third_party_cookie_count": int(metrics.get("thirdPartyCookieCount", 0)),
            "third_party_request_count": int(metrics.get("thirdPartyRequestCount", 0)),
            "risk_score": int(metrics.get("riskScore", 0)),
            "unique_tracker_domains": len(set(trackers)),
            "tracker_events": tracker_events,
            "fingerprint_events": fingerprint_events,
            "note": data.get("note", ""),
            # Keep raw lists for later global stats
            "_trackers": trackers,
            "_events": events,
        }

        records.append(record)

    return records


def compute_global_stats(records):
    """Compute global statistics useful for a research paper."""
    if not records:
        return {}, Counter()

    n = len(records)

    avg_risk = sum(r["risk_score"] for r in records) / n
    max_risk = max(r["risk_score"] for r in records)
    min_risk = min(r["risk_score"] for r in records)

    avg_trackers = sum(r["tracker_count"] for r in records) / n
    avg_fp = sum(r["fingerprint_count"] for r in records) / n
    avg_cookies = sum(r["third_party_cookie_count"] for r in records) / n
    avg_requests = sum(r["third_party_request_count"] for r in records) / n

    # Distribution of risk scores
    risk_hist = Counter(r["risk_score"] for r in records)

    # Global per-tracker-domain frequency across all sites
    tracker_counter = Counter()
    for r in records:
        tracker_counter.update(r["_trackers"])

    stats = {
        "total_cases": n,
        "avg_risk": round(avg_risk, 2),
        "max_risk": max_risk,
        "min_risk": min_risk,
        "avg_trackers": round(avg_trackers, 2),
        "avg_fingerprints": round(avg_fp, 2),
        "avg_third_party_cookies": round(avg_cookies, 2),
        "avg_third_party_requests": round(avg_requests, 2),
        "risk_hist": risk_hist,
    }

    return stats, tracker_counter


def write_csv(records, path):
    """Write detailed per-site metrics to CSV."""
    if not records:
        return

    # Remove internal fields before writing
    cleaned = []
    for r in records:
        c = {k: v for k, v in r.items() if not k.startswith("_")}
        cleaned.append(c)

    fieldnames = list(cleaned[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned)


def write_markdown(records, stats, tracker_counter, path, top_n_trackers=15):
    """Write Markdown report with summary, distributions, and per-site table."""
    with open(path, "w", encoding="utf-8") as f:
        f.write("# PRISM Testcases Report\n\n")
        f.write(f"_Generated on {datetime.utcnow().isoformat()} UTC_\n\n")

        # Summary metrics
        if stats:
            f.write("## Summary metrics\n\n")
            f.write("| Metric | Value |\n")
            f.write("|--------|-------|\n")
            f.write(f"| Total testcases | {stats['total_cases']} |\n")
            f.write(f"| Average risk score | {stats['avg_risk']} |\n")
            f.write(f"| Maximum risk score | {stats['max_risk']} |\n")
            f.write(f"| Minimum risk score | {stats['min_risk']} |\n")
            f.write(f"| Avg. tracker domains per site | {stats['avg_trackers']} |\n")
            f.write(f"| Avg. fingerprinting APIs per site | {stats['avg_fingerprints']} |\n")
            f.write(f"| Avg. 3rd‑party cookies per site | {stats['avg_third_party_cookies']} |\n")
            f.write(f"| Avg. 3rd‑party requests per site | {stats['avg_third_party_requests']} |\n\n")

        # Risk score distribution
        if stats and stats.get("risk_hist"):
            f.write("## Risk score distribution\n\n")
            f.write("| Risk score | Number of sites |\n")
            f.write("|------------|-----------------|\n")
            for score in sorted(stats["risk_hist"].keys()):
                f.write(f"| {score} | {stats['risk_hist'][score]} |\n")
            f.write("\n")

        # Top tracker domains across all sites
        if tracker_counter:
            f.write("## Most common tracker domains\n\n")
            f.write("| Rank | Tracker domain | Occurrences |\n")
            f.write("|------|----------------|-------------|\n")
            for i, (domain, count) in enumerate(tracker_counter.most_common(top_n_trackers), start=1):
                f.write(f"| {i} | {domain} | {count} |\n")
            f.write("\n")

        # Per-site detailed table
        if records:
            f.write("## Per‑site results\n\n")
            headers = [
                "file",
                "domain",
                "risk_score",
                "tracker_count",
                "unique_tracker_domains",
                "fingerprint_count",
                "third_party_cookie_count",
                "third_party_request_count",
                "tracker_events",
                "fingerprint_events",
                "timestamp",
            ]
            f.write("| " + " | ".join(headers) + " |\n")
            f.write("|" + "|".join(["---"] * len(headers)) + "|\n")

            for r in records:
                row = [str(r.get(h, "")) for h in headers]
                f.write("| " + " | ".join(row) + " |\n")


def main():
    records = load_testcases(TESTCASE_DIR)
    if not records:
        print("No JSON files found in TESTCASES/.")
        return

    stats, tracker_counter = compute_global_stats(records)
    write_csv(records, OUTPUT_CSV)
    write_markdown(records, stats, tracker_counter, OUTPUT_MD)

    print(f"Wrote {len(records)} records to {OUTPUT_CSV} and {OUTPUT_MD}")


if __name__ == "__main__":
    main()
