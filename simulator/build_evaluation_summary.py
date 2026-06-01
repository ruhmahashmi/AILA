import csv
import math
from collections import defaultdict

METRICS_FILE  = "evaluation_metrics.csv"
COVERAGE_FILE = "concept_coverage.csv"
OUTPUT_FILE   = "evaluation_summary.csv"

PROFILES    = ["strong", "medium", "weak"]
POLICIES    = ["graph_neighbor", "information_based"]
CONCEPT_IDS = list(range(1, 7))

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

def stdev(values):
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    return math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))

def coverage_spread(coverage_rows, policy, profile):
    """Std dev of avg_selections across all 6 concepts for a policy-profile pair.
    Higher spread = more concentrated question distribution."""
    vals = [
        float(r["avg_selections"])
        for r in coverage_rows
        if r["policy"] == policy and r["profile_type"] == profile
    ]
    return round(stdev(vals), 4) if vals else 0.0

def coverage_max_concept(coverage_rows, policy, profile):
    """Which concept_id received the most selections under this policy-profile."""
    subset = [
        r for r in coverage_rows
        if r["policy"] == policy and r["profile_type"] == profile
    ]
    if not subset:
        return "N/A"
    return max(subset, key=lambda r: float(r["avg_selections"]))["concept_id"]

def build_summary(metrics_rows, coverage_rows):
    # Index metrics by (policy, profile)
    metrics_lookup = {
        (r["policy"], r["profile_type"]): r
        for r in metrics_rows
    }

    summary = []
    for policy in POLICIES:
        for profile in PROFILES:
            m = metrics_lookup.get((policy, profile), {})
            c_spread      = coverage_spread(coverage_rows, policy, profile)
            top_concept   = coverage_max_concept(coverage_rows, policy, profile)

            summary.append({
                "policy":              policy,
                "profile_type":        profile,
                "mean_accuracy":       m.get("mean_accuracy", ""),
                "std_accuracy":        m.get("std_accuracy", ""),
                "min_seed_acc":        m.get("min_seed_acc", ""),
                "max_seed_acc":        m.get("max_seed_acc", ""),
                "mean_questions":      m.get("mean_questions", ""),
                "coverage_spread":     c_spread,
                "top_concept":         top_concept,
                "seed_42_acc":         m.get("seed_42_acc", ""),
                "seed_99_acc":         m.get("seed_99_acc", ""),
                "seed_7_acc":          m.get("seed_7_acc", ""),
            })
    return summary

def save_summary(summary):
    fieldnames = list(summary[0].keys())
    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(summary)
    print(f"✓ {OUTPUT_FILE} written: {len(summary)} rows\n")

def print_summary_table(summary):
    print("Final Evaluation Summary")
    print("=" * 100)
    hdr = (f"  {'Policy':<22} {'Profile':<10} {'Mean Acc':>10} "
           f"{'Std':>7} {'Min':>7} {'Max':>7} {'Qs':>5} "
           f"{'Cov Spread':>12} {'Top Concept':>12}")
    print(hdr)
    print("  " + "-" * 95)
    for row in summary:
        print(
            f"  {row['policy']:<22} {row['profile_type']:<10}"
            f" {float(row['mean_accuracy']):>10.4f}"
            f" {float(row['std_accuracy']):>7.4f}"
            f" {float(row['min_seed_acc']):>7.4f}"
            f" {float(row['max_seed_acc']):>7.4f}"
            f" {float(row['mean_questions']):>5.1f}"
            f" {float(row['coverage_spread']):>12.4f}"
            f" {'C' + str(row['top_concept']):>12}"
        )
    print("=" * 100)
    print("\n  Coverage Spread: std dev of avg selections across 6 concepts.")
    print("  Higher = more concentrated. Lower = more even distribution.\n")

if __name__ == "__main__":
    print("Loading metrics and coverage files...")
    metrics_rows  = load_csv(METRICS_FILE)
    coverage_rows = load_csv(COVERAGE_FILE)
    print(f"  metrics: {len(metrics_rows)} rows | coverage: {len(coverage_rows)} rows\n")

    summary = build_summary(metrics_rows, coverage_rows)
    print_summary_table(summary)
    save_summary(summary)
    print("Done. evaluation_summary.csv is ready for Week 10.")