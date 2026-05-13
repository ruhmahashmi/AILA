import random
from dataclasses import dataclass

random.seed(42)

@dataclass
class ConceptNode:
    concept_id: int
    name: str
    neighbors: list

@dataclass
class Question:
    question_id: int
    concept_id: int
    slip: float = 0.10
    guess: float = 0.20

@dataclass
class Student:
    student_id: int
    true_mastery: dict

@dataclass
class EstimatedMastery:
    mastery: dict

def build_graph():
    return {
        1: ConceptNode(1, "Concept 1", [2, 3]),
        2: ConceptNode(2, "Concept 2", [1, 4]),
        3: ConceptNode(3, "Concept 3", [1, 5]),
        4: ConceptNode(4, "Concept 4", [2, 6]),
        5: ConceptNode(5, "Concept 5", [3]),
        6: ConceptNode(6, "Concept 6", [4]),
    }

def build_questions():
    questions = []
    qid = 1
    for cid in range(1, 7):
        for _ in range(4):
            questions.append(Question(qid, cid))
            qid += 1
    return questions

def make_student():
    true_mastery = {1: 1, 2: 1, 3: 0, 4: 1, 5: 0, 6: 0}
    return Student(student_id=1, true_mastery=true_mastery)

def init_estimate():
    return EstimatedMastery({cid: 0.5 for cid in range(1, 7)})

def select_question(questions, asked_ids=None):
    asked_ids = asked_ids or set()
    for q in questions:
        if q.question_id not in asked_ids:
            return q
    return None

def simulate_response(student, question):
    mastered = student.true_mastery[question.concept_id] == 1
    p_correct = 1 - question.slip if mastered else question.guess
    return 1 if random.random() < p_correct else 0

def update_mastery(estimated, concept_id, response):
    old = estimated.mastery[concept_id]
    if response == 1:
        new = min(1.0, old + 0.1)
    else:
        new = max(0.0, old - 0.1)
    estimated.mastery[concept_id] = new
    return old, new

def run_simulation():
    graph = build_graph()
    questions = build_questions()
    student = make_student()
    estimated = init_estimate()
    asked = set()

    print("Starting simulation...")
    print("Initial mastery:", estimated.mastery)

    q = select_question(questions, asked)
    asked.add(q.question_id)
    response = simulate_response(student, q)
    old_m, new_m = update_mastery(estimated, q.concept_id, response)

    print(f"Selected question: {q.question_id} (concept {q.concept_id})")
    print(f"True mastery: {student.true_mastery[q.concept_id]}")
    print(f"Response: {response}")
    print(f"Mastery update: {old_m:.2f} -> {new_m:.2f}")
    print("Updated mastery:", estimated.mastery)

if __name__ == "__main__":
    run_simulation()