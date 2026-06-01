# AILA Simulator

Simulation-based comparison of adaptive question selection policies for AI-driven adaptive testing in AILA.

## Project Overview

This simulator generates synthetic student profiles and runs them through an adaptive question loop to compare two selection policies:
- **Graph Neighbor** — selects the next question from concepts directly connected to the last tested concept in the knowledge graph
- **Information-Based** — selects the next question globally from the concept with the highest uncertainty score

Both policies use a DINA-style response model with binary mastery, slip = 0.10, and guess = 0.20.

## How to Run

### Full batch run (300 students)
```bash
python3 main.py
```
Output: `interaction_log.csv` and `run_summary.csv`

### Switch policies
Open `config.py` and set:
```python
POLICY = "graph_neighbor"       # or "information_based" or "random"
```

## Output Files

| File | Rows | Description |
|---|---|---|
| `interaction_log.csv` | 3,600 | One row per question-answer step (300 students × 12 steps) |
| `run_summary.csv` | 300 | One row per completed student run |

Both files are excluded from version control via `.gitignore`.

### interaction_log.csv fields
`student_id`, `profile_type`, `step`, `policy`, `question_id`, `concept_id`, `response`, `true_mastery_concept`, `old_mastery`, `new_mastery`, `mastery_snapshot`, `convergence_delta`

### run_summary.csv fields
`student_id`, `profile_type`, `policy`, `total_questions`, `stop_reason`, `final_mastery`, `true_mastery`

## Test Scripts

| Script | What it checks |
|---|---|
| `test_response.py` | DINA response rates across 1,000 trials per condition |
| `test_simulator.py` | Stop reason, mastery direction, and log fields on 3 manual students |
| `test_policies.py` | Policy divergence and stopping rule consistency |
| `verify_output.py` | Full field-level checks on both CSV output files |

### Run all tests
```bash
python3 test_response.py
python3 test_simulator.py
python3 test_policies.py
python3 verify_output.py
```

## File Structure
simulator/
├── config.py # Settings: policy, student count, question limit, update step
├── data.py # Concept graph, question bank, student generator
├── models.py # Student, ConceptNode, Question, EstimatedMastery objects
├── logic.py # Simulation loop, response model, both selection policies
├── logger.py # CSV writing for interaction log and run summary
├── main.py # Batch runner for full 300-student experiment
├── test_response.py # Response rate verification
├── test_simulator.py # Small-run assertion checks
├── test_policies.py # Policy behavior and divergence checks
└── verify_output.py # Output file verification


## Simulator Settings (config.py)

| Setting | Value | Description |
|---|---|---|
| `NUM_STUDENTS` | 300 | Total students per batch |
| `MAX_QUESTIONS` | 12 | Hard question limit per student |
| `UPDATE_STEP` | 0.1 | Mastery update size per response |
| `RANDOM_SEED` | 42 | Seed for reproducibility |
| `POLICY` | configurable | Active selection policy |
