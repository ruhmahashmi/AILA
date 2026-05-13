import random
import config
from config import UPDATE_STEP, MAX_QUESTIONS


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
    steps = []
    step_num = 0

    while len(asked) < MAX_QUESTIONS:
        q = select_question(questions, asked)
        if q is None:
            stop_reason = "no_questions_left"
            break

        asked.add(q.question_id)
        step_num += 1

        response = simulate_response(student, q)
        old_m, new_m = update_mastery(estimated, q.concept_id, response)

        # Convergence delta = how much this step changed the estimate
        convergence_delta = round(abs(new_m - old_m), 4)

        steps.append({
            "step": step_num,
            "policy": config.POLICY,
            "question_id": q.question_id,
            "concept_id": q.concept_id,
            "response": response,
            "true_mastery_concept": student.true_mastery[q.concept_id],
            "old_mastery": round(old_m, 3),
            "new_mastery": round(new_m, 3),
            "mastery_snapshot": dict(estimated.mastery),
            "convergence_delta": convergence_delta,
        })

    else:
        stop_reason = "max_questions_reached"

    return {
        "steps": steps,
        "total_questions": step_num,
        "stop_reason": stop_reason,
        "final_mastery": dict(estimated.mastery),
        "true_mastery": dict(student.true_mastery),
    }