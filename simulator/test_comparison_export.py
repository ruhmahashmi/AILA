import csv
import ast

COMPARISON_FILE = "comparison_results.csv"
EXPECTED_ROWS   = 300
REQUIRED_FIELDS = {
    "student_id", "profile_type", "true_mastery",
    "gn_diagnostic_acc", "ib_diagnostic_acc", "acc_difference",
    "gn_total_questions", "ib_total_questions",
    "gn_stop_reason", "ib_stop_reason"
}
VALID_PROFILES = {"strong", "medium", "weak"}
VALID_STOP     = {"max_questions_reached", "no_questions_left"}

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

if __name__ == "__main__":
    rows = load_csv(COMPARISON_FILE)
    errors = []

    # Check 1: row count
    if len(rows) != EXPECTED_ROWS:
        errors.append(f"Row count: expected {EXPECTED_ROWS}, got {len(rows)}")
    else:
        print(f"✓ Row count correct: {len(rows)}")

    for i, row in enumerate(rows):
        rid = f"row {i+1} student_id={row.get('student_id','?')}"

        # Check 2: required fields
        missing = REQUIRED_FIELDS - set(row.keys())
        if missing:
            errors.append(f"  {rid}: missing fields {missing}")
            continue

        # Check 3: no blank fields
        for field in REQUIRED_FIELDS:
            if row[field].strip() == "":
                errors.append(f"  {rid}: blank field '{field}'")

        # Check 4: valid profile type
        if row["profile_type"] not in VALID_PROFILES:
            errors.append(f"  {rid}: invalid profile_type '{row['profile_type']}'")

        # Check 5: diagnostic accuracy between 0 and 1
        for acc_field in ["gn_diagnostic_acc", "ib_diagnostic_acc"]:
            try:
                val = float(row[acc_field])
                if not (0.0 <= val <= 1.0):
                    errors.append(f"  {rid}: {acc_field}={val} out of range [0,1]")
            except ValueError:
                errors.append(f"  {rid}: {acc_field} not a number")

        # Check 6: acc_difference = gn - ib within rounding tolerance
        try:
            gn  = float(row["gn_diagnostic_acc"])
            ib  = float(row["ib_diagnostic_acc"])
            diff = float(row["acc_difference"])
            if abs(diff - round(gn - ib, 4)) > 0.001:
                errors.append(f"  {rid}: acc_difference={diff} does not match gn-ib={round(gn-ib,4)}")
        except ValueError:
            errors.append(f"  {rid}: could not validate acc_difference")

        # Check 7: valid stop reasons
        for stop_field in ["gn_stop_reason", "ib_stop_reason"]:
            if row[stop_field] not in VALID_STOP:
                errors.append(f"  {rid}: invalid {stop_field} '{row[stop_field]}'")

        # Check 8: true mastery parseable
        try:
            ast.literal_eval(row["true_mastery"])
        except Exception:
            errors.append(f"  {rid}: could not parse true_mastery")

    # Check 9: no duplicate student IDs
    ids = [r["student_id"] for r in rows]
    if len(ids) != len(set(ids)):
        errors.append("Duplicate student IDs found in comparison file")
    else:
        print("✓ No duplicate student IDs")

    if errors:
        print(f"\nFAIL: {len(errors)} error(s) found:")
        for e in errors:
            print(e)
        raise AssertionError("comparison_results.csv failed checks.")
    else:
        print("✓ All required fields present and valid")
        print("✓ All diagnostic accuracy values in range [0, 1]")
        print("✓ All acc_difference values correctly computed")
        print("✓ All stop reasons valid")
        print("✓ true_mastery parseable on every row")
        print("\nAll comparison export checks passed.")