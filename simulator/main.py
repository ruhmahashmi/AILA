import random
import csv
import config
from data import build_graph, build_questions, generate_students, init_estimate
from logic import run_simulation

SEEDS   = [42, 99, 7]
POLICIES = ["graph_neighbor", "information_based"]
RESPONSE_SEED_OFFSET = 1000  # response seed = student_seed + offset, keeps them independent

def run_policy_batch(policy_name, students, seed):
    """Run all students under one policy for one seed. Returns tagged summary rows."""
    config.POLICY = policy_name
    random.seed(seed + RESPONSE_SEED_OFFSET)   # reset response noise seed
    summary_rows = []

    for student in students:
        result = run_simulation(build_graph, build_questions, student, init_estimate)
        summary_rows.append({
            "seed":            seed,
            "student_id":      student.student_id,
            "profile_type":    student.profile_type,
            "policy":          policy_name,
            "total_questions": result["total_questions"],
            "stop_reason":     result["stop_reason"],
            "final_mastery":   result["final_mastery"],
            "true_mastery":    student.true_mastery,
        })
    return summary_rows

def write_rows(rows, filepath, mode="a"):
    """Append or write rows to a CSV. Writes header only when creating fresh."""
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    write_header = (mode == "w")
    with open(filepath, mode, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        writer.writerows(rows)

def row_count(filepath):
    with open(filepath, newline="") as f:
        return sum(1 for _ in f) - 1  # subtract header

if __name__ == "__main__":
    # Open output files fresh (write mode clears any previous run)
    gn_file = "multiseed_summary_graphneighbor.csv"
    ib_file = "multiseed_summary_informationbased.csv"

    first_seed = True
    total_gn = 0
    total_ib = 0

    for seed in SEEDS:
        print(f"\n--- Seed {seed} ---")
        random.seed(seed)
        students = generate_students()
        print(f"  Generated {len(students)} students")

        mode = "w" if first_seed else "a"

        gn_rows = run_policy_batch("graph_neighbor",    students, seed)
        write_rows(gn_rows, gn_file, mode=mode)
        total_gn += len(gn_rows)
        print(f"  [graph_neighbor]    {len(gn_rows)} rows written (total so far: {total_gn})")

        ib_rows = run_policy_batch("information_based", students, seed)
        write_rows(ib_rows, ib_file, mode=mode)
        total_ib += len(ib_rows)
        print(f"  [information_based] {len(ib_rows)} rows written (total so far: {total_ib})")

        first_seed = False

    # Final row count check
    print(f"\n--- Final row counts ---")
    gn_count = row_count(gn_file)
    ib_count = row_count(ib_file)
    print(f"  {gn_file}: {gn_count} rows")
    print(f"  {ib_file}: {ib_count} rows")

    expected = len(SEEDS) * config.STUDENT_SAMPLE_SIZE
    assert gn_count == expected, f"FAIL: GN expected {expected} rows, got {gn_count}"
    assert ib_count == expected, f"FAIL: IB expected {expected} rows, got {ib_count}"
    print(f"\n✓ Both files contain exactly {expected} rows ({len(SEEDS)} seeds × {config.STUDENT_SAMPLE_SIZE} students)")
    print("\nMulti-seed batch complete.")