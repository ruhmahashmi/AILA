import csv
import ast

GN_FILE = "run_summary_graphneighbor.csv"
IB_FILE = "run_summary_informationbased.csv"

REQUIRED_FIELDS = {
    "student_id", "profile_type", "policy",
    "total_questions", "stop_reason",
    "final_mastery", "true_mastery"
}
VALID_PROFILES   = {"strong", "medium", "weak"}
VALID_STOP       = {"max_questions_reached", "no_questions_left"}
VALID_POLICIES   = {"graph_neighbor", "information_based"}
EXPECTED_ROWS    = 300
EXPECTED_STEPS   = 12

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

def check_file(rows, filename, expected_policy):
    errors = []

    # Row count
    if len(rows) != EXPECTED_ROWS:
        errors.append(f"  Row count: expected {EXPECTED_ROWS}, got {len(rows)}")

    for i, row in enumerate(rows):
        rid = f"row {i+1} student_id={row.get('student_id','?')}"

        # Required fields present
        missing = REQUIRED_FIELDS - set(row.keys())
        if missing:
            errors.append(f"  {rid}: missing fields {missing}")
            continue

        # No blank fields
        for field in REQUIRED_FIELDS:
            if row[field].strip() == "":
                errors.append(f"  {rid}: blank field '{field}'")

        # Profile type valid
        if row["profile_type"] not in VALID_PROFILES:
            errors.append(f"  {rid}: invalid profile_type '{row['profile_type']}'")

        # Stop reason valid
        if row["stop_reason"] not in VALID_STOP:
            errors.append(f"  {rid}: invalid stop_reason '{row['stop_reason']}'")

        # Policy matches expected
        if row["policy"] != expected_policy:
            errors.append(f"  {rid}: expected policy '{expected_policy}', got '{row['policy']}'")

        # Total questions = 12
        try:
            tq = int(row["total_questions"])
            if tq != EXPECTED_STEPS:
                errors.append(f"  {rid}: total_questions={tq}, expected {EXPECTED_STEPS}")
        except ValueError:
            errors.append(f"  {rid}: total_questions not an integer")

        # Final mastery values between 0 and 1
        try:
            fm = ast.literal_eval(row["final_mastery"])
            for cid, val in fm.items():
                if not (0.0 <= val <= 1.0):
                    errors.append(f"  {rid}: final_mastery[{cid}]={val} out of range")
        except Exception:
            errors.append(f"  {rid}: could not parse final_mastery")

    if errors:
        print(f"\nFAIL: {filename}")
        for e in errors:
            print(e)
        raise AssertionError(f"{filename} failed checks.")
    else:
        print(f"✓ {filename}: {len(rows)} rows, all checks passed")

def check_same_student_ids(gn_rows, ib_rows):
    gn_ids = [r["student_id"] for r in gn_rows]
    ib_ids = [r["student_id"] for r in ib_rows]
    assert gn_ids == ib_ids, "FAIL: student ID order differs between GN and IB files"
    print("✓ Student IDs identical and in same order across both files")

if __name__ == "__main__":
    print("--- Checking batch output files ---\n")
    gn_rows = load_csv(GN_FILE)
    ib_rows = load_csv(IB_FILE)

    check_file(gn_rows, GN_FILE, "graph_neighbor")
    check_file(ib_rows, IB_FILE, "information_based")
    check_same_student_ids(gn_rows, ib_rows)

    print("\nAll batch output checks passed.")