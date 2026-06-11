# AILA Adaptive Question Selection — Simulation Study

A simulation-based evaluation of two adaptive question selection policies —
Graph Neighbor and Information-Based — for diagnostic knowledge assessment
in an intelligent tutoring system context.

## What this repository contains

- `run_simulation.py` — generates student populations and question sequences
- `evaluate.py` — computes diagnostic accuracy and coverage metrics
- `make_charts.py` — produces the four report figures
- `report_draft.md` — the full written report
- `DEMO.md` — step-by-step instructions to reproduce all results

## How to run

See [DEMO.md](DEMO.md) for the full six-step pipeline.

Quick start:
```bash
pip install -r requirements.txt
python3 run_simulation.py && python3 evaluate.py && python3 make_charts.py
```

## Report

`report_draft.md` contains the complete report including Experiments, Results,
Limitations, Future Work, and AILA Extension sections.
All reported metrics are reproducible by running the pipeline above.