<div align="center">

<img src="https://img.shields.io/badge/Drexel_University-CCI-07294D?style=for-the-badge" />
<img src="https://img.shields.io/badge/STAR_Scholars-2025-FFC600?style=for-the-badge" />
<img src="https://img.shields.io/badge/UREP_Mini--Grant-$1%2C000-FFC600?style=for-the-badge" />
<img src="https://img.shields.io/badge/Pennoni_Honors_College-Showcase_2026-07294D?style=for-the-badge" />

# AILA — An Intelligent Lecturing Assistant

**From Research Pipeline to Full-Stack Adaptive Assessment Platform**

*Ruhma Hashmi · Advisor: Dr. Yuan An · College of Computing & Informatics, Drexel University*

[![IEEE BigData 2025](https://img.shields.io/badge/IEEE_BigData_2025-arXiv%3A2511.14595-blue?style=flat-square)](https://arxiv.org/abs/2511.14595)
[![ACM SIGCSE 2026](https://img.shields.io/badge/ACM_SIGCSE_TS_2026-DOI%3A10.1145%2F3770761.3777185-red?style=flat-square)](https://doi.org/10.1145/3770761.3777185)
[![arXiv](https://img.shields.io/badge/arXiv-2507.05629-b31b1b?style=flat-square)](https://arxiv.org/abs/2507.05629)
[![GitHub](https://img.shields.io/github/stars/ruhmahashmi/aila-star?style=flat-square)](https://github.com/ruhmahashmi/aila-star)

</div>

---

## What is AILA?

AILA is a full-stack AI-powered platform that automates the creation of high-quality formative assessment questions from lecture materials — and adapts quiz delivery to individual student mastery.

Instructors in fast-moving STEM fields face two compounding challenges:
1. Manually writing retrieval practice questions is time-consuming and labor-intensive
2. Raw AI-generated questions suffer from hallucinations, weak distractors, and trivial content — instructors often filter out two-thirds before use

AILA addresses both by building a **knowledge graph (KG)** from lecture slides, then using that structured representation to prompt an LLM for higher-order, cross-topic MCQs. The platform then delivers these through adaptive quizzes calibrated to each student's mastery level.

---

## Published Research

> This project has produced **3 published/submitted papers** across IEEE, ACM, and arXiv.

### Paper 1 — IEEE BigData 2025
**Rate-Distortion Guided Knowledge Graph Construction from Lecture Notes Using Gromov-Wasserstein Optimal Transport**
*Yuan An, Ruhma Hashmi, Michelle Rogers, Jane Greenberg, Brian K Smith*
*IEEE International Conference on Big Data, Macau SAR, China — December 8–11, 2025*

> Formalizes KG extraction as an information-theoretic compression problem. Lecture content is modeled as a metric-measure space; candidate KGs are aligned using **Fused Gromov-Wasserstein (FGW)** couplings to quantify both semantic and structural distortion. Five refinement operators (add, merge, split, prune, rewire) iteratively minimize the Lagrangian **L = R + βD** toward an optimal rate-distortion knee point.

[![arXiv](https://img.shields.io/badge/arXiv-2511.14595-b31b1b?style=flat-square)](https://arxiv.org/abs/2511.14595)
[📄 PDF](docs/papers/RateDistortion_IEEE_BigData_2025.pdf)

---

### Paper 2 — ACM SIGCSE TS 2026
**Scaling Retrieval Practice with LLM: Improving MCQ Quality through Knowledge Graphs**
*Yuan An, Ruhma Hashmi*
*ACM Technical Symposium on Computer Science Education, St. Louis, MO — February 18–21, 2026*

> Evaluates **257 KG-based vs. 207 Raw MCQs** from Drexel CS172 across 14 Likert-scale quality criteria. KG-based MCQs outperform raw generation on 13 of 14 criteria, with the largest gain on *Hard to Guess* (+0.52). Overall average: KG 4.78 vs. Raw 4.75 across 400+ questions.

[![DOI](https://img.shields.io/badge/DOI-10.1145%2F3770761.3777185-red?style=flat-square)](https://doi.org/10.1145/3770761.3777185)
[📄 PDF](docs/papers/ScalingRetrievalPractice_SIGCSE_2026.pdf)

---

### Paper 3 — arXiv (co-authored)
**Enhancing Student Learning with LLM-Generated Retrieval Practice Questions: An Empirical Study in Data Science Courses**
*Yuan An, John Liu, Niyam Acharya, Ruhma Hashmi*
*arXiv:2507.05629 — 2025*

> 10-week empirical study across two college-level data science courses (~60 students). Students who received LLM-generated MCQs achieved **89% accuracy** vs. **73% in the control week** — a **16-percentage-point gain** (Mann-Whitney U, p < 0.0001, effect size r = 0.586).

[![arXiv](https://img.shields.io/badge/arXiv-2507.05629-b31b1b?style=flat-square)](https://arxiv.org/abs/2507.05629)
[📄 PDF](docs/papers/EnhancingStudentLearning_arXiv_2507.05629.pdf)

---

## Key Results

| Metric | Value |
|--------|-------|
| Student accuracy with AI practice | **89%** |
| Student accuracy (control, no practice) | **73%** |
| Improvement | **+16 percentage points** (p < 0.0001, r = 0.586) |
| KG MCQ overall avg (Likert 1–5) | **4.78** |
| Raw MCQ overall avg (Likert 1–5) | **4.75** |
| Largest quality gain | **+0.52** on *Hard to Guess* |
| MCQs evaluated | **400+** (257 KG-based, 207 Raw) |
| UREP Mini-Grant awarded | **$1,000** |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  AILA Platform                       │
│                                                     │
│  Frontend: Next.js / React                          │
│  Backend:  FastAPI (Python)                         │
│  AI Model: Google Gemini LLM                        │
│  Database: SQLite                                   │
└─────────────────────────────────────────────────────┘
```

### Pipeline — Lecture to Adaptive Quiz

```
1. Upload Lecture (PDF/PPTX)
       ↓
2. Two-Pass KG Generation
   ├── Pass 1 (Structure): Reads all slides → identifies topics + depth scores → extracts inter-topic links
   └── Pass 2 (Concepts):  Sequential per-subtopic calls → child concepts + relationships
       ↓
3. KG-Guided MCQ Generation
   └── LLM prompted with KG JSON (concepts + edges) → higher-order, cross-topic questions
       ↓
4. Adaptive Quiz Delivery
   └── Difficulty-configured quizzes → per-student mastery tracking
```

### KG vs. Raw MCQ — What's Different?

| | Raw MCQ | KG-Based MCQ |
|---|---|---|
| **Context** | Current slide only | Full lecture knowledge graph |
| **Input** | Raw slide text | KG concepts + edges (JSON) |
| **Question focus** | Fact recall | Conceptual, cross-topic |
| **Difficulty** | Single-slide | Higher-order, integrative |
| **Best use** | Per-slide review | Exam prep, "connect the dots" |

---

## Rate-Distortion Framework (IEEE BigData 2025)

The core theoretical contribution formalizes KG extraction as a **lossy compression problem**:

- **Rate (R)** — KG size/complexity. More nodes = more information encoded.
- **Distortion (D)** — Semantic + structural divergence between lecture and KG, measured via **Fused Gromov-Wasserstein (FGW)** optimal transport.
- **Lagrangian (L = R + βD)** — Minimized by iterative refinement operators.

Five KG refinement operators:
`add concept` · `merge similar` · `split coarse` · `prune redundant` · `rewire edges`

The framework produces an **RD curve** during refinement, and the optimal KG corresponds to the "knee point" — compact yet maximally faithful to the lecture content.

---

## Current Work — Independent Study (2026)

**Benchmarking Graph-Based Computerized Adaptive Testing (CAT) vs. Linear Item Response Theory (IRT)**

Building on AILA's KG structure, the current independent study maps **DINA (Deterministic Inputs, Noisy "And" Gate) cognitive diagnosis models** to KG nodes and benchmarks graph-based CAT against traditional linear IRT:

| Component | Description |
|-----------|-------------|
| **DINA Model** | Maps slip/guess parameters to KG nodes for concept-level diagnostic precision |
| **Graph-Based CAT** | Traverses KG prerequisites; selects each MCQ to maximally reduce uncertainty in student mastery vector |
| **IRT Benchmark** | 2PL/3PL IRT as baseline; measures question count to reach equivalent diagnostic certainty |
| **Adaptive Selection** | Minimizes test length while preserving diagnostic accuracy |

**Research question:** Does graph-based CAT with DINA outperform linear IRT in diagnostic efficiency?

---

## Project Timeline

| Year | Milestone |
|------|-----------|
| 2025 | **STAR Scholars Program** — Built KG-based MCQ pipeline; evaluated 400+ questions across 14 quality criteria |
| 2025 | **IEEE BigData 2025 Published** — Rate-Distortion Guided KG Construction, Macau SAR |
| 2026 | **UREP Mini-Grant ($1,000)** — Received funding; transitioned to full-stack deployable web app |
| 2026 | **ACM SIGCSE TS 2026 Published** — Scaling Retrieval Practice with LLM, St. Louis, MO |
| 2026 | **Independent Study (Ongoing)** — Benchmarking graph-based CAT vs. linear IRT on AILA platform |

---

## Platform Features

### Instructor View
- Upload PDF/PPTX lecture slides
- View auto-generated knowledge graph (expandable concept map)
- Click a concept to reveal sub-concepts and relationships
- Configure quiz settings and difficulty levels
- Generate and review MCQs before student release

### Student View
- Access weekly adaptive quizzes
- Answer KG-grounded MCQs with immediate feedback
- Personalized difficulty based on mastery tracking

---

## Repo Structure

```
aila-star/
├── aila_backend/       # FastAPI + SQLite backend
│   ├── main.py         # API entry point
│   ├── kg_pipeline/    # Two-pass KG generation (Gemini)
│   ├── mcq_gen/        # KG-guided MCQ generation
│   ├── quiz/           # Adaptive quiz logic
│   └── README.md
├── aila_frontend/      # Next.js / React frontend
│   ├── app/            # Pages and layouts
│   ├── components/     # Reusable UI components
│   └── README.md
├── docs/
│   ├── papers/         # Published research PDFs
│   └── posters/        # Conference & showcase posters
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API key

### Backend

```bash
cd aila_backend
pip install -r requirements.txt
# Add your Gemini API key to .env
uvicorn aila_backend.main:app --reload
```

Backend runs on `http://localhost:8000` by default.

### Frontend

```bash
cd aila_frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000` by default.

> **Environment variables:** Set `NEXT_PUBLIC_API_URL` in `.env` for both frontend and backend as needed. The Google API key must be provided via `.env` in the backend.

---

## Future Directions

- Personalized MCQ generation adapting to individual mastery in real time
- Psychometric IRT calibration to auto-set MCQ difficulty
- Instructor review and curriculum alignment tools
- Long-term retention studies across multiple academic terms
- Multi-subject expansion: STEM, data science, life sciences
- Analytics dashboards with concept mastery heatmaps


## Contact

**Ruhma Hashmi**
College of Computing & Informatics, Drexel University
📧 rh927@drexel.edu
🔗 [LinkedIn](https://linkedin.com/in/ruhmahashmi)
🔬 [Google Scholar](https://scholar.google.com)
🔗 [Linktree](https://linktr.ee/ruhmahashmi)

**Advisor: Dr. Yuan An**
College of Computing & Informatics, Drexel University

---
