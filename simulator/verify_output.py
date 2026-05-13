import csv

INTERACTION_LOG_PATH = "interaction_log.csv"
RUN_SUMMARY_PATH = "run_summary.csv"

EXPECTED_INTERACTION_FIELDS = {
    "student_id", "profile_type", "step", "policy",
    "question_id", "concept_id", "response",
    "true_mastery_concept", "old_mastery", "new_mastery",
    "mastery_snapshot", "convergence_delta"
}

EXPECTED_SUMMARY_FIELDS = {
    "student_id", "profile_type", "policy",
    "total_questions", "stop_reason",
    "final_mastery", "true_mastery"
}

VALID_PROFILES = {"strong", "medium", "weak"}
VALID_STOP_REASONS = {"max_questions_reached", "no_questions_left"}


def verify_interaction_log():
    print("Verifying interaction_log.csv...")
    errors = []

    with open(INTERACTION_LOG_PATH, newline="") as f:
        reader = csv.DictReader(f)

        # Check headers
        missing_fields = EXPECTED_INTERACTION_FIELDS - set(reader.fieldnames)
        if missing_fields:
            errors.append(f"  Missing columns: {missing_fields}")

        rows = list(reader)

    # Check row count
    if len(rows) != 3600:
        errors.append(f"  Expected 3600 rows, got {len(rows)}")

    for i, row in enumerate(rows):
        row_id = f"Row {i+2}"  # +2 accounts for header

        # No blank fields
        for field in EXPECTED_INTERACTION_FIELDS:
            if row.get(field, "").strip() == "":
                errors.append(f"  {row_id}: blank field '{field}'")

        # Profile type is valid
        if row["profile_type"] not in VALID_PROFILES:
            errors.append(f"  {row_id}: invalid profile_type '{row['profile_type']}'")

        # Response is 0 or 1
        if row["response"] not in {"0", "1"}:
            errors.append(f"  {row_id}: invalid response '{row['response']}'")

        # Mastery values are between 0 and 1
        for field in ["old_mastery", "new_mastery"]:
            try:
                val = float(row[field])
                if not (0.0 <= val <= 1.0):
                    errors.append(f"  {row_id}: {field} out of range: {val}")
            except ValueError:
                errors.append(f"  {row_id}: {field} not a float: {row[field]}")

        # Convergence delta is always 0.1
        try:
            delta = float(row["convergence_delta"])
            if abs(delta - 0.1) > 0.001:
                errors.append(f"  {row_id}: unexpected convergence_delta: {delta}")
        except ValueError:
            errors.append(f"  {row_id}: convergence_delta not a float")

        # Step is a positive integer
        try:
            step = int(row["step"])
            if step < 1:
                errors.append(f"  {row_id}: step < 1: {step}")
        except ValueError:
            errors.append(f"  {row_id}: step not an integer")

    if errors:
        print(f"  FAILED — {len(errors)} issue(s) found:")
        for e in errors[:10]:  # show first 10 to avoid flood
            print(e)
        if len(errors) > 10:
            print(f"  ...and {len(errors) - 10} more.")
    else:
        print(f"  ✓ All checks passed — {len(rows)} rows, all fields clean")


def verify_run_summary():
    print("\nVerifying run_summary.csv...")
    errors = []

    with open(RUN_SUMMARY_PATH, newline="") as f:
        reader = csv.DictReader(f)

        missing_fields = EXPECTED_SUMMARY_FIELDS - set(reader.fieldnames)
        if missing_fields:
            errors.append(f"  Missing columns: {missing_fields}")

        rows = list(reader)

    # Check row count
    if len(rows) != 300:
        errors.append(f"  Expected 300 rows, got {len(rows)}")

    for i, row in enumerate(rows):
        row_id = f"Row {i+2}"

        # No blank fields
        for field in EXPECTED_SUMMARY_FIELDS:
            if row.get(field, "").strip() == "":
                errors.append(f"  {row_id}: blank field '{field}'")

        # Stop reason is valid
        if row["stop_reason"] not in VALID_STOP_REASONS:
            errors.append(f"  {row_id}: invalid stop_reason '{row['stop_reason']}'")

        # Profile type is valid
        if row["profile_type"] not in VALID_PROFILES:
            errors.append(f"  {row_id}: invalid profile_type '{row['profile_type']}'")

        # Total questions is 12
        try:
            tq = int(row["total_questions"])
            if tq != 12:
                errors.append(f"  {row_id}: total_questions expected 12, got {tq}")
        except ValueError:
            errors.append(f"  {row_id}: total_questions not an integer")

    if errors:
        print(f"  FAILED — {len(errors)} issue(s) found:")
        for e in errors[:10]:
            print(e)
        if len(errors) > 10:
            print(f"  ...and {len(errors) - 10} more.")
    else:
        print(f"  ✓ All checks passed — {len(rows)} rows, all fields clean")


def print_sample_rows():
    print("\n--- Sample: first 3 rows of interaction_log.csv ---")
    with open(INTERACTION_LOG_PATH, newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= 3:
                break
            print(dict(row))

    print("\n--- Sample: first 3 rows of run_summary.csv ---")
    with open(RUN_SUMMARY_PATH, newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= 3:
                break
            print(dict(row))


if __name__ == "__main__":
    verify_interaction_log()
    verify_run_summary()
    print_sample_rows()
    print("\nOutput verification complete.")