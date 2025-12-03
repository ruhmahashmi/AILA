# AILA Backend

This is the FastAPI backend for the AILA STAR (AI‑powered Intelligent Lecturing Assistant) research project at Drexel University, Summer 2025.

It provides endpoints for user/auth management, lecture upload and processing, AI‑powered slide segmentation, knowledge‑graph construction, MCQ generation, and quiz management.

## Features

- **Auth & users**
  - User signup & login with hashed passwords (SQLite).
  - Role field for instructor vs student.

- **Courses & enrollments**
  - Create courses, enroll students.
  - Course/week organization to match the frontend’s week selector.

- **Lecture processing**
  - Upload PDF/PPTX lecture files.
  - Background processing pipeline:
    - Slide/text extraction.
    - Segment creation with cleaned titles and summaries.
    - Concept extraction per slide.
    - Knowledge‑graph (KG) node + edge generation for each course/week.
  - Progress polling and job history endpoints.

- **Knowledge graph**
  - Stores KG per `(courseId, week)` in `knowledgegraph` table.
  - Node data includes: `id`, `label`, `count`, `slidenums`, `summary`, `contents`, `level`, `isRoot`, etc.
  - Edge data encodes directed parent‑child relations between concepts.
  - Exposed via:

    - `GET /api/knowledge-graph?course_id={courseId}&week={week}`  
      → `{ "nodes": [...], "edges": [...] }` used by the frontend concept map.

- **MCQ & quiz endpoints**
  - `POST /api/generate-mcqs` – summary/content‑based MCQs for a concept.
  - `POST /api/generate-mcqs-kg` – KG‑aware MCQs that use relationships between concepts.
  - CRUD‑style quiz endpoints:
    - Create quizzes linked to a course/week and concept IDs.
    - Start/resume quiz attempts.
    - Submit MCQ answers and track correctness.
    - Aggregate quiz stats per quiz.

- **Integration**
  - CORS configured for local Next.js frontend.
  - All application endpoints scoped under `/api/`.

## Getting Started

1. **Clone the repo** and move into the backend:
git clone https://github.com/ruhmahashmi/aila-star.git
cd aila-star/aila_backend # adjust if your folder name differs 
2. **Create a `.env` file** with required secrets, e.g.:
GOOGLE_API_KEY=your_gemini_or_other_key
DATABASE_URL=sqlite:///ailastar.db
If `DATABASE_URL` is omitted, the app defaults to a local SQLite file.
3. Install dependencies: pip install -r requirements.txt
4. Run the backend server: uvicorn main:app --reload

5. Backend will listen on `http://localhost:8000` and auto‑create `ailastar.db` on first run.

## Development Notes

- Python ≥ 3.9 recommended.
- The processing pipeline is designed for experimentation; logging is enabled to trace lecture processing, KG construction, and MCQ generation.
- For production or larger experiments, swap SQLite for Postgres and configure a proper task queue for background jobs.

---

**Research Project:** Prof. Yuan An & Ruhma Hashmi, Drexel University, Summer 2025
