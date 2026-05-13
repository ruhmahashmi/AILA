import random
import config
from data import build_graph, build_questions, generate_students, init_estimate
from logic import run_simulation
from logger import init_logs, log_interaction, log_run_summary


def main():
    if config.RANDOM_SEED is not None:
        random.seed(config.RANDOM_SEED)

    init_logs()
    students = generate_students()
    print(f"Generated {len(students)} students.")
    print(f"Policy: {config.POLICY} | Max questions per student: {config.MAX_QUESTIONS}\n")

    counts = {"strong": {"correct": 0, "total": 0},
              "medium": {"correct": 0, "total": 0},
              "weak":   {"correct": 0, "total": 0}}

    for student in students:
        result = run_simulation(build_graph, build_questions, student, init_estimate)

        for step in result["steps"]:
            log_interaction({
                "student_id": student.student_id,
                "profile_type": student.profile_type,
                "step": step["step"],
                "policy": step["policy"],
                "question_id": step["question_id"],
                "concept_id": step["concept_id"],
                "response": step["response"],
                "true_mastery_concept": step["true_mastery_concept"],
                "old_mastery": step["old_mastery"],
                "new_mastery": step["new_mastery"],
                "mastery_snapshot": step["mastery_snapshot"],
                "convergence_delta": step["convergence_delta"],
            })

            counts[student.profile_type]["total"] += 1
            if step["response"] == 1:
                counts[student.profile_type]["correct"] += 1

        log_run_summary({
            "student_id": student.student_id,
            "profile_type": student.profile_type,
            "policy": config.POLICY,
            "total_questions": result["total_questions"],
            "stop_reason": result["stop_reason"],
            "final_mastery": result["final_mastery"],
            "true_mastery": result["true_mastery"],
        })

    print("--- Response Breakdown (all steps) ---")
    for profile, data in counts.items():
        rate = data["correct"] / data["total"] if data["total"] > 0 else 0
        print(f"  {profile:6s}: {data['correct']}/{data['total']} correct  ({rate:.1%})")
    print("\nResults saved to interaction_log.csv and run_summary.csv")


if __name__ == "__main__":
    main()