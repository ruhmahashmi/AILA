import random
from config import N_CONCEPTS, STUDENT_SAMPLE_SIZE, STUDENT_PROFILES
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