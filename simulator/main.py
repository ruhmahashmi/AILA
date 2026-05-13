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
    
    correct_responses = 0
    
    print("\nStarting batch simulation for all students...")
    
    # Loop through the entire batch
    for student in students:
        result = run_simulation(build_graph, build_questions, student, init_estimate)
        
        # Track total correct responses just to verify the loop is working
        if result["response"] == 1:
            correct_responses += 1

    print("\n--- Simulation Complete ---")
    print(f"Total students processed: {len(students)}")
    print(f"Total correct first responses: {correct_responses}")

if __name__ == "__main__":
    main()