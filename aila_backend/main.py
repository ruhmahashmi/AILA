from dotenv import load_dotenv
load_dotenv()
import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Body
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, create_engine, ForeignKey, Text, JSON, text as sql_text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from sqlalchemy import Boolean, ARRAY
from sqlalchemy import text as sql_text
from pydantic import BaseModel
from pptx import Presentation
from typing import List
from collections import defaultdict
import asyncio
import fitz  # PyMuPDF
import hashlib
import uuid
import shutil
import json
import re
import logging
import google.generativeai as genai
from collections import deque

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])




DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///ailastar.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

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

class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(String(36), primary_key=True, index=True)
    course_id = Column(String(36), ForeignKey("courses.id"))
    student_id = Column(String(36), ForeignKey("users.id"))
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

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

class MCQReqModel(BaseModel):
    course_id: str
    week: int
    concept_id: str
    summary: str = ""
    contents: str = ""

class MCQPayload(BaseModel):
    segment_id: str
    content: str

class KnowledgeGraph(Base):
    __tablename__ = "knowledge_graph"
    id = Column(String(36), primary_key=True, index=True)
    course_id = Column(String(36), nullable=False)
    week = Column(Integer, nullable=False)
    node_data = Column(Text, nullable=False)
    edge_data = Column(Text, nullable=False)

class MCQConceptModel(BaseModel):
    course_id: str
    week: int
    concept_id: str
    summary: str = ""
    contents: str = ""

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id"))
    week = Column(Integer, nullable=False)
    concept_ids = Column(JSON, nullable=False)  # List of KG node IDs or segment IDs
    instructor_id = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(String(36), primary_key=True, index=True)
    quiz_id = Column(String, ForeignKey('quizzes.id'))
    student_id = Column(String(36), ForeignKey("users.id"))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), onupdate=func.now())
    responses = Column(JSON, default=dict)  # {mcq_id: {"answer": ..., "correct": ...}}

class MCQResponse(Base):
    __tablename__ = "mcq_responses"
    id = Column(String(36), primary_key=True, index=True)
    attempt_id = Column(String(36), ForeignKey("quiz_attempts.id"))
    mcq_id = Column(String(36), ForeignKey("mcqs.id"))
    question = Column(Text, nullable=False)
    selected = Column(String(255), nullable=True)
    correct = Column(Boolean, default=False)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

class MethodFilter(logging.Filter):
    def filter(self, record):
        if record.args and len(record.args) >= 4:
            method = record.args[1]  # GET, POST, etc.
            status = str(record.args[3])  # status code
            # Show POST/PUT/DELETE/PATCH + any errors (4xx/5xx)
            if method in ("POST", "PUT", "DELETE", "PATCH"):
                return True
            if status.startswith(("4", "5")):
                return True
            return False
        return False

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Attach filter to Uvicorn access logger so only key lines show
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.addFilter(MethodFilter())


# Add WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Connection might be closed
                pass

manager = ConnectionManager()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

KEYWORD_BLACKLIST = set([
    'slide','slides','page','pages','chapter','section',
    'introduction','summary','conclusion','example','diagram',
    'content','topic','concept','question','answer', '',
    'ppt','presentation'
])

def is_good_keyword(word):
    word = word.strip().lower()
    if not word or len(word) < 2:
        return False
    if re.fullmatch(r'[\d\W]+', word):  # only numbers or punctuation
        return False
    BLACKLIST = set(['slide', 'slides', 'page', 'pages', 'chapter', 'section', 'untitled'])
    BLACKLIST.update(KEYWORD_BLACKLIST)  # Merge for stricter check
    if word in BLACKLIST:
        return False
    if len(word.split()) > 4:  
        return False
    if len(word) > 30:  
        return False
    return True


def clean_title(title):
    if not title or not title.strip():
        return None
    title = title.strip()
    title = re.sub(r'^(slide|page|chapter|section)[\s\-_]*\d*[:.\s-]*', '', title, flags=re.I)
    title = re.sub(r'[\s\-_]*(slide|page|chapter|section)[\s\-_]*\d*\s*$', '', title, flags=re.I)
    title_clean = title.strip()
    if not title_clean or title_clean.lower() in KEYWORD_BLACKLIST:
        return None
    if len(title_clean) < 3 or re.fullmatch(r'\d+', title_clean):
        return None
    title_clean = re.sub(r'^[-:\s]+', '', title_clean)
    return title_clean.strip() or None

def normalize_id(text):
    """Make sure every concept has the EXACT same ID everywhere"""
    return re.sub(r'\W+', '_', text.strip().lower()).strip('_')

def process_lecture_and_kg(filepath, upload_id, course_id, week, file_name, processing_id):
    from llama_index.llms.gemini import Gemini
    import json
    import uuid
    import os
    import fitz
    from pptx import Presentation
    from collections import defaultdict
    import re

    db = SessionLocal()
    llm = Gemini(model="models/gemini-2.5-flash")  

    try:
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "processing", "progress": 0, "error_message": None
        })
        db.commit()

        # ---------- 1. Extract segments ----------
        segments = []
        ext = os.path.splitext(filepath)[-1].lower()
        if ext == ".pdf":
            doc = fitz.open(filepath)
            for i, page in enumerate(doc):
                text = page.get_text(sort=True)
                if text.strip():
                    segments.append({"slide_num": i + 1, "text": text})
        elif ext == ".pptx":
            prs = Presentation(filepath)
            for i, slide in enumerate(prs.slides):
                lines = [shape.text for shape in slide.shapes if hasattr(shape, "text")]
                content = "\n".join(lines)
                if content.strip():
                    segments.append({"slide_num": i + 1, "text": content})

        if not segments:
            raise ValueError("No readable slides found")

        total_steps = len(segments)
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({"progress": 10})
        db.commit()

        # ---------- 2. Extract concepts per slide ----------
        concept_info = defaultdict(lambda: {
            "slide_indices": [], "slide_nums": [], "summaries": [], "contents": []
        })

        for idx, seg in enumerate(segments):
            text = seg["text"]
            try:
                prompt = (
                    "Extract 5–20 important, specific technical concepts/terms from this lecture slide. "
                    "Each concept should be 1–5 words. Avoid generic terms like 'example', 'diagram', 'summary'. "
                    "Focus on core topics the instructor is teaching.\n\n"
                    f"Slide {seg['slide_num']}:\n{text[:1500]}"
                )
                raw = str(llm.complete(prompt))
                print(f"[LLM RAW CONCEPTS] Slide {idx}: {raw}")

                candidates = [
                    clean_title(re.sub(r'^[\*\-\d\.\)]+\s*', '', line).strip())
                    for line in raw.splitlines() if line.strip()
                ]
                concepts = [c for c in candidates if c and is_good_keyword(c) and len(c.split()) <= 5]

                if not concepts and text.strip():
                    fallback = clean_title(text.split("\n", 1)[0])
                    if fallback and is_good_keyword(fallback):
                        concepts = [fallback]

            except Exception as e:
                print(f"[Concept extraction error] {e}")
                concepts = ["Unknown Concept"]

            for concept in concepts:
                info = concept_info[concept]
                info["slide_indices"].append(idx)
                info["slide_nums"].append(seg.get("slide_num"))
                info["contents"].append(text[:1000])
                try:
                    sum_prompt = f"In 1–2 sentences, explain '{concept}' as taught in this slide:\n{text[:1000]}"
                    summary = str(llm.complete(sum_prompt)).strip()
                    info["summaries"].append(summary)
                except:
                    info["summaries"].append("")

            main_concept = concepts[0] if concepts else f"Slide {seg['slide_num']}"
            seg_db = Segment(
                id=str(uuid.uuid4()),
                upload_id=upload_id,
                course_id=course_id,
                week=week,
                segment_index=idx,
                title=main_concept,
                content=text,
                keywords=", ".join(concepts),
                summary=" | ".join(set(info["summaries"][-3:])) if info["summaries"] else ""
            )
            db.add(seg_db)

            percent = 10 + int((idx + 1) / total_steps * 70)
            db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({"progress": percent})
            db.commit()

        # ---------- 3. Build clean node list ----------
        kg_nodes = []
        for concept, info in concept_info.items():
            kg_nodes.append({
                "id": normalize_id(concept),
                "label": concept,
                "count": len(info["slide_indices"]),
                "slide_nums": sorted(set(info["slide_nums"])),
                "summary": " ".join(set(info["summaries"]))[:1000],
                "contents": ""
            })

        print(f"[DEDUP KG] Final unique concepts: {len(kg_nodes)}")

        # ---------- 4. Generate CORRECT hierarchical edges (PARENT → CHILD) ----------
        print("[GENERATING HIERARCHY] Asking Gemini for correct top-down hierarchy...")
        concept_list = "\n".join([
            f"- {n['label']} (mentioned {n['count']} times, slides {n['slide_nums']})"
            for n in sorted(kg_nodes, key=lambda x: -x['count'])[:80]
        ])

        hierarchy_prompt = f"""
You are an expert computer science professor building a knowledge graph for students.

Here are the concepts extracted from the lecture:

{concept_list}

Create a clean, top-down hierarchy where:
- General concepts are parents
- Specific concepts are children
- Direction is always PARENT → CHILD (e.g., "Queue" → "Priority Queue", not the reverse)
- Use realistic relations like: "includes", "has type", "uses", "implemented with", "has operation"

Return ONLY valid JSON in this exact format:
{{
  "edges": [
    {{"source": "Data Structure", "target": "Queue", "relation": "includes"}},
    {{"source": "Queue", "target": "Priority Queue", "relation": "has type"}},
    {{"source": "Priority Queue", "target": "Heap", "relation": "implemented with"}}
  ]
}}

Rules:
- source = parent (more general)
- target = child (more specific)
- Only use concepts from the list above
- No cycles
- Prefer depth over width
- Maximum 50 edges

Return only the JSON.
"""

        try:
            response = str(llm.complete(hierarchy_prompt))
            print(f"[GEMINI HIERARCHY RAW]: {response}")

            # Clean JSON from Gemini response
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            json_str = json_str.strip()

            hierarchy_json = json.loads(json_str)
            gemini_edges = hierarchy_json.get("edges", [])

            # FINAL EDGES: Clean and normalize
            new_edges = []
            seen = set()
            for e in gemini_edges:
                src = str(e.get("source", "")).strip()
                tgt = str(e.get("target", "")).strip()
                rel = str(e.get("relation", "related to")).strip()

                if not src or not tgt or src == tgt:
                    continue

                src_id = src.replace(" ", "_")[:50]
                tgt_id = tgt.replace(" ", "_")[:50]

                edge_key = (src_id, tgt_id)
                if edge_key in seen:
                    continue
                seen.add(edge_key)

                new_edges.append({
                    "source": normalize_id(e["source"]),
                    "target": normalize_id(e["target"]),
                    "relation": rel
                })

            print(f"[HIERARCHY EDGES] Generated {len(new_edges)} correct parent→child edges")

        except Exception as e:
            print(f"[Hierarchy failed] {e}, using fallback")
            new_edges = []  # or your old co-occurrence method

        # ---------- 5. Save KG with CORRECT DIRECTION ----------
        all_nodes = kg_nodes                     #  list of concept dicts
        all_edges = new_edges                     # parent → child edges from Gemini

        all_nodes = compute_levels(all_nodes, all_edges)

        # Optional: give roots a much higher visual weight
        for node in all_nodes:
            if node.get("isRoot"):
                node["count"] = (node.get("count", 0) or 0) + 20

        existing = db.execute(
            sql_text("SELECT node_data, edge_data, id FROM knowledge_graph WHERE course_id=:c AND week=:w"),
            {"c": course_id, "w": week}
        ).fetchone()

        if existing:
            existing_nodes = json.loads(existing[0]) if existing[0] else []
            existing_edges = json.loads(existing[1]) if existing[1] else []
            seen = {(e["source"], e["target"]) for e in existing_edges}
            all_edges = existing_edges + [e for e in all_edges if (e["source"], e["target"]) not in seen]
            kg_id = existing[2]
            db.execute(
                sql_text("UPDATE knowledge_graph SET node_data=:n, edge_data=:e WHERE id=:id"),
                {"n": json.dumps(all_nodes), "e": json.dumps(all_edges), "id": kg_id}
            )
        else:
            kg_id = str(uuid.uuid4())
            db.execute(
                sql_text("""
                    INSERT INTO knowledge_graph (id, course_id, week, node_data, edge_data)
                    VALUES (:id, :c, :w, :n, :e)
                """),
                {"id": kg_id, "c": course_id, "w": week, "n": json.dumps(all_nodes), "e": json.dumps(all_edges)}
            )

        db.commit()

        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "done", "progress": 100
        })
        db.commit()

        print(f"[PROCESSING COMPLETE] Course: {course_id}, Week: {week}")
        print(f"   → {len(all_nodes)} concepts, {len(all_edges)} CORRECT hierarchical relations saved")

    except Exception as e:
        print(f"[FATAL ERROR] {str(e)}")
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "error", "progress": 0, "error_message": str(e)[:500]
        })
        db.commit()
    finally:
        db.close()

def compute_levels(nodes, edges):
    node_map = {n["id"]: n for n in nodes}
    incoming = defaultdict(int)
    children = defaultdict(list)
    for e in edges:
        incoming[e["target"]] += 1
        children[e["source"]].append(e["target"])
    
    # Roots = nodes with no incoming edges
    roots = [nid for nid in node_map if incoming.get(nid, 0) == 0]
    
    level_map = {}
    queue = deque([(root, 0) for root in roots])
    
    while queue:
        node_id, level = queue.popleft()
        level_map[node_id] = level
        for child in children[node_id]:
            if child not in level_map:
                level_map[child] = level + 1
                queue.append((child, level + 1))
    
    # Assign level and isRoot to every node
    for node in nodes:
        node["level"] = level_map.get(node["id"], 0)
        node["isRoot"] = node["id"] in roots
    
    # Sort so most important nodes appear first
    return sorted(nodes, key=lambda x: (-x.get("count", 0), x.get("level", 0)))


def extract_mcqs_from_response(resp):
    """
    Handles LLM output: accepts string or list, safely strips code block fencing, parses JSON,
    and recovers MCQs robustly.
    """
    # 1. If resp is already parsed (list or dict), return MCQs
    if isinstance(resp, list):
        return resp
    if isinstance(resp, dict) and "mcqs" in resp:
        return resp["mcqs"]

    # 2. If resp is a string, clean it up
    if isinstance(resp, str):
        text = resp.strip()
        # Remove markdown code fence if present
        if text.startswith("```"):
            lines = text.splitlines()
            # Remove opening ```, possibly with 'json'
            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]
            # Remove closing ```
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        try:
            items = json.loads(text)
            if isinstance(items, dict) and "mcqs" in items:
                return items["mcqs"]
            if isinstance(items, list):
                return items
            return []
        except Exception as e:
            print("[MCQ PARSE ERROR]", e)
            return []
    print("[MCQ PARSE ERROR] Response is neither str nor list nor dict:", type(resp))
    return []



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
        "course_id": s.course_id,            # <-- add this
        "week": s.week,                      # <-- add this
        "segment_index": s.segment_index,    # <-- and this
        "title": s.title,
        "content": s.content,
        "summary": s.summary,
        "keywords": s.keywords
    }


@app.get("/api/knowledge-graph/")
async def get_kg(course_id: str, week: int, db: Session = Depends(get_db)):
    row = db.execute(
        sql_text("SELECT node_data, edge_data FROM knowledge_graph WHERE course_id=:course_id AND week=:week"),
        {"course_id": course_id, "week": week}
    ).fetchone()
    if row:
        return {"nodes": json.loads(row[0]), "edges": json.loads(row[1])}
    else:
        return {"nodes": [], "edges": []}

# ==== RETRIEVAL PRACTICE: MCQ GENERATION (basic stub) ====
@app.post("/api/generate-mcqs/")
async def generate_mcqs(payload: MCQConceptModel = Body(...)):
    # Compose a targeted LLM prompt
    prompt = (
        f"You are a teaching assistant. Create several relevant multiple-choice questions about the concept '{payload.concept_id}' "
        "based only on its context in the following lecture notes. Use the summary for focus and the detailed contents for depth. "
        "Make sure all questions focus specifically on this concept as covered in the summary/content below. "
        "The number of questions should depend on its importance and how much material is present. "
        "Make sure EACH QUESTION is accompanied by exactly 4 numbered options, and provide the correct answer as an 'answer' field (the text matching one of the options, not the letter/number). "
        "Respond ONLY as a JSON list in the format:"
        '[{"question": "...", "options": ["A", "B", "C", "D"], "answer": "..."}]\n'
        f"\nConcept summary:\n{payload.summary[:600]}"
        f"\n\nRelated contents (for MCQ details):\n{payload.contents[:1200]}"
    )
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(prompt)
        model_output = str(getattr(response, "text", getattr(response, "candidates", response)))
        mcqs = extract_mcqs_from_response(model_output)
        out = []
        for item in mcqs:
            if isinstance(item, dict) and all(k in item for k in ("question", "options", "answer")) and len(item["options"]) == 4:
                out.append(item)
        return {"mcqs": out if out else [{"question": f"No MCQs found for concept '{payload.concept_id}'.", "options": [], "answer": ""}]}
    except Exception as ex:
        print("[MCQ GENERATION ERROR]", ex)
        return {"mcqs": [{"question": "Sample fallback MCQ: LLM Error, please try again.", "options": ["A", "B", "C", "D"], "answer": "A"}]}
    except Exception as ex:
        print("[MCQ GENERATION ERROR]", ex)
        # Do NOT refer to model_output here!
        return {"mcqs": [{
            "question": "Sample fallback MCQ: LLM Error, please try again.",
            "options": ["A", "B", "C", "D"],
            "answer": "A"
        }]}


@app.post("/api/generate-mcqs-kg/")
async def generate_mcqs_kg(payload: dict = Body(...), db: Session = Depends(get_db)):
    course_id = payload.get("course_id")
    week = payload.get("week")
    concept_id = payload.get("concept_id") or payload.get("segment_id")

    kg_row = db.execute(
        sql_text("SELECT node_data, edge_data FROM knowledge_graph WHERE course_id=:c AND week=:w"),
        {"c": course_id, "w": week}
    ).fetchone()
    kg_nodes, kg_edges = [], []
    if kg_row:
        kg_nodes = json.loads(kg_row[0]) if kg_row[0] else []
        kg_edges = json.loads(kg_row[1]) if kg_row[1] else []

    # Find the selected node, if any
    selected_node = next((n for n in kg_nodes if n["id"] == concept_id), None)
    selected_summary = selected_node.get("summary", "") if selected_node else ""
    selected_contents = selected_node.get("contents", "") if selected_node else ""

    prompt = (
        f"As a teaching assistant, generate several relevant and varied multiple-choice questions (MCQs) focused on the concept '{concept_id}' "
        "as it appears in this week's knowledge graph. Use the summary and content of that concept for focus. "
        "Also use its direct relationships to other concepts in the KG to create integrative questions that require understanding context and relationships. "
        "The number of questions should reflect the importance and coverage of the concept. "
        "For each MCQ, ALWAYS include an 'answer' key, as the correct text exactly matching one of the options (not a letter or index)."
        "Respond ONLY as a JSON list, e.g.:\n"
        '[{"question": "...", "options": ["A", "B", "C", "D"], "answer": "..."}]\n'
        f"\nConcept summary:\n{selected_summary[:600]}"
        f"\n\nConcept detail/context:\n{selected_contents[:1200]}"
        f"\n\nKnowledge Graph Concepts:\n{json.dumps(kg_nodes)[:1200]}"
        f"\nRelations:\n{json.dumps(kg_edges)[:400]}"
    )
    print("[DEBUG] MCQ KG Concept Prompt:", prompt)
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(prompt)
        model_output = str(getattr(response, "text", getattr(response, "candidates", response)))
        mcqs = extract_mcqs_from_response(model_output)
        out = []
        for item in mcqs:
            if isinstance(item, dict) and all(k in item for k in ("question", "options", "answer")) and len(item["options"]) == 4:
                out.append(item)
        return {"mcqs": out if out else [{"question": f"No MCQs found for concept '{concept_id}' in KG.", "options": [], "answer": ""}]}
    except Exception as ex:
        print("[MCQ KG GENERATION ERROR]", ex)
        return {"mcqs": [{"question": "Sample fallback MCQ: LLM Error, please try again.", "options": ["A", "B", "C", "D"], "answer": "A"}]}
    
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

@app.get("/api/debug/segment/{segment_id}")
async def debug_segment(segment_id: str, db: Session = Depends(get_db)):
    s = db.query(Segment).filter_by(id=segment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {
        "id": s.id,
        "title": s.title,
        "content": s.content[:200] + "..." if s.content else None,
        "summary": s.summary,
        "keywords": s.keywords,
        "summary_length": len(s.summary) if s.summary else 0,
        "has_summary": bool(s.summary and s.summary.strip())
    }

# Add WebSocket endpoint
@app.websocket("/ws/{course_id}/{week}")
async def websocket_endpoint(websocket: WebSocket, course_id: str, week: int):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for now, can be used for real-time updates
            await manager.send_personal_message(f"Message: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- 1. Create a quiz (Instructor) ---
@app.post("/api/quiz/create")
async def create_quiz(
    name: str = Form(...),
    course_id: str = Form(...),
    week: int = Form(...),
    concept_ids: str = Form(...),  # Can be JSON or comma-separated
    instructor_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create a quiz for a course, week, and concepts."""
    try:
        concepts = json.loads(concept_ids)
    except Exception:
        concepts = [s.strip() for s in concept_ids.split(",") if s.strip()]
    quiz = Quiz(
        id=str(uuid.uuid4()),
        name=name,
        course_id=course_id,
        week=week,
        concept_ids=concepts,
        instructor_id=instructor_id
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return {
        "quiz": {
            "id": quiz.id,
            "name": quiz.name,
            "course_id": quiz.course_id,
            "week": quiz.week,
            "concept_ids": quiz.concept_ids
        }
    }

# --- 2. List all quizzes for a course/week (for student or dashboard) ---
@app.get("/api/quiz/list")
async def list_quizzes(course_id: str, week: int, db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter_by(course_id=course_id, week=week).all()
    return [
        {"id": q.id, "name": q.name, "concept_ids": q.concept_ids}
        for q in quizzes
    ]

# --- 3. Start or resume a quiz attempt (one per student per quiz) ---
@app.post("/api/quiz/attempt/start")
async def start_quiz_attempt(
    quiz_id: str = Form(...),
    student_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """Start or resume a quiz attempt for a student."""
    attempt = db.query(QuizAttempt).filter_by(quiz_id=quiz_id, student_id=student_id).first()
    if attempt:
        return {"attempt_id": attempt.id, "resume": True}

    new_attempt = QuizAttempt(
        id=str(uuid.uuid4()),
        quiz_id=quiz_id,
        student_id=student_id,
        responses={}
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)
    return {"attempt_id": new_attempt.id, "resume": False}

# --- 4. Fetch next adaptive MCQ (students; Gemini/KG) ---
@app.get("/api/quiz/attempt/next")
async def get_next_mcq_gemini(attempt_id: str, db: Session = Depends(get_db)):
    """Get the next MCQ for a student's quiz attempt, using Gemini LLM."""
    attempt = db.query(QuizAttempt).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    quiz = db.query(Quiz).filter_by(id=attempt.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Robustly handle CSV/JSON for concept_ids
    conceptids = quiz.concept_ids if hasattr(quiz, 'concept_ids') else []
    if isinstance(conceptids, str):
        try:
            conceptids = json.loads(conceptids)
        except Exception:
            conceptids = [s.strip() for s in conceptids.split(",") if s.strip()]
    if not isinstance(conceptids, list):
        conceptids = list(conceptids)

    given_mcqs = set(attempt.responses.keys()) if attempt.responses else set()

    for conceptid in conceptids:
        kg_row = db.execute(
            sql_text("SELECT node_data, edge_data FROM knowledge_graph WHERE course_id=:c AND week=:w"),
            {"c": quiz.course_id, "w": quiz.week}
        ).fetchone()
        kg_nodes = json.loads(kg_row[0]) if (kg_row and kg_row[0]) else []

        selected_node = next((n for n in kg_nodes if n["id"] == conceptid), None)
        if not selected_node:
            continue

        payload = {
            "course_id": quiz.course_id,
            "week": quiz.week,
            "concept_id": conceptid,
        }
        resp = await generate_mcqs_kg(payload, db)
        mcqs = resp.get("mcqs", [])

        for mcq in mcqs:
            mcq_id = f"gemini-{conceptid}-{hash(mcq['question'])}"
            if mcq_id not in given_mcqs:
                return {
                    "mcq_id": mcq_id,
                    "question": mcq["question"],
                    "options": mcq["options"],
                    "answer": mcq["answer"],  # Only supply if practicing, not for graded quiz
                }
    return {"done": True}

# --- 5. Submit MCQ answer for attempt (DB or Gemini MCQ) ---
@app.post("/api/quiz/attempt/submit")
async def submit_mcq_answer(
    attempt_id: str = Form(...),
    mcq_id: str = Form(...),
    selected: str = Form(...),
    answer: str = Form(None),  # Only required for Gemini MCQs
    db: Session = Depends(get_db)
):
    attempt = db.query(QuizAttempt).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    mcq = db.query(MCQ).filter_by(id=mcq_id).first()

    if mcq is not None:
        correct = (selected.strip() == mcq.answer.strip())
        answer_val = mcq.answer
        question = mcq.question
    elif answer is not None:
        correct = (selected.strip() == answer.strip())
        answer_val = answer
        question = "(Generated MCQ)"
    else:
        raise HTTPException(status_code=400, detail="No answer key for this MCQ")

    responses = attempt.responses or {}
    responses[mcq_id] = {"selected": selected, "correct": correct}
    attempt.responses = responses
    db.commit()

    mcq_resp = MCQResponse(
        id=str(uuid.uuid4()),
        attempt_id=attempt_id,
        mcq_id=mcq_id,
        question=question,
        selected=selected,
        correct=correct
    )
    db.add(mcq_resp)
    db.commit()

    return {"correct": correct, "answer": answer_val}

# --- 6. Get summary of quiz attempt ---
@app.get("/api/quiz/attempt/state")
async def quiz_attempt_state(attempt_id: str, db: Session = Depends(get_db)):
    """Return a summary (attempted/correct count, responses) for an attempt."""
    attempt = db.query(QuizAttempt).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    responses = attempt.responses or {}
    return {
        "attempted": len(responses),
        "correct": sum(1 for r in responses.values() if r.get("correct")),
        "responses": responses
    }

# --- 7. Quiz aggregate stats (by instructor) ---
@app.get("/api/quiz/stats")
async def quiz_stats(quiz_id: str, db: Session = Depends(get_db)):
    """Aggregate stats for a quiz."""
    attempts = db.query(QuizAttempt).filter_by(quiz_id=quiz_id).all()
    summary = []
    for att in attempts:
        responses = att.responses or {}
        summary.append({
            "attempted": len(responses),
            "correct": sum(1 for v in responses.values() if v.get("correct"))
        })
    return {"total_attempts": len(attempts), "stats": summary}

# --- 8. Home/root route ---
@app.get("/")
async def root():
    return {"message": "AILA Backend (SQLite) is running"}

# --- 9. Delete upload/file endpoint (optional housekeeping) ---
@app.post("/api/delete-upload")
async def delete_upload(uploadid: str = Form(...), db: Session = Depends(get_db)):
    """Delete a previously uploaded lecture file."""
    upload = db.query(LectureUpload).filter(LectureUpload.id == uploadid).first()
    if not upload:
        raise HTTPException(status_code=404, detail="File not found")
    if upload.fileurl and os.path.exists(upload.fileurl):
        os.remove(upload.fileurl)
    db.delete(upload)
    db.commit()
    return {"status": "deleted"}