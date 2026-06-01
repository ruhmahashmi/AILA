import random
import csv
import config
from data import build_graph, build_questions, generate_students, init_estimate
from logic import run_simulation

SEEDS            = [42, 99, 7]
POLICIES         = ["graph_neighbor", "information_based"]
RESPONSE_SEED_OFFSET = 1000

def run_policy_batch(policy_name, students, seed):
    config.POLICY = policy_name
    random.seed(seed + RESPONSE_SEED_OFFSET)
    summary_rows     = []
    interaction_rows = []

    for student in students:
        result = run_simulation(build_graph, build_questions, student, init_estimate)

        for step in result["steps"]:
            interaction_rows.append({
                "seed":        seed,
                "student_id":  student.student_id,
                "profile_type": student.profile_type,
                "policy":      policy_name,
                **step,        # step, question_id, concept_id, response, etc.
            })

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

    return summary_rows, interaction_rows

def write_rows(rows, filepath, mode="a"):
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    with open(filepath, mode, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if mode == "w":
            writer.writeheader()
        writer.writerows(rows)

def row_count(filepath):
    with open(filepath, newline="") as f:
        return sum(1 for _ in f) - 1

if __name__ == "__main__":
    gn_summary_file     = "multiseed_summary_graphneighbor.csv"
    ib_summary_file     = "multiseed_summary_informationbased.csv"
    gn_interaction_file = "multiseed_interactions_graphneighbor.csv"
    ib_interaction_file = "multiseed_interactions_informationbased.csv"

    first_seed = True
    total_gn = total_ib = 0

    for seed in SEEDS:
        print(f"\n--- Seed {seed} ---")
        random.seed(seed)
        students = generate_students()
        print(f"  Generated {len(students)} students")

        mode = "w" if first_seed else "a"

        gn_summary, gn_interactions = run_policy_batch("graph_neighbor",    students, seed)
        write_rows(gn_summary,      gn_summary_file,     mode=mode)
        write_rows(gn_interactions, gn_interaction_file, mode=mode)
        total_gn += len(gn_summary)
        print(f"  [graph_neighbor]    {len(gn_summary)} students | {len(gn_interactions)} steps")

        ib_summary, ib_interactions = run_policy_batch("information_based", students, seed)
        write_rows(ib_summary,      ib_summary_file,     mode=mode)
        write_rows(ib_interactions, ib_interaction_file, mode=mode)
        total_ib += len(ib_summary)
        print(f"  [information_based] {len(ib_summary)} students | {len(ib_interactions)} steps")

        first_seed = False

    print(f"\n--- Final row counts ---")
    for f in [gn_summary_file, ib_summary_file,
              gn_interaction_file, ib_interaction_file]:
        print(f"  {f}: {row_count(f)} rows")

    expected_summary     = len(SEEDS) * config.STUDENT_SAMPLE_SIZE
    expected_interaction = expected_summary * config.MAX_QUESTIONS

    gn_s = row_count(gn_summary_file)
    ib_s = row_count(ib_summary_file)
    assert gn_s == expected_summary, f"FAIL: GN summary {gn_s} != {expected_summary}"
    assert ib_s == expected_summary, f"FAIL: IB summary {ib_s} != {expected_summary}"
    print(f"\n✓ Summary files: {expected_summary} rows each")

    gn_i = row_count(gn_interaction_file)
    ib_i = row_count(ib_interaction_file)
    assert gn_i == expected_interaction, f"FAIL: GN interactions {gn_i} != {expected_interaction}"
    assert ib_i == expected_interaction, f"FAIL: IB interactions {ib_i} != {expected_interaction}"
    print(f"✓ Interaction files: {expected_interaction} rows each")
    print("\nMulti-seed batch complete.")