import csv
from collections import defaultdict

COMPARISON_FILE = "comparison_results.csv"
SUMMARY_FILE    = "profile_summary.csv"
PROFILES        = ["strong", "medium", "weak"]

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

def compute_summary(rows):
    buckets = {p: [] for p in PROFILES}
    for row in rows:
        buckets[row["profile_type"]].append(row)

    summary = []
    for profile in PROFILES:
        group = buckets[profile]
        n = len(group)

        gn_acc  = sum(float(r["gn_diagnostic_acc"])  for r in group) / n
        ib_acc  = sum(float(r["ib_diagnostic_acc"])  for r in group) / n
        gn_q    = sum(float(r["gn_total_questions"]) for r in group) / n
        ib_q    = sum(float(r["ib_total_questions"]) for r in group) / n
        acc_diff = round(gn_acc - ib_acc, 4)

        summary.append({
            "profile_type":          profile,
            "n_students":            n,
            "gn_avg_accuracy":       round(gn_acc, 4),
            "ib_avg_accuracy":       round(ib_acc, 4),
            "accuracy_diff_gn_minus_ib": acc_diff,
            "gn_avg_questions":      round(gn_q, 2),
            "ib_avg_questions":      round(ib_q, 2),
        })
    return summary

def save_summary(summary):
    fieldnames = list(summary[0].keys())
    with open(SUMMARY_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(summary)
    print(f"✓ {SUMMARY_FILE} written: {len(summary)} rows\n")

def print_summary_table(summary):
    col1, col2, col3, col4, col5, col6, col7 = (
        "Profile", "N", "GN Accuracy", "IB Accuracy",
        "Diff (GN-IB)", "GN Avg Qs", "IB Avg Qs"
    )
    header = f"  {col1:<10} {col2:>5} {col3:>13} {col4:>13} {col5:>14} {col6:>11} {col7:>11}"
    print("Per-Profile Policy Comparison Summary")
    print("=" * 82)
    print(header)
    print("  " + "-" * 79)
    for row in summary:
        diff = float(row["accuracy_diff_gn_minus_ib"])
        diff_str = f"{diff:+.4f}"
        winner = "← GN" if diff > 0.001 else ("← IB" if diff < -0.001 else "  tie")
        print(
            f"  {row['profile_type']:<10}"
            f" {row['n_students']:>5}"
            f" {float(row['gn_avg_accuracy']):>13.4f}"
            f" {float(row['ib_avg_accuracy']):>13.4f}"
            f" {diff_str:>14}  {winner}"
            f" {float(row['gn_avg_questions']):>11.2f}"
            f" {float(row['ib_avg_questions']):>11.2f}"
        )
    print("=" * 82)
    print("\n  Diff > 0 means Graph Neighbor performed better.")
    print("  Diff < 0 means Information-Based performed better.\n")

if __name__ == "__main__":
    print(f"Loading {COMPARISON_FILE}...")
    rows = load_csv(COMPARISON_FILE)
    print(f"  {len(rows)} student rows loaded\n")

    summary = compute_summary(rows)
    print_summary_table(summary)
    save_summary(summary)

    print("Done. profile_summary.csv is ready for Week 9 analysis.")