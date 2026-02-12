// components/AdaptiveQuiz.js
'use client';

import { useState, useEffect } from 'react';

const BACKEND_URL = "http://localhost:8000";

export default function AdaptiveQuiz({ quizId, attemptId: attemptIdProp, onQuizEnd }) {
  const [attemptId, setAttemptId] = useState(attemptIdProp || null);
  const [mcq, setMcq] = useState(null); // { mcq_id, question, options, answer?, concept_id, difficulty, bloom_level }
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Start a new attempt if not given
  useEffect(() => {
    if (attemptIdProp) return;
    if (!quizId) return;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/quiz/attempt/start`, {
          method: "POST",
          body: new URLSearchParams({
            quiz_id: quizId,
            student_id: "YOUR_STUDENT_ID", // TODO: logged-in id
          }),
        });
        const data = await res.json();
        setAttemptId(data.attempt_id);
      } catch {
        setError("Failed to start quiz.");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, [quizId, attemptIdProp]);

  // Fetch next MCQ whenever attemptId changes or after answer submission
  useEffect(() => {
    if (!attemptId) return;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/quiz/attempt/next?attempt_id=${attemptId}`
        );
        const data = await res.json();
        if (data.done) {
          setDone(true);
          setMcq(null);
        } else if (!data.question) {
          setError("No more questions in this quiz.");
          setDone(true);
        } else {
          // ✅ Now capturing difficulty and bloom_level from backend
          setMcq({
            mcq_id: data.mcq_id,
            question: data.question,
            options: data.options || [],
            answer: data.answer, // may be omitted for graded mode
            concept_id: data.concept_id || null,
            difficulty: data.difficulty || "Medium",
            bloom_level: data.bloom_level || "Remember",
          });
        }
      } catch {
        setError("Failed to load next question.");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, [attemptId, answers.length]);

  function quit() {
    setDone(true);
    setMcq(null);
    if (onQuizEnd) {
      const attempted = answers.length;
      const correct = answers.filter((a) => a.correct).length;
      onQuizEnd({ attempted, correct });
    }
  }

  async function submitAnswer(selected) {
    if (!mcq) return;
    setLoading(true);
    setError("");

    console.log("Submitting answer:", {
      attempt_id: attemptId,
      mcq_id: mcq.mcq_id,
      selected,
      answer: mcq.answer,
      concept_id: mcq.concept_id,
    });

    try {
      const payload = {
        attempt_id: attemptId,
        mcq_id: mcq.mcq_id,
        selected,
      };
      if (mcq.answer) payload.answer = mcq.answer;
      if (mcq.concept_id) payload.concept_id = mcq.concept_id;

      const res = await fetch(`${BACKEND_URL}/api/quiz/attempt/submit`, {
        method: "POST",
        body: new URLSearchParams(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }

      console.log("Quiz submit response:", { status: res.status, data });

      if (res.ok && data && typeof data.correct === "boolean") {
        setAnswers((ans) => [
          ...ans,
          {
            question: mcq.question,
            selected,
            correct: data.correct,
            concept_id: mcq.concept_id,
          },
        ]);
      } else {
        setError("Failed to submit answer.");
      }
    } catch (err) {
      console.error("Submit fetch error:", err);
      setError("Failed to submit answer.");
    }
    setLoading(false);
  }

  if (loading && !mcq) return <div>Loading quiz...</div>;
  if (error) return <div className="text-red-700">{error}</div>;
  if (done)
    return (
      <div>
        <div className="font-bold text-lg mb-2">Quiz session ended.</div>
        <div>
          Your score: {answers.filter((a) => a.correct).length} / {answers.length}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-gray-200 rounded"
        >
          Restart
        </button>
      </div>
    );
  if (!mcq) return <div>Loading question...</div>;

  const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null;
  const showFeedback = !!lastAnswer && lastAnswer.question === mcq.question;

  return (
    <div className="bg-white border rounded-lg shadow-md p-6">
      {/* ✅ Question Header with Metadata Tags */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-lg text-gray-800">
          Question {answers.length + 1}
        </div>
        <div className="flex gap-2">
          {/* Difficulty Badge */}
          <span className={`badge badge-difficulty ${mcq.difficulty.toLowerCase()}`}>
            {mcq.difficulty}
          </span>
          {/* ✅ Bloom Level Badge */}
          <span className="badge badge-bloom">
            Bloom: {mcq.bloom_level}
          </span>
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-4 text-gray-700 text-base leading-relaxed">
        {mcq.question}
      </div>

      {/* Options */}
      <ul className="space-y-2">
        {mcq.options.map((opt, idx) => (
          <li key={idx}>
            <button
              className="block w-full text-left px-4 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || showFeedback}
              onClick={() => submitAnswer(opt)}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>

      {/* Feedback */}
      {showFeedback && (
        <div className="mt-4 p-3 rounded-lg text-sm">
          {lastAnswer.correct ? (
            <div className="text-green-700 bg-green-50 border border-green-200 p-3 rounded">
              ✓ Correct!
            </div>
          ) : (
            <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded">
              ✗ Incorrect. Correct answer: <strong>{mcq.answer}</strong>
            </div>
          )}
        </div>
      )}

      {/* Quit Button */}
      <button
        onClick={quit}
        disabled={loading}
        className="mt-6 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
      >
        Quit and Show Score
      </button>

      {/* ✅ Add styles inline or in your CSS file */}
      <style jsx>{`
        .badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-difficulty {
          color: white;
        }

        .badge-difficulty.easy {
          background: #10b981;
        }

        .badge-difficulty.medium {
          background: #f59e0b;
        }

        .badge-difficulty.hard {
          background: #ef4444;
        }

        .badge-bloom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
      `}</style>
    </div>
  );
}
