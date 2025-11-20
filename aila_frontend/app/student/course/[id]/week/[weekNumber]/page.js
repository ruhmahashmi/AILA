// app/student/course/[id]/week/[weekNumber]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdaptiveQuiz from '../../../../../components/AdaptiveQuiz';

const BACKEND_URL = 'http://localhost:8000';
const WEEK_COUNT = 11;

// TODO: Replace with real logged-in student ID, e.g., from auth context
const STUDENT_ID = "YOUR_STUDENT_ID";

export default function StudentCourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [quizSummary, setQuizSummary] = useState(null);
  const [conceptLabels, setConceptLabels] = useState({});
  const [currentQuiz, setCurrentQuiz] = useState(null);

  // Fetch quizzes for the week
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/quiz/list?course_id=${courseId}&week=${weekNumber}`)
      .then(res => res.json())
      .then(data => setQuizzes(Array.isArray(data) ? data : []));
    setSelectedQuizId(null);
    setAttemptId(null);
    setQuizSummary(null);
    setCurrentQuiz(null);
  }, [courseId, weekNumber]);

  // Fetch concept labels for this course/week  
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/knowledge-graph/?course_id=${courseId}&week=${weekNumber}`)
      .then(res => res.json())
      .then(data => {
        const labelMap = {};
        ((data && data.nodes) || []).forEach(n => { labelMap[n.id] = n.label; });
        setConceptLabels(labelMap);
      });
  }, [courseId, weekNumber]);

  // When student selects a quiz, start attempt
  async function handleStartQuiz(quizId) {
    setQuizSummary(null);
    setSelectedQuizId(quizId);
    setAttemptId(null);
    setCurrentQuiz(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/attempt/start`, {
        method: "POST",
        body: new URLSearchParams({
          quiz_id: quizId,
          student_id: STUDENT_ID,
        }),
      });
      const data = await res.json();
      if (data && data.attempt_id) {
        setAttemptId(data.attempt_id);
        const quiz = quizzes.find(q => q.id === quizId);
        setCurrentQuiz(quiz || null);
      } else {
        alert("Failed to start quiz (no attempt_id).");
      }
    } catch {
      alert("Failed to start quiz (network error).");
    }
  }

  // When AdaptiveQuiz signals end/quit, show summary
  function handleQuizEnd(summary) {
    setQuizSummary(summary);
    setAttemptId(null);
    setSelectedQuizId(null);
    setCurrentQuiz(null);
  }

  // Week navigation sidebar  
  const WeekSelector = () => (
    <div className="w-48 border-r border-gray-300 p-4 bg-white">
      <h3 className="font-semibold mb-2">Select Week</h3>
      <ul>
        {Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map(w => (
          <li key={w}>
            <button
              className={`block w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${
                String(weekNumber) === String(w) ? 'bg-blue-200 font-bold text-blue-700' : ''
              }`}
              onClick={() => router.push(`/student/course/${courseId}/week/${w}`)}
            >
              Week {w}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <WeekSelector />
      <div className="flex-1 flex flex-col p-8">
        <h2 className="font-semibold text-xl mb-6">Practice Quizzes for Week {weekNumber}</h2>
        {/* Quiz List */}
        {!attemptId && !quizSummary ? (
          <>
            {quizzes.length === 0 ? (
              <div className="text-gray-600">No quizzes available for this week.</div>
            ) : (
              <ul className="mb-10">
                {quizzes.map(q => (
                  <li key={q.id} className="mb-6">
                    <div className="p-4 bg-white shadow rounded">
                      <div className="font-semibold text-lg">{q.name}</div>
                      <div className="text-gray-600 mb-3 text-sm">
                        Concepts: {Array.isArray(q.concept_ids) && q.concept_ids.length > 0 ?
                          q.concept_ids.map(cid => conceptLabels[cid] || cid).join(', ')
                          : "No concepts tagged"}
                      </div>
                      <button
                        onClick={() => handleStartQuiz(q.id)}
                        className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-900"
                      >
                        Start Practice
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
        {/* Adaptive Quiz Attempt */}
        {attemptId ? (
          <AdaptiveQuiz
            quizId={selectedQuizId}
            attemptId={attemptId}
            onQuizEnd={handleQuizEnd}
          />
        ) : null}
        {/* Quiz Summary */}
        {quizSummary && (
          <div className="mt-8 p-6 bg-green-100 rounded">
            <div className="text-lg font-bold">Quiz Summary</div>
            <div>Questions Attempted: <strong>{quizSummary.attempted}</strong></div>
            <div>Correct Answers: <strong>{quizSummary.correct}</strong></div>
            <button
              className="mt-4 px-4 py-2 bg-gray-300 rounded"
              onClick={() => {
                setQuizSummary(null);
                setCurrentQuiz(null);
                setAttemptId(null);
                setSelectedQuizId(null);
              }}
            >
              Back to Quiz List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
