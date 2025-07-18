from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, Integer, String, DateTime, create_engine, ForeignKey, Text, JSON, text as sql_text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel
from pptx import Presentation
import fitz  # PyMuPDF
import hashlib
import uuid
import os
import shutil
import json
import google.generativeai as genai

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MYSQL_USER = os.environ.get("MYSQL_USER", "ailastaruser")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "yourpassword")
MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
MYSQL_DB = os.environ.get("MYSQL_DB", "ailastar")
DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# ====== MODELS ======
class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)

class Course(Base):
    __tablename__ = "courses"
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    instructor_id = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    instructor = relationship("User")

class LectureUpload(Base):
    __tablename__ = "lecture_uploads"
    id = Column(String(36), primary_key=True, index=True)
    course_id = Column(String(36), ForeignKey("courses.id"))
    week = Column(Integer, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(255), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="uploaded")
    error = Column(Text, nullable=True)

class LectureProcessing(Base):
    __tablename__ = "lecture_processing"
    id = Column(String(36), primary_key=True, index=True)
    course_id = Column(String(36), nullable=False)
    week = Column(Integer, nullable=False)
    file_name = Column(String(255), nullable=False)
    status = Column(String(32), default="pending")
    progress = Column(Integer, default=0)  # percent
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Segment(Base):
    __tablename__ = "segments"
    id = Column(String(36), primary_key=True, index=True)
    upload_id = Column(String(36), ForeignKey("lecture_uploads.id"))
    course_id = Column(String(36), ForeignKey("courses.id"))
    week = Column(Integer, nullable=False)
    segment_index = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    keywords = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)

class MCQ(Base):
    __tablename__ = "mcqs"
    id = Column(String(36), primary_key=True, index=True)
    segment_id = Column(String(36), ForeignKey("segments.id"))
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    answer = Column(Text, nullable=True)

class MCQPayload(BaseModel):
    segment_id: str
    content: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

def process_lecture_and_kg(filepath, upload_id, course_id, week, file_name, processing_id):
    from llama_index.llms.gemini import Gemini
    db = SessionLocal()
    try:
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "processing", "progress": 0, "error_message": None
        })
        db.commit()
        segments = []
        ext = os.path.splitext(filepath)[-1].lower()
        if ext == ".pdf":
            doc = fitz.open(filepath)
            for i, page in enumerate(doc):
                text = page.get_text(sort=True)
                if text.strip():
                    segments.append({"slide_num": i+1, "text": text})
        elif ext == ".pptx":
            prs = Presentation(filepath)
            for i, slide in enumerate(prs.slides):
                lines = []
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        lines.append(shape.text)
                content = "\n".join(lines)
                if content.strip():
                    segments.append({"slide_num": i+1, "text": content})
        else:
            db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
                "status": "error",
                "error_message": f"Unsupported file type: {filepath}"
            })
            db.commit()
            db.close()
            return

        total_steps = len(segments)
        if total_steps == 0:
            db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
                "status": "error",
                "progress": 0,
                "error_message": f"No valid slides found in file: {file_name}"
            })
            db.commit()
            db.close()
            return

        llm = Gemini(model="models/gemini-2.5-flash")
        kg_nodes, kg_edges = [], []

        for idx, seg in enumerate(segments):
            try:
                text = seg["text"]
                title = text.split('\n', 1)[0].strip() if text.strip() else f"Slide {seg['slide_num']}"
                # LLM summary
                try:
                    summary = str(llm.complete(f"Summarize this lecture segment in 2 sentences:\n{text[:2000]}"))
                except Exception as e:
                    summary = ""
                # Gemini keyword prompt (explicit & project-specific)
                try:
                    keyword_prompt = (
                        "Given the following lecture slide/text, extract ONLY 4-5 of the most important, "
                        "distinct technical keywords or key concepts that are specifically present in the text. "
                        "Respond ONLY as a comma-separated list.\n"
                        f"Text:\n{text[:1500]}"
                    )
                    raw_keywords = str(llm.complete(keyword_prompt))
                    keywords = [k.strip() for k in raw_keywords.split(",") if k.strip()]
                except Exception as e:
                    keywords = []

                # LLM KG extraction, robust Markdown fencing and JSON cleaning
                try:
                    kg_response = llm.complete(
                        f"From this segment, extract key scientific concepts/entities and main direct relationships. "
                        f"Respond as valid JSON with: nodes: [{{id, label}}], edges: [{{source, target, relation}}].\n{text[:1500]}"
                    )
                    kg_text = str(getattr(kg_response, "text", kg_response)).strip()
                    if kg_text.startswith("```json"):
                        kg_text = kg_text[len("```json"):].lstrip()
                    if kg_text.startswith("```"):
                        kg_text = kg_text[len("```"):].lstrip()
                    if kg_text.endswith("```"):
                        kg_text = kg_text[:-3].rstrip()
                    lines = kg_text.splitlines()
                    while lines and not lines.strip().startswith("{"):
                        lines.pop(0)
                    while lines and not lines[-1].strip().endswith("}"):
                        lines.pop()
                    kg_text = "\n".join(lines)
                    try:
                        kg = json.loads(kg_text)
                    except Exception:
                        kg = {"nodes": [], "edges": []}
                    kg_nodes.extend(kg.get("nodes", []))
                    kg_edges.extend(kg.get("edges", []))
                except Exception as e:
                    pass

                # Save segment to DB
                seg_db = Segment(
                    id=str(uuid.uuid4()), upload_id=upload_id, course_id=course_id, week=week,
                    segment_index=idx, title=title, content=text,
                    keywords=",".join(keywords),
                    summary=summary,
                )
                db.add(seg_db)
                percent = int(((idx + 1) / total_steps) * 100)
                db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
                    "progress": percent,
                    "status": "processing"
                })
                db.commit()

            except Exception as e:
                db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
                    "status": "error",
                    "progress": int(((idx + 1) / total_steps) * 100),
                    "error_message": f"Slide {idx+1} failed: {e}"
                })
                db.commit()
                db.close()
                return

        db.commit()
        # Save KG to DB
        try:
            unique_nodes = {n['id']: n for n in kg_nodes if 'id' in n}.values() if kg_nodes else []
            unique_edges = [
                dict(t) for t in {tuple(sorted(e.items())) for e in kg_edges if isinstance(e, dict)}
            ] if kg_edges else []
            db.execute(
                sql_text("INSERT INTO knowledge_graph "
                         "(id, course_id, week, node_data, edge_data) VALUES "
                         "(:id, :course_id, :week, :node_data, :edge_data)"),
                {
                    "id": str(uuid.uuid4()),
                    "course_id": course_id,
                    "week": week,
                    "node_data": json.dumps(list(unique_nodes)),
                    "edge_data": json.dumps(list(unique_edges)),
                }
            )
            db.commit()
        except Exception as ex:
            db.rollback()
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "done",
            "progress": 100,
            "error_message": None
        })
        db.commit()
    except Exception as e:
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "error",
            "progress": 0,
            "error_message": f"Fatal: {str(e)}"
        })
        db.commit()
    finally:
        db.close()

# ==== LECTURE UPLOAD, PROCESSING, AND STATUS ====

@app.post("/api/upload-lecture/")
async def upload_lecture(
    background_tasks: BackgroundTasks,
    course_id: str = Form(...),
    week: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    os.makedirs("uploads", exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename.replace(' ', '_')}"
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    upload_id = str(uuid.uuid4())
    processing_id = str(uuid.uuid4())
    # LectureUpload record for tracking upload
    new_upload = LectureUpload(
        id=upload_id, course_id=course_id, week=week, file_name=file.filename,
        file_url=filepath, status="uploaded"
    )
    db.add(new_upload)
    job = LectureProcessing(
        id=processing_id, course_id=course_id, week=week, file_name=file.filename, status="pending", progress=0
    )
    db.add(job)
    db.commit()
    db.refresh(new_upload)
    db.refresh(job)
    background_tasks.add_task(process_lecture_and_kg, filepath, upload_id, course_id, week, file.filename, processing_id)
    return {"upload_id": upload_id, "processing_id": processing_id, "status": "processing started"}

@app.get("/api/lecture-status/")
async def lecture_status(processing_id: str, db: Session = Depends(get_db)):
    job = db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "status": job.status,
        "progress": job.progress,
        "error": job.error_message,
        "file_name": job.file_name
    }

@app.get("/api/lecture-history/")
async def lecture_history(course_id: str, db: Session = Depends(get_db)):
    jobs = db.query(LectureProcessing).filter(LectureProcessing.course_id == course_id).all()
    return [{
        "id": j.id, "week": j.week, "file_name": j.file_name,
        "status": j.status, "progress": j.progress, "error": j.error_message
    } for j in jobs]

@app.get("/api/segments/")
async def get_segments(course_id: str, week: int, db: Session = Depends(get_db)):
    segs = db.query(Segment).filter_by(course_id=course_id, week=week).order_by(Segment.segment_index).all()
    return [
        {"id": s.id, "segment_index": s.segment_index, "title": s.title, "keywords": s.keywords}
        for s in segs
    ]

@app.get("/api/segment/{segment_id}")
async def get_segment_detail(segment_id: str, db: Session = Depends(get_db)):
    s = db.query(Segment).filter_by(id=segment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {
        "id": s.id,
        "title": s.title,
        "content": s.content,
        "summary": s.summary,
        "keywords": s.keywords
    }

@app.get("/api/knowledge-graph/")
async def get_kg(course_id: str, week: int, db: Session = Depends(get_db)):
    row = db.execute(
        "SELECT node_data, edge_data FROM knowledge_graph WHERE course_id=%s AND week=%s",
        (course_id, week)
    ).fetchone()
    if row:
        return {"nodes": json.loads(row[0]), "edges": json.loads(row[1])}
    else:
        return {"nodes": [], "edges": []}

# ==== RETRIEVAL PRACTICE: MCQ GENERATION (basic stub) ====
@app.post("/api/generate-mcqs/")
async def generate_mcqs(segment_id: str = Form(...), db: Session = Depends(get_db)):
    # Placeholder: implement with your Gemini LLM function or similar
    return {"mcqs": [
        {"question": "What is an example MCQ?", "options": ["A", "B", "C", "D"], "answer": "A"}
    ]}

@app.get("/api/mcqs/")
async def get_mcqs(segment_id: str, db: Session = Depends(get_db)):
    # Return MCQs for the segment
    mcqs = db.query(MCQ).filter_by(segment_id=segment_id).all()
    return [
        {"question": m.question, "options": m.options, "answer": m.answer}
        for m in mcqs
    ]

@app.post("/api/auth/signup")
async def signup(email: str = Form(...), password: str = Form(...), role: str = Form(...), db: Session = Depends(get_db)):
    # Check if already exists
    user = db.query(User).filter(User.email == email).first()
    if user:
        raise HTTPException(status_code=409, detail="Email already registered")
    hashed_pw = hashlib.sha256(password.encode()).hexdigest()
    new_user = User(id=str(uuid.uuid4()), email=email, password=hashed_pw, role=role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email, "role": new_user.role}

@app.post("/api/auth/login")
async def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    hashed_pw = hashlib.sha256(password.encode()).hexdigest()
    user = db.query(User).filter(User.email == email, User.password == hashed_pw).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"id": user.id, "email": user.email, "role": user.role}

# ==== COURSE MANAGEMENT ====
@app.get("/api/courses")
async def get_courses(instructor_id: str = None, db: Session = Depends(get_db)):
    if instructor_id:
        courses = db.query(Course).filter(Course.instructor_id == instructor_id).all()
    else:
        courses = db.query(Course).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "instructor_id": c.instructor_id,
            "created_at": c.created_at.isoformat()
        }
        for c in courses
    ]

@app.post("/api/courses")
async def create_course(name: str = Form(...), instructor_id: str = Form(...), db: Session = Depends(get_db)):
    new_course = Course(id=str(uuid.uuid4()), name=name, instructor_id=instructor_id)
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return {
        "id": new_course.id,
        "name": new_course.name,
        "instructor_id": new_course.instructor_id,
        "created_at": new_course.created_at.isoformat()
    }

# ==== ENROLLMENT: Students enroll in courses ====
@app.post("/api/enroll")
async def enroll(course_id: str = Form(...), student_id: str = Form(...), db: Session = Depends(get_db)):
    # assumes Enrollment model exists with id, course_id, student_id
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.student_id == student_id
    ).first()
    if enrollment:
        raise HTTPException(status_code=409, detail="Already enrolled")
    new_enrollment = Enrollment(id=str(uuid.uuid4()), course_id=course_id, student_id=student_id)
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    return {"status": "enrolled", "enrollment_id": new_enrollment.id}

@app.get("/api/student-courses")
async def get_student_courses(student_id: str, db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    course_ids = [en.course_id for en in enrollments]
    courses = db.query(Course).filter(Course.id.in_(course_ids)).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "instructor_id": c.instructor_id,
            "created_at": c.created_at.isoformat()
        }
        for c in courses
    ]

# ==== MODULES & WEEKS (for week-based structure) ====
@app.get("/api/modules")
async def get_modules(course_id: str, db: Session = Depends(get_db)):
    # assumes Module model with id, name, course_id, week
    modules = db.query(Module).filter(Module.course_id == course_id).order_by(Module.week).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "week": m.week,
            "course_id": m.course_id
        }
        for m in modules
    ]

@app.post("/api/modules")
async def create_module(name: str = Form(...), course_id: str = Form(...), week: int = Form(...), db: Session = Depends(get_db)):
    # New teaching module for a given week in course
    mod = Module(id=str(uuid.uuid4()), name=name, course_id=course_id, week=week)
    db.add(mod)
    db.commit()
    db.refresh(mod)
    return {
        "id": mod.id,
        "name": mod.name,
        "week": mod.week,
        "course_id": mod.course_id
    }


@app.get("/")
async def root():
    return {"message": "AILA Backend (MySQL) is running"}
