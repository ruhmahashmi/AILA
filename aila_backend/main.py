from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import fitz  # PyMuPDF
from pptx import Presentation
from supabase import create_client, Client
from llama_index.llms.gemini import Gemini
import uuid

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")
if google_api_key:
    os.environ["GOOGLE_API_KEY"] = google_api_key

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
llm = Gemini(model="models/gemini-2.5-flash")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def download_from_supabase(bucket: str, file_path: str, save_as: str):
    response = supabase.storage.from_(bucket).download(file_path)
    if not response:
        raise HTTPException(status_code=404, detail="File not found in Supabase Storage")
    with open(save_as, "wb") as f:
        f.write(response)

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

def parse_and_store(job_id, course_id, file_name):
    bucket = "lecture-materials"
    supabase_path = f"{course_id}/{file_name}"
    local_path = f"uploads/{course_id}_{file_name}"
    os.makedirs("uploads", exist_ok=True)
    try:
        download_from_supabase(bucket, supabase_path, local_path)
        supabase.table('lecture_processing').update({"progress": 10}).eq('id', job_id).execute()
        if file_name.lower().endswith('.pdf'):
            segments = extract_text_segments(local_path)
        elif file_name.lower().endswith('.pptx'):
            segments = extract_text_from_pptx(local_path)
        else:
            raise Exception("Unsupported file type")
        supabase.table('lecture_processing').update({"progress": 30}).eq('id', job_id).execute()
        summaries = []
        total_segments = len(segments)
        for idx, segment in enumerate(segments):
            if segment.strip():
                resp = llm.complete(f"Summarize this lecture segment:\n{segment}")
                summaries.append(str(resp))
            else:
                summaries.append("")
            progress = 30 + 70 * (idx + 1) / total_segments if total_segments else 100
            supabase.table('lecture_processing').update({"progress": progress}).eq('id', job_id).execute()
        result = {
            "segments": segments,
            "summaries": summaries,
        }
        supabase.table('lecture_processing').update({
            "progress": 100,
            "status": "done",
            "result": result
        }).eq('id', job_id).execute()
    except Exception as e:
        supabase.table('lecture_processing').update({
            "status": "error",
            "error": str(e),
            "progress": 100
        }).eq('id', job_id).execute()

class ProcessLectureRequest(BaseModel):
    file_name: str
    course_id: str

@app.post("/process-lecture/")
async def process_lecture(request: ProcessLectureRequest, background_tasks: BackgroundTasks):
    course_id = request.course_id
    file_name = request.file_name
    job_id = str(uuid.uuid4())
    supabase.table('lecture_processing').insert({
        "id": job_id,
        "course_id": course_id,
        "file_name": file_name,
        "status": "pending",
        "progress": 0
    }).execute()
    background_tasks.add_task(parse_and_store, job_id, course_id, file_name)
    return {"status": "processing started", "job_id": job_id}

@app.get("/lecture-status/")
async def lecture_status(course_id: str, file_name: str):
    job = supabase.table('lecture_processing') \
        .select('*') \
        .eq('course_id', course_id) \
        .eq('file_name', file_name) \
        .order('created_at', desc=True) \
        .limit(1) \
        .execute()
    if not job.data:
        return {"status": "not found"}
    job = job.data[0]
    return {
        "status": job['status'],
        "progress": job.get('progress', 0),
        "result": job.get('result'),
        "error": job.get('error')
    }

@app.get("/lecture-history/")
async def lecture_history(course_id: str):
    jobs = supabase.table('lecture_processing') \
        .select('*') \
        .eq('course_id', course_id) \
        .order('created_at', desc=True) \
        .execute()
    return jobs.data if jobs.data else []

@app.get("/")
async def root():
    return {"message": "AILA Backend is running"}
