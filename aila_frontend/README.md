# AILA STAR – AI-powered Intelligent Lecturing Assistant

This is the frontend for the AILA STAR research project at Drexel University, Summer 2025.

# AILA Frontend

This is the Next.js/React frontend for the AILA project. It provides role-based dashboards (instructor/student), course management, lecture upload interfaces, and AI/MCQ tools.

## Features

- **Role-based authentication:** Instructors and students can sign up and log in.
- **Dashboards:** Separate dashboards for instructors and students.
- **Course management:** Instructors can create courses; students can enroll.
- **Dynamic course pages:** Each course has its own page for both roles.
- **Instructor:** Create courses, upload and review lecture slides, generate MCQs.
- **Student:** Enroll in courses, view materials, answer retrieval practice questions.
- **Modern UI:** Built with Next.js App Router and Tailwind CSS.

## Setup
1. **Clone the repo** and `cd frontend` (or aila_frontend)
2. Install dependencies: npm install
3. Start the development server: npm run dev
4. Frontend runs by default on `localhost:3000`.

## Structure
aila_frontend/
├── app/
│ ├── login/
│ ├── signup/
│ ├── instructor/
│ └── student/
├── components/
├── lib/
├── styles/
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md

## Environment
- The backend must be running on `http://localhost:8000` or set in environment configuration.
- Update API endpoint URLs as needed for deployment.

---

**Research Project:** Prof. Yuan An, Ruhma Hashmi, Drexel University, Summer 2025
