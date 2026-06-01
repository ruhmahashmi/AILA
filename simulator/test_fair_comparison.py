import random
import config
from data import build_graph, build_questions, generate_students, init_estimate
from logic import run_simulation

RESPONSE_SEED = 99

def run_mini_batch(policy_name, students):
    config.POLICY = policy_name          # set policy before each run
    random.seed(RESPONSE_SEED)           # reset response seed
    results = []
    for student in students:
        result = run_simulation(build_graph, build_questions, student, init_estimate)
        results.append({
            "student_id":  student.student_id,
            "stop_reason": result["stop_reason"],
            "total_steps": result["total_questions"],
        })
    return results

if __name__ == "__main__":
    random.seed(config.RANDOM_SEED or 42)
    students = generate_students()

    gn_results = run_mini_batch("graph_neighbor",    students)
    ib_results = run_mini_batch("information_based", students)

    assert len(gn_results) == len(ib_results), \
        f"FAIL: student count mismatch — GN={len(gn_results)}, IB={len(ib_results)}"
    print("✓ Both runs completed on the same number of students")

    gn_ids = [r["student_id"] for r in gn_results]
    ib_ids = [r["student_id"] for r in ib_results]
    assert gn_ids == ib_ids, "FAIL: student ID order differs between runs"
    print("✓ Student IDs are identical and in the same order across both runs")

    for gn, ib in zip(gn_results, ib_results):
        assert gn["total_steps"] == ib["total_steps"], \
            f"FAIL: step count mismatch for student {gn['student_id']} — GN={gn['total_steps']}, IB={ib['total_steps']}"
    print("✓ Every student ran for the same number of steps under both policies")

    VALID = {"max_questions_reached", "no_questions_left"}
    for r in gn_results + ib_results:
        assert r["stop_reason"] in VALID, \
            f"FAIL: invalid stop reason '{r['stop_reason']}' for student {r['student_id']}"
    print("✓ All stop reasons are valid under both policies")

    print("\nAll fairness checks passed.")