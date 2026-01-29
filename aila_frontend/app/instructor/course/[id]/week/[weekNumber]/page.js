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

// --- SUB-COMPONENT: MCQ CARD (EDITABLE) ---
function MCQCard({ q, i, knowledgeGraph, loadPreview }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize edit state with current question data
  const [editedData, setEditedData] = useState({
    question: q.question,
    options: Array.isArray(q.options) ? q.options : [],
    answer: q.answer,
    difficulty: q.difficulty || "Medium"
  });

  // Ensure options is always an array for rendering/editing
  useEffect(() => {
    let opts = q.options;
    if (typeof opts === "string") {
      try { opts = JSON.parse(opts); } catch (e) { opts = []; }
    }
    if (!Array.isArray(opts)) opts = [];
    
    setEditedData({
      question: q.question,
      options: opts,
      answer: q.answer,
      difficulty: q.difficulty || "Medium"
    });
  }, [q]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/mcq/${q.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedData)
      });
      if (!res.ok) throw new Error("Failed to update");
      setIsEditing(false);
      loadPreview(); // Refresh parent list
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- EDIT MODE UI ---
  if (isEditing) {
    return (
      <div className="p-5 border-2 border-blue-300 rounded-xl bg-blue-50/50 shadow-md mb-4 transition-all">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Editing Question {i + 1}</span>
        </div>

        {/* Question Text Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question Text</label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white shadow-sm"
            rows={3}
            value={editedData.question}
            onChange={(e) => setEditedData({...editedData, question: e.target.value})}
          />
        </div>

        {/* Options Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Options <span className="font-normal normal-case text-gray-400">(Select the correct answer)</span>
          </label>
          <div className="space-y-2">
            {editedData.options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center group">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={editedData.answer === opt}
                  onChange={() => setEditedData({...editedData, answer: opt})}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                  title="Mark as correct answer"
                />
                <input
                  className={`flex-1 p-2 border rounded-md text-sm transition-all shadow-sm ${
                    editedData.answer === opt 
                      ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' 
                      : 'border-gray-300 bg-white focus:border-blue-400'
                  }`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...editedData.options];
                    newOpts[idx] = e.target.value;
                    // If we edit the text of the currently selected correct answer, update the answer field too
                    const wasCorrect = (editedData.answer === opt);
                    setEditedData({
                      ...editedData, 
                      options: newOpts,
                      answer: wasCorrect ? e.target.value : editedData.answer
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-blue-100">
           <div className="flex items-center gap-2">
             <label className="text-xs font-bold text-gray-500 uppercase">Difficulty:</label>
             <select 
                value={editedData.difficulty}
                onChange={(e) => setEditedData({...editedData, difficulty: e.target.value})}
                className="text-xs p-1.5 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none"
             >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
             </select>
           </div>

          <div className="flex gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-white hover:text-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : "Save Changes"}
              </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW MODE UI ---
  return (
    <div className={`p-5 border rounded-xl bg-white shadow-sm transition-all group relative mb-4 ${isOpen ? "border-blue-200 ring-1 ring-blue-50" : "border-gray-200 hover:shadow-md hover:border-gray-300"}`}>
      
      {/* Header: Number, Metadata & Actions */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
           <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Question {i + 1}</span>
           <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                {knowledgeGraph.nodes?.find(n => n.id === q.concept_id)?.label || q.concept_id || "Concept"}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${
                 q.difficulty === 'Hard' ? 'bg-red-50 text-red-700 border-red-100' :
                 q.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-100' :
                 'bg-yellow-50 text-yellow-700 border-yellow-100'
              }`}>
                 {q.difficulty || "Medium"}
              </span>
           </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
               e.stopPropagation();
               setIsEditing(true);
               setIsOpen(true); 
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
            title="Edit Question"
          >
            ✏️ Edit
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <button
            onClick={async (e) => {
               e.stopPropagation();
               if(!confirm("Regenerate this specific question?")) return;
               await fetch(`${BACKEND_URL}/api/mcq/regenerate/${q.id}`, { method: "POST" });
               loadPreview();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
            title="Regenerate Question"
          >
            🔄
          </button>
          <button
            onClick={async (e) => {
               e.stopPropagation();
               if(!confirm("Delete this question?")) return;
               await fetch(`${BACKEND_URL}/api/mcq/${q.id}`, { method: "DELETE" });
               loadPreview();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
            title="Delete Question"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Question Text (Click to Toggle) */}
      <div 
        onClick={() => !isEditing && setIsOpen(!isOpen)}
        className="cursor-pointer group-hover:text-blue-900 transition-colors"
      >
        <p className="text-gray-900 font-medium text-lg leading-relaxed">{q.question}</p>
        
        {!isOpen && (
           <div className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Click to view options & answer</span>
              <span className="text-lg">▾</span>
           </div>
        )}
      </div>

      {/* Options List (Hidden by default) */}
      {isOpen && (
        <div className="space-y-2 mt-4 animate-in slide-in-from-top-1 fade-in duration-200">
          <div className="h-px bg-gray-100 mb-4"></div>
          {(() => {
              let safeOptions = q.options;
              // Handle case where options might come back as string from some legacy endpoints
              if (typeof safeOptions === "string") {
                  try { safeOptions = JSON.parse(safeOptions); } catch (e) {}
              }
              if (!Array.isArray(safeOptions) || safeOptions.length === 0) return <p className="text-red-400 text-sm italic">No options found.</p>;

              return safeOptions.map((opt, j) => {
                const optionStr = String(opt).trim();
                const answerStr = String(q.answer).trim();
                
                let isCorrect = optionStr === answerStr;
                
                // Fallback for "Answer: A" style (legacy data support)
                if (!isCorrect && answerStr.length === 1) {
                    const letters = ['A','B','C','D'];
                    if (letters[j] === answerStr) isCorrect = true;
                }

                return (
                  <div key={j} className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all ${
                    isCorrect 
                      ? "bg-green-50 border-green-200 ring-1 ring-green-100" 
                      : "bg-white border-gray-100 text-gray-600 opacity-70"
                  }`}>
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      isCorrect ? "bg-green-500 border-green-500 text-white" : "border-gray-300 bg-gray-50"
                    }`}>
                      {isCorrect && <span className="text-[9px] font-bold">✓</span>}
                    </div>
                    <span className={`leading-snug ${isCorrect ? "font-semibold text-green-900" : ""}`}>{opt}</span>
                  </div>
                );
              });
          })()}
          
          <button 
             onClick={() => setIsOpen(false)}
             className="text-xs text-gray-400 hover:text-gray-600 mt-2 flex items-center gap-1"
          >
             <span>▴ Collapse</span>
          </button>
        </div>
      )}
    </div>
  );
}


export default function CourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();
  const week = Number(weekNumber);


  // --- STATE ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // This controls the refresh
  const [knowledgeGraph, setKnowledgeGraph] = useState({ nodes: [], edges: [] });
  // eslint-disable-next-line no-unused-vars
  const [kgError, setKgError] = useState(null);
  const [isLoadingKG, setIsLoadingKG] = useState(true);


  const [activeConceptId, setActiveConceptId] = useState(null);
  const [processingFiles, setProcessingFiles] = useState([]);


  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [expandedQuizSettingsId, setExpandedQuizSettingsId] = useState(null); 


  const [quizStats, setQuizStats] = useState(null);
  const [quizPreview, setQuizPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [filterDifficulty, setFilterDifficulty] = useState("All");


  // --- FETCHERS ---
  const fetchKnowledgeGraph = useCallback(async () => {
    if (!courseId || !Number.isFinite(week)) return;
    
    // -------------------------------------------------------------
    // NUCLEAR FIX: Check file count first. If 0, WIPE GRAPH.
    // -------------------------------------------------------------
    try {
       const fileRes = await fetch(`${BACKEND_URL}/api/lecture-history/?course_id=${courseId}&t=${Date.now()}`);
       const files = await fileRes.json();
       const weekFiles = Array.isArray(files) ? files.filter(f => String(f.week) === String(week)) : [];


       if (weekFiles.length === 0) {
           console.log("NUCLEAR FIX: No files found for week. Forcing graph wipe.");
           setKnowledgeGraph({ nodes: [], edges: [] });
           setActiveConceptId(null);
           setIsLoadingKG(false);
           return; 
       }
    } catch(e) {
        console.error("File check failed, continuing to KG fetch", e);
    }
    // -------------------------------------------------------------


    setIsLoadingKG(true);
    setKgError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge-graph?courseid=${courseId}&week=${week}&t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("KG Load Failed");
      const data = await safeJson(res);
      setKnowledgeGraph({ nodes: data?.nodes || [], edges: data?.edges || [] });
    } catch (e) {
      setKgError(e.message);
      setKnowledgeGraph({ nodes: [], edges: [] });
    } finally {
      setIsLoadingKG(false);
    }
  }, [courseId, week]);


  const fetchQuizzes = useCallback(async () => {
    if (!courseId || !Number.isFinite(week)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/list?course_id=${courseId}&week=${week}&_t=${Date.now()}`, { cache: "no-store" });
      const data = await safeJson(res);
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (e) {
      setQuizzes([]);
    }
  }, [courseId, week]);


  const loadPreview = useCallback(async () => {
    if (!selectedQuizId) return;
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/questions/${selectedQuizId}`, { cache: "no-store" });
      const data = await safeJson(res);
      setQuizPreview({ mcqs: Array.isArray(data?.mcqs) ? data.mcqs : [] });
    } catch (e) {
      setPreviewError(e.message);
      setQuizPreview({ mcqs: [] });
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedQuizId]);


  const fetchQuizStats = useCallback(async () => {
    if (!selectedQuizId) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/quiz/stats?quiz_id=${selectedQuizId}`, { cache: "no-store" });
        if(res.ok) setQuizStats(await safeJson(res));
    } catch(e) {}
  }, [selectedQuizId]);


  const handleProcessingStarted = useCallback((processingId, fileName) => {
    setProcessingFiles((prev) => [...prev, { processingId, fileName }]);
  }, []);


  const handleConceptSelect = useCallback((conceptId) => {
    setActiveConceptId(conceptId);
  }, []);


  // --- ACTIONS ---
  const generateQuizMCQs = async () => {
    if (!selectedQuizId) return;
    setLoadingPreview(true);
    try {
      await fetch(`${BACKEND_URL}/api/quiz/generate-mcqs/${selectedQuizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_from_concepts" })
      });
      await loadPreview();
      await fetchQuizStats();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
  };


  // --- EFFECTS ---
  useEffect(() => {
    fetchKnowledgeGraph();
    fetchQuizzes();
  }, [fetchKnowledgeGraph, fetchQuizzes]);


  // Auto-select first concept
  useEffect(() => {
    if (knowledgeGraph.nodes.length > 0 && !activeConceptId) {
      setActiveConceptId(knowledgeGraph.nodes.find(n => n.isRoot)?.id || knowledgeGraph.nodes[0].id);
    }
  }, [knowledgeGraph.nodes, activeConceptId]);


  // Refresh preview when quiz changes
  useEffect(() => {
    if (selectedQuizId) {
      loadPreview();
      fetchQuizStats();
      setExpandedQuizSettingsId(selectedQuizId);
    }
  }, [selectedQuizId, loadPreview, fetchQuizStats]);



  // Polling Effect
  useEffect(() => {
    if (processingFiles.length === 0) return;
  
    const interval = setInterval(async () => {
      const results = await Promise.all(
        processingFiles.map(async (f) => {
          try {
            const res = await fetch(
              `${BACKEND_URL}/api/lecture-status?processing_id=${f.processingId}`
            );
            const data = await safeJson(res);
              
            // If the backend has made progress (e.g. Phase 1 done > 10%), 
            // fetch the graph to show partial results (the Root Node).
            if (data.status === "processing" && data.progress >= 20) {
                fetchKnowledgeGraph(); 
            }
              
            return { ...data, processingId: f.processingId };
          } catch {
            return { status: "error", processingId: f.processingId };
          }
        })
      );
  
      const doneJobs = results.filter((r) => r.status === "done");
  
      // Handle Done Jobs
      if (doneJobs.length > 0) {
        setProcessingFiles((prev) =>
          prev.filter((p) => !doneJobs.some((d) => d.processingId === p.processingId))
        );
  
        setTimeout(() => {
          fetchKnowledgeGraph();
          fetchQuizzes();
          setRefreshTrigger((prev) => prev + 1);
        }, 1000);
      }
    }, 2000); // Poll every 2 seconds for snappier updates
  
    return () => clearInterval(interval);
  }, [processingFiles, fetchKnowledgeGraph, fetchQuizzes]);
  


  // --- RENDER HELPERS ---
  const activeConcept = knowledgeGraph.nodes?.find(n => n.id === activeConceptId) || null;
  const activeQuiz = quizzes.find(q => q.id === selectedQuizId);
  
  const allMcqs = quizPreview?.mcqs || [];
  const easyCount = allMcqs.filter(m => m.difficulty === "Easy").length;
  const mediumCount = allMcqs.filter(m => !m.difficulty || m.difficulty === "Medium").length;
  const hardCount = allMcqs.filter(m => m.difficulty === "Hard").length;
  const totalCount = allMcqs.length;


  const visibleQuestions = allMcqs.filter(m => filterDifficulty === "All" || (m.difficulty || "Medium") === filterDifficulty);
  
  const questionCountLabel = !loadingPreview && totalCount > 0 
    ? `(${totalCount} total • ${easyCount} Easy, ${mediumCount} Medium, ${hardCount} Hard)`
    : "";


  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      
      {/* COLLAPSIBLE SIDEBAR */}
      <div className={`bg-white border-r border-gray-200 shadow-xl z-50 transition-all duration-300 flex flex-col ${sidebarOpen ? "w-64" : "w-16"}`}>
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className={`font-bold text-gray-800 transition-opacity whitespace-nowrap overflow-hidden ${sidebarOpen ? "opacity-100" : "opacity-0 w-0"}`}>Select Week</h2>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded hover:bg-gray-200 text-gray-600 focus:outline-none">
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map(w => (
            <button
              key={w}
              onClick={() => router.push(`/instructor/course/${courseId}/week/${w}`)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                String(weekNumber) === String(w) ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
              }`}
              title={`Week ${w}`}
            >
              <span className={`font-semibold text-sm whitespace-nowrap ${!sidebarOpen && "hidden"}`}>Week {w}</span>
              {!sidebarOpen && <span className="mx-auto font-bold text-xs">{w}</span>}
            </button>
          ))}
        </div>
      </div>


      {/* MAIN SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-6 space-y-8 pb-20">
          
          {/* FIXED HEADER: Improved Position */}
          <div className="flex justify-between items-end border-b border-gray-200 pb-4">
            <div>
               <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                 Week {weekNumber}
                 <span className="text-xl font-normal text-gray-400">|</span>
                 <span className="text-xl font-medium text-gray-600">Instructor Dashboard</span>
               </h1>
               <p className="text-sm text-gray-400 mt-1 font-mono">ID: {courseId}</p>
            </div>
          </div>


            {/* TWO-COLUMN LAYOUT: UPLOAD & FILES LIST */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            
            {/* LEFT: Upload Form */}
            <div className="h-full">
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 h-full flex flex-col justify-center min-h-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-semibold">Upload Lecture Slides</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF or PPTX • Powers your concept map
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex-1 flex flex-col justify-center">
                   <UploadLectureForm
                    courseId={courseId}
                    weekNumber={weekNumber}
                    onUploadComplete={handleProcessingStarted}
                  />
                </div>
              </div>
            </div>


            {/* RIGHT: File List */}
            <div className="h-full">
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 h-full min-h-[200px] flex flex-col">
                  <UploadedFilesList
                    key={refreshTrigger} 
                    courseId={courseId}
                    week={weekNumber}
                    refreshTrigger={refreshTrigger}
                    onReload={() => {
                        fetchKnowledgeGraph();
                        fetchQuizzes();
                        setRefreshTrigger(prev => prev + 1);
                    }}
                  />
              </div>
            </div>
          </div>


          {/* Processing Status */}
          {processingFiles.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
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
          
          {/* CONCEPT GRAPH */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden relative">
              
              {/* Header - Outside the relative container for clean separation */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">🧠 Concept Map</h3>
                  <div className="flex items-center gap-2">
                      {isLoadingKG && <span className="text-xs text-blue-500 animate-pulse">Updating...</span>}
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">Interactive</span>
                  </div>
              </div>


              {/* Graph Container */}
              <div className="h-[500px] relative bg-white"> 
                  
                  {/* Loading Overlay - Shows only during the "Root -> Full Graph" transition */}
                  {processingFiles.length > 0 && knowledgeGraph.nodes.length > 0 && knowledgeGraph.nodes.length < 5 && (
                      <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm flex items-center gap-2 animate-pulse transition-all">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          Expanding Universe...
                      </div>
                  )}


                  {/* The Graph Itself */}
                  {knowledgeGraph.nodes.length > 0 ? (
                      <ConceptGraph 
                          key={JSON.stringify(knowledgeGraph.nodes)} 
                          nodes={knowledgeGraph.nodes} 
                          edges={knowledgeGraph.edges} 
                          onSelect={setActiveConceptId} 
                      />
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <span className="text-4xl mb-2">🕸️</span>
                          <p>No concept map available.</p>
                          <p className="text-xs">Upload slides to generate one.</p>
                      </div>
                  )}
              </div>
          </div>


          {/* REST OF PAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
             {/* LEFT: Concept Details */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Concept Details</div>
                <div className="flex-1 overflow-y-auto p-4">
                   <SlideViewer concept={activeConcept} courseId={courseId} week={weekNumber} />
                </div>
             </div>


             {/* RIGHT: Quiz Creator */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Create New Quiz</div>
                <div className="flex-1 overflow-y-auto p-4">
                  <QuizCreator
                    key={`${courseId}-${weekNumber}`}
                    courseId={courseId}
                    week={Number(weekNumber)}
                    concepts={knowledgeGraph.nodes}
                    onQuizCreated={fetchQuizzes}
                    onConceptClick={handleConceptSelect}
                  />
                </div>
             </div>
          </div>


          {/* QUIZ MANAGER SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4 border-t border-gray-200 min-h-[600px]">
             
             {/* LEFT COLUMN: Quiz List */}
             <div className="lg:col-span-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar flex flex-col bg-gray-50 rounded-xl border border-gray-200">
               <div className="flex items-center justify-between p-4 sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                 <h2 className="text-xl font-bold text-gray-800">Your Quizzes <span className="text-gray-500 text-base font-normal">({quizzes.length})</span></h2>
                 <button onClick={fetchQuizzes} className="text-sm text-blue-600 hover:underline">Refresh</button>
               </div>
               
               <div className="p-4 space-y-4 flex-1">
                 {quizzes.length === 0 && <p className="text-gray-400 italic text-sm text-center py-10">No quizzes created yet.</p>}


                 {quizzes.map((q, idx) => {
                   const isSelected = selectedQuizId === q.id;
                   return (
                     <div key={q.id} className={`rounded-xl border-2 transition-all overflow-hidden bg-white ${isSelected ? "border-blue-500 shadow-md ring-2 ring-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                        <div 
                          onClick={() => {
                             setSelectedQuizId(q.id);
                             setExpandedQuizSettingsId(q.id); 
                          }}
                          className="p-4 cursor-pointer"
                        >
                           <div className="flex justify-between items-start mb-1">
                              <h3 className="font-bold text-lg text-gray-900">{q.name}</h3>
                              <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                           </div>
                           <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                             Concepts: {(q.concept_ids || q.conceptids || []).length}
                           </p>
                        </div>
                        {isSelected && expandedQuizSettingsId === q.id && (
                           <div className="border-t border-gray-100 bg-gray-50 p-4 animate-in slide-in-from-top-2 duration-200">
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Settings</h4>
                              <QuizSettingsForm quizId={q.id} week={week} />
                           </div>
                        )}
                     </div>
                   );
                 })}
               </div>
             </div>


             {/* RIGHT COLUMN: Question Bank Review */}
             <div className="lg:col-span-8 h-[600px]">
               {selectedQuizId ? (
                 <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 border-b bg-gray-50 flex flex-col gap-4 z-20 backdrop-blur-md bg-white/95 rounded-t-xl">
                       <div className="flex flex-wrap gap-4 justify-between items-start">
                         <div>
                           <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                             Question Bank 
                             <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                               {activeQuiz?.name}
                             </span>
                           </h2>
                           <p className="text-xs text-gray-500 mt-1 font-medium">{questionCountLabel}</p>
                         </div>
                         
                         <div className="flex bg-gray-200 p-1 rounded-lg self-start">
                            {["All", "Easy", "Medium", "Hard"].map(lvl => {
                              let count = 0;
                              if (lvl === "All") count = totalCount;
                              else if (lvl === "Easy") count = easyCount;
                              else if (lvl === "Medium") count = mediumCount;
                              else if (lvl === "Hard") count = hardCount;


                              return (
                                <button
                                  key={lvl}
                                  onClick={() => setFilterDifficulty(lvl)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex gap-1 ${filterDifficulty === lvl ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                >
                                  {lvl} <span className="opacity-50 text-[10px] self-center">({count})</span>
                                </button>
                              );
                            })}
                         </div>
                       </div>
                       
                       <div className="flex gap-3 pt-2 border-t border-gray-100">
                          <button 
                            onClick={generateQuizMCQs}
                            disabled={loadingPreview}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 shadow-sm transition-colors flex items-center justify-center gap-2"
                          >
                            {loadingPreview ? "Generating..." : "✨ Generate / Add More Questions"}
                          </button>
                          <button 
                            onClick={loadPreview}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                          >
                            🔄 Refresh
                          </button>
                       </div>
                    </div>


                    <div className="p-6 bg-gray-50/50 flex-1 overflow-y-auto custom-scrollbar">
                       {previewError && <div className="bg-red-50 text-red-600 p-4 rounded mb-4 text-sm border border-red-200">{previewError}</div>}
                       
                       {!loadingPreview && visibleQuestions.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4">
                            {visibleQuestions.map((q, i) => (
                                <MCQCard key={q.id || i} q={q} i={i} knowledgeGraph={knowledgeGraph} loadPreview={loadPreview} />
                            ))}
                          </div>
                       ) : (
                          !loadingPreview && (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400">
                               <div className="text-5xl mb-4 opacity-20">📝</div>
                               <p className="text-lg font-medium text-gray-500">
                                  {allMcqs.length > 0 ? `No ${filterDifficulty} questions found.` : "No questions generated yet."}
                               </p>
                            </div>
                          )
                       )}
                       
                       {loadingPreview && (
                           <div className="flex flex-col items-center justify-center h-64">
                             <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                             <p className="text-sm font-medium text-gray-500">Loading Questions...</p>
                           </div>
                       )}
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                    <span className="text-4xl mb-4">👈</span>
                    <p className="font-medium text-lg">Select a quiz from the left</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
