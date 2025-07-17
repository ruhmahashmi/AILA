# AILA Backend
This is the backend for the AILA STAR research project at Drexel University, Summer 2025.

## Overview
This is the FastAPI backend for the AILA Intelligent Lecturing Assistant research project.  
It provides endpoints for user/auth management, lecture upload and processing, AI-powered slide segmentation, and MCQ generation.
---

## Features
- User signup & login (SQLite, hashed passwords)
- Course and enrollment management
- Lecture material upload and segment parsing (PDF/PPTX)
- Per-segment slide viewing
- Teaching Assistant MCQ generation with LLM (Gemini/RAG)
- Progress polling and job history endpoints  
- CORS enabled for frontend integration

---

## Getting Started

1. **Clone the repo** and `cd backend` (or aila_backend)
2. Create a `.env` file with any needed secrets (Google API key, etc)
3. Install dependencies: pip install -r requirements.txt
4. Run the backend server: uvicorn main:app --reload
5. The backend will auto-create its SQLite database (`ailastar.db`) on first run.

## Development Notes
- Frontend communicates via endpoints like `/api/auth/signup`, `/api/courses`, `/api/segments`, etc.
- Requires Python ≥ 3.9.

## Folder Structure

aila_backend/
├── main.py
├── .env
├── requirements.txt
└── ...

