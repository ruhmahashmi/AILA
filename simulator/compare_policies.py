import csv
import ast

GN_FILE      = "run_summary_graphneighbor.csv"
IB_FILE      = "run_summary_informationbased.csv"
OUTPUT_FILE  = "comparison_results.csv"
EXPECTED_ROWS = 300

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

def parse_mastery(raw):
    """Parse a mastery dict stored as a Python dict string."""
    return ast.literal_eval(raw)

def diagnostic_accuracy(final_mastery, true_mastery):
    """
    Proportion of concepts correctly classified.
    Correct = estimate > 0.5 when mastered, or estimate < 0.5 when not mastered.
    Tie at exactly 0.5 is counted as incorrect.
    """
    n = len(true_mastery)
    correct = 0
    for cid in true_mastery:
        estimated = final_mastery[int(cid)]
        true_val  = true_mastery[cid]
        if true_val == 1 and estimated > 0.5:
            correct += 1
        elif true_val == 0 and estimated < 0.5:
            correct += 1
    return round(correct / n, 4)

def build_lookup(rows):
    """Index rows by student_id for fast alignment."""
    return {row["student_id"]: row for row in rows}

def merge_and_export(gn_rows, ib_rows):
    gn_lookup = build_lookup(gn_rows)
    ib_lookup = build_lookup(ib_rows)

    # Confirm same student IDs in same order
    gn_ids = [r["student_id"] for r in gn_rows]
    ib_ids = [r["student_id"] for r in ib_rows]
    assert gn_ids == ib_ids, "FAIL: student ID order differs between GN and IB files"

    merged = []
    for sid in gn_ids:
        gn = gn_lookup[sid]
        ib = ib_lookup[sid]

        true_mastery  = parse_mastery(gn["true_mastery"])
        gn_final      = parse_mastery(gn["final_mastery"])
        ib_final      = parse_mastery(ib["final_mastery"])

        gn_acc = diagnostic_accuracy(gn_final, true_mastery)
        ib_acc = diagnostic_accuracy(ib_final, true_mastery)

        merged.append({
            "student_id":           sid,
            "profile_type":         gn["profile_type"],
            "true_mastery":         gn["true_mastery"],
            "gn_diagnostic_acc":    gn_acc,
            "ib_diagnostic_acc":    ib_acc,
            "acc_difference":       round(gn_acc - ib_acc, 4),  # positive = GN better
            "gn_total_questions":   gn["total_questions"],
            "ib_total_questions":   ib["total_questions"],
            "gn_stop_reason":       gn["stop_reason"],
            "ib_stop_reason":       ib["stop_reason"],
        })

    assert len(merged) == EXPECTED_ROWS, \
        f"FAIL: merged file has {len(merged)} rows, expected {EXPECTED_ROWS}"

    fieldnames = list(merged[0].keys())
    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(merged)

    print(f"✓ {OUTPUT_FILE} written: {len(merged)} rows")
    return merged

def print_quick_summary(merged):
    """Print average diagnostic accuracy by profile for a quick sanity check."""
    from collections import defaultdict
    profile_gn = defaultdict(list)
    profile_ib = defaultdict(list)

    for row in merged:
        p = row["profile_type"]
        profile_gn[p].append(float(row["gn_diagnostic_acc"]))
        profile_ib[p].append(float(row["ib_diagnostic_acc"]))

    print("\nQuick accuracy preview (average per profile):")
    print(f"  {'Profile':<10} {'Graph Neighbor':>16} {'Info-Based':>12} {'Difference':>12}")
    print(f"  {'-'*52}")
    for profile in ["strong", "medium", "weak"]:
        gn_avg = sum(profile_gn[profile]) / len(profile_gn[profile])
        ib_avg = sum(profile_ib[profile]) / len(profile_ib[profile])
        diff   = gn_avg - ib_avg
        print(f"  {profile:<10} {gn_avg:>16.4f} {ib_avg:>12.4f} {diff:>+12.4f}")

if __name__ == "__main__":
    print("Loading run summary files...")
    gn_rows = load_csv(GN_FILE)
    ib_rows = load_csv(IB_FILE)
    print(f"  GN: {len(gn_rows)} rows | IB: {len(ib_rows)} rows")

    print("\nMerging and computing diagnostic accuracy...")
    merged = merge_and_export(gn_rows, ib_rows)
    print_quick_summary(merged)

    print("\nDone. comparison_results.csv is ready for Week 9 analysis.")