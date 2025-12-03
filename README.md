# AILA STAR – AI‑powered Intelligent Lecturing Assistant

This repository contains the full code and research artifacts for the AILA STAR project (Drexel University, Summer 2025).  
AILA (AI‑powered Intelligent Lecturing Assistant) is a research system that supports secure logins, lecture material upload, knowledge extraction, automated segmentation, retrieval‑augmented AI teaching assistant, and role‑based dashboards for instructors and students.

## Project Structure

- `aila_backend/` – FastAPI + SQLite backend (lecture processing, knowledge graph, MCQs, quizzes)
- `aila_frontend/` – Next.js/React frontend (dashboards, concept map UI, quiz tools)

## Key Features

- Secure login/signup with instructor and student roles
- Course, week, and lecture organization and upload
- Slide/segment extraction, LLM‑powered summaries and MCQ generation
- Knowledge‑graph construction for each course/week
- Instructor week view centered on an expandable concept map:
  - Core concepts shown first
  - Click a concept to reveal related sub‑concepts
  - Details panel with summary, slide content and MCQ generators
- Spaced retrieval practice and quiz analytics via interactive dashboards
- Modular, research‑oriented codebase for rapid iteration

## Getting Started

### Backend

See `aila_backend/README.md` for detailed backend setup.

1. `cd aila_backend`
2. `pip install -r requirements.txt`
3. `uvicorn main:app --reload`

The backend will create `ailastar.db` automatically and listens on `http://localhost:8000` by default.

### Frontend

See `aila_frontend/README.md` for detailed frontend setup.

1. `cd aila_frontend`
2. `npm install`
3. `npm run dev`


The frontend runs on `http://localhost:3000` by default and expects the backend at `http://localhost:8000` (configurable via environment).

## Development Notes

- All API endpoints are scoped under `/api/` on the backend for easy consumption from the frontend.
- Uses local SQLite for quick prototyping; can be upgraded to Postgres or another RDBMS.
- Environment variables (e.g., Google API key) must be provided via `.env` in the backend and frontend as needed.

---

**Faculty:** Prof. Yuan An, CCI, Drexel University  
**Student:** Ruhma Hashmi, CCI, Drexel University  
**Summer 2025 STAR Research Project**
