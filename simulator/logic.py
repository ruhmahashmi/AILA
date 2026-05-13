import random
import config
from config import UPDATE_STEP, MAX_QUESTIONS


# --- Response Simulation ---

def simulate_response(student, question):
    mastered = student.true_mastery[question.concept_id] == 1
    p_correct = 1 - question.slip if mastered else question.guess
    return 1 if random.random() < p_correct else 0


# --- Mastery Update ---

def update_mastery(estimated, concept_id, response):
    old = estimated.mastery[concept_id]
    new = min(1.0, old + UPDATE_STEP) if response == 1 else max(0.0, old - UPDATE_STEP)
    estimated.mastery[concept_id] = new
    return old, new


# --- Uncertainty Score ---

def uncertainty(p):
    """p*(1-p) peaks at 0.5 — highest when estimate is most uncertain."""
    return p * (1 - p)


# --- Policy A: Graph Neighbor ---

def select_graph_neighbor(questions, asked_ids, estimated, graph, current_concept_id):
    """
    Restrict candidates to direct neighbors of the current concept.
    Among neighbors, pick the concept with highest uncertainty.
    Among questions for that concept, pick the first unused one.
    Tie-break on concept ID order.
    """
    neighbors = graph[current_concept_id].neighbors

    # Build candidate pool: unused questions from neighbor concepts
    candidates = [q for q in questions
                  if q.question_id not in asked_ids
                  and q.concept_id in neighbors]

    if not candidates:
        # Fall back to any unused question if no neighbors available
        candidates = [q for q in questions if q.question_id not in asked_ids]

    if not candidates:
        return None

    # Pick neighbor concept with highest uncertainty, tie-break by concept ID
    best_concept = min(
        {q.concept_id for q in candidates},
        key=lambda cid: (-uncertainty(estimated.mastery[cid]), cid)
    )

    # Return first unused question for that concept (tie-break by question ID)
    concept_questions = sorted(
        [q for q in candidates if q.concept_id == best_concept],
        key=lambda q: q.question_id
    )
    return concept_questions[0]


# --- Policy B: Information-Based ---

def select_information_based(questions, asked_ids, estimated):
    """
    Consider all unused questions globally.
    Pick the question whose target concept has the highest uncertainty.
    Tie-break on concept ID, then question ID.
    """
    candidates = [q for q in questions if q.question_id not in asked_ids]

    if not candidates:
        return None

    return min(
        candidates,
        key=lambda q: (-uncertainty(estimated.mastery[q.concept_id]),
                       q.concept_id,
                       q.question_id)
    )


# --- Policy Router ---

def select_question(questions, asked_ids, estimated, graph, current_concept_id, policy):
    if policy == "graph_neighbor":
        return select_graph_neighbor(questions, asked_ids, estimated, graph, current_concept_id)
    elif policy == "information_based":
        return select_information_based(questions, asked_ids, estimated)
    else:
        # Random baseline: first unused question in order
        for q in questions:
            if q.question_id not in asked_ids:
                return q
        return None


# --- Main Simulation Loop ---

def run_simulation(build_graph, build_questions, student, init_estimate):
    graph = build_graph()
    questions = build_questions()
    estimated = init_estimate()
    asked = set()
    steps = []
    step_num = 0
    policy = config.POLICY

    # Start from concept 1 always
    current_concept_id = 1

    while len(asked) < MAX_QUESTIONS:
        q = select_question(questions, asked, estimated, graph, current_concept_id, policy)

        if q is None:
            stop_reason = "no_questions_left"
            break

        asked.add(q.question_id)
        step_num += 1

        response = simulate_response(student, q)
        old_m, new_m = update_mastery(estimated, q.concept_id, response)
        convergence_delta = round(abs(new_m - old_m), 4)

        # Update current concept for graph neighbor tracking
        current_concept_id = q.concept_id

        steps.append({
            "step": step_num,
            "policy": policy,
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