# aila_backend/models.py
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from database import Base

class LectureProcessing(Base):
    __tablename__ = "lecture_processing"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String, index=True)
    week = Column(Integer)
    file_name = Column(String)
    status = Column(String, default="pending") # pending, processing, done, error
    progress = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class KnowledgeGraph(Base):
    __tablename__ = "knowledge_graph"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String, index=True)
    week = Column(Integer)
    node_data = Column(Text)  # JSON string of nodes
    edge_data = Column(Text)  # JSON string of edges

class Segment(Base):
    __tablename__ = "segments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Optional: link to upload if you have a LectureUpload model, otherwise loose link
    upload_id = Column(String, index=True, nullable=True) 
    course_id = Column(String, index=True)
    week = Column(Integer)
    segment_index = Column(Integer)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    keywords = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    course_id = Column(String, index=True)
    week = Column(Integer)
    # Storing list of concept IDs as JSON
    concept_ids = Column(JSON, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    mcqs = relationship("MCQ", back_populates="quiz")

class MCQ(Base):
    __tablename__ = "mcqs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = Column(String, ForeignKey("quizzes.id"), nullable=True)
    concept_id = Column(String, nullable=True)
    segment_id = Column(String, ForeignKey("segments.id"), nullable=True)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False) # List of strings ["A", "B", "C", "D"]
    answer = Column(Text, nullable=True)   # The correct answer string
    difficulty = Column(String, default="Medium")

    quiz = relationship("Quiz", back_populates="mcqs")
    segment = relationship("Segment")

class QuizSettings(Base):
    __tablename__ = "quiz_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    quiz_id = Column(String, ForeignKey("quizzes.id"), nullable=False)
    week = Column(Integer)
    min_difficulty = Column(String, nullable=True)
    max_difficulty = Column(String, nullable=True)
    max_questions = Column(Integer, nullable=True)
    allowed_retries = Column(Integer, nullable=True)
    feedback_style = Column(String, nullable=True)
    include_spaced = Column(Boolean, default=False)
