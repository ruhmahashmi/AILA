# aila_backend/models.py

from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, func, Index, PrimaryKeyConstraint
from sqlalchemy.orm import relationship, declarative_base, sessionmaker
from sqlalchemy.dialects.sqlite import DATETIME
from sqlalchemy.sql import func
import uuid
from aila_backend.database import Base



# ---------- CORE ENTITIES ----------

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    instructor_id = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    instructor = relationship("User")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(36), ForeignKey("courses.id"))
    student_id = Column(String(36), ForeignKey("users.id"))
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------- LECTURE FILES & SEGMENTS ----------

class LectureUpload(Base):
    __tablename__ = "lecture_uploads"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(36), ForeignKey("courses.id"))
    week = Column(Integer, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(255), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="uploaded")
    error = Column(Text, nullable=True)


class LectureProcessing(Base):
    __tablename__ = "lecture_processing"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String, index=True)
    week = Column(Integer)
    file_name = Column(String)
    status = Column(String, default="pending")  # pending, processing, done, error
    progress = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Segment(Base):
    __tablename__ = "segments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    upload_id = Column(String, ForeignKey("lecture_uploads.id"), index=True, nullable=True)
    course_id = Column(String, index=True)
    week = Column(Integer)
    segment_index = Column(Integer)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    keywords = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)


# ---------- KNOWLEDGE GRAPH ----------

class KnowledgeGraph(Base):
    __tablename__ = "knowledge_graph"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String, index=True)
    week = Column(Integer)

    # distinguish master vs file-specific graphs
    graph_type = Column(String, default="master")   # 'master' or 'file'
    source_file = Column(String, nullable=True)     # filename if graph_type='file'

    node_data = Column(Text)  # JSON string
    edge_data = Column(Text)  # JSON string


# ---------- QUIZZES & MCQs ----------

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    course_id = Column(String, index=True)
    week = Column(Integer)
    concept_ids = Column(JSON, nullable=True)  # list of concept IDs
    instructor_id = Column(String, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mcqs = relationship("MCQ", back_populates="quiz")


class MCQ(Base):
    __tablename__ = "mcq"  

    id = Column(String(36), primary_key=True, index=True)
    quiz_id = Column(String(36), ForeignKey("quizzes.id"))
    concept_id = Column(String(36))
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    answer = Column(String(255), nullable=False)
    difficulty = Column(String(20), default="Medium")
    bloom_level = Column(String(20), default="Remember")  

    quiz = relationship("Quiz", back_populates="mcqs")


class QuizSettings(Base):
    __tablename__ = "quiz_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    quiz_id = Column(String, ForeignKey("quizzes.id"), nullable=False)
    week = Column(Integer)

    min_difficulty = Column(String, default="Easy")
    max_difficulty = Column(String, default="Hard")
    min_bloom_level = Column(String, default="Remember")  
    max_bloom_level = Column(String, default="Create")    
    max_questions = Column(Integer, default=10)
    allowed_retries = Column(Integer, default=3)
    feedback_style = Column(String, default="Immediate")
    include_spaced = Column(Boolean, default=False)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(String(50), primary_key=True, index=True)
    quiz_id = Column(String(50), ForeignKey("quizzes.id"))
    student_id = Column(String(50), ForeignKey("users.id"))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), onupdate=func.now())
    responses = Column(JSON, default=dict)  # {mcq_id: {...}}
    created_at = Column(DateTime, default=func.now())
    score = Column(Integer, default=0)           
    total_questions = Column(Integer, default=0) 
    completed = Column(Boolean, default=False)


class MCQResponse(Base):
    __tablename__ = "mcq_responses"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    attempt_id = Column(String(36), ForeignKey("quiz_attempts.id"))
    mcq_id = Column(String(36), ForeignKey("mcq.id"))  
    question = Column(Text, nullable=False)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    selected_answer = Column(String, nullable=False)  # ✅ this exists
    is_correct = Column(Boolean, default=False)       # ✅ this exists

    __table_args__ = (
        PrimaryKeyConstraint("attempt_id", "mcq_id"),
        Index("ix_mcq_response_attempt", "attempt_id"),
        Index("ix_mcq_response_mcq", "mcq_id"),
    )
