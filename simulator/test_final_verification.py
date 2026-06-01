import csv
import os

FILES = {
    "evaluation_metrics.csv":              6,
    "concept_coverage.csv":                48,
    "comparison_results.csv":              300,
    "evaluation_summary.csv":              6,
    "multiseed_summary_graphneighbor.csv": 900,
    "multiseed_summary_informationbased.csv": 900,
}
CHART_FILES = [
    "chart1_accuracy_by_profile.png",
    "chart2_accuracy_diff_scatter.png",
    "chart3_concept_coverage.png",
    "chart4_stability.png",
]
TEXT_FILES = ["interpretation.txt"]
MIN_PNG_SIZE = 20_000

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

if __name__ == "__main__":
    errors = []

    print("--- CSV row count checks ---")
    for filepath, expected in FILES.items():
        if not os.path.exists(filepath):
            errors.append(f"MISSING: {filepath}")
            continue
        rows = load_csv(filepath)
        if len(rows) != expected:
            errors.append(f"{filepath}: expected {expected} rows, got {len(rows)}")
        else:
            print(f"✓ {filepath}: {len(rows)} rows")

    print("\n--- Chart file checks ---")
    for chart in CHART_FILES:
        if not os.path.exists(chart):
            errors.append(f"MISSING: {chart}")
        else:
            size = os.path.getsize(chart)
            if size < MIN_PNG_SIZE:
                errors.append(f"{chart}: too small ({size} bytes), may be corrupt")
            else:
                print(f"✓ {chart} ({size:,} bytes)")

    print("\n--- Text file checks ---")
    for txtfile in TEXT_FILES:
        if not os.path.exists(txtfile):
            errors.append(f"MISSING: {txtfile}")
        else:
            size = os.path.getsize(txtfile)
            if size < 500:
                errors.append(f"{txtfile}: too short ({size} bytes)")
            else:
                print(f"✓ {txtfile} ({size:,} bytes)")

    print()
    if errors:
        print(f"FAIL: {len(errors)} error(s) found:")
        for e in errors:
            print(f"  {e}")
        raise AssertionError("Final verification failed.")
    else:
        print("All output files verified. Week 9 is complete.") # complete