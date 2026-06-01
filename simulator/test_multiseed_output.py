import csv
import ast

GN_FILE  = "multiseed_summary_graphneighbor.csv"
IB_FILE  = "multiseed_summary_informationbased.csv"

SEEDS            = [42, 99, 7]
STUDENTS_PER_SEED = 300
EXPECTED_ROWS    = len(SEEDS) * STUDENTS_PER_SEED   # 900
REQUIRED_FIELDS  = {
    "seed", "student_id", "profile_type", "policy",
    "total_questions", "stop_reason", "final_mastery", "true_mastery"
}
VALID_PROFILES = {"strong", "medium", "weak"}
VALID_STOP     = {"max_questions_reached", "no_questions_left"}

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

def check_file(rows, filename, expected_policy):
    errors = []

    # Check 1: total row count
    if len(rows) != EXPECTED_ROWS:
        errors.append(f"  Row count: expected {EXPECTED_ROWS}, got {len(rows)}")
    else:
        print(f"✓ {filename}: {len(rows)} rows total")

    # Check 2: each seed contributes exactly 300 rows
    from collections import Counter
    seed_counts = Counter(row["seed"] for row in rows)
    for seed in SEEDS:
        count = seed_counts.get(str(seed), 0)
        if count != STUDENTS_PER_SEED:
            errors.append(f"  Seed {seed}: expected {STUDENTS_PER_SEED} rows, got {count}")
        else:
            print(f"✓ Seed {seed}: {count} rows")

    for i, row in enumerate(rows):
        rid = f"row {i+1} seed={row.get('seed','?')} student_id={row.get('student_id','?')}"

        # Check 3: required fields present
        missing = REQUIRED_FIELDS - set(row.keys())
        if missing:
            errors.append(f"  {rid}: missing fields {missing}")
            continue

        # Check 4: no blank fields
        for field in REQUIRED_FIELDS:
            if row[field].strip() == "":
                errors.append(f"  {rid}: blank field '{field}'")

        # Check 5: seed value is one of the expected seeds
        if row["seed"] not in [str(s) for s in SEEDS]:
            errors.append(f"  {rid}: unexpected seed value '{row['seed']}'")

        # Check 6: valid profile type
        if row["profile_type"] not in VALID_PROFILES:
            errors.append(f"  {rid}: invalid profile_type '{row['profile_type']}'")

        # Check 7: valid stop reason
        if row["stop_reason"] not in VALID_STOP:
            errors.append(f"  {rid}: invalid stop_reason '{row['stop_reason']}'")

        # Check 8: policy matches expected
        if row["policy"] != expected_policy:
            errors.append(f"  {rid}: expected policy '{expected_policy}', got '{row['policy']}'")

        # Check 9: final mastery parseable and values in range
        try:
            fm = ast.literal_eval(row["final_mastery"])
            for cid, val in fm.items():
                if not (0.0 <= val <= 1.0):
                    errors.append(f"  {rid}: final_mastery[{cid}]={val} out of range")
        except Exception:
            errors.append(f"  {rid}: could not parse final_mastery")

    if errors:
        print(f"\nFAIL: {filename} — {len(errors)} error(s):")
        for e in errors:
            print(e)
        raise AssertionError(f"{filename} failed checks.")
    else:
        print(f"✓ {filename}: all field and value checks passed\n")

if __name__ == "__main__":
    print("--- Checking multi-seed output files ---\n")
    gn_rows = load_csv(GN_FILE)
    ib_rows = load_csv(IB_FILE)

    check_file(gn_rows, GN_FILE, "graph_neighbor")
    check_file(ib_rows, IB_FILE, "information_based")

    print("All multi-seed output checks passed.")