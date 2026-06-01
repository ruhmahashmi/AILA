import os

CHARTS = [
    "chart1_accuracy_by_profile.png",
    "chart2_accuracy_diff_scatter.png",
    "chart3_concept_coverage.png",
    "chart4_stability.png",
]
MIN_FILE_SIZE = 20_000   # bytes — any real PNG chart will exceed this

if __name__ == "__main__":
    errors = []

    for chart in CHARTS:
        if not os.path.exists(chart):
            errors.append(f"MISSING: {chart}")
        else:
            size = os.path.getsize(chart)
            if size < MIN_FILE_SIZE:
                errors.append(f"TOO SMALL ({size} bytes): {chart} — may be corrupt or blank")
            else:
                print(f"✓ {chart} exists ({size:,} bytes)")

    if errors:
        print(f"\nFAIL: {len(errors)} error(s):")
        for e in errors:
            print(f"  {e}")
        raise AssertionError("Chart file checks failed.")
    else:
        print("\nAll four chart files present and non-empty.")