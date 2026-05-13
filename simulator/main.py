import random
import config
from data import build_graph, build_questions, generate_students, init_estimate
from logic import run_simulation


def main():
    if config.RANDOM_SEED is not None:
        random.seed(config.RANDOM_SEED)

    # Generate all students
    students = generate_students()
    print(f"Generated {len(students)} students.")
    
    # Grab first student just to test the simulation loop
    student = students[0]
    
    # Pass the specific student to the simulation 
    result = run_simulation(build_graph, build_questions, student, init_estimate)

    print("\nStarting simulation...")
    print(f"Student ID: {student.student_id} ({student.profile_type} profile)")
    print("True Mastery:", student.true_mastery)
    print("Selected question:", result["question_id"], "(concept", result["concept_id"], ")")
    print("Response:", result["response"])
    print(f"Mastery update: {result['old_mastery']:.2f} -> {result['new_mastery']:.2f}")
    print("Updated mastery:", result["estimate"])


if __name__ == "__main__":
    main()