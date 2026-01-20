# AILA Frontend

This is the Next.js/React frontend for the AILA STAR project at Drexel University (Summer 2025).  
It provides role‑based dashboards (instructor/student), course management, lecture upload interfaces, and AI/MCQ tools on top of a knowledge graph for each course/week.

## Features

- **Role‑based authentication**
  - Instructors and students can sign up and log in.
  - Simple role checks in the UI route users to the correct dashboard.

- **Dashboards**
  - Instructor dashboard: courses, weeks, lecture uploads, concept map, MCQs and quizzes.
  - Student dashboard: enrolled courses, retrieval‑practice questions, quiz attempts.

- **Course & week pages**
  - Instructors can create courses and view a per‑week page for each course.
  - Each week supports lecture upload, processing status, and a knowledge graph view.

- **Concept‑map‑first instructor week view**
  - Large concept map as the visual “hero” for each week.
  - Shows only core concepts initially (roots / high‑importance nodes).
  - Clicking a concept expands related sub‑concepts around it.
  - Radial layout for visible concepts for clearer structure and less clutter.
  - Concept details card below the map:
    - Slide numbers
    - LLM‑generated summary
    - Combined slide content (collapsible)
    - Buttons for raw and KG‑aware MCQ generation.

- **Quiz tools**
  - Create quizzes from selected concepts.
  - View existing quizzes per course/week.
  - Basic quiz analytics (attempt counts, performance summary).

- **Modern UI**
  - Next.js App Router (TypeScript‑ready).
  - Tailwind CSS for styling.
  - Responsive layout with clear separation between week selector, uploads, and concept/quiz tools.

## Setup

1. **Clone the repo** and move into the frontend:
git clone https://github.com/ruhmahashmi/aila-star.git
cd aila-star/aila_frontend # adjust if your folder name differs
2. Install dependencies: npm install
3. **Configure environment (optional for dev)**:
- By default, the frontend expects the backend at `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`.
- For deployment, configure your API base URL via environment variables or a config file.
4. Start the development server: npm run dev
5. Open `http://localhost:3000` in your browser.

## Structure
aila_frontend/
├── app/
│ ├── login/
│ ├── signup/
│ ├── instructor/
│ │ └── [courseId]/week/[weekNumber]/ # week view with concept map + details + quizzes
│ └── student/
├── components/
│ ├── ConceptGraph.tsx / .js # expandable concept map
│ ├── SlideViewer.tsx / .js # concept summary + content + MCQ tools
│ ├── QuizCreator.tsx / .js
│ └── ...
├── lib/
├── styles/
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md


## Environment

- The backend must be running on `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'` (or the URL configured in your code).
- CORS must allow the frontend origin (see backend README).

---

**Research Project:** Prof. Yuan An & Ruhma Hashmi, Drexel University, Summer 2025
