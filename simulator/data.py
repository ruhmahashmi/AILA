from models import ConceptNode, Question, Student, EstimatedMastery
from config import N_CONCEPTS, QUESTIONS_PER_CONCEPT, INITIAL_MASTERY

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
    for cid in range(1, N_CONCEPTS + 1):
        for _ in range(QUESTIONS_PER_CONCEPT):
            questions.append(Question(qid, cid))
            qid += 1
    return questions

def make_student():
    return Student(1, {1: 1, 2: 1, 3: 0, 4: 1, 5: 0, 6: 0})

def init_estimate():
    return EstimatedMastery({cid: INITIAL_MASTERY for cid in range(1, N_CONCEPTS + 1)})