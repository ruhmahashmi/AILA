<div align="center">

# AILA — An Intelligent Lecturing Assistant

**AI-powered platform that builds knowledge graphs from lecture slides and generates adaptive formative assessments**

*Ruhma Hashmi · Advisor: Dr. Yuan An · College of Computing & Informatics, Drexel University*

[![IEEE BigData 2025](https://img.shields.io/badge/IEEE_BigData_2025-arXiv%3A2511.14595-blue?style=flat-square)](https://arxiv.org/abs/2511.14595)
[![ACM SIGCSE 2026](https://img.shields.io/badge/ACM_SIGCSE_TS_2026-DOI%3A10.1145%2F3770761.3777185-red?style=flat-square)](https://doi.org/10.1145/3770761.3777185)
[![arXiv](https://img.shields.io/badge/arXiv-2507.05629-b31b1b?style=flat-square)](https://arxiv.org/abs/2507.05629)

</div>

---

## Overview

AILA automates the creation of high-quality multiple-choice questions (MCQs) from lecture slides by first building a **knowledge graph (KG)** of the content, then using that structured representation to prompt an LLM. The platform delivers questions through adaptive quizzes calibrated to individual student mastery.

Built as a full-stack web app: **Next.js** frontend, **FastAPI** backend, **Google Gemini** LLM, **SQLite** database.

---

## Published Research

| Paper | Venue | Links |
|-------|-------|-------|
| Rate-Distortion Guided KG Construction from Lecture Notes Using Gromov-Wasserstein Optimal Transport | IEEE BigData 2025 | [arXiv](https://arxiv.org/abs/2511.14595) · [PDF](docs/papers/RateDistortion_IEEE_BigData_2025.pdf) |
| Scaling Retrieval Practice with LLM: Improving MCQ Quality through Knowledge Graphs | ACM SIGCSE TS 2026 | [DOI](https://doi.org/10.1145/3770761.3777185) · [PDF](docs/papers/ScalingRetrievalPractice_SIGCSE_2026.pdf) |
| Enhancing Student Learning with LLM-Generated Retrieval Practice Questions: An Empirical Study | arXiv 2025 (co-authored) | [arXiv](https://arxiv.org/abs/2507.05629) · [PDF](docs/papers/EnhancingStudentLearning_arXiv_2507.05629.pdf) |

---

## Posters & Presentations

| Event | Year | File |
|-------|------|------|
| Drexel STAR Scholars Showcase | 2025 | [PDF](docs/posters/AILA_STAR_Scholars_Poster_2025.pdf) |
| Pennoni Honors College Student Showcase | 2026 | [PDF](docs/posters/AILA_Pennoni_Showcase_Poster_2026.pdf) |

---

## Getting Started

### Backend
```bash
cd aila_backend
pip install -r requirements.txt
uvicorn aila_backend.main:app --reload
```

### Frontend
```bash
cd aila_frontend
npm install
npm run dev
```

> Set your Google Gemini API key via `.env` in the backend. Frontend runs on `localhost:3000`, backend on `localhost:8000`.

---

## Repo Structure

```
aila-star/
├── aila_backend/     # FastAPI + SQLite (KG pipeline, MCQ gen, quiz logic)
├── aila_frontend/    # Next.js / React (dashboards, concept map, quiz UI)
└── docs/
    ├── papers/       # Published research PDFs
    └── posters/      # Conference & showcase posters
```

---

## Funding & Acknowledgements

Supported by Drexel **STAR Scholars Program (2025)** and **UREP Mini-Grant ($1,000, 2026)**.
Advised by **Dr. Yuan An**, College of Computing & Informatics, Drexel University.

---

## Contact

**Ruhma Hashmi** · rh927@drexel.edu · [linktr.ee/ruhmahashmi](https://linktr.ee/ruhmahashmi)
