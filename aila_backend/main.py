from dotenv import load_dotenv
load_dotenv()
import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Body
from fastapi import WebSocket, WebSocketDisconnect
from fastapi import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, create_engine, ForeignKey, Text, JSON, text as sql_text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from sqlalchemy import Boolean, ARRAY
from sqlalchemy import text as sql_text
from sqlalchemy import text as sqltext
from sqlalchemy import text
from sqlalchemy import and_
from pydantic import BaseModel, Field
from pptx import Presentation
from typing import List
from collections import deque, defaultdict
from datetime import datetime
from typing import Optional
from models import LectureProcessing, KnowledgeGraph
import asyncio
import fitz  # PyMuPDF
import hashlib
import traceback
import random
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
    quiz_id = Column(String(36), ForeignKey("quizzes.id"), nullable=True)  
    concept_id = Column(String(255), nullable=True)                         
    segment_id = Column(String(36), ForeignKey("segments.id"), nullable=True)

    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    answer = Column(Text, nullable=True)
    difficulty = Column(String(20), default="Medium")

    quiz = relationship("Quiz", backref="mcqs")
    segment = relationship("Segment")


class MCQReqModel(BaseModel):
    course_id: str
    week: int
    concept_id: str
    summary: str = ""
    contents: str = ""

class MCQPayload(BaseModel):
    segment_id: str
    content: str

class KnowledgeGraphBase(Base):
    __tablename__ = 'knowledge_graph'
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

class QuizCreate(BaseModel):
    name: str = "New Quiz"
    course_id: str
    week: int
    instructor_id: str = "unknown"
    concept_ids: List[str]

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(String(50), primary_key=True, index=True)
    quiz_id = Column(String(50), ForeignKey('quizzes.id'))
    student_id = Column(String(50), ForeignKey("users.id"))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), onupdate=func.now())
    responses = Column(JSON, default=dict)  # {mcq_id: {"answer": ..., "correct": ...}}
    score = Column(Integer, nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow)

class QuizSettings(Base):
    __tablename__ = "quiz_settings"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quiz_id = Column(String(36), ForeignKey("quizzes.id"), nullable=False)
    week = Column(Integer, nullable=False)
    min_difficulty = Column(String(20), nullable=True)
    max_difficulty = Column(String(20), nullable=True)
    max_questions = Column(Integer, nullable=True)
    allowed_retries = Column(Integer, nullable=True)
    feedback_style = Column(String(20), nullable=True)
    include_spaced = Column(Boolean, default=False)

class QuizSettingsIn(BaseModel):
    week: int
    min_difficulty: Optional[str] = None
    max_difficulty: Optional[str] = None
    max_questions: Optional[int] = None
    allowed_retries: Optional[int] = None
    feedback_style: Optional[str] = None
    include_spaced: bool = False

class QuizSettingsOut(QuizSettingsIn):
    id: int
    quiz_id: str

class QuizStartResponse(BaseModel):
    attempt_id: str
    questions: List[dict]
    settings: dict
    retries_left: int

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
    

class MCQUpdate(BaseModel):
    question: str
    options: List[str]
    answer: str
    difficulty: Optional[str] = "Medium"

class GenerateQuizMCQsRequest(BaseModel):
    action: str = "generate_from_concepts"

class TitleGenRequest(BaseModel):
    concepts: List[str]

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

# --- B. Lock previewed MCQs to a quiz (optional) ---
class LockPreviewPayload(BaseModel):
    quiz_id: str
    items: List[dict]  # [{ "concept_id": "...", "mcqs": [ {...}, ... ] }, ...]


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
    import fitz  # PyMuPDF
    from pptx import Presentation
    from collections import defaultdict
    import re
    import traceback
    from sqlalchemy import text as sql_text # Ensure this import exists

    db = SessionLocal()
    llm = Gemini(model="models/gemini-2.5-flash") 

    try:
        # 0. Init Status
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "processing", "progress": 5, "error_message": None
        })
        db.commit()

        # ---------- 1. Extract Slides (Restore Segments) ----------
        segments_data = []
        ext = os.path.splitext(filepath)[-1].lower()
        
        if ext == ".pdf":
            doc = fitz.open(filepath)
            for i, page in enumerate(doc):
                text = page.get_text(sort=True)
                if text.strip():
                    segments_data.append({"slide_num": i + 1, "text": text})
        elif ext == ".pptx":
            prs = Presentation(filepath)
            for i, slide in enumerate(prs.slides):
                lines = [shape.text for shape in slide.shapes if hasattr(shape, "text")]
                content = "\n".join(lines)
                if content.strip():
                    segments_data.append({"slide_num": i + 1, "text": content})

        if not segments_data:
            raise ValueError("No readable slides found")

        # Save Segments to DB (CRITICAL FOR QUIZZES & PREVIEW)
        print("[PROCESS] Saving segments to DB...")
        for seg in segments_data:
            new_seg = Segment(
                id=str(uuid.uuid4()),
                upload_id=upload_id,
                course_id=course_id,
                week=week,
                segment_index=seg["slide_num"],
                title=f"Slide {seg['slide_num']}", 
                content=seg["text"],
                keywords="", # Will populate via graph mapping below
                summary=""
            )
            db.add(new_seg)
        db.commit()

        # Prepare context for Graph LLM (Limit to ~30k chars)
        full_text = "\n\n".join([f"--- Slide {s['slide_num']} ---\n{s['text']}" for s in segments_data])[:30000]

        # ---------- 2. GENERATE GRAPH (Hierarchy + Summaries) ----------
        print("[KG LOGIC] Generating graph...")
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({"progress": 50})
        db.commit()
        
        prompt = f"""
        You are an expert computer science instructor. Analyze the following lecture slides from "{file_name}".
        
        GOAL: Build a hierarchical concept map and extract metadata.
        
        STEP 1: Identify the SINGLE main topic (e.g., "Stacks").
        STEP 2: Identify sub-concepts (nodes) and their parent-child relationships (edges).
        STEP 3: Write a 1-sentence definition (summary) for each concept.
        STEP 4: For each concept, list the "slide_numbers" where it is explicitly discussed (look for "--- Slide X ---").

        Return valid JSON:
        {{
            "main_topic": "The single overarching topic",
            "nodes": [
                {{ 
                    "id": "Concept Name", 
                    "label": "Display Label", 
                    "summary": "Definition...", 
                    "slide_nums": [1, 3] 
                }}
            ],
            "edges": [
                {{ "source": "Parent ID", "target": "Child ID", "relation": "..." }}
            ]
        }}

        RULES:
        - "main_topic" is the root.
        - All nodes must connect to the tree.
        - slide_nums must be integers found in the text.

        Context:
        {full_text}
        """

        response = llm.complete(prompt)
        cleaned_text = str(response).replace("```json", "").replace("```", "").strip()
        
        try:
            data = json.loads(cleaned_text)
        except:
            # Fallback cleanup if JSON is messy
            start = cleaned_text.find("{")
            end = cleaned_text.rfind("}") + 1
            if start != -1 and end != 0:
                data = json.loads(cleaned_text[start:end])
            else:
                raise ValueError("LLM returned invalid JSON")

        # ---------- 3. Process & Save Graph ----------
        main_topic = data.get("main_topic", file_name)
        raw_nodes = data.get("nodes", [])
        raw_edges = data.get("edges", [])

        print(f"[KG LOGIC] Main Topic: {main_topic}")

        # Fix Hierarchy (Using your existing helper)
        final_nodes, final_edges = compute_levels(raw_nodes, raw_edges, explicit_root=main_topic)

        # --- RESTORE CONTENT CONTEXT (Crucial for Quiz Generation) ---
        slide_text_map = {s["slide_num"]: s["text"] for s in segments_data}

        for node in final_nodes:
            # 1. Gather text from all slides where this concept appears
            s_nums = node.get("slide_nums", [])
            gathered_text = []
            
            # Ensure s_nums is a list of ints
            if isinstance(s_nums, (int, str)): s_nums = [int(s_nums)]
            
            for num in s_nums:
                if num in slide_text_map:
                    gathered_text.append(slide_text_map[num])
            
            # 2. Save content context to node (Limit to 1500 chars)
            node["contents"] = "\n...\n".join(gathered_text)[:1500]
            
            # 3. Update Segment Keywords (For Search)
            if s_nums:
                label_safe = node.get("label", "").replace("'", "''")
                
                # --- FIX: Dynamically build placeholders for IN clause ---
                placeholders = ",".join([":s" + str(i) for i in range(len(s_nums))])
                params = {"c": course_id, "w": week}
                
                # Add individual params for the IN clause
                for i, num in enumerate(s_nums):
                    params[f"s{i}"] = num
                
                query = f"""
                    UPDATE segments 
                    SET keywords = keywords || '{label_safe}, ' 
                    WHERE course_id=:c AND week=:w AND segment_index IN ({placeholders})
                """
                
                db.execute(sql_text(query), params)
                
                # Update Segment Title (First slide of concept gets the concept name)
                first_slide = s_nums[0]
                db.execute(
                    sql_text("UPDATE segments SET title = :t WHERE course_id=:c AND week=:w AND segment_index=:i AND title LIKE 'Slide %'"),
                    {"t": node["label"], "c": course_id, "w": week, "i": first_slide}
                )

                
                # Update Segment Title (First slide of concept gets the concept name)
                first_slide = s_nums[0]
                db.execute(
                    sql_text("UPDATE segments SET title = :t WHERE course_id=:c AND week=:w AND segment_index=:i AND title LIKE 'Slide %'"),
                    {"t": node["label"], "c": course_id, "w": week, "i": first_slide}
                )
        
        db.commit()

        # ---------- 4. Save Knowledge Graph ----------
        existing_kg = db.execute(
            sql_text("SELECT id FROM knowledge_graph WHERE course_id=:c AND week=:w"),
            {"c": course_id, "w": week}
        ).fetchone()

        node_json = json.dumps(final_nodes)
        edge_json = json.dumps(final_edges)

        if existing_kg:
            db.execute(
                sql_text("UPDATE knowledge_graph SET node_data=:n, edge_data=:e WHERE id=:id"),
                {"n": node_json, "e": edge_json, "id": existing_kg[0]}
            )
        else:
            db.execute(
                sql_text("INSERT INTO knowledge_graph (id, course_id, week, node_data, edge_data) VALUES (:id, :c, :w, :n, :e)"),
                {"id": str(uuid.uuid4()), "c": course_id, "w": week, "n": node_json, "e": edge_json}
            )

        # Finish
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "done", "progress": 100
        })
        db.commit()
        print(f"[KG COMPLETE] Saved {len(final_nodes)} nodes with content context.")

    except Exception as e:
        print(f"[KG ERROR] {str(e)}")
        traceback.print_exc()
        db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).update({
            "status": "error", "progress": 0, "error_message": str(e)[:500]
        })
        db.commit()
    finally:
        db.close()


def compute_levels(nodes, edges, explicit_root=None):
    """
    Forces a strict hierarchy where 'explicit_root' is Level 0.
    Connects any disconnected nodes to the root to prevent 'islands'.
    """
    node_map = {n["id"]: n for n in nodes}
    
    # 1. Ensure the Explicit Root exists in the node list
    if explicit_root:
        if explicit_root not in node_map:
            root_node = {"id": explicit_root, "label": explicit_root, "isRoot": True}
            nodes.append(root_node)
            node_map[explicit_root] = root_node
        else:
            # Force existing node to be root
            node_map[explicit_root]["isRoot"] = True

    # 2. Build Adjacency List
    adj = defaultdict(list)
    for e in edges:
        adj[e["source"]].append(e["target"])

    # 3. BFS to Assign Levels from Root
    levels = {node_id: -1 for node_id in node_map} # -1 means unvisited
    
    # Start BFS from the explicit root
    queue = deque()
    if explicit_root and explicit_root in node_map:
        queue.append((explicit_root, 0))
    else:
        # Fallback: Find topological roots (nodes with no incoming edges)
        incoming = defaultdict(int)
        for e in edges: incoming[e["target"]] += 1
        topo_roots = [n["id"] for n in nodes if incoming[n["id"]] == 0]
        for r in topo_roots: queue.append((r, 0))

    visited = set()
    if explicit_root: visited.add(explicit_root)

    while queue:
        curr, depth = queue.popleft()
        levels[curr] = depth
        
        for child in adj[curr]:
            if child not in visited:
                visited.add(child)
                queue.append((child, depth + 1))
    
    # 4. Handle Disconnected Nodes (Orphans)
    # Force connect any unvisited nodes to the Root
    new_edges = []
    if explicit_root:
        for node in nodes:
            node_id = node["id"]
            if node_id != explicit_root and levels[node_id] == -1:
                # Create a "Related" edge so it appears in the graph
                new_edges.append({
                    "source": explicit_root,
                    "target": node_id,
                    "relation": "related concept"
                })
                # Set level to 1 (direct child of root)
                levels[node_id] = 1
                node["isRoot"] = False 

    # 5. Finalize Node Objects
    for node in nodes:
        node["level"] = levels.get(node["id"], 1)
        node["isRoot"] = (node["id"] == explicit_root) if explicit_root else (node.get("level") == 0)
        
        # Optional: Add type for frontend styling
        if node["isRoot"]:
            node["type"] = "root"
        else:
            node["type"] = "concept"

    # Combine original edges with new "rescue" edges
    final_edges = edges + new_edges
    
    # Sort nodes so Root is always first (helps some frontend parsers)
    nodes.sort(key=lambda x: x["level"])
    
    return nodes, final_edges


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

def pick_next_concept(concept_ids, responses, include_spaced):
    # concept_ids: all quiz concepts
    # responses: {mcq_id: {"concept_id": "...", "correct": bool}}

    if not include_spaced or not responses:
        # default behavior: your existing selection logic
        return random.choice(concept_ids)

    # separate “current focus” vs “review” concept pools
    seen_concepts = {r.get("concept_id") for r in responses.values() if r.get("concept_id")}
    unseen = [c for c in concept_ids if c not in seen_concepts]
    review_candidates = list(seen_concepts) or concept_ids

    # 20–30% chance to pull a review concept
    if random.random() < 0.3:
        return random.choice(review_candidates)
    if unseen:
        return random.choice(unseen)
    return random.choice(concept_ids)




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


@app.get("/api/knowledge-graph")
async def getkg(courseid: str, week: int, db: Session = Depends(get_db)):
    print(f"🔍 KG LOOKUP: courseid='{courseid}' week={week}")
    
    row = db.execute(
        sqltext("SELECT node_data, edge_data FROM knowledge_graph WHERE course_id=:course_id AND week=:week"),
        {"course_id": courseid, "week": week}
    ).fetchone()
    
    print(f"Row found: {row is not None}")
    
    if row and row[0] and row[1]:
        try:
            nodes = json.loads(row[0])
            edges = json.loads(row[1])
            print(f"✅ RETURNED {len(nodes)} nodes, {len(edges)} edges")
            return {"nodes": nodes, "edges": edges}
        except Exception as e:
            print(f"JSON DECODE ERROR: {e}")
            return {"nodes": [], "edges": []}
    
    print("No data found")
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
        return {"mcqs": [{
            "question": "Sample fallback MCQ: LLM Error, please try again.",
            "options": ["A", "B", "C", "D"],
            "answer": "A"
        }]}


@app.post("/api/generate-mcqs-kg")
async def generate_mcqs_kg(payload: dict = Body(...), db: Session = Depends(get_db)):
    course_id = payload.get("course_id")
    week = payload.get("week")
    concept_id = payload.get("concept_id") or payload.get("segment_id")
    quiz_id = payload.get("quiz_id")

    # 1. Determine Difficulty Range
    allowed_str = "'Easy', 'Medium', 'Hard'"
    if quiz_id:
        try:
            settings = None
            try:
                settings = db.query(QuizSettings).filter(QuizSettings.quiz_id == quiz_id).first()
            except AttributeError:
                settings = db.query(QuizSettings).filter(QuizSettings.quizid == quiz_id).first()
                
            if settings:
                all_levels = ["Easy", "Medium", "Hard"]
                mind = settings.mindifficulty or "Easy"
                maxd = settings.maxdifficulty or "Hard"
                try:
                    start_idx = all_levels.index(mind)
                    end_idx = all_levels.index(maxd)
                    if start_idx > end_idx: start_idx, end_idx = end_idx, start_idx
                    allowed_str = ", ".join([f"'{x}'" for x in all_levels[start_idx : end_idx+1]])
                except ValueError:
                    pass 
        except Exception:
            pass

    # 2. Fetch KG Context (Robust Attribute Access)
    kg_entry = None
    try:
        # Try course_id (standard)
        kg_entry = db.query(KnowledgeGraph).filter(
            KnowledgeGraph.course_id == course_id,
            KnowledgeGraph.week == week
        ).first()
    except AttributeError:
        # Try courseid (legacy/alternate)
        try:
            kg_entry = db.query(KnowledgeGraph).filter(
                KnowledgeGraph.courseid == course_id,
                KnowledgeGraph.week == week
            ).first()
        except Exception as e:
            print(f"KG Attribute Lookup Error: {e}")

    selected_summary = ""
    selected_contents = ""

    if kg_entry:
        try:
            # SAFELY access nodedata or node_data
            raw_node_data = getattr(kg_entry, 'nodedata', getattr(kg_entry, 'node_data', None))
            
            if raw_node_data:
                kg_nodes = json.loads(raw_node_data)
                selected_node = next((n for n in kg_nodes if n.get('id') == concept_id), None)
                if selected_node:
                    selected_summary = selected_node.get('summary', '')
                    selected_contents = selected_node.get('contents', selected_summary)
            else:
                print("Warning: KG entry found but no node data attribute matched.")
                
        except json.JSONDecodeError:
            print("Error decoding KG JSON")
        except Exception as e:
            print(f"Error parsing KG nodes: {e}")

    # 3. Prompt Generation (Strict Anti-Hallucination)
    prompt = (
        f"As an expert computer science instructor, create relevant multiple-choice questions (MCQs) for the concept '{concept_id}'.\n"
        f"TARGET DIFFICULTIES: {allowed_str}.\n"
        "Use the provided Summary and Details below for technical accuracy, but DO NOT REFER TO THEM in the questions.\n\n"
        "STRICT RULES:\n"
        "1. The questions must stand alone as standard exam questions.\n"
        "2. NEVER use phrases like 'according to the text', 'as mentioned above', 'in the provided context'.\n"
        "3. Provide exactly 4 options per question.\n"
        "4. Include a 'difficulty' field for each question matching the target difficulties.\n"
        "5. Respond ONLY as a JSON list.\n\n"
        "Response Format:\n"
        "[{'question': '...', 'options': ['A', 'B', 'C', 'D'], 'answer': '...', 'difficulty': '...'}]\n\n"
        f"Summary:\n{selected_summary[:800]}\n"
        f"Details:\n{selected_contents[:1200]}"
    )

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = model.generate_content(prompt)
        model_output = getattr(response, 'text', str(response))
        mcqs = extract_mcqs_from_response(model_output)

        out = []
        valid_difficulties = [d.strip("' ") for d in allowed_str.split(",")]
        
        for item in mcqs:
            if isinstance(item, dict) and 'question' in item and 'options' in item and 'answer' in item:
                if 'difficulty' not in item or item['difficulty'] not in valid_difficulties:
                    item['difficulty'] = random.choice(valid_difficulties)
                
                # Check for hallucinations
                q_text = item['question'].lower()
                if "provided text" in q_text or "according to" in q_text:
                    continue

                item['concept_id'] = concept_id
                out.append(item)
        
        return {"mcqs": out}

    except Exception as ex:
        print(f"MCQ GENERATION ERROR: {ex}")
        return {"mcqs": []}


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

@app.delete("/api/upload/{upload_id}")
def delete_upload(upload_id: str, db: Session = Depends(get_db)):
    record = db.query(LectureProcessing).filter(LectureProcessing.id == upload_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # DELETE GRAPH LOGIC
    db.query(KnowledgeGraph).filter(
        KnowledgeGraph.course_id == record.course_id,
        KnowledgeGraph.week == record.week
    ).delete()
    
    db.delete(record)
    db.commit()
    return {"status": "deleted"}

@app.delete("/api/quiz/{quiz_id}")
async def delete_quiz(quiz_id: str, db: Session = Depends(get_db)):
    """
    Deletes a quiz and all its related data (MCQs, attempts, settings).
    """
    # 1. Find the quiz
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # 2. Delete related MCQs
    db.query(MCQ).filter(MCQ.quiz_id == quiz_id).delete()
    
    # 3. Delete related Attempts (optional, but good for cleanup)
    db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).delete()
    
    # 4. Delete Settings
    # Try both attribute names for safety based on our previous fixes
    try:
        db.query(QuizSettings).filter(QuizSettings.quiz_id == quiz_id).delete()
    except:
        db.query(QuizSettings).filter(QuizSettings.quizid == quiz_id).delete()

    # 5. Delete the Quiz itself
    db.delete(quiz)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete quiz: {e}")

    return {"status": "deleted", "quiz_id": quiz_id}

# Add WebSocket endpoint
@app.websocket("/ws/{course_id}/{week}")
async def websocket_endpoint(websocket: WebSocket, course_id: str, week: int):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(f"Message: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- 1. Create a quiz (Instructor) ---
@app.post("/api/quiz/create")
async def create_quiz(request: QuizCreate, db: Session = Depends(get_db)):
    print("✅ Creating quiz:", request.course_id, len(request.concept_ids))
    
    # 1. CREATE QUIZ ONLY
    qid = str(uuid.uuid4())
    quiz = Quiz(
        id=qid,
        name=request.name,
        course_id=request.course_id,
        week=request.week,
        concept_ids=request.concept_ids,
        instructor_id=request.instructor_id
    )
    db.add(quiz)
    db.commit()
    
    print(f"📋 Quiz {qid} created with {len(request.concept_ids)} concepts")
    return {"quiz_id": qid, "message": "Quiz created, ready for MCQ generation"}



@app.post("/api/quizzes")
async def create_quiz(payload: dict, db: Session = Depends(get_db)):
    print("QUIZ CREATE DEBUG", payload)  
    quiz_id = str(uuid.uuid4())
    new_quiz = Quiz(
        id=quiz_id,
        name=payload.get("name", "New Quiz"),
        course_id=payload["course_id"],  
        week=payload["week"],
        concept_ids=payload["concept_ids"],  # List[str]
        instructor_id=payload.get("instructor_id", "unknown")
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)
    
    mcq_count = 0
    # Load KG
    kg_row = db.execute(
        sqltext("SELECT node_data FROM knowledge_graph WHERE course_id=:c AND week=:w"),
        {"c": payload["course_id"], "w": payload["week"]}
    ).fetchone()
    if kg_row:
        kg_nodes = json.loads(kg_row[0]) if kg_row[0] else []
        # Limit to first 3 concepts
        for cid in payload["concept_ids"][:3]:
            node = next((n for n in kg_nodes if n.get("id") == cid), None)
            if node:
                kg_payload = {
                    "course_id": payload["course_id"],
                    "week": payload["week"],
                    "concept_id": cid,
                    "summary": node.get("summary", "")[:800],
                    "contents": node.get("contents", "")[:1500]
                }
                try:
                    resp = await generate_mcqs_kg(kg_payload, db)
                    mcqs = resp.get("mcqs", [])[:2]  # 2 per concept
                    for mcq in mcqs:
                        db.add(MCQ(
                            id=str(uuid.uuid4()),
                            quiz_id=quiz_id,
                            concept_id=cid,
                            question=mcq.get("question", "Sample Q"),
                            options=mcq.get("options", ["A", "B", "C", "D"]),
                            answer=mcq.get("answer", "A")
                        ))
                    mcq_count += len(mcqs)
                except Exception as e:
                    print(f"MCQ gen failed for {cid}", e)
    db.commit()
    print(f"Quiz {quiz_id} created with {mcq_count} MCQs")
    return {"quiz_id": quiz_id, "generated_mcqs": mcq_count}


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
    attempt = db.query(QuizAttempt).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    quiz = db.query(Quiz).filter_by(id=attempt.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    settings = db.query(QuizSettings).filter(
        QuizSettings.quiz_id == quiz.id
    ).first()

    max_questions = settings.max_questions if settings else None
    include_spaced = settings.include_spaced if settings else False

    responses = attempt.responses or {}
    answered_count = len(responses)

    if max_questions is not None and answered_count >= max_questions:
        return {"done": True, "reason": "max_questions_reached", "answered": answered_count}

    concept_ids = quiz.concept_ids or []
    if isinstance(concept_ids, str):
        try:
            concept_ids = json.loads(concept_ids)
        except Exception:
            concept_ids = [s.strip() for s in concept_ids.split(",") if s.strip()]

    concept_id = pick_next_concept(concept_ids, responses, include_spaced)

    given_mcqs = set(responses.keys())

    # 1) Try cached MCQs for this quiz + concept
    cached = (
        db.query(MCQ)
        .filter(
            MCQ.quiz_id == quiz.id,
            MCQ.concept_id == concept_id,
        )
        .all()
    )
    for m in cached:
            if m.id not in given_mcqs:
                return {
                    "mcq_id": m.id,
                    "question": m.question,
                    "options": m.options,
                    "answer": m.answer,
                    "concept_id": m.concept_id,
                }

    # 2) If no cached MCQ left, generate from KG on the fly
    payload = {
        "course_id": quiz.course_id,
        "week": quiz.week,
        "concept_id": concept_id,
    }
    resp = await generate_mcqs_kg(payload, db)
    mcqs = resp.get("mcqs", [])

    for mcq in mcqs:
        mcq_id = f"gemini-{concept_id}-{hash(mcq['question'])}"
        if mcq_id in given_mcqs:
            continue
        # Optionally, you can also cache this one:
        # db.add(MCQ(...)); db.commit()
        return {
            "mcq_id": mcq_id,
            "question": mcq["question"],
            "options": mcq["options"],
            "answer": mcq["answer"],
            "concept_id": concept_id,
        }

    return {"done": True}


# --- 5. Submit MCQ answer for attempt (DB or Gemini MCQ) ---
@app.post("/api/quiz/attempt/submit")
async def submit_mcq_answer(
    attempt_id: str = Form(...),
    mcq_id: str = Form(...),
    selected: str = Form(...),
    answer: str = Form(None),          # for Gemini MCQs
    concept_id: str = Form(None),      # NEW
    db: Session = Depends(get_db)
):
    attempt = db.query(QuizAttempt).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    mcq = db.query(MCQ).filter_by(id=mcq_id).first()

    if mcq is not None:
        correct = selected.strip() == mcq.answer.strip()
        answer_val = mcq.answer
        question = mcq.question
        concept_id_used = mcq.concept_id or concept_id
    elif answer is not None:
        correct = selected.strip() == answer.strip()
        answer_val = answer
        question = "(Generated MCQ)"
        concept_id_used = concept_id
    else:
        raise HTTPException(status_code=400, detail="No answer key for this MCQ")

    responses = attempt.responses or {}
    responses[mcq_id] = {
        "selected": selected,
        "correct": correct,
        "concept_id": concept_id_used,
    }
    attempt.responses = responses
    db.commit()

    mcq_resp = MCQResponse(
        id=str(uuid.uuid4()),
        attempt_id=attempt_id,
        mcq_id=mcq_id,
        question=question,
        selected=selected,
        correct=correct,
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
    # Aggregate stats for a quiz
    attempts = db.query(QuizAttempt).filter_by(quiz_id=quiz_id).all()
    summary = []
    
    for att in attempts:
        # 1. Handle if 'responses' is None
        raw_responses = att.responses or {}
        
        # 2. Handle if 'responses' is a JSON string (SQLite/SQLAlchemy quirk)
        if isinstance(raw_responses, str):
            try:
                responses = json.loads(raw_responses)
            except:
                responses = {}
        else:
            responses = raw_responses

        # 3. Calculate Correct Count Safely
        correct_count = 0
        if isinstance(responses, dict):
             for v in responses.values():
                 # Handle if the value inside the dict is ALSO a string (double encoded)
                 if isinstance(v, str):
                     try:
                         v = json.loads(v)
                     except:
                         continue # Skip malformed data
                 
                 if isinstance(v, dict) and v.get("correct"):
                     correct_count += 1
        
        summary.append({
            "attempt_id": att.id,
            "student_id": att.student_id,
            "attempted": len(responses) if isinstance(responses, dict) else 0,
            "correct": correct_count,
            "score": att.score
        })

    return {
        "total_attempts": len(attempts),
        "stats": summary
    }

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

@app.get("/api/quiz/settings/{quiz_id}", response_model=QuizSettingsOut)
async def get_quiz_settings(quiz_id: str, db: Session = Depends(get_db)):
    # 1. Fetch from DB (try both attribute names to be safe)
    try:
        qs = db.query(QuizSettings).filter(QuizSettings.quiz_id == quiz_id).first()
    except AttributeError:
        qs = db.query(QuizSettings).filter(QuizSettings.quizid == quiz_id).first()
    
    # 2. If no settings exist, create defaults
    if not qs:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        default_week = quiz.week if quiz else 1
        
        # RETURN DICT: Pydantic will validate this against its schema
        # We provide BOTH keys so whichever one Pydantic wants, it finds.
        return {
            "id": -1,
            "quizid": quiz_id,   # Case A
            "quiz_id": quiz_id,  # Case B (Pydantic likely wants this)
            "week": default_week,
            "mindifficulty": "Easy",
            "maxdifficulty": "Hard",
            "maxquestions": 10,
            "allowedretries": 3,
            "feedbackstyle": "Immediate",
            "includespaced": False
        }

    # 3. If settings exist, return them
    # Safely get the ID from the SQLAlchemy object
    q_id_val = getattr(qs, 'quiz_id', getattr(qs, 'quizid', quiz_id))
    
    return {
        "id": qs.id,
        "quizid": q_id_val,
        "quiz_id": q_id_val,
        "week": qs.week,
        "mindifficulty": qs.mindifficulty,
        "maxdifficulty": qs.maxdifficulty,
        "maxquestions": qs.maxquestions,
        "allowedretries": qs.allowedretries,
        "feedbackstyle": qs.feedbackstyle,
        "includespaced": qs.includespaced
    }


@app.get("/api/quiz/questions/{quiz_id}")
def get_quiz_questions(quiz_id: str, db: Session = Depends(get_db)):
    result = db.execute(
        sql_text("SELECT id, question, options, answer, concept_id, difficulty FROM mcqs WHERE quiz_id = :quiz_id"),
        {"quiz_id": quiz_id}
    ).fetchall()
    
    mcqs = []
    for row in result:
        # Handle JSON options safely
        try:
            opts = json.loads(row[2]) if isinstance(row[2], str) else row[2]
        except:
            opts = []

        mcqs.append({
            "id": row[0],
            "question": row[1],
            "options": opts,
            "answer": row[3],
            "concept_id": row[4],
            "difficulty": row[5] or "Medium"  # <--- FALLBACK HERE
        })
    print(f"🎉 Quiz {quiz_id} + {len(mcqs)} MCQs SAVED")
    return {"mcqs": mcqs}


@app.post("/api/quiz/settings/{quiz_id}", response_model=QuizSettingsOut)
async def upsert_quiz_settings(quiz_id: str, payload: QuizSettingsIn, db: Session = Depends(get_db)):
    # 1. Find existing
    try:
        qs = db.query(QuizSettings).filter(QuizSettings.quiz_id == quiz_id).first()
    except AttributeError:
        qs = db.query(QuizSettings).filter(QuizSettings.quizid == quiz_id).first()
    
    # 2. Create if new
    if qs is None:
        qs = QuizSettings(
            week=payload.week,
            mindifficulty=payload.mindifficulty or "Easy",
            maxdifficulty=payload.maxdifficulty or "Hard",
            maxquestions=payload.maxquestions if payload.maxquestions is not None else 10,
            allowedretries=payload.allowedretries if payload.allowedretries is not None else 3,
            feedbackstyle=payload.feedbackstyle or "Immediate",
            includespaced=payload.includespaced
        )
        # Assign FK safely
        if hasattr(QuizSettings, 'quiz_id'):
            qs.quiz_id = quiz_id
        else:
            qs.quizid = quiz_id
        db.add(qs)
    else:
        # 3. Update existing
        qs.week = payload.week
        qs.mindifficulty = payload.mindifficulty or qs.mindifficulty or "Easy"
        qs.maxdifficulty = payload.maxdifficulty or qs.maxdifficulty or "Hard"
        qs.maxquestions = payload.maxquestions if payload.maxquestions is not None else qs.maxquestions
        qs.allowedretries = payload.allowedretries if payload.allowedretries is not None else qs.allowedretries
        qs.feedbackstyle = payload.feedbackstyle or qs.feedbackstyle or "Immediate"
        qs.includespaced = payload.includespaced

    db.commit()
    db.refresh(qs)
    
    # 4. Return Dict with both key variations
    q_id_val = getattr(qs, 'quiz_id', getattr(qs, 'quizid', quiz_id))
    
    return {
        "id": qs.id,
        "quizid": q_id_val,
        "quiz_id": q_id_val,
        "week": qs.week,
        "mindifficulty": qs.mindifficulty,
        "maxdifficulty": qs.maxdifficulty,
        "maxquestions": qs.maxquestions,
        "allowedretries": qs.allowedretries,
        "feedbackstyle": qs.feedbackstyle,
        "includespaced": qs.includespaced
    }

@app.post("/api/quiz/generate-title")
async def generate_quiz_title(payload: TitleGenRequest):
    """
    Generates a short, academic quiz title based on a list of concept names.
    """
    if not payload.concepts:
        return {"title": "New Quiz"}

    # Join concepts for the prompt
    topics_str = ", ".join(payload.concepts)
    
    prompt = (
        f"Generate a concise, academic quiz title (3-8 words) for a quiz covering these topics: {topics_str}. "
        "Return ONLY the title text. Do not use quotes. Do not say 'Here is the title'."
        "Examples: 'Introduction to Data Structures', 'Advanced Recursion Patterns', 'Memory Management Basics'."
    )

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = model.generate_content(prompt)
        title = response.text.strip().replace('"', '').replace("'", "")
        return {"title": title}
    except Exception as e:
        print(f"Title Gen Error: {e}")
        # Fallback if LLM fails
        return {"title": f"Quiz: {payload.concepts[0]} & more"}

# --- A. Instructor preview: KG-based sample MCQs (no DB writes) ---
@app.get("/api/quiz/preview")
async def preview_quiz(
    quiz_id: str,
    n: int = 5,
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Load KG once
    kg_row = db.execute(
        sql_text(
            "SELECT node_data, edge_data FROM knowledge_graph "
            "WHERE course_id=:c AND week=:w"
        ),
        {"c": quiz.course_id, "w": quiz.week},
    ).fetchone()
    kg_nodes = json.loads(kg_row[0]) if (kg_row and kg_row[0]) else []
    kg_edges = json.loads(kg_row[1]) if (kg_row and kg_row[1]) else []

    previews = []

    for cid in quiz.concept_ids:
        selected_node = next((n for n in kg_nodes if n["id"] == cid), None)
        if not selected_node:
            continue

        payload = {
            "course_id": quiz.course_id,
            "week": quiz.week,
            "concept_id": cid,
        }
        resp = await generate_mcqs_kg(payload, db)
        mcqs = resp.get("mcqs", [])[: max(1, n // max(1, len(quiz.concept_ids)))]

        previews.append(
            {
                "concept_id": cid,
                "concept_label": selected_node.get("label", cid),
                "mcqs": mcqs,
            }
        )

    return {"quiz_id": quiz.id, "previews": previews}


@app.post("/api/quiz/lock-preview")
async def lock_preview(payload: LockPreviewPayload, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == payload.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    created = 0
    for item in payload.items:
        cid = item.get("concept_id")
        for mcq in item.get("mcqs", []):
            if not (
                isinstance(mcq, dict)
                and "question" in mcq
                and "options" in mcq
                and "answer" in mcq
            ):
                continue
            db.add(
                MCQ(
                    id=str(uuid.uuid4()),
                    quiz_id=quiz.id,
                    concept_id=cid,
                    question=mcq["question"],
                    options=mcq["options"],
                    answer=mcq["answer"],
                )
            )
            created += 1

    db.commit()
    return {"quiz_id": quiz.id, "locked_mcqs": created}

@app.post("/api/quiz/generate-mcqs/{quiz_id}")
async def generate_quiz_mcqs(quiz_id: str, payload: GenerateQuizMCQsRequest, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz or not quiz.concept_ids:
        return {"quiz_id": quiz_id, "generated_mcqs": 0, "message": "No concepts"}

    count = 0
    target_concepts = quiz.concept_ids[:3] 

    for cid in target_concepts:
        kg_payload = {
            "course_id": quiz.course_id,
            "week": quiz.week,
            "concept_id": cid,
            "quiz_id": quiz.id  
        }
        
        try:
            gen_resp = await generate_mcqs_kg(kg_payload, db)
            new_mcqs = gen_resp.get("mcqs", [])
            
            for m in new_mcqs:
                db.add(MCQ(
                    id=str(uuid.uuid4()),
                    quiz_id=quiz.id,
                    concept_id=cid,
                    question=m.get("question"),
                    options=m.get("options"), 
                    answer=m.get("answer"),
                    difficulty=m.get("difficulty", "Medium")
                ))
                count += 1
        except Exception as e:
            print(f"Error generating for {cid}: {e}")
            continue

    db.commit()
    return {"quiz_id": quiz.id, "generated_mcqs": count}


@app.delete("/api/mcq/{mcq_id}")
async def delete_mcq(mcq_id: str, db: Session = Depends(get_db)):
    mcq = db.query(MCQ).filter(MCQ.id == mcq_id).first()
    if not mcq:
        raise HTTPException(status_code=404, detail="MCQ not found")
    db.delete(mcq)
    db.commit()
    return {"status": "deleted", "id": mcq_id}

@app.post("/api/mcq/regenerate/{mcq_id}")
async def regenerate_single_mcq(mcq_id: str, db: Session = Depends(get_db)):
    old_mcq = db.query(MCQ).filter(MCQ.id == mcq_id).first()
    if not old_mcq:
        raise HTTPException(status_code=404, detail="MCQ not found")
    
    quiz = db.query(Quiz).filter(Quiz.id == old_mcq.quiz_id).first()
    
    kg_payload = {
        "course_id": quiz.course_id,
        "week": quiz.week,
        "concept_id": old_mcq.concept_id,
        "quiz_id": quiz.id
    }
    
    try:
        gen_resp = await generate_mcqs_kg(kg_payload, db)
        new_mcqs_data = gen_resp.get("mcqs", [])
        
        if not new_mcqs_data:
             raise HTTPException(status_code=500, detail="Failed to generate replacement")

        best_new = new_mcqs_data[0]
        
        old_mcq.question = best_new["question"]
        old_mcq.options = best_new["options"]
        old_mcq.answer = best_new["answer"]
        old_mcq.difficulty = best_new.get("difficulty", "Medium")
        
        db.commit()
        return {"status": "regenerated", "mcq": {
            "id": old_mcq.id,
            "question": old_mcq.question,
            "options": old_mcq.options,
            "answer": old_mcq.answer
        }}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/student/quiz/start", response_model=QuizStartResponse)
async def start_student_quiz(
    quiz_id: str = Body(..., embed=True),
    student_id: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    # 1. Fetch Quiz & Settings
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    settings = db.query(QuizSettings).filter(QuizSettings.quiz_id == quiz_id).first()
    
    # Defaults
    max_q = settings.max_questions if settings else 10
    allowed_retries = settings.allowed_retries if settings else 3
    feedback_style = settings.feedback_style if settings else "default"

    # --- ROBUST DIFFICULTY FILTERING LOGIC ---
    # Use lowercase keys for normalization
    DIFF_LEVELS = {"easy": 1, "medium": 2, "hard": 3}
    
    # Normalize settings (Handle None or mismatch case)
    min_setting = (settings.min_difficulty or "Easy").lower()
    max_setting = (settings.max_difficulty or "Hard").lower()
    
    min_diff_val = DIFF_LEVELS.get(min_setting, 1)
    max_diff_val = DIFF_LEVELS.get(max_setting, 3)

    # 2. Check for ACTIVE incomplete attempt (Resume Logic)
    active_attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == student_id,
        QuizAttempt.score == None 
    ).first()

    completed_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == student_id,
        QuizAttempt.score != None
    ).count()
    
    # Helper to filter questions
    def get_filtered_mcqs():
        all_mcqs = db.query(MCQ).filter(MCQ.quiz_id == quiz_id).all()
        valid = []
        for m in all_mcqs:
            # Normalize DB Value
            q_diff = (m.difficulty or "Medium").lower()
            q_val = DIFF_LEVELS.get(q_diff, 2) # Default to Medium if unknown
            
            if min_diff_val <= q_val <= max_diff_val:
                valid.append(m)
        return valid, all_mcqs

    # 3. Resume Existing Attempt
    if active_attempt:
        # Re-select questions using the same logic
        valid_mcqs, all_mcqs = get_filtered_mcqs()
        
        # If filtering leaves nothing, use all_mcqs as fallback (better than empty)
        target_pool = valid_mcqs if valid_mcqs else all_mcqs
        
        selected_mcqs = random.sample(target_pool, min(len(target_pool), max_q))
        
        return {
            "attempt_id": active_attempt.id,
            "questions": [
                {
                    "id": m.id,
                    "question": m.question,
                    "options": m.options, 
                    "difficulty": m.difficulty
                } for m in selected_mcqs
            ],
            "settings": {
                "feedback_style": feedback_style,
                "max_questions": max_q
            },
            "retries_left": max(0, allowed_retries - completed_attempts)
        }

    # 4. Check Retries (Only count COMPLETED attempts)
    if completed_attempts >= allowed_retries:
         raise HTTPException(status_code=403, detail="No retries remaining")

    # 5. Create NEW Attempt with Filtering
    valid_mcqs, all_mcqs = get_filtered_mcqs()
    
    # STRICT FILTERING: 
    # If we have valid questions, use ONLY them.
    # If we have ZERO valid questions (e.g. settings=Easy, DB=Hard only), 
    # we have two choices: Return empty (error) OR fallback.
    # Safe choice: Fallback to all_mcqs but maybe warn? For now, fallback.
    target_pool = valid_mcqs if valid_mcqs else all_mcqs 
    
    if not target_pool:
        # Quiz is literally empty
        return {
            "attempt_id": "error",
            "questions": [],
            "settings": {},
            "retries_left": 0
        }

    selected_mcqs = random.sample(target_pool, min(len(target_pool), max_q))
    
    attempt_id = str(uuid.uuid4())
    new_attempt = QuizAttempt(
        id=attempt_id,
        quiz_id=quiz_id,
        student_id=student_id,
        responses={} 
    )
    db.add(new_attempt)
    db.commit()
    
    return {
        "attempt_id": attempt_id,
        "questions": [
            {
                "id": m.id,
                "question": m.question,
                "options": m.options, 
                "difficulty": m.difficulty
            } for m in selected_mcqs
        ],
        "settings": {
            "feedback_style": feedback_style,
            "max_questions": max_q
        },
        "retries_left": max(0, allowed_retries - completed_attempts)
    }

@app.put("/api/mcq/{mcq_id}")
async def update_mcq(mcq_id: str, payload: MCQUpdate, db: Session = Depends(get_db)):
    """
    Update an existing MCQ.
    """
    mcq = db.query(MCQ).filter(MCQ.id == mcq_id).first()
    if not mcq:
        raise HTTPException(status_code=404, detail="MCQ not found")
    
    mcq.question = payload.question
    mcq.options = payload.options
    mcq.answer = payload.answer
    if payload.difficulty:
        mcq.difficulty = payload.difficulty
        
    db.commit()
    db.refresh(mcq)
    
    return {
        "status": "updated",
        "mcq": {
            "id": mcq.id,
            "question": mcq.question,
            "options": mcq.options,
            "answer": mcq.answer,
            "difficulty": mcq.difficulty
        }
    }


@app.post("/api/student/quiz/submit")
async def submit_quiz_attempt(
    attempt_id: str = Body(..., embed=True),
    responses: dict = Body(..., embed=True), # {mcq_id: "selected_option"}
    db: Session = Depends(get_db)
):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Check if already submitted
    if attempt.score is not None:
        # Return existing results if user double-submits
        # (You might want to fetch and recalculate or just return stored state)
        pass 

    # Get Settings for Feedback Style
    settings = db.query(QuizSettings).filter(QuizSettings.quiz_id == attempt.quiz_id).first()
    style = settings.feedback_style if settings else "default"
    
    results = []
    score = 0
    total = len(responses) # Or total questions in quiz? Better to use len(responses) for now.
    
    for mcq_id, selected_opt in responses.items():
        mcq = db.query(MCQ).filter(MCQ.id == mcq_id).first()
        
        # Handle case where MCQ might be deleted or invalid
        if not mcq: 
            results.append({
                "mcq_id": mcq_id,
                "selected": selected_opt,
                "correct": False,
                "error": "Question not found"
            })
            continue
        
        is_correct = (selected_opt == mcq.answer)
        if is_correct: score += 1
        
        feedback_item = {
            "mcq_id": mcq_id,
            "selected": selected_opt, # <--- THIS IS CRITICAL FOR "Skipped" FIX
            "correct": is_correct
        }
        
        # Apply Feedback Settings
        if style == "none":
            # No hint, no answer
            pass 
        elif style == "hint":
            # Only hint if wrong
            if not is_correct:
                # You can store specific hints in DB, or generate generic one
                feedback_item["hint"] = f"Review the concept: {mcq.concept_id or 'General'}"
        else: # "default" or "full"
            # Show correct answer
            feedback_item["correct_answer"] = mcq.answer
            
        results.append(feedback_item)
        
    # Save to DB
    attempt.score = score
    attempt.responses = responses # Save raw JSON map
    db.commit()
    
    return {
        "score": score,
        "total": total,
        "results": results, 
        "style": style
    }

@app.post("/api/student/quiz/check-answer")
async def check_answer_mcq(
    quiz_id: str = Body(..., embed=True),
    mcq_id: str = Body(..., embed=True),
    selected_opt: str = Body(..., embed=True),
    attempt_count: int = Body(1, embed=True),
    db: Session = Depends(get_db)
):
    # 1. Get Question & Settings
    mcq = db.query(MCQ).filter(MCQ.id == mcq_id).first()
    settings = db.query(QuizSettings).filter(QuizSettings.quiz_id == quiz_id).first()
    
    if not mcq:
        raise HTTPException(status_code=404, detail="Question not found")

    # 2. Normalize Settings
    # Handle "Hint only", "Hint", "hint", etc. by normalizing string
    raw_style = settings.feedback_style if settings else "default"
    style = raw_style.lower().strip() 
    
    max_retries = settings.allowed_retries if settings else 3
    is_correct = (mcq.answer == selected_opt)
    
    response = {
        "correct": is_correct,
        "style": raw_style,
        "retries_exhausted": False
    }

    # 3. Logic for Incorrect Answers
    if not is_correct:
        # Check if attempts are strictly LESS than max (e.g., attempt 1 of 3, 2 of 3)
        # If attempt_count == max_retries, they just used their last try.
        if attempt_count < max_retries:
            response["retries_exhausted"] = False
            
            # --- ROBUST STYLE CHECK ---
            # Checks if "hint" is anywhere in the setting name (e.g. "Hint only")
            if "hint" in style:
                concept_text = mcq.concept_id if mcq.concept_id else "course concepts"
                response["hint"] = f"Review: {concept_text}"
            
            # Default behavior (Immediate Feedback) often just says "Incorrect"
            elif "default" in style or "immediate" in style:
                response["hint"] = "Incorrect. Try again."
                
        else:
            # Last attempt used -> Exhausted
            response["retries_exhausted"] = True
            response["correct_answer"] = mcq.answer
            response["hint"] = "No more retries."

    return response


async def generate_knowledge_graph(course_id: str, week: int, processing_id: str, db: Session):
    """
    Analyzes lecture slides to build a hierarchical concept map.
    Forces 'main_topic' to be the root node.
    """
    try:
        print(f"[KG START] Generating graph for Course: {course_id}, Week: {week}")
        
        # Get upload record for status updates
        upload_record = db.query(LectureProcessing).filter(LectureProcessing.id == processing_id).first()

        # 1. Fetch Text Content
        segments = db.query(Segment).filter(
            Segment.course_id == course_id, 
            Segment.week == week
        ).all()
        
        if not segments:
            print("[KG SKIP] No segments found.")
            return

        full_text = "\n".join([s.content for s in segments if s.content])[:15000]
        file_name = upload_record.file_name if upload_record else "Lecture Topic"

        # 2. Call LLM
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        You are an expert computer science instructor. Analyze the following lecture content from "{file_name}".
        
        STEP 1: Identify the SINGLE main topic (e.g., "Stacks", "Queue").
        STEP 2: Identify sub-concepts and their relationships.

        Return valid JSON:
        {{
            "main_topic": "The single overarching topic string",
            "nodes": [ {{"id": "Concept Name", "label": "Display Label"}} ],
            "edges": [ {{"source": "Parent ID", "target": "Child ID", "relation": "..."}} ]
        }}

        RULES:
        - "main_topic" is the absolute root.
        - All concepts must connect back to "main_topic".
        - No disconnected islands.

        Context:
        {full_text}
        """

        response = model.generate_content(prompt)
        # robust json cleaning
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_text)

        # 3. Process Hierarchy
        main_topic = data.get("main_topic", file_name.replace(".pdf", ""))
        raw_nodes = data.get("nodes", [])
        raw_edges = data.get("edges", [])

        print(f"[KG LOGIC] Main Topic: {main_topic}")

        # Use the compute_levels helper we defined earlier
        final_nodes, final_edges = compute_levels(raw_nodes, raw_edges, explicit_root=main_topic)

        # 4. Save to DB
        existing_kg = db.query(KnowledgeGraphBase).filter(
            KnowledgeGraphBase.course_id == course_id,
            KnowledgeGraphBase.week == week
        ).first()

        node_json = json.dumps(final_nodes)
        edge_json = json.dumps(final_edges)

        if existing_kg:
            existing_kg.node_data = node_json
            existing_kg.edge_data = edge_json
        else:
            new_kg = KnowledgeGraphBase(
                id=str(uuid.uuid4()),
                course_id=course_id,
                week=week,
                node_data=node_json,
                edge_data=edge_json
            )
            db.add(new_kg)

        # 5. Mark Processing Complete
        if upload_record:
            upload_record.status = "done"
            upload_record.progress = 100
        
        db.commit()
        print("[KG SUCCESS] Graph saved.")

    except Exception as e:
        print(f"[KG ERROR] {str(e)}")
        traceback.print_exc()
        if upload_record:
            upload_record.status = "error"
            upload_record.error_message = str(e)
            db.commit()