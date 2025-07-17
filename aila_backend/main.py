from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import fitz  # PyMuPDF
from pptx import Presentation
import sqlite3
import uuid
import json
import hashlib

# --- Database utility (SQLite) ---
def get_db():
    db = sqlite3.connect("ailastar.db")
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    cur = db.cursor()
    # Users table for authentication and role
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )""")
    # Lecture processing jobs
    cur.execute("""
    CREATE TABLE IF NOT EXISTS lecture_processing (
        id TEXT PRIMARY KEY,
        course_id TEXT,
        file_name TEXT,
        status TEXT,
        progress INTEGER,
        result TEXT,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    # Courses for basic course management
    cur.execute("""
    CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        instructor_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    # Profiles table (role lookup, optional)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )""")
    # Enrollments for students
    cur.execute("""
    CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        student_id TEXT,
        course_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    db.commit()
    db.close()

init_db()

# --- FastAPI setup ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Endpoints ---

@app.post("/api/auth/signup")
async def signup(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    if not email or not password or not role:
        return JSONResponse({"error": "Missing email, password, or role."}, status_code=400)
    hashed_pw = hashlib.sha256(password.encode()).hexdigest()
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cur.fetchone():
            db.close()
            return JSONResponse({"error": "Email already registered."}, status_code=409)
        user_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)",
            (user_id, email, hashed_pw, role))
        # Profile table (optional, for role lookup)
        cur.execute(
            "INSERT INTO profiles (id, user_id, role) VALUES (?, ?, ?)",
            (str(uuid.uuid4()), user_id, role))
        db.commit()
        db.close()
        return JSONResponse({"message": "Sign-up successful"}, status_code=201)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/auth/login")
async def login(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return JSONResponse({"error": "Email and password required."}, status_code=400)
    hashed_pw = hashlib.sha256(password.encode()).hexdigest()
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, role FROM users WHERE email = ? AND password = ?", (email, hashed_pw))
    user = cur.fetchone()
    db.close()
    if not user:
        return JSONResponse({"error": "Invalid email or password."}, status_code=401)
    # Return both id and role (for frontend dashboard routing)
    return JSONResponse({"id": user["id"], "role": user["role"]}, status_code=200)

@app.get("/api/auth/user")
async def get_current_user():
    # This is a dummy endpoint for now—always returns no user
    # In a real app, use session/cookies to check authentication
    return {"user": None}

# --- Profiles endpoint (for role lookup) ---
@app.get("/api/profiles/{user_id}")
async def profiles(user_id: str):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT role FROM profiles WHERE user_id = ?", (user_id,))
    data = cur.fetchone()
    db.close()
    if data:
        return {"role": data["role"]}
    return {}

# --- Course management ---

@app.get("/api/courses")
async def get_courses(instructor_id: str = None):
    db = get_db()
    cur = db.cursor()
    if instructor_id:
        cur.execute("SELECT * FROM courses WHERE instructor_id = ?", (instructor_id,))
    else:
        cur.execute("SELECT * FROM courses")
    courses = [dict(row) for row in cur.fetchall()]
    db.close()
    return courses

@app.post("/api/courses")
async def create_course(request: Request):
    data = await request.json()
    name = data.get("name")
    instructor_id = data.get("instructor_id")
    if not name or not instructor_id:
        return JSONResponse({"error": "Name and instructor_id required."}, status_code=400)
    db = get_db()
    cur = db.cursor()
    course_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO courses (id, name, instructor_id) VALUES (?, ?, ?)",
        (course_id, name, instructor_id),
    )
    db.commit()
    db.close()
    return {"id": course_id, "name": name, "instructor_id": instructor_id}

# --- Enrollment endpoints ---

@app.get("/api/enrollments")
async def get_enrollments(student_id: str = None):
    db = get_db()
    cur = db.cursor()
    if student_id:
        cur.execute("SELECT * FROM enrollments WHERE student_id = ?", (student_id,))
    else:
        cur.execute("SELECT * FROM enrollments")
    enrollments = [dict(row) for row in cur.fetchall()]
    db.close()
    return enrollments

@app.post("/api/enrollments")
async def enroll(request: Request):
    data = await request.json()
    student_id = data.get("student_id")
    course_id = data.get("course_id")
    if not student_id or not course_id:
        return JSONResponse({"error": "student_id and course_id required."}, status_code=400)
    db = get_db()
    cur = db.cursor()
    enrollment_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)",
        (enrollment_id, student_id, course_id)
    )
    db.commit()
    db.close()
    return {"id": enrollment_id, "student_id": student_id, "course_id": course_id}

# --- File/Text Extraction and Processing  ---

def extract_text_segments(pdf_path):
    doc = fitz.open(pdf_path)
    segments = []
    for page in doc:
        text = page.get_text(sort=True)
        if text.strip():
            segments.append(text)
    return segments

def extract_text_from_pptx(pptx_path):
    prs = Presentation(pptx_path)
    segments = []
    for slide in prs.slides:
        slide_text = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                slide_text.append(shape.text)
        if slide_text:
            segments.append("\n".join(slide_text))
    return segments

def store_job_update(job_id, fields: dict):
    db = get_db()
    cur = db.cursor()
    sets = ", ".join([f"{k} = ?" for k in fields.keys()])
    values = list(fields.values())
    cur.execute(f"UPDATE lecture_processing SET {sets} WHERE id = ?", values + [job_id])
    db.commit()
    db.close()

def store_job_result(job_id, result, status="done"):
    store_job_update(job_id, {"progress": 100, "status": status, "result": json.dumps(result)})

def parse_and_store(job_id, course_id, file_name):
    local_path = f"uploads/{course_id}_{file_name}"
    os.makedirs("uploads", exist_ok=True)
    try:
        store_job_update(job_id, {"progress": 10})
        if file_name.lower().endswith('.pdf'):
            segments = extract_text_segments(local_path)
        elif file_name.lower().endswith('.pptx'):
            segments = extract_text_from_pptx(local_path)
        else:
            raise Exception("Unsupported file type")
        store_job_update(job_id, {"progress": 30})
        summaries = []
        total_segments = len(segments)
        for idx, segment in enumerate(segments):
            
            try:
                from llama_index.llms.gemini import Gemini
                llm = Gemini(model="models/gemini-2.5-flash")
                resp = llm.complete(f"Summarize this lecture segment:\n{segment}")
                summaries.append(str(resp))
            except Exception:
                summaries.append("")
            progress = 30 + 70 * (idx + 1) / total_segments if total_segments else 100
            store_job_update(job_id, {"progress": progress})
        result = {"segments": segments, "summaries": summaries}
        store_job_result(job_id, result)
    except Exception as e:
        store_job_update(job_id, {"status": "error", "error": str(e), "progress": 100})

class ProcessLectureRequest(BaseModel):
    file_name: str
    course_id: str

@app.post("/process-lecture/")
async def process_lecture(request: ProcessLectureRequest, background_tasks: BackgroundTasks):
    course_id = request.course_id
    file_name = request.file_name
    job_id = str(uuid.uuid4())
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        INSERT INTO lecture_processing (id, course_id, file_name, status, progress)
        VALUES (?, ?, ?, ?, ?)
        """, (job_id, course_id, file_name, "pending", 0)
    )
    db.commit()
    db.close()
    background_tasks.add_task(parse_and_store, job_id, course_id, file_name)
    return {"status": "processing started", "job_id": job_id}

@app.get("/lecture-status/")
async def lecture_status(course_id: str, file_name: str):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT * FROM lecture_processing
        WHERE course_id = ? AND file_name = ?
        ORDER BY created_at DESC
        LIMIT 1
        """, (course_id, file_name)
    )
    row = cur.fetchone()
    db.close()
    if not row:
        return {"status": "not found"}
    result = row["result"]
    if result and isinstance(result, str):
        try:
            result = json.loads(result)
        except Exception:
            pass
    return {
        "status": row["status"],
        "progress": row["progress"],
        "result": result,
        "error": row["error"],
    }

@app.get("/lecture-history/")
async def lecture_history(course_id: str):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT * FROM lecture_processing
        WHERE course_id = ?
        ORDER BY created_at DESC
        """, (course_id,)
    )
    jobs = [dict(row) for row in cur.fetchall()]
    db.close()
    return jobs if jobs else []

@app.get("/")
async def root():
    return {"message": "AILA Backend is running"}
