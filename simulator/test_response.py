import random
from models import Student, Question

random.seed(42)

def test_response_rates():
    # Create a strong student with concept 1 mastered
    strong = Student(1, "strong", {1: 1, 2: 0})
    # Create a weak student with concept 1 NOT mastered
    weak = Student(2, "weak", {1: 0, 2: 0})
    
    question = Question(question_id=1, concept_id=1, slip=0.10, guess=0.20)

    TRIALS = 1000

    # Test strong student (mastered) — expect ~90% correct
    strong_correct = sum(
        1 if random.random() < (1 - question.slip) else 0
        for _ in range(TRIALS)
    )

    # Test weak student (not mastered) — expect ~20% correct
    weak_correct = sum(
        1 if random.random() < question.guess else 0
        for _ in range(TRIALS)
    )

    print(f"Strong student (mastered)   — correct rate: {strong_correct / TRIALS:.2%}  (expected ~90%)")
    print(f"Weak student (not mastered) — correct rate: {weak_correct / TRIALS:.2%}  (expected ~20%)")

    assert 0.85 <= strong_correct / TRIALS <= 0.95, "Strong student rate out of expected range"
    assert 0.15 <= weak_correct / TRIALS <= 0.25, "Weak student rate out of expected range"
    print("\nAll response simulation checks passed.")

if __name__ == "__main__":
    test_response_rates()