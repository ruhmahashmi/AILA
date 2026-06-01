import csv
from collections import Counter

COVERAGE_FILE  = "concept_coverage.csv"
PROFILES       = {"strong", "medium", "weak", "all"}
POLICIES       = {"graph_neighbor", "information_based"}
CONCEPT_IDS    = {str(i) for i in range(1, 7)}
# 2 policies × 4 profile groups × 6 concepts = 48 rows
EXPECTED_ROWS  = 2 * 4 * 6
REQUIRED_FIELDS = {"policy", "profile_type", "concept_id", "avg_selections"}

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

if __name__ == "__main__":
    rows = load_csv(COVERAGE_FILE)
    errors = []

    # Check 1: row count
    if len(rows) != EXPECTED_ROWS:
        errors.append(f"Row count: expected {EXPECTED_ROWS}, got {len(rows)}")
    else:
        print(f"✓ Row count correct: {len(rows)}")

    # Check 2: all policy-profile-concept combos present
    found = {(r["policy"], r["profile_type"], r["concept_id"]) for r in rows}
    expected = {(p, pr, str(c))
                for p in POLICIES
                for pr in PROFILES
                for c in range(1, 7)}
    missing = expected - found
    if missing:
        errors.append(f"Missing combinations: {missing}")
    else:
        print("✓ All policy-profile-concept combinations present")

    for row in rows:
        rid = (f"policy={row.get('policy','?')} "
               f"profile={row.get('profile_type','?')} "
               f"concept={row.get('concept_id','?')}")

        # Check 3: required fields
        missing_fields = REQUIRED_FIELDS - set(row.keys())
        if missing_fields:
            errors.append(f"  {rid}: missing fields {missing_fields}")
            continue

        # Check 4: no blank fields
        for field in REQUIRED_FIELDS:
            if row[field].strip() == "":
                errors.append(f"  {rid}: blank field '{field}'")

        # Check 5: avg_selections >= 0
        try:
            val = float(row["avg_selections"])
            if val < 0:
                errors.append(f"  {rid}: avg_selections={val} cannot be negative")
        except ValueError:
            errors.append(f"  {rid}: avg_selections not a number")

        # Check 6: concept_id is valid
        if row["concept_id"] not in CONCEPT_IDS:
            errors.append(f"  {rid}: unexpected concept_id '{row['concept_id']}'")

    # Check 7: per policy, total avg selections across all concepts (profile=all)
    # should sum to MAX_QUESTIONS (12) since every student answers 12 questions
    from collections import defaultdict
    totals = defaultdict(float)
    for row in rows:
        if row["profile_type"] == "all":
            totals[row["policy"]] += float(row["avg_selections"])

    for policy, total in totals.items():
        if abs(total - 12.0) > 0.1:
            errors.append(
                f"  Coverage total for {policy} (all profiles) = {total:.4f}, "
                f"expected ~12.0 (one per question asked)"
            )
        else:
            print(f"✓ {policy}: total avg coverage sums to {total:.4f} ≈ 12.0")

    if errors:
        print(f"\nFAIL: {len(errors)} error(s) found:")
        for e in errors:
            print(e)
        raise AssertionError("concept_coverage.csv failed checks.")
    else:
        print("✓ All avg_selections values non-negative")
        print("✓ All required fields present and valid")
        print("\nAll coverage checks passed.")