// app/instructor/course/[id]/week/[weekNumber]/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import UploadLectureForm from "../../../../../components/UploadLectureForm";
import ProcessingFileStatus from "../../../../../components/ProcessingFileStatus";
import SlideViewer from "../../../../../components/SlideViewer";
import QuizCreator from "../../../../../components/QuizCreator";
import UploadedFilesList from "../../../../../components/UploadedFilesList";
import ConceptGraph from "../../../../../components/ConceptGraph";
import QuizSettingsForm from "../../../../../components/QuizSettingsForm";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const WEEK_COUNT = 11;

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { _raw: text };
  }
}

export default function CourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();
  const week = Number(weekNumber);

  const [knowledgeGraph, setKnowledgeGraph] = useState({ nodes: [], edges: [] });
  const [kgError, setKgError] = useState(null);
  const [isLoadingKG, setIsLoadingKG] = useState(true);

  const [activeConceptId, setActiveConceptId] = useState(null);
  const [processingFiles, setProcessingFiles] = useState([]);

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  const [quizStats, setQuizStats] = useState(null);
  const [quizPreview, setQuizPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  

  const fetchKnowledgeGraph = useCallback(async () => {
    if (!courseId || !Number.isFinite(week)) return;

    setIsLoadingKG(true);
    setKgError(null);

    const url = `${BACKEND_URL}/api/knowledge-graph?courseid=${encodeURIComponent(
      courseId
    )}&week=${encodeURIComponent(String(week))}`;

    try {
      console.log("🔄 Fetching KG:", url);
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(`KG HTTP ${res.status}. Body: ${JSON.stringify(body)}`);
      }

      const data = await safeJson(res);
      console.log("🧠 KG API Response:", data);

      const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
      const edges = Array.isArray(data?.edges) ? data.edges : [];

      console.log(`✅ KG LOADED: nodes=${nodes.length} edges=${edges.length}`);
      setKnowledgeGraph({ nodes, edges });
    } catch (e) {
      console.error("❌ KG fetch error:", e);
      setKgError(e.message || String(e)); 
      setKnowledgeGraph({ nodes: [], edges: [] });
    } finally {
      setIsLoadingKG(false);
    }
  }, [courseId, week]);

  const fetchQuizzes = useCallback(async () => {
    if (!courseId || !Number.isFinite(week)) return;

    const url = `${BACKEND_URL}/api/quiz/list?course_id=${encodeURIComponent(
      courseId
    )}&week=${encodeURIComponent(String(week))}&_t=${Date.now()}`;

    try {
      console.log("📋 Fetching quizzes from:", url);
      const res = await fetch(url, { cache: "no-store" });
      const data = await safeJson(res);
      console.log("📋 Quizzes loaded:", data?.length || 0);
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("❌ Quizzes fetch error:", e);
      setQuizzes([]);
    }
  }, [courseId, week]);

  const handleProcessingStarted = useCallback((processingId, fileName) => {
    setProcessingFiles((prev) => [...prev, { processingId, fileName }]);
  }, []);

  const handleClickConcept = useCallback((id) => {
    setActiveConceptId(id);
  }, []);

  const handleSelectQuiz = useCallback((id) => {
    setSelectedQuizId(id);
  }, []);

  const loadPreview = useCallback(async () => {
    if (!selectedQuizId) return;

    try {
      setLoadingPreview(true);
      setPreviewError(null);

      const res = await fetch(`${BACKEND_URL}/api/quiz/questions/${selectedQuizId}`, {
        cache: "no-store"
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(`Preview HTTP ${res.status}. Body: ${JSON.stringify(body)}`);
      }

      const data = await safeJson(res);
      // normalize to { mcqs: [] }
      const mcqs = Array.isArray(data) ? data : Array.isArray(data?.mcqs) ? data.mcqs : [];
      setQuizPreview({ mcqs });
    } catch (e) {
      console.error("❌ Preview error:", e);
      setPreviewError(e.message || String(e));
      setQuizPreview({ mcqs: [] });
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedQuizId]);

  const fetchQuizStats = useCallback(async () => {
    if (!selectedQuizId) {
      setQuizStats(null);
      return;
    }

    const candidates = [
      `${BACKEND_URL}/api/quiz/stats?quiz_id=${encodeURIComponent(selectedQuizId)}`,
      `${BACKEND_URL}/api/quiz/stats?quizid=${encodeURIComponent(selectedQuizId)}`,
      `${BACKEND_URL}/api/quiz/stats/${encodeURIComponent(selectedQuizId)}`
    ];

    try {
      for (const url of candidates) {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await safeJson(res);
          setQuizStats(data);
          return;
        }
      }
      setQuizStats(null);
    } catch (e) {
      console.error("❌ Stats error:", e);
      setQuizStats(null);
    }
  }, [selectedQuizId]);

  const generateQuizMCQs = useCallback(async () => {
    if (!selectedQuizId) return;

    try {
      setLoadingPreview(true);
      setPreviewError(null);

      const res = await fetch(`${BACKEND_URL}/api/quiz/generate-mcqs/${selectedQuizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_from_concepts" })
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(`Generate HTTP ${res.status}. Body: ${JSON.stringify(body)}`);
      }

      await loadPreview();
      await fetchQuizStats();
    } catch (e) {
      console.error("❌ Generate error:", e);
      setPreviewError(e.message || String(e));
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedQuizId, loadPreview, fetchQuizStats]);

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
              onClick={() => !isActive && router.push(`/instructor/course/${courseId}/week/${w}`)}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                isActive ? "bg-blue-600 text-white shadow-lg" : "text-gray-700 hover:bg-gray-100 hover:shadow"
              }`}
            >
              Week {w}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Initial load
  useEffect(() => {
    setActiveConceptId(null);
    setSelectedQuizId(null);
    setQuizStats(null);
    setQuizPreview(null);
    setPreviewError(null);

    fetchKnowledgeGraph();
    fetchQuizzes();
  }, [fetchKnowledgeGraph, fetchQuizzes]);

  // Auto-select concept
  useEffect(() => {
    if (knowledgeGraph.nodes.length > 0 && !activeConceptId) {
      const firstRoot = knowledgeGraph.nodes.find((n) => n.isRoot) || knowledgeGraph.nodes[0];
      setActiveConceptId(firstRoot.id);
    }
  }, [knowledgeGraph.nodes, activeConceptId]);

  // Load quiz details when selected
  useEffect(() => {
    if (selectedQuizId) {
      loadPreview();
      fetchQuizStats();
    } else {
      setQuizPreview(null);
      setPreviewError(null);
      setQuizStats(null);
    }
  }, [selectedQuizId, loadPreview, fetchQuizStats]);

  // Polling
  useEffect(() => {
    if (processingFiles.length === 0) return;

    const intervalId = setInterval(async () => {
      const results = await Promise.all(
        processingFiles.map(async ({ processingId }) => {
          try {
            const res = await fetch(
              `${BACKEND_URL}/api/lecture-status?processingid=${encodeURIComponent(processingId)}`,
              { cache: "no-store" }
            );
            const data = await safeJson(res);
            return { ...data, processingId };
          } catch {
            return { status: "error", processingId };
          }
        })
      );

      const doneJobs = results.filter((r) => r.status === "done");
      if (doneJobs.length > 0) {
        await fetchKnowledgeGraph();
        await fetchQuizzes();
        setProcessingFiles((prev) => prev.filter((f) => !doneJobs.some((d) => d.processingId === f.processingId)));
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [processingFiles, fetchKnowledgeGraph, fetchQuizzes]);

  const activeConcept =
    knowledgeGraph.nodes?.find((node) => node.id === activeConceptId) || null;

  if (isLoadingKG && knowledgeGraph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">
            Loading Week {weekNumber} Knowledge Graph...
          </p>
          {kgError && <p className="text-sm text-red-600 mt-2">{String(kgError)}</p>}
        </div>
      </div>
    );
  }

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
                <h3 className="font-semibold text-blue-900 mb-3">Processing Files...</h3>
                {processingFiles.map(({ processingId, fileName }) => (
                  <ProcessingFileStatus
                    key={processingId}
                    processingId={processingId}
                    fileName={fileName}
                  />
                ))}
              </div>
            )}

            {/* KG Debug */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-yellow-900">KG Debug</div>
                <button
                  onClick={fetchKnowledgeGraph}
                  className="text-xs px-2 py-1 rounded bg-white border hover:bg-gray-50"
                >
                  Refresh KG
                </button>
              </div>
              <div className="mt-2 text-yellow-900">
                nodes={knowledgeGraph.nodes.length} edges={knowledgeGraph.edges.length} loading={String(isLoadingKG)}
              </div>
              {kgError && <div className="mt-1 text-red-700">Error: {String(kgError)}</div>}
            </div>

            {/* Concept Map */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    🧠 Concept Map ({knowledgeGraph.nodes.length} nodes, {knowledgeGraph.edges.length} edges)
                  </h3>
                  <button
                    onClick={fetchKnowledgeGraph}
                    className="text-sm text-blue-600 hover:underline"
                    disabled={isLoadingKG}
                  >
                    🔄 Refresh
                  </button>
                </div>
                {knowledgeGraph.nodes.length === 0 && !isLoadingKG && (
                  <p className="text-center py-8 text-gray-500">
                    No concepts yet. Upload slides to generate knowledge graph!
                  </p>
                )}
              </div>

              <ConceptGraph
                nodes={knowledgeGraph.nodes}
                edges={knowledgeGraph.edges}
                onSelect={handleClickConcept}
              />
            </div>

            {/* Concept Details */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Concept Details</h2>
              <SlideViewer concept={activeConcept} courseId={courseId} week={weekNumber} />
            </div>

            {/* Quiz Creator */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
            <QuizCreator
              key={`${courseId}-${weekNumber}`}
              courseId={courseId}
              week={Number(weekNumber)}
              concepts={knowledgeGraph.nodes}
              onQuizCreated={() => {
                fetchQuizzes();
              }}
            />
            </div>

            {/* Quizzes List + Settings */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4">Quizzes for Week {weekNumber}</h2>
                {Array.isArray(quizzes) && quizzes.length > 0 ? (
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
                          {(q.concept_ids || q.conceptids || [])
                            .map((cid) => {
                              const node = knowledgeGraph.nodes?.find((n) => n.id === cid);
                              return node?.label || cid;
                            })
                            .join(", ") || "None"}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No quizzes created yet. Create one above!</p>
                )}
              </div>

              {selectedQuizId && <QuizSettingsForm quizId={selectedQuizId} week={week} />}

              {selectedQuizId && (
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={loadPreview}
                    disabled={loadingPreview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loadingPreview ? "Loading..." : "Refresh Preview"}
                  </button>
                  <button
                    onClick={generateQuizMCQs}
                    disabled={loadingPreview}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {loadingPreview ? "Generating..." : "Generate MCQs"}
                  </button>
                </div>
              )}

              {/* --- ENHANCED QUESTION BANK REVIEW --- */}
              {selectedQuizId && !loadingPreview && (
                <div className="mt-6 p-4 bg-white rounded-xl shadow border">
                  {previewError && <p className="text-red-600 text-sm mb-2">{String(previewError)}</p>}
                  
                  {quizPreview?.mcqs?.length > 0 ? (
                    <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
                      {quizPreview.mcqs.map((q, i) => (
                        <div 
                          key={q.id || i} 
                          className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all relative group"
                        >
                          {/* --- HEADER: Metadata & Actions --- */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-wrap gap-2">
                              {/* CONCEPT LABEL */}
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                🏷️ {knowledgeGraph.nodes?.find(n => n.id === q.concept_id)?.label || q.concept_id || "General"}
                              </span>
                              
                              {/* DIFFICULTY LABEL */}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                 q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                                 q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                 'bg-yellow-100 text-yellow-800'
                              }`}>
                                 📊 {q.difficulty || "Medium"}
                              </span>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if(!confirm("Regenerate this specific question?")) return;
                                  try {
                                    const res = await fetch(`${BACKEND_URL}/api/mcq/regenerate/${q.id}`, { method: "POST" });
                                    if(res.ok) {
                                      loadPreview();
                                    } else {
                                      alert("Failed to regenerate");
                                    }
                                  } catch(e) { alert(e); }
                                }}
                                className="text-xs bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-md shadow-sm flex items-center gap-1"
                              >
                                🔄 Regenerate
                              </button>
                              
                              <button
                                onClick={async () => {
                                  if(!confirm("Delete this question?")) return;
                                  try {
                                    const res = await fetch(`${BACKEND_URL}/api/mcq/${q.id}`, { method: "DELETE" });
                                    if(res.ok) {
                                       setQuizPreview(prev => ({
                                         ...prev,
                                         mcqs: prev.mcqs.filter(m => m.id !== q.id)
                                       }));
                                    } else {
                                      alert("Failed to delete");
                                    }
                                  } catch(e) { alert(e); }
                                }}
                                className="text-xs bg-white border border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-md shadow-sm flex items-center gap-1"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>

                          {/* --- QUESTION --- */}
                          <div className="mb-4">
                            <div className="text-sm text-gray-500 font-mono mb-1">Question {i + 1}</div>
                            <h4 className="text-gray-900 font-medium text-lg leading-relaxed">{q.question}</h4>
                          </div>

                          {/* --- OPTIONS --- */}
                          <div className="space-y-2">
                            {(() => {
                                let safeOptions = q.options;
                                // Handle case where options might be a JSON string
                                if (typeof safeOptions === "string") {
                                    try { safeOptions = JSON.parse(safeOptions); } catch (e) { console.error("Parse options error", e); }
                                }
                                
                                if (!Array.isArray(safeOptions) || safeOptions.length === 0) {
                                    return <div className="text-sm text-red-400 italic">No options available (Raw: {JSON.stringify(q.options)})</div>;
                                }

                                return safeOptions.map((opt, j) => {
                                  const isCorrect = opt === q.answer;
                                  return (
                                    <div 
                                      key={j} 
                                      className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                                        isCorrect 
                                          ? "bg-green-50 border-green-200" 
                                          : "bg-gray-50 border-gray-100 text-gray-600"
                                      }`}
                                    >
                                      <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${
                                        isCorrect ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                                      }`}>
                                        {isCorrect && <span className="text-[10px]">✓</span>}
                                      </div>
                                      <div className={isCorrect ? "text-green-900 font-medium" : ""}>
                                        {opt}
                                      </div>
                                    </div>
                                  );
                                });
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-500 text-lg">No questions in the bank yet.</p>
                      <p className="text-gray-400 text-sm mt-1">Click "Generate MCQs" above to start.</p>
                    </div>
                  )}
                </div>
              )}

              {quizStats && (
                <div className="text-sm text-gray-700">
                  <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs">
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


