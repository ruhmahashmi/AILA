import csv
import ast
from collections import defaultdict

# ── Plotly imports ──────────────────────────────────────────────────────────
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.io as pio

# ── Constants ────────────────────────────────────────────────────────────────
PROFILES    = ["strong", "medium", "weak"]
POLICIES    = ["graph_neighbor", "information_based"]
POLICY_LABELS = {
    "graph_neighbor":    "Graph Neighbor",
    "information_based": "Information-Based",
}
PROFILE_COLORS = {
    "strong": "#2563EB",   # blue
    "medium": "#16A34A",   # green
    "weak":   "#DC2626",   # red
}
POLICY_COLORS = {
    "graph_neighbor":    "#7C3AED",   # purple
    "information_based": "#EA580C",   # orange
}

FONT_FAMILY = "Inter, Arial, sans-serif"
TITLE_SIZE  = 16
AXIS_SIZE   = 12

def load_csv(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))

def base_layout(title):
    return dict(
        title=dict(text=title, font=dict(size=TITLE_SIZE, family=FONT_FAMILY)),
        font=dict(family=FONT_FAMILY, size=AXIS_SIZE),
        plot_bgcolor="white",
        paper_bgcolor="white",
        margin=dict(l=60, r=40, t=70, b=60),
    )

# ── Chart 1: Grouped bar — accuracy by policy and profile ───────────────────
def chart1_accuracy_by_profile(metrics_rows):
    data = defaultdict(dict)
    for row in metrics_rows:
        data[row["policy"]][row["profile_type"]] = float(row["mean_accuracy"])

    fig = go.Figure()
    x_labels = PROFILES
    bar_width = 0.35
    offsets   = [-0.18, 0.18]

    for i, policy in enumerate(POLICIES):
        fig.add_trace(go.Bar(
            name=POLICY_LABELS[policy],
            x=[p.capitalize() for p in x_labels],
            y=[data[policy].get(p, 0) for p in x_labels],
            marker_color=POLICY_COLORS[policy],
            width=bar_width,
            text=[f"{data[policy].get(p, 0):.3f}" for p in x_labels],
            textposition="outside",
            offset=offsets[i] - bar_width / 2,
        ))

    fig.update_layout(
        **base_layout("Chart 1 — Average Diagnostic Accuracy by Policy and Profile"),
        barmode="group",
        yaxis=dict(title="Average Diagnostic Accuracy", range=[0, 1.05],
                   tickformat=".2f", gridcolor="#E5E7EB"),
        xaxis=dict(title="Student Profile"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        width=700, height=460,
    )
    pio.write_image(fig, "chart1_accuracy_by_profile.png", scale=2)
    print("✓ chart1_accuracy_by_profile.png")

# ── Chart 2: Per-student accuracy difference scatter ────────────────────────
def chart2_accuracy_diff_scatter(comparison_rows):
    fig = go.Figure()

    for profile in PROFILES:
        subset = [r for r in comparison_rows if r["profile_type"] == profile]
        ids    = [int(r["student_id"]) for r in subset]
        diffs  = [float(r["acc_difference"]) for r in subset]

        fig.add_trace(go.Scatter(
            x=ids,
            y=diffs,
            mode="markers",
            name=profile.capitalize(),
            marker=dict(color=PROFILE_COLORS[profile], size=5, opacity=0.65),
        ))

    fig.add_hline(y=0, line_dash="dash", line_color="#6B7280", line_width=1.5,
                  annotation_text="No difference", annotation_position="top right")

    fig.update_layout(
        **base_layout("Chart 2 — Per-Student Accuracy Difference (GN − IB)"),
        xaxis=dict(title="Student ID", gridcolor="#E5E7EB"),
        yaxis=dict(title="Accuracy Difference (GN − IB)",
                   tickformat=".2f", gridcolor="#E5E7EB",
                   zeroline=False),
        legend=dict(title="Profile", orientation="v"),
        width=750, height=460,
    )
    pio.write_image(fig, "chart2_accuracy_diff_scatter.png", scale=2)
    print("✓ chart2_accuracy_diff_scatter.png")

# ── Chart 3: Per-concept coverage bar chart ─────────────────────────────────
def chart3_concept_coverage(coverage_rows):
    # Use overall (profile=all) coverage only
    data = defaultdict(dict)
    for row in coverage_rows:
        if row["profile_type"] == "all":
            data[row["policy"]][int(row["concept_id"])] = float(row["avg_selections"])

    concept_labels = [f"C{i}" for i in range(1, 7)]
    fig = go.Figure()

    for policy in POLICIES:
        fig.add_trace(go.Bar(
            name=POLICY_LABELS[policy],
            x=concept_labels,
            y=[data[policy].get(i, 0) for i in range(1, 7)],
            marker_color=POLICY_COLORS[policy],
            text=[f"{data[policy].get(i, 0):.2f}" for i in range(1, 7)],
            textposition="outside",
        ))

    fig.update_layout(
        **base_layout("Chart 3 — Average Questions per Concept per Student by Policy"),
        barmode="group",
        yaxis=dict(title="Avg Selections per Student", gridcolor="#E5E7EB",
                   tickformat=".2f"),
        xaxis=dict(title="Concept ID"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        width=700, height=460,
    )
    pio.write_image(fig, "chart3_concept_coverage.png", scale=2)
    print("✓ chart3_concept_coverage.png")

# ── Chart 4: Stability bar chart ─────────────────────────────────────────────
def chart4_stability(metrics_rows):
    data = defaultdict(dict)
    for row in metrics_rows:
        data[row["policy"]][row["profile_type"]] = float(row["std_accuracy"])

    fig = go.Figure()
    for policy in POLICIES:
        fig.add_trace(go.Bar(
            name=POLICY_LABELS[policy],
            x=[p.capitalize() for p in PROFILES],
            y=[data[policy].get(p, 0) for p in PROFILES],
            marker_color=POLICY_COLORS[policy],
            text=[f"{data[policy].get(p, 0):.4f}" for p in PROFILES],
            textposition="outside",
        ))

    fig.update_layout(
        **base_layout("Chart 4 — Accuracy Stability Across Seeds by Policy and Profile"),
        barmode="group",
        yaxis=dict(title="Std Dev of Diagnostic Accuracy (across seeds)",
                   gridcolor="#E5E7EB", tickformat=".4f"),
        xaxis=dict(title="Student Profile"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        annotations=[dict(
            text="Lower = more stable",
            xref="paper", yref="paper", x=0.01, y=0.97,
            showarrow=False, font=dict(size=11, color="#6B7280"),
        )],
        width=700, height=460,
    )
    pio.write_image(fig, "chart4_stability.png", scale=2)
    print("✓ chart4_stability.png")

# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Loading data files...")
    metrics_rows    = load_csv("evaluation_metrics.csv")
    comparison_rows = load_csv("comparison_results.csv")
    coverage_rows   = load_csv("concept_coverage.csv")
    print(f"  metrics: {len(metrics_rows)} rows | "
          f"comparison: {len(comparison_rows)} rows | "
          f"coverage: {len(coverage_rows)} rows\n")

    print("Generating charts...")
    chart1_accuracy_by_profile(metrics_rows)
    chart2_accuracy_diff_scatter(comparison_rows)
    chart3_concept_coverage(coverage_rows)
    chart4_stability(metrics_rows)

    print("\nAll four charts saved as PNG files.")