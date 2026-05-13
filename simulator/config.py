RANDOM_SEED = None
N_CONCEPTS = 6
QUESTIONS_PER_CONCEPT = 4
DEFAULT_SLIP = 0.10
DEFAULT_GUESS = 0.20
INITIAL_MASTERY = 0.5
UPDATE_STEP = 0.1

# Policy Settings
POLICY = "random"  # options later: "graph_neighbor", "information_based"
MAX_QUESTIONS = 12  

# Student Generation Settings
STUDENT_SAMPLE_SIZE = 300
STUDENT_PROFILES = {
    "strong": 0.75,
    "medium": 0.50,
    "weak": 0.25
}