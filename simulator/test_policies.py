import random
import config
from data import build_graph, build_questions, init_estimate
from logic import run_simulation
from models import Student

# Same student, same seed, run under each policy
TEST_STUDENT = Student(999, "medium", {1: 1, 2: 0, 3: 1, 4: 0, 5: 0, 6: 1})

def run_policy(policy_name):
    random.seed(42)
    config.POLICY = policy_name
    result = run_simulation(build_graph, build_questions, TEST_STUDENT, init_estimate)
    return result

def print_policy_trace(policy_name, result):
    print(f"\n{'='*50}")
    print(f"Policy: {policy_name.upper()}")
    print(f"{'Step':<5} {'Q':<4} {'Concept':<8} {'Resp':<5} {'Old M':<7} {'New M'}")
    print(f"{'-'*50}")
    for step in result["steps"]:
        print(
            f"{step['step']:<5} "
            f"{step['question_id']:<4} "
            f"{step['concept_id']:<8} "
            f"{step['response']:<5} "
            f"{step['old_mastery']:<7} "
            f"{step['new_mastery']}"
        )
    concepts_visited = [s["concept_id"] for s in result["steps"]]
    print(f"\nConcept visit order: {concepts_visited}")
    print(f"Stop reason: {result['stop_reason']}")

def check_policies_diverge(results):
    """Confirm graph_neighbor and information_based visit different concept sequences."""
    gn_concepts = [s["concept_id"] for s in results["graph_neighbor"]["steps"]]
    ib_concepts = [s["concept_id"] for s in results["information_based"]["steps"]]
    assert gn_concepts != ib_concepts, \
        "FAIL: Graph Neighbor and Information-Based visited identical concept sequences"
    print("\n✓ Policies diverge — concept visit sequences are different")

def check_same_stopping_rule(results):
    """Confirm both policies hit the same stopping rule."""
    for policy, result in results.items():
        assert result["stop_reason"] == "max_questions_reached", \
            f"FAIL: {policy} had unexpected stop reason: {result['stop_reason']}"
    print("✓ Both policies stopped for the same reason: max_questions_reached")

if __name__ == "__main__":
    policies = ["random", "graph_neighbor", "information_based"]
    results = {}

    for policy in policies:
        results[policy] = run_policy(policy)
        print_policy_trace(policy, results[policy])

    print("\n--- Policy Behavior Checks ---")
    check_policies_diverge(results)
    check_same_stopping_rule(results)
    print("\nAll policy checks passed.")