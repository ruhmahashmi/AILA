import csv
import os

INTERACTION_LOG_PATH = "interaction_log.csv"
RUN_SUMMARY_PATH = "run_summary.csv"

INTERACTION_FIELDS = [
    "student_id", "profile_type", "step", "question_id",
    "concept_id", "response", "true_mastery_concept",
    "old_mastery", "new_mastery"
]

RUN_SUMMARY_FIELDS = [
    "student_id", "profile_type", "total_questions",
    "final_mastery", "true_mastery"
]

def init_logs():
    for path, fields in [
        (INTERACTION_LOG_PATH, INTERACTION_FIELDS),
        (RUN_SUMMARY_PATH, RUN_SUMMARY_FIELDS)
    ]:
        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()

def log_interaction(row: dict):
    with open(INTERACTION_LOG_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=INTERACTION_FIELDS)
        writer.writerow(row)

def log_run_summary(row: dict):
    with open(RUN_SUMMARY_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=RUN_SUMMARY_FIELDS)
        writer.writerow(row)