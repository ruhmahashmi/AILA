# DEMO — Reproducing All Results

This file documents how to reproduce every output file, chart, and evaluation
result generated in this project, starting from a clean clone of the repository.
All commands assume you are in the `simulator/` directory.

---

## Requirements

Python 3.9 or later. Install dependencies:

```bash
pip install -r requirements.txt
```

`requirements.txt` should include:
matplotlib
numpy
csv

(All other imports are from the Python standard library.)

---

## Step 1: Run the Simulator

Generate student populations and collect question sequences for both policies
across three random seeds (42, 99, 7). This produces the raw per-student
response logs used in all downstream evaluation.

```bash
python3 run_simulation.py
```

**Output files produced:**
- `simulation_results_seed42.csv`
- `simulation_results_seed99.csv`
- `simulation_results_seed7.csv`

Each file contains one row per student per policy, with columns:
`student_id`, `profile_type`, `seed`, `policy`, `question_sequence`,
`final_mastery_estimate`, `true_mastery`, `diagnostic_accuracy`.

**Runtime:** approximately 15–30 seconds for 900 student runs per policy.

---

## Step 2: Run the Evaluator

Aggregate per-student results into per-seed and cross-seed summary metrics.

```bash
python3 evaluate.py
```

**Output files produced:**
- `evaluation_metrics.csv` — mean and std accuracy per policy per profile across seeds
- `evaluation_summary.csv` — same as above plus coverage_spread and top_concept columns
- `comparison_results.csv` — per-student side-by-side accuracy for GN and IB
- `concept_coverage.csv` — average questions per concept per student per policy per profile

---

## Step 3: Verify Results

Confirm that the key metrics in the report match the CSV output:

```bash
python3 - << 'EOF'
import csv

metrics = {}
with open('evaluation_metrics.csv') as f:
    for row in csv.DictReader(f):
        key = (row['policy'], row['profile_type'])
        metrics[key] = row

checks = [
    (('graph_neighbor',    'strong'), 'mean_accuracy', 0.8817),
    (('information_based', 'strong'), 'mean_accuracy', 0.895),
    (('graph_neighbor',    'medium'), 'mean_accuracy', 0.8567),
    (('information_based', 'medium'), 'mean_accuracy', 0.865),
    (('graph_neighbor',    'weak'),   'mean_accuracy', 0.8022),
    (('information_based', 'weak'),   'mean_accuracy', 0.8367),
]

for (policy, profile), field, expected in checks:
    actual = float(metrics[(policy, profile)][field])
    status = "PASS" if abs(actual - expected) < 0.001 else "FAIL"
    print(f"{status}  {policy:20s} {profile:6s}: expected {expected}, got {actual:.4f}")
EOF
```

All six lines should print `PASS`. If any print `FAIL`, re-run Steps 1 and 2.

---

## Step 4: Generate Charts

Produce all four report figures from the evaluation CSVs.

```bash
python3 make_charts.py
```

**Output files produced:**
- `chart1_accuracy_by_profile.png` — grouped bar chart, accuracy by policy and profile
- `chart2_accuracy_diff_scatter.png` — scatter plot, per-student GN−IB accuracy difference
- `chart3_concept_coverage.png` — grouped bar chart, avg questions per concept by policy
- `chart4_stability.png` — grouped bar chart, std accuracy across seeds by policy and profile

Charts are saved to the working directory at 150 dpi. They are not committed to the
repository (see `.gitignore`).

---

## Step 5: Build the Report

The report is a single Markdown file. It can be read directly or converted to PDF:

```bash
# Read directly
cat report_draft.md

# Convert to PDF (requires pandoc)
pandoc report_draft.md -o report_final.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt
```

All figure captions in the report reference the four `.png` files by name. If
converting to PDF, the four chart files must be present in the same directory as
`report_draft.md`.

---

## Step 6: Full Pipeline in One Command

To re-run everything from scratch in sequence:

```bash
python3 run_simulation.py && \
python3 evaluate.py && \
python3 make_charts.py && \
echo "All outputs regenerated."
```

---

## Repository Structure

simulator/
├── run_simulation.py # Step 1 — generates simulation CSVs
├── evaluate.py # Step 2 — generates evaluation CSVs
├── make_charts.py # Step 4 — generates chart PNGs
├── config.py # Shared configuration (seeds, params, graph)
├── bkt.py # BKT mastery update logic
├── policies.py # Graph Neighbor and Information-Based policies
├── report_draft.md # Full report (committed)
├── DEMO.md # This file
├── requirements.txt # Python dependencies
├── evaluation_metrics.csv # Generated — not committed
├── evaluation_summary.csv # Generated — not committed
├── comparison_results.csv # Generated — not committed
├── concept_coverage.csv # Generated — not committed
├── chart1_accuracy_by_profile.png # Generated — not committed
├── chart2_accuracy_diff_scatter.png # Generated — not committed
├── chart3_concept_coverage.png # Generated — not committed
└── chart4_stability.png # Generated — not committed

---

## Expected Output Files After Full Pipeline

| File | Rows | Key columns |
|---|---|---|
| `simulation_results_seed42.csv` | 600 | student_id, policy, diagnostic_accuracy |
| `evaluation_metrics.csv` | 6 | policy, profile_type, mean_accuracy, std_accuracy |
| `evaluation_summary.csv` | 6 | policy, profile_type, coverage_spread, top_concept |
| `comparison_results.csv` | 300 | student_id, gn_diagnostic_acc, ib_diagnostic_acc |
| `concept_coverage.csv` | 48 | policy, profile_type, concept_id, avg_selections |
