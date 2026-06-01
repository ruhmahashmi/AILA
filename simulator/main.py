import random
import config
from data import build_graph, build_questions, generate_students, init_estimate
from logic import run_simulation
from logger import save_interaction_log, save_run_summary

POLICIES = ["graph_neighbor", "information_based"]
RESPONSE_SEED = 99

def run_policy_batch(policy_name, students):
    config.POLICY = policy_name      # set policy before each run
    random.seed(RESPONSE_SEED)       # reset response seed
    interaction_rows = []
    summary_rows = []

    for student in students:
        result = run_simulation(build_graph, build_questions, student, init_estimate)
        for step in result["steps"]:
            step["student_id"]   = student.student_id
            step["profile_type"] = student.profile_type
        interaction_rows.extend(result["steps"])
        summary_rows.append({
            "student_id":      student.student_id,
            "profile_type":    student.profile_type,
            "policy":          policy_name,
            "total_questions": result["total_questions"],
            "stop_reason":     result["stop_reason"],
            "final_mastery":   result["final_mastery"],
            "true_mastery":    student.true_mastery,
        })

    suffix = policy_name.replace("_", "")
    save_interaction_log(interaction_rows, filename=f"interaction_log_{suffix}.csv")
    save_run_summary(summary_rows,         filename=f"run_summary_{suffix}.csv")
    print(f"[{policy_name}] Done. {len(summary_rows)} students written.")
    print_profile_breakdown(summary_rows, policy_name)
    return summary_rows

def print_profile_breakdown(summary_rows, policy_name):
    """Print correct response rate broken down by profile type."""
    from collections import defaultdict
    profile_correct = defaultdict(list)

    for row in summary_rows:
        # final_mastery is a dict — average it as a proxy for overall correctness
        avg_mastery = sum(row["final_mastery"].values()) / len(row["final_mastery"])
        profile_correct[row["profile_type"]].append(avg_mastery)

    print(f"\n  [{policy_name}] Average final mastery by profile:")
    for profile in ["strong", "medium", "weak"]:
        values = profile_correct.get(profile, [])
        if values:
            avg = sum(values) / len(values)
            print(f"    {profile:8s}: {avg:.3f}")

if __name__ == "__main__":
    random.seed(config.RANDOM_SEED or 42)
    students = generate_students()     # generated ONCE, reused for both policies
    print(f"Generated {len(students)} students. Running both policies...\n")

    for policy in POLICIES:
        run_policy_batch(policy, students)

    print("\nBatch complete. Output files:")
    for policy in POLICIES:
        suffix = policy.replace("_", "")
        print(f"  interaction_log_{suffix}.csv  |  run_summary_{suffix}.csv")