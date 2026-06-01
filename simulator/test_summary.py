import csv

SUMMARY_FILE  = "profile_summary.csv"
EXPECTED_ROWS = 3
PROFILES      = {"strong", "medium", "weak"}
REQUIRED_FIELDS = {
    "profile_type", "n_students",
    "gn_avg_accuracy", "ib_avg_accuracy", "accuracy_diff_gn_minus_ib",
    "gn_avg_questions", "ib_avg_questions"
}

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

if __name__ == "__main__":
    rows = load_csv(SUMMARY_FILE)
    errors = []

    # Check 1: exactly 3 rows (one per profile)
    if len(rows) != EXPECTED_ROWS:
        errors.append(f"Row count: expected {EXPECTED_ROWS}, got {len(rows)}")
    else:
        print(f"✓ Row count correct: {len(rows)}")

    # Check 2: all three profiles present
    found_profiles = {r["profile_type"] for r in rows}
    if found_profiles != PROFILES:
        errors.append(f"Profile types: expected {PROFILES}, got {found_profiles}")
    else:
        print(f"✓ All three profile types present: {found_profiles}")

    for row in rows:
        rid = f"profile={row.get('profile_type','?')}"

        # Check 3: required fields present
        missing = REQUIRED_FIELDS - set(row.keys())
        if missing:
            errors.append(f"  {rid}: missing fields {missing}")
            continue

        # Check 4: no blank fields
        for field in REQUIRED_FIELDS:
            if row[field].strip() == "":
                errors.append(f"  {rid}: blank field '{field}'")

        # Check 5: accuracy values between 0 and 1
        for acc_field in ["gn_avg_accuracy", "ib_avg_accuracy"]:
            try:
                val = float(row[acc_field])
                if not (0.0 <= val <= 1.0):
                    errors.append(f"  {rid}: {acc_field}={val} out of range [0,1]")
            except ValueError:
                errors.append(f"  {rid}: {acc_field} not a number")

        # Check 6: diff = gn - ib within tolerance
        try:
            gn   = float(row["gn_avg_accuracy"])
            ib   = float(row["ib_avg_accuracy"])
            diff = float(row["accuracy_diff_gn_minus_ib"])
            if abs(diff - round(gn - ib, 4)) > 0.001:
                errors.append(f"  {rid}: diff={diff} does not match gn-ib={round(gn-ib,4)}")
        except ValueError:
            errors.append(f"  {rid}: could not validate accuracy_diff")

        # Check 7: n_students > 0
        try:
            n = int(row["n_students"])
            if n <= 0:
                errors.append(f"  {rid}: n_students={n} must be > 0")
        except ValueError:
            errors.append(f"  {rid}: n_students not an integer")

        # Check 8: avg questions > 0
        for q_field in ["gn_avg_questions", "ib_avg_questions"]:
            try:
                val = float(row[q_field])
                if val <= 0:
                    errors.append(f"  {rid}: {q_field}={val} must be > 0")
            except ValueError:
                errors.append(f"  {rid}: {q_field} not a number")

    if errors:
        print(f"\nFAIL: {len(errors)} error(s) found:")
        for e in errors:
            print(e)
        raise AssertionError("profile_summary.csv failed checks.")
    else:
        print("✓ All required fields present and valid")
        print("✓ All accuracy values in range [0, 1]")
        print("✓ Difference values correctly computed")
        print("✓ Student counts and question averages are positive")
        print("\nAll summary checks passed.")