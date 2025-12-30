// app/instructor/course/[id]/week/[weekNumber]/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import UploadLectureForm from "../../../../../components/UploadLectureForm";
import ProcessingFileStatus from "../../../../../components/ProcessingFileStatus";
import SlideViewer from "../../../../../components/SlideViewer";
import QuizCreator from "../../../../../components/QuizCreator";
import UploadedFilesList from "../../../../../components/UploadedFilesList";
import ConceptGraph from "../../../../../components/ConceptGraph";
import QuizSettingsForm from "../../../../../components/QuizSettingsForm";

const BACKEND_URL = "http://localhost:8000";
const WEEK_COUNT = 11;

export default function CourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();
  const week = Number(weekNumber);

  const [knowledgeGraph, setKnowledgeGraph] = useState({ nodes: [], edges: [] });
  const [activeConceptId, setActiveConceptId] = useState(null);
  const [processingFiles, setProcessingFiles] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizStats, setQuizStats] = useState(null);
  const [quizPreview, setQuizPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);


  // --- data fetchers ---

  const fetchKnowledgeGraph = () => {
    fetch(
      `${BACKEND_URL}/api/knowledge-graph/?course_id=${courseId}&week=${weekNumber}`
    )
      .then((res) => res.json())
      .then((data) => setKnowledgeGraph(data))
      .catch(() => setKnowledgeGraph({ nodes: [], edges: [] }));
  };

  const fetchQuizzes = () => {
    fetch(`${BACKEND_URL}/api/quiz/list?course_id=${courseId}&week=${weekNumber}`)
      .then((res) => res.json())
      .then(setQuizzes)
      .catch(() => setQuizzes([]));
  };

  const fetchQuizStats = () => {
    if (!selectedQuizId) {
      setQuizStats(null);
      return;
    }
    fetch(`${BACKEND_URL}/api/quiz/stats?quiz_id=${selectedQuizId}`)
      .then((res) => res.json())
      .then(setQuizStats)
      .catch(() => setQuizStats(null));
  };

  // --- effects ---

  useEffect(() => {
    fetchKnowledgeGraph();
    fetchQuizzes();
    setActiveConceptId(null);
    setSelectedQuizId(null);
    setQuizStats(null);
    setQuizPreview(null);
  }, [courseId, weekNumber]);

  useEffect(() => {
    if (knowledgeGraph.nodes.length > 0 && !activeConceptId) {
      setActiveConceptId(knowledgeGraph.nodes[0].id);
    }
  }, [knowledgeGraph.nodes, activeConceptId]);

  useEffect(() => {
    fetchQuizStats();
    setQuizPreview(null); // clear preview when switching quizzes
  }, [selectedQuizId]);

  useEffect(() => {
    if (processingFiles.length === 0) return;

    const intervalId = setInterval(() => {
      Promise.all(
        processingFiles.map(({ processingId }) =>
          fetch(
            `${BACKEND_URL}/api/lecture-status/?processing_id=${processingId}`
          )
            .then((res) => res.json())
            .then((data) => ({ ...data, processingId }))
            .catch(() => ({ status: "error", processingId }))
        )
      ).then((results) => {
        const doneJobs = results.filter((r) => r.status === "done");
        if (doneJobs.length > 0) {
          fetchKnowledgeGraph();
          fetchQuizzes();
          setProcessingFiles((prev) =>
            prev.filter(
              (f) =>
                !doneJobs.some((d) => d.processingId === f.processingId)
            )
          );
        }
      });
    }, 3000);

    return () => clearInterval(intervalId);
  }, [processingFiles, courseId, weekNumber]);

  // --- handlers ---

  const handleProcessingStarted = (processingId, fileName) => {
    setProcessingFiles((prev) => [...prev, { processingId, fileName }]);
  };

  const handleClickConcept = (id) => {
    setActiveConceptId(id);
  };

  const handleSelectQuiz = (id) => {
    console.log("Clicked quiz", id);
    setSelectedQuizId(id);
  };

  // NEW: load quiz preview from backend
  const loadPreview = async () => {
    if (!selectedQuizId) return;
    try {
      setLoadingPreview(true);
      const res = await fetch(
        `${BACKEND_URL}/api/quiz/questions/${selectedQuizId}`
      );
      if (!res.ok) {
        console.error("Failed to load quiz preview");
        setQuizPreview(null);
        return;
      }
      const data = await res.json(); // expect { mcqs: [...] }
      setQuizPreview(data);
    } catch (e) {
      console.error("Error loading quiz preview", e);
      setQuizPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const activeConcept =
    knowledgeGraph.nodes.find((node) => node.id === activeConceptId) || null;

  const WeekSelector = () => (
    <div className="p-6 pt-8">
      <h3 className="font-bold text-lg mb-4 text-gray-800">Select Week</h3>
      <div className="space-y-2">
        {Array.from({ length: WEEK_COUNT }, (_, i) => {
          const w = i + 1;
          const isActive = String(weekNumber) === String(w);
          return (
            <button
              key={w}
              onClick={() =>
                !isActive &&
                router.push(`/instructor/course/${courseId}/week/${w}`)
              }
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-700 hover:bg-gray-100 hover:shadow"
              }`}
            >
              Week {w}
            </button>
          );
        })}
      </div>
    </div>
  );

  // --- render ---

  console.log("selectedQuizId in render", selectedQuizId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT SIDEBAR */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-lg z-50 flex-shrink-0">
        <div className="h-full overflow-y-auto">
          <WeekSelector />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto pb-10">
          <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Week {weekNumber} — Lecture Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Course ID: {courseId}</p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Upload Lecture Slides</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    PDF or PPTX • This powers your concept map & quizzes
                  </p>
                </div>
                <UploadLectureForm
                  courseId={courseId}
                  weekNumber={weekNumber}
                  onUploadComplete={handleProcessingStarted}
                />
              </div>
            </div>

            <UploadedFilesList
              courseId={courseId}
              week={weekNumber}
              onReload={fetchKnowledgeGraph}
            />

            {processingFiles.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Processing Files...
                </h3>
                {processingFiles.map(({ processingId, fileName }) => (
                  <ProcessingFileStatus
                    key={processingId}
                    processingId={processingId}
                    fileName={fileName}
                  />
                ))}
              </div>
            )}

            {/* Concept Map */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <ConceptGraph
                nodes={knowledgeGraph.nodes}
                edges={knowledgeGraph.edges}
                onSelect={handleClickConcept}
              />
            </div>

            {/* Concept Details */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Concept Details</h2>
              <SlideViewer
                concept={activeConcept}
                courseId={courseId}
                week={weekNumber}
              />
            </div>

            {/* Quiz Creator */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <QuizCreator
                courseId={courseId}
                week={weekNumber}
                concepts={knowledgeGraph.nodes}
                onQuizCreated={fetchQuizzes}
              />
            </div>

            {/* Quizzes List + Settings */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4">
                  Quizzes for Week {weekNumber}
                </h2>
                {quizzes.length === 0 ? (
                  <p className="text-gray-500 italic">
                    No quizzes created yet. Create one above!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {quizzes.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleSelectQuiz(q.id)}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                          selectedQuizId === q.id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300 hover:shadow"
                        }`}
                      >
                        <div className="font-semibold text-lg">{q.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Concepts:{" "}
                          {q.concept_ids
                            .map(
                              (cid) =>
                                knowledgeGraph.nodes.find((n) => n.id === cid)
                                  ?.label || cid
                            )
                            .join(", ")}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedQuizId && (
                <QuizSettingsForm quizId={selectedQuizId} week={week} />
              )}

              {selectedQuizId && (
                <button
                  onClick={loadPreview}
                  disabled={loadingPreview}
                  className="text-sm text-blue-600 underline"
                >
                  {loadingPreview ? "Loading preview..." : "Preview questions"}
                </button>
              )}

              {quizPreview && quizPreview.mcqs && (
                <div className="mt-4 space-y-3 text-sm">
                  {quizPreview.mcqs.map((q, i) => (
                    <div key={i} className="border rounded p-3">
                      <div className="font-semibold">
                        Q{i + 1}. {q.question}
                      </div>
                      <ul className="list-disc ml-5 mt-1">
                        {q.options.map((opt, j) => (
                          <li key={j}>{opt}</li>
                        ))}
                      </ul>
                      <div className="mt-1 text-green-700">
                        Correct: {q.answer}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {quizStats && (
                <div className="text-sm text-gray-700">
                  <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(quizStats, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
