// app/student/course/[id]/week/[weekNumber]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const WEEK_COUNT = 11;
const STUDENT_ID = "student_123"; // TODO: Replace with real auth

export default function StudentCourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();

  // --- LIST STATE ---
  const [quizzes, setQuizzes] = useState([]);
  const [conceptLabels, setConceptLabels] = useState({});
  const [loadingList, setLoadingList] = useState(true);

  // --- QUIZ TAKING STATE ---
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [quizData, setQuizData] = useState(null); // { questions, attempt_id, settings, retries_left }
  const [answers, setAnswers] = useState({}); // { mcq_id: "Option A" }
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [result, setResult] = useState(null); // { score, total, results: [], style }
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- FEEDBACK STATE (Per Question) ---
  const [feedbackStatus, setFeedbackStatus] = useState("idle"); // "idle" | "checking" | "correct" | "incorrect"
  const [currentFeedback, setCurrentFeedback] = useState(null); // { correct, hint, correct_answer, retries_exhausted }
  
  // Track retries per question ID { "mcq_id": count }
  const [retryCounts, setRetryCounts] = useState({});

  // 1. Fetch Quizzes & KG Labels on Load
  useEffect(() => {
    async function loadData() {
      setLoadingList(true);
      try {
        const [qRes, kgRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/quiz/list?course_id=${courseId}&week=${weekNumber}`),
          fetch(`${BACKEND_URL}/api/knowledge-graph?courseid=${courseId}&week=${weekNumber}`)
        ]);

        const qData = await qRes.json();
        setQuizzes(Array.isArray(qData) ? qData : []);

        const kgData = await kgRes.json();
        const labelMap = {};
        ((kgData && kgData.nodes) || []).forEach(n => { labelMap[n.id] = n.label; });
        setConceptLabels(labelMap);
      } catch (e) {
        console.error("Failed to load week data", e);
      } finally {
        setLoadingList(false);
      }
    }
    loadData();
  }, [courseId, weekNumber]);

  // 2. Start Quiz Handler
  async function handleStartQuiz(quizId) {
    setActiveQuizId(quizId);
    setLoadingQuiz(true);
    setQuizData(null);
    setResult(null);
    setAnswers({});
    setRetryCounts({});
    setCurrentQuestionIndex(0);
    setFeedbackStatus("idle");
    setCurrentFeedback(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/student/quiz/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quizId, student_id: STUDENT_ID })
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to start quiz");
        setActiveQuizId(null);
        return;
      }

      const data = await res.json();
      setQuizData(data);
    } catch (e) {
      alert("Network error starting quiz");
      setActiveQuizId(null);
    } finally {
      setLoadingQuiz(false);
    }
  }

  // 3. Check Answer Handler
  async function handleCheckAnswer() {
    const currentQ = quizData.questions[currentQuestionIndex];
    const selected = answers[currentQ.id];
    if (!selected) return;

    const currentAttemptCount = (retryCounts[currentQ.id] || 0) + 1;
    setRetryCounts(prev => ({ ...prev, [currentQ.id]: currentAttemptCount }));

    setFeedbackStatus("checking");
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/student/quiz/check-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: activeQuizId,
          mcq_id: currentQ.id,
          selected_opt: selected,
          attempt_count: currentAttemptCount
        })
      });
      
      if (!res.ok) throw new Error("Check failed");

      const data = await res.json();
      setCurrentFeedback(data);
      
      if (data.correct) {
        setFeedbackStatus("correct");
      } else {
        setFeedbackStatus("incorrect");
      }
      
    } catch (e) { 
      console.error(e);
      alert("Error checking answer");
      setFeedbackStatus("idle");
    }
  }

  // 4. Submit Handler
  async function handleSubmit() {
    if (!confirm("Finish and submit quiz?")) return;
    setSubmitting(true);
    
    try {
      const responsesArray = Object.entries(answers).map(([mcq_id, selected_answer]) => ({
        mcq_id,
        selected_answer,
      }));
  
      const res = await fetch(`${BACKEND_URL}/api/student/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: quizData.attempt_id,
          student_id: STUDENT_ID,     // ✅ include student + quiz for stats
          quiz_id: activeQuizId,
          responses: responsesArray,
        }),
      });
  
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.detail || "Error submitting quiz");
        return;
      }
  
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert("Error submitting quiz");
    } finally {
      setSubmitting(false);
    }
  }  

  // 5. Navigation Handlers
  function handleNext() {
    setFeedbackStatus("idle");
    setCurrentFeedback(null);

    if (currentQuestionIndex < (quizData?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }

  function handlePrev() {
    setFeedbackStatus("idle");
    setCurrentFeedback(null);
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }

  function handleBackToList() {
    setActiveQuizId(null);
    setQuizData(null);
    setResult(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
  }

  const WeekSelector = () => (
    <div className="w-64 border-r border-gray-200 bg-white h-screen overflow-y-auto hidden md:block flex-shrink-0">
      <div className="p-6">
        <h3 className="font-bold text-gray-800 mb-4 px-2">Course Modules</h3>
        <ul className="space-y-1">
          {Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map(w => {
             const isActive = String(weekNumber) === String(w);
             return (
              <li key={w}>
                <button
                  className={`block w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => router.push(`/student/course/${courseId}/week/${w}`)}
                >
                  Week {w}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  // --- RENDER: QUIZ TAKING MODE ---
  if (activeQuizId) {
    if (loadingQuiz) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Preparing your quiz...</p>
          </div>
        </div>
      );
    }

    // --- RESULT VIEW ---
    if (result) {
      return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Results</h1>
                <p className="text-gray-500">Attempt ID: {quizData.attempt_id.slice(0,8)}</p>
              </div>

              <div className={`p-6 rounded-xl mb-8 text-center ${
                 (result.score / (result.total || 1)) > 0.7 ? "bg-green-50 text-green-800" : "bg-blue-50 text-blue-800"
              }`}>
                <div className="text-5xl font-extrabold mb-2">
                  {result.score} <span className="text-2xl opacity-60">/ {result.total}</span>
                </div>
                <p className="font-medium">
                  {(result.score / (result.total || 1)) > 0.7 ? "Outstanding performance! 🎉" : "Good effort! Keep reviewing. 💪"}
                </p>
              </div>

              <div className="space-y-6">
                {quizData.questions.map((q, i) => {
                  const feedback = result.results?.find(r => r.mcq_id === q.id) || {};
                  const isCorrect = feedback.correct;
                  
                  return (
                    <div key={q.id} className={`p-6 border rounded-xl ${
                      isCorrect ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"
                    }`}>
                      <div className="flex gap-4">
                        <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                           isCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-3 text-lg">{q.question}</p>
                          
                          <div className="text-sm bg-white p-3 rounded border border-gray-200 inline-block mb-2 shadow-sm">
                            <span className="text-gray-500 mr-2">Your answer:</span>
                            <span className={isCorrect ? "font-semibold text-green-700" : "font-semibold text-red-600"}>
                              {feedback.selected || "Skipped"}
                            </span>
                          </div>

                          {feedback.correct_answer && (
                             <div className="text-sm text-green-700 mt-1 font-medium bg-green-100/50 p-2 rounded inline-block ml-2">
                               ✓ Correct: {feedback.correct_answer}
                             </div>
                          )}
                          
                          {feedback.hint && (
                             <div className="mt-3 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-100 flex gap-2 items-start">
                               <span>💡</span>
                               <span><strong>Hint:</strong> {feedback.hint}</span>
                             </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 text-center">
                <button 
                  onClick={handleBackToList} 
                  className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // --- QUIZ TAKING VIEW ---
    const currentQ = quizData.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;
    const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={handleBackToList}
              className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2 text-sm"
            >
              ← Exit Quiz
            </button>
            <div className="flex items-center gap-3">
               <span className="text-sm text-gray-500 font-medium">
                 Question {currentQuestionIndex + 1} of {quizData.questions.length}
               </span>
               <div className="bg-blue-50 px-3 py-1 rounded-full text-xs font-semibold text-blue-600 border border-blue-100">
                  Retries left: {Math.max(0, (quizData.retries_left || 3) - (retryCounts[currentQ.id] || 0))}
               </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>

          {/* Question Card */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
            <div className="flex-1">
               {/* ✅ Difficulty + Bloom Badges */}
               <div className="flex items-center gap-2 mb-4">
                 <span className={`badge badge-difficulty ${(currentQ.difficulty || 'Medium').toLowerCase()}`}>
                   {currentQ.difficulty || "Medium"}
                 </span>
                 <span className="badge badge-bloom">
                   Bloom: {currentQ.bloom_level || "Remember"}
                 </span>
               </div>

               <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
                 {currentQ.question}
               </h2>
               
               <div className="space-y-3">
                 {currentQ.options.map((opt) => {
                   const isSelected = answers[currentQ.id] === opt;
                   return (
                     <div 
                       key={opt} 
                       onClick={() => {
                         if (feedbackStatus !== "correct") {
                           setAnswers(prev => ({ ...prev, [currentQ.id]: opt }));
                           if (feedbackStatus === "incorrect") {
                             setFeedbackStatus("idle");
                             setCurrentFeedback(null);
                           }
                         }
                       }}
                       className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all group ${
                         isSelected 
                           ? (feedbackStatus === "correct" 
                               ? "border-green-500 bg-green-50" 
                               : (feedbackStatus === "incorrect" ? "border-red-500 bg-red-50" : "border-blue-500 bg-blue-50/30")
                             )
                           : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                       }`}
                     >
                       <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected 
                            ? (feedbackStatus === "correct" 
                                ? "border-green-600 bg-green-600" 
                                : (feedbackStatus === "incorrect" ? "border-red-600 bg-red-600" : "border-blue-600 bg-blue-600")
                              )
                            : "border-gray-300 group-hover:border-gray-400"
                       }`}>
                         {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                       </div>
                       <span className={`text-base ${isSelected ? "text-gray-900 font-medium" : "text-gray-700"}`}>
                         {opt}
                       </span>
                     </div>
                   );
                 })}
               </div>
            </div>

            {/* FEEDBACK & ACTIONS AREA */}
            <div className="mt-8 pt-6 border-t border-gray-100">
               
               {/* Feedback Message */}
               {feedbackStatus !== "idle" && feedbackStatus !== "checking" && (
                 <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                    feedbackStatus === "correct" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"
                 }`}>
                    <div className="text-xl">{feedbackStatus === "correct" ? "🎉" : "❌"}</div>
                    <div className="flex-1">
                      <div className="font-bold">{feedbackStatus === "correct" ? "Correct!" : "Incorrect"}</div>
                      
                      {!currentFeedback?.correct && (
                        <div className="mt-2 text-sm space-y-1">
                          {currentFeedback?.hint && (
                             <div className="flex gap-2"><span>💡</span> <span><strong>Hint:</strong> {currentFeedback.hint}</span></div>
                          )}
                          {currentFeedback?.correct_answer && (
                             <div className="flex gap-2"><span>✓</span> <span><strong>Correct Answer:</strong> {currentFeedback.correct_answer}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                 </div>
               )}

               <div className="flex justify-between items-center">
                 <button
                   onClick={handlePrev}
                   disabled={currentQuestionIndex === 0 || feedbackStatus === "checking"} 
                   className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg disabled:opacity-30"
                 >
                   Previous
                 </button>

                 <div className="flex gap-3">
                   {(feedbackStatus === "idle" || (feedbackStatus === "incorrect" && !currentFeedback?.retries_exhausted)) && (
                      <button
                        onClick={handleCheckAnswer}
                        disabled={!answers[currentQ.id] || feedbackStatus === "checking"}
                        className={`px-8 py-3 font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all ${
                           feedbackStatus === "incorrect" 
                             ? "bg-red-600 text-white hover:bg-red-700" 
                             : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {feedbackStatus === "checking" ? "Checking..." : (feedbackStatus === "incorrect" ? "Try Again" : "Check Answer")}
                      </button>
                   )}

                   {(feedbackStatus === "correct" || (feedbackStatus === "incorrect" && currentFeedback?.retries_exhausted)) && (
                      isLastQuestion ? (
                         <button
                           onClick={handleSubmit}
                           disabled={submitting}
                           className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg"
                         >
                           {submitting ? "Submitting..." : "Finish Quiz"}
                         </button>
                      ) : (
                         <button
                           onClick={handleNext}
                           className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2"
                         >
                           Next Question →
                         </button>
                      )
                   )}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: LIST VIEW ---
  return (
    <div className="flex min-h-screen bg-gray-50">
      <WeekSelector />
      
      <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Week {weekNumber}</h2>
          <p className="text-gray-500 mt-2 text-lg">Select a quiz to practice your concepts.</p>
        </header>

        {loadingList ? (
           <div className="flex-1 flex items-center justify-center">
             <div className="animate-pulse flex space-x-4">
               <div className="rounded-full bg-gray-200 h-10 w-10"></div>
               <div className="flex-1 space-y-6 py-1">
                 <div className="h-2 bg-gray-200 rounded"></div>
                 <div className="space-y-3">
                   <div className="grid grid-cols-3 gap-4">
                     <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                     <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                   </div>
                   <div className="h-2 bg-gray-200 rounded"></div>
                 </div>
               </div>
             </div>
           </div>
        ) : (
          <>
            {quizzes.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center border border-gray-200 shadow-sm">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-900">No quizzes yet</h3>
                <p className="text-gray-500 mt-2">Check back later for practice materials.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {quizzes.map(q => (
                  <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-gray-900 mb-2">{q.name}</h3>
                      <div className="flex flex-wrap gap-2 mb-6">
                         {Array.isArray(q.concept_ids) && q.concept_ids.length > 0 ? (
                            q.concept_ids.map(cid => (
                              <span key={cid} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                                {conceptLabels[cid] || cid}
                              </span>
                            ))
                         ) : (
                           <span className="text-gray-400 text-sm italic">General Practice</span>
                         )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleStartQuiz(q.id)}
                      className="w-full py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Start Quiz</span>
                      <span>→</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
