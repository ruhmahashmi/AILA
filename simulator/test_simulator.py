import random
import config
from data import build_graph, build_questions, init_estimate
from logic import run_simulation
from models import Student

# Fix the seed so results are reproducible every time you run this
random.seed(42)

# Create one student of each type manually for predictable testing
test_students = [
    Student(901, "strong", {1: 1, 2: 1, 3: 1, 4: 1, 5: 0, 6: 0}),
    Student(902, "medium", {1: 1, 2: 0, 3: 1, 4: 0, 5: 0, 6: 1}),
    Student(903, "weak",   {1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0}),
]


def check_mastery_direction(steps):
    """Verify mastery moves up on correct responses and down on incorrect."""
    for step in steps:
        if step["response"] == 1:
            assert step["new_mastery"] > step["old_mastery"], \
                f"Step {step['step']}: correct response should increase mastery"
        else:
            assert step["new_mastery"] < step["old_mastery"], \
                f"Step {step['step']}: incorrect response should decrease mastery"


def check_stop_reason(result):
    """Verify run stopped for a valid reason."""
    valid_reasons = {"max_questions_reached", "no_questions_left"}
    assert result["stop_reason"] in valid_reasons, \
        f"Unexpected stop reason: {result['stop_reason']}"


def check_log_fields(steps):
    """Verify every step has all required fields."""
    required = {
        "step", "policy", "question_id", "concept_id", "response",
        "true_mastery_concept", "old_mastery", "new_mastery",
        "mastery_snapshot", "convergence_delta"
    }
    for step in steps:
        missing = required - set(step.keys())
        assert not missing, f"Step {step['step']} missing fields: {missing}"


def print_trace(student, result):
    print(f"\n{'='*55}")
    print(f"Student {student.student_id} ({student.profile_type})")
    print(f"True mastery: {student.true_mastery}")
    print(f"Stop reason:  {result['stop_reason']}")
    print(f"Total steps:  {result['total_questions']}")
    print(f"{'-'*55}")
    print(f"{'Step':<5} {'Q':<4} {'C':<4} {'Resp':<5} {'Old M':<7} {'New M':<7} {'Delta':<7} {'TruM'}")
    print(f"{'-'*55}")
    for step in result["steps"]:
        print(
            f"{step['step']:<5} "
            f"{step['question_id']:<4} "
            f"{step['concept_id']:<4} "
            f"{step['response']:<5} "
            f"{step['old_mastery']:<7} "
            f"{step['new_mastery']:<7} "
            f"{step['convergence_delta']:<7} "
            f"{step['true_mastery_concept']}"
        )
    print(f"\nFinal mastery estimate: {result['final_mastery']}")
    print(f"True mastery:           {result['true_mastery']}")


def run_checks(student, result):
    check_mastery_direction(result["steps"])
    check_stop_reason(result)
    check_log_fields(result["steps"])
    print(f"  ✓ All checks passed for Student {student.student_id} ({student.profile_type})")


if __name__ == "__main__":
    print("Running small-scale simulator tests...\n")

    for student in test_students:
        result = run_simulation(build_graph, build_questions, student, init_estimate)
        print_trace(student, result)
        run_checks(student, result)

    print("\n" + "="*55)
    print("All small-scale tests passed.")