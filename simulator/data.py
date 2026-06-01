import random
from config import N_CONCEPTS, STUDENT_SAMPLE_SIZE, STUDENT_PROFILES
from models import ConceptNode, Question, Student, EstimatedMastery
from config import N_CONCEPTS, QUESTIONS_PER_CONCEPT, INITIAL_MASTERY

def build_graph():
    # Branching AILA-style topology:
    # 1 → 2, 3  (two foundational branches from root)
    # 2 → 4, 5  (branch A splits further)
    # 3 → 5, 6  (branch B shares node 5 and reaches node 6)
    # 4 → 6     (branch A converges at node 6)
    # 5 → 6     (shared node converges at endpoint)
    # 6 → (none) (terminal node)
    graph = {
        1: ConceptNode(concept_id=1, name="Concept 1", neighbors={2, 3}),
        2: ConceptNode(concept_id=2, name="Concept 2", neighbors={4, 5}),
        3: ConceptNode(concept_id=3, name="Concept 3", neighbors={5, 6}),
        4: ConceptNode(concept_id=4, name="Concept 4", neighbors={6}),
        5: ConceptNode(concept_id=5, name="Concept 5", neighbors={6}),
        6: ConceptNode(concept_id=6, name="Concept 6", neighbors=set()),
    }
    return graph

def build_questions():
    questions = []
    qid = 1
    for cid in range(1, N_CONCEPTS + 1):
        for _ in range(QUESTIONS_PER_CONCEPT):
            questions.append(Question(qid, cid))
            qid += 1
    return questions


def generate_students():
    students = []
    
    # Calculate how many students per profile type
    students_per_profile = STUDENT_SAMPLE_SIZE // len(STUDENT_PROFILES)
    
    student_id = 1
    for profile_type, prob in STUDENT_PROFILES.items():
        for _ in range(students_per_profile):
            # Generate binary mastery vector based on the group's probability
            true_mastery = {
                cid: 1 if random.random() < prob else 0 
                for cid in range(1, N_CONCEPTS + 1)
            }
            students.append(Student(student_id, profile_type, true_mastery))
            student_id += 1
            
    return students

def init_estimate():
    return EstimatedMastery({cid: INITIAL_MASTERY for cid in range(1, N_CONCEPTS + 1)})