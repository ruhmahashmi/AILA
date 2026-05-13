import random
from config import RANDOM_SEED
from data import build_graph, build_questions, make_student, init_estimate
from logic import run_simulation

def main():
    if RANDOM_SEED is not None:
        random.seed(RANDOM_SEED)

    result = run_simulation(build_graph, build_questions, make_student, init_estimate)

    print("Starting simulation...")
    print("Selected question:", result["question_id"], "(concept", result["concept_id"], ")")
    print("Response:", result["response"])
    print(f"Mastery update: {result['old_mastery']:.2f} -> {result['new_mastery']:.2f}")
    print("Updated mastery:", result["estimate"])

if __name__ == "__main__":
    main()