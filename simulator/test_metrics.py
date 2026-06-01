import csv

METRICS_FILE  = "evaluation_metrics.csv"
EXPECTED_ROWS = 6   # 2 policies × 3 profiles
PROFILES      = {"strong", "medium", "weak"}
POLICIES      = {"graph_neighbor", "information_based"}
REQUIRED_FIELDS = {
    "policy", "profile_type",
    "mean_accuracy", "std_accuracy", "min_seed_acc", "max_seed_acc",
    "mean_questions", "seed_42_acc", "seed_99_acc", "seed_7_acc"
}

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

if __name__ == "__main__":
    rows = load_csv(METRICS_FILE)
    errors = []

    # Check 1: row count
    if len(rows) != EXPECTED_ROWS:
        errors.append(f"Row count: expected {EXPECTED_ROWS}, got {len(rows)}")
    else:
        print(f"✓ Row count correct: {len(rows)}")

    # Check 2: all policy-profile combinations present
    found_combos = {(r["policy"], r["profile_type"]) for r in rows}
    expected_combos = {(p, pr) for p in POLICIES for pr in PROFILES}
    if found_combos != expected_combos:
        missing = expected_combos - found_combos
        errors.append(f"Missing policy-profile combinations: {missing}")
    else:
        print("✓ All 6 policy-profile combinations present")

    for row in rows:
        rid = f"policy={row.get('policy','?')} profile={row.get('profile_type','?')}"

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
        for acc_field in ["mean_accuracy", "min_seed_acc", "max_seed_acc",
                          "seed_42_acc", "seed_99_acc", "seed_7_acc"]:
            try:
                val = float(row[acc_field])
                if not (0.0 <= val <= 1.0):
                    errors.append(f"  {rid}: {acc_field}={val} out of range [0,1]")
            except ValueError:
                errors.append(f"  {rid}: {acc_field} not a number")

        # Check 6: std_accuracy >= 0
        try:
            std = float(row["std_accuracy"])
            if std < 0:
                errors.append(f"  {rid}: std_accuracy={std} cannot be negative")
        except ValueError:
            errors.append(f"  {rid}: std_accuracy not a number")

        # Check 7: min <= mean <= max
        try:
            lo   = float(row["min_seed_acc"])
            mean = float(row["mean_accuracy"])
            hi   = float(row["max_seed_acc"])
            if not (lo <= mean <= hi + 0.001):
                errors.append(f"  {rid}: min={lo} <= mean={mean} <= max={hi} violated")
        except ValueError:
            errors.append(f"  {rid}: could not validate min/mean/max ordering")

        # Check 8: mean_questions > 0
        try:
            qs = float(row["mean_questions"])
            if qs <= 0:
                errors.append(f"  {rid}: mean_questions={qs} must be > 0")
        except ValueError:
            errors.append(f"  {rid}: mean_questions not a number")

    if errors:
        print(f"\nFAIL: {len(errors)} error(s) found:")
        for e in errors:
            print(e)
        raise AssertionError("evaluation_metrics.csv failed checks.")
    else:
        print("✓ All accuracy values in range [0, 1]")
        print("✓ std_accuracy non-negative on all rows")
        print("✓ min ≤ mean ≤ max on all rows")
        print("✓ mean_questions positive on all rows")
        print("\nAll metrics checks passed.")