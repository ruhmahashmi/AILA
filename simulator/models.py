from dataclasses import dataclass

@dataclass
class ConceptNode:
    concept_id: int
    name: str
    neighbors: list

@dataclass
class Question:
    question_id: int
    concept_id: int
    slip: float = 0.10
    guess: float = 0.20

@dataclass
class Student:
    student_id: int
    profile_type: str
    true_mastery: dict

@dataclass
class EstimatedMastery:
    mastery: dict