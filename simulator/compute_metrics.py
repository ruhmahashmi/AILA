import csv
import ast
import math
from collections import defaultdict

GN_FILE      = "multiseed_summary_graphneighbor.csv"
IB_FILE      = "multiseed_summary_informationbased.csv"
OUTPUT_FILE  = "evaluation_metrics.csv"

SEEDS    = [42, 99, 7]
PROFILES = ["strong", "medium", "weak"]
N_CONCEPTS = 6

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

def parse_mastery(raw):
    return ast.literal_eval(raw)

def diagnostic_accuracy(final_mastery, true_mastery):
    """Proportion of concepts correctly classified (same definition as Week 8)."""
    correct = 0
    for cid in true_mastery:
        estimated = final_mastery[int(cid)]
        true_val  = true_mastery[cid]
        if true_val == 1 and estimated > 0.5:
            correct += 1
        elif true_val == 0 and estimated < 0.5:
            correct += 1
    return correct / N_CONCEPTS

def stdev(values):
    """Population standard deviation (n not n-1) — we have all seeds, not a sample."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    return math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))

def compute_per_seed_averages(rows, policy_name):
    """
    For each (seed, profile) group, compute average diagnostic accuracy
    and average total questions. Returns nested dict:
      result[profile][seed] = {"acc": float, "questions": float}
    """
    # Group: result[profile][seed] = list of accuracy values
    buckets = defaultdict(lambda: defaultdict(list))
    q_buckets = defaultdict(lambda: defaultdict(list))

    for row in rows:
        seed    = int(row["seed"])
        profile = row["profile_type"]
        fm      = parse_mastery(row["final_mastery"])
        tm      = parse_mastery(row["true_mastery"])
        acc     = diagnostic_accuracy(fm, tm)
        qs      = int(row["total_questions"])
        buckets[profile][seed].append(acc)
        q_buckets[profile][seed].append(qs)

    result = {}
    for profile in PROFILES:
        result[profile] = {}
        for seed in SEEDS:
            accs = buckets[profile][seed]
            qs   = q_buckets[profile][seed]
            result[profile][seed] = {
                "acc":       sum(accs) / len(accs) if accs else 0.0,
                "questions": sum(qs)   / len(qs)   if qs   else 0.0,
            }
    return result

def build_metrics_table(gn_seed_avgs, ib_seed_avgs):
    """Pool per-seed averages into final metrics rows."""
    rows = []
    for profile in PROFILES:
        for policy_name, seed_avgs in [("graph_neighbor",    gn_seed_avgs),
                                        ("information_based", ib_seed_avgs)]:
            per_seed_accs = [seed_avgs[profile][s]["acc"]       for s in SEEDS]
            per_seed_qs   = [seed_avgs[profile][s]["questions"]  for s in SEEDS]

            mean_acc  = sum(per_seed_accs) / len(per_seed_accs)
            std_acc   = stdev(per_seed_accs)
            mean_qs   = sum(per_seed_qs)   / len(per_seed_qs)

            rows.append({
                "policy":           policy_name,
                "profile_type":     profile,
                "mean_accuracy":    round(mean_acc, 4),
                "std_accuracy":     round(std_acc,  4),
                "min_seed_acc":     round(min(per_seed_accs), 4),
                "max_seed_acc":     round(max(per_seed_accs), 4),
                "mean_questions":   round(mean_qs,  2),
                "seed_42_acc":      round(seed_avgs[profile][42]["acc"], 4),
                "seed_99_acc":      round(seed_avgs[profile][99]["acc"], 4),
                "seed_7_acc":       round(seed_avgs[profile][7]["acc"],  4),
            })
    return rows

def save_metrics(rows):
    fieldnames = list(rows[0].keys())
    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"✓ {OUTPUT_FILE} written: {len(rows)} rows\n")

def print_metrics_table(rows):
    print("Core Evaluation Metrics")
    print("=" * 90)
    header = (f"  {'Policy':<20} {'Profile':<10} {'Mean Acc':>10} "
              f"{'Std Acc':>9} {'Min':>8} {'Max':>8} {'Mean Qs':>9}")
    print(header)
    print("  " + "-" * 86)
    for row in rows:
        print(
            f"  {row['policy']:<20} {row['profile_type']:<10}"
            f" {float(row['mean_accuracy']):>10.4f}"
            f" {float(row['std_accuracy']):>9.4f}"
            f" {float(row['min_seed_acc']):>8.4f}"
            f" {float(row['max_seed_acc']):>8.4f}"
            f" {float(row['mean_questions']):>9.2f}"
        )
    print("=" * 90)
    print("\nStd Acc = standard deviation of per-seed averages across seeds 42, 99, 7.")
    print("Lower std = more stable policy across different student populations.\n")

if __name__ == "__main__":
    print("Loading pooled multi-seed files...")
    gn_rows = load_csv(GN_FILE)
    ib_rows = load_csv(IB_FILE)
    print(f"  GN: {len(gn_rows)} rows | IB: {len(ib_rows)} rows\n")

    print("Computing per-seed averages...")
    gn_seed_avgs = compute_per_seed_averages(gn_rows, "graph_neighbor")
    ib_seed_avgs = compute_per_seed_averages(ib_rows, "information_based")

    print("Building metrics table...")
    metrics = build_metrics_table(gn_seed_avgs, ib_seed_avgs)

    print_metrics_table(metrics)
    save_metrics(metrics)

    print("Done. evaluation_metrics.csv is ready for charting.")