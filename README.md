# AILA STAR – AI-powered Intelligent Lecturing Assistant

This repository contains the full code and research artifacts for the AILA STAR project (Drexel University, Summer 2025).
AILA (AI-powered Intelligent Lecturing Assistant) is a research system that supports secure logins, lecture material upload, knowledge extraction, automated segmentation, retrieval-augmented AI teaching assistant and role-based dashboards for instructors and students.

## Project Structure

- `aila_backend/`: FastAPI + SQLite backend
- `aila_frontend/`: Next.js/React frontend

## Key Features

- Secure login/signup (with role checks)
- Course, week, and lecture organization and upload
- Slide/segment extraction, LLM-powered summaries/MCQ generation
- Spaced retrieval practice via interactive dashboards
- Modular, research-oriented codebase for rapid iteration

## Getting Started

### Backend
See `aila_backend/README.md` for backend setup instructions.

1. `cd aila_backend`
2. `pip install -r requirements.txt`
3. `uvicorn main:app --reload`

### Frontend
See `aila_frontend/README.md` for frontend setup instructions.

1. `cd aila_frontend`
2. `npm install`
3. `npm run dev`

## Development Notes

- All API endpoints are scoped under `/api/` for easy consumption.
- Uses local SQLite for quick prototyping; easily upgradable to Postgres.
- Environment variables (API keys, etc.) must be set in `.env`.

---

**Faculty:** Prof. Yuan An, CCI, Drexel University  
**Student:** Ruhma Hashmi, CCI, Drexel University  
**Summer 2025 STAR Research Project**
