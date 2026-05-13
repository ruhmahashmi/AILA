import random
import config
from data import build_graph, build_questions, generate_students, init_estimate
from logic import run_simulation
from logger import init_logs, log_interaction, log_run_summary

def main():
    if config.RANDOM_SEED is not None:
        random.seed(config.RANDOM_SEED)

    # Wipe and create fresh CSV files with headers
    init_logs()

    students = generate_students()
    print(f"Generated {len(students)} students.")
    print("Starting batch simulation...\n")

    for student in students:
        result = run_simulation(build_graph, build_questions, student, init_estimate)

        # Log the single interaction (step 1 for now)
        log_interaction({
            "student_id": student.student_id,
            "profile_type": student.profile_type,
            "step": 1,
            "question_id": result["question_id"],
            "concept_id": result["concept_id"],
            "response": result["response"],
            "true_mastery_concept": result["true_mastery"][result["concept_id"]],
            "old_mastery": round(result["old_mastery"], 3),
            "new_mastery": round(result["new_mastery"], 3),
        })

        # Log the run summary
        log_run_summary({
            "student_id": student.student_id,
            "profile_type": student.profile_type,
            "total_questions": 1,
            "final_mastery": result["estimate"],
            "true_mastery": result["true_mastery"],
        })

    print("--- Simulation Complete ---")
    print(f"Students processed: {len(students)}")
    print("Results saved to interaction_log.csv and run_summary.csv")

if __name__ == "__main__":
    main()