import random
from config import UPDATE_STEP

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
    new = min(1.0, old + UPDATE_STEP) if response == 1 else max(0.0, old - UPDATE_STEP)
    estimated.mastery[concept_id] = new
    return old, new

def run_simulation(build_graph, build_questions, student, init_estimate):
    graph = build_graph()
    questions = build_questions()
    estimated = init_estimate()
    asked = set()
    estimated = init_estimate()
    asked = set()

    q = select_question(questions, asked)
    asked.add(q.question_id)
    response = simulate_response(student, q)
    old_m, new_m = update_mastery(estimated, q.concept_id, response)

    return {
        "question_id": q.question_id,
        "concept_id": q.concept_id,
        "response": response,
        "old_mastery": old_m,
        "new_mastery": new_m,
        "estimate": estimated.mastery,
        "true_mastery": student.true_mastery,
    }