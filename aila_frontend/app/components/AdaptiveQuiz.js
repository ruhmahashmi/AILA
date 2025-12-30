// components/AdaptiveQuiz.js
'use client';

import { useState, useEffect } from 'react';

const BACKEND_URL = "http://localhost:8000";

export default function AdaptiveQuiz({ quizId, attemptId: attemptIdProp, onQuizEnd }) {
  const [attemptId, setAttemptId] = useState(attemptIdProp || null);
  const [mcq, setMcq] = useState(null); // { mcq_id, question, options, answer?, concept_id }
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
          // Expect backend to return concept_id too
          setMcq({
            mcq_id: data.mcq_id,
            question: data.question,
            options: data.options || [],
            answer: data.answer, // may be omitted for graded mode
            concept_id: data.concept_id || null,
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
    <div className="bg-white border rounded p-4">
      <div className="mb-2 font-semibold">Question {answers.length + 1}</div>
      <div className="mb-2">{mcq.question}</div>
      <ul>
        {mcq.options.map((opt, idx) => (
          <li key={idx}>
            <button
              className="block my-1 px-4 py-2 rounded bg-blue-100 hover:bg-blue-300"
              disabled={loading || showFeedback}
              onClick={() => submitAnswer(opt)}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
      {showFeedback && (
        <div className="mt-3 text-sm">
          {lastAnswer.correct ? (
            <span className="text-green-700">Correct!</span>
          ) : (
            <span className="text-red-700">
              Incorrect.&nbsp;Correct answer:{" "}
              <strong>{mcq.answer}</strong>
            </span>
          )}
        </div>
      )}
      <button
        onClick={quit}
        disabled={loading}
        className="mt-4 px-3 py-1 bg-red-200 rounded"
      >
        Quit and Show Score
      </button>
    </div>
  );
}
