import csv
from collections import defaultdict

GN_FILE     = "multiseed_interactions_graphneighbor.csv"
IB_FILE     = "multiseed_interactions_informationbased.csv"
OUTPUT_FILE = "concept_coverage.csv"

SEEDS      = [42, 99, 7]
PROFILES   = ["strong", "medium", "weak"]
N_CONCEPTS = 6
CONCEPT_IDS = list(range(1, N_CONCEPTS + 1))

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

def compute_coverage(rows, policy_name):
    """
    Returns coverage dict:
      coverage[profile][concept_id] = avg selections per student across all seeds
    Also returns overall (all profiles) coverage per concept.
    """
    # Count: selections[profile][seed][concept_id] = count
    selections = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    # Student counts: students[profile][seed] = set of student IDs
    student_sets = defaultdict(lambda: defaultdict(set))

    for row in rows:
        profile    = row["profile_type"]
        seed       = int(row["seed"])
        concept_id = int(row["concept_id"])
        student_id = row["student_id"]

        selections[profile][seed][concept_id] += 1
        student_sets[profile][seed].add(student_id)

    results = []

    # Per-profile coverage
    for profile in PROFILES:
        for cid in CONCEPT_IDS:
            # Average per student per seed, then average across seeds
            per_seed_avgs = []
            for seed in SEEDS:
                n_students = len(student_sets[profile][seed])
                if n_students > 0:
                    avg = selections[profile][seed][cid] / n_students
                    per_seed_avgs.append(avg)
            mean_per_student = round(sum(per_seed_avgs) / len(per_seed_avgs), 4) \
                               if per_seed_avgs else 0.0
            results.append({
                "policy":             policy_name,
                "profile_type":       profile,
                "concept_id":         cid,
                "avg_selections":     mean_per_student,
            })

    # Overall (all profiles pooled)
    for cid in CONCEPT_IDS:
        per_seed_avgs = []
        for seed in SEEDS:
            total_selections = sum(
                selections[profile][seed][cid] for profile in PROFILES
            )
            total_students = sum(
                len(student_sets[profile][seed]) for profile in PROFILES
            )
            if total_students > 0:
                per_seed_avgs.append(total_selections / total_students)
        mean_per_student = round(sum(per_seed_avgs) / len(per_seed_avgs), 4) \
                           if per_seed_avgs else 0.0
        results.append({
            "policy":         policy_name,
            "profile_type":   "all",
            "concept_id":     cid,
            "avg_selections": mean_per_student,
        })

    return results

def save_coverage(gn_results, ib_results):
    all_rows = gn_results + ib_results
    fieldnames = list(all_rows[0].keys())
    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)
    print(f"✓ {OUTPUT_FILE} written: {len(all_rows)} rows\n")

def print_coverage_table(gn_results, ib_results):
    # Build lookup for easy printing
    def lookup(results):
        return {(r["profile_type"], r["concept_id"]): r["avg_selections"]
                for r in results}
    gn = lookup(gn_results)
    ib = lookup(ib_results)

    print("Per-Concept Coverage (avg selections per student)")
    print("=" * 72)
    for profile in PROFILES + ["all"]:
        print(f"\n  Profile: {profile}")
        print(f"  {'Concept':<10} {'Graph Neighbor':>16} {'Info-Based':>12} {'Diff (GN-IB)':>14}")
        print(f"  {'-'*54}")
        for cid in CONCEPT_IDS:
            gn_val = gn.get((profile, cid), 0.0)
            ib_val = ib.get((profile, cid), 0.0)
            diff   = round(float(gn_val) - float(ib_val), 4)
            marker = " ▲" if diff > 0.05 else (" ▼" if diff < -0.05 else "")
            print(f"  Concept {cid:<4} {float(gn_val):>16.4f} {float(ib_val):>12.4f}"
                  f" {diff:>+14.4f}{marker}")
    print("\n  ▲ = GN selects this concept notably more than IB")
    print("  ▼ = IB selects this concept notably more than GN")
    print("=" * 72)

if __name__ == "__main__":
    print("Loading interaction log files...")
    gn_rows = load_csv(GN_FILE)
    ib_rows = load_csv(IB_FILE)
    print(f"  GN: {len(gn_rows)} rows | IB: {len(ib_rows)} rows\n")

    print("Computing per-concept coverage...")
    gn_coverage = compute_coverage(gn_rows, "graph_neighbor")
    ib_coverage = compute_coverage(ib_rows, "information_based")

    print_coverage_table(gn_coverage, ib_coverage)
    save_coverage(gn_coverage, ib_coverage)

    print("Done. concept_coverage.csv is ready for charting.")