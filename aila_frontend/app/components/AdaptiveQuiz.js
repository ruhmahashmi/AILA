// components/AdaptiveQuiz.js

import { useState, useEffect } from 'react';

export default function AdaptiveQuiz({ segmentId }) {
  const [mcqs, setMcqs] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch or auto-generate MCQs for this segment
  useEffect(() => {
    if (!segmentId) return;
    setLoading(true);
    setError("");
    fetch(`http://localhost:8000/api/mcqs/?segment_id=${segmentId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setMcqs(data);
        } else {
          // No MCQs saved: try live-generation using KG endpoint!
          fetch('http://localhost:8000/api/generate-mcqs-kg/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segment_id: segmentId })
          })
            .then(res => res.json())
            .then(gen => {
              if (gen.mcqs && gen.mcqs.length > 0) {
                setMcqs(gen.mcqs);
              } else {
                setError("No quiz could be generated for this concept.");
              }
            })
            .catch(() => setError("Quiz auto-generation failed."))
        }
        setCurrentIdx(0);
        setAnswers([]);
        setShowResult(false);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not fetch or generate quiz.");
        setLoading(false);
      });
  }, [segmentId]);

  if (loading) return <div>Loading quiz...</div>;
  if (error) return <div className="text-red-700">{error}</div>;
  if (!mcqs.length) return <div>No quiz available for this concept.</div>;
  if (showResult) {
    const score = answers.filter(ans => ans.isCorrect).length;
    return (
      <div>
        <div className="font-bold text-lg mb-2">Quiz Complete!</div>
        <div>Your score: {score} / {mcqs.length}</div>
        <div>
          {score === mcqs.length
            ? <span className="text-green-700">Excellent! You’ve mastered this concept.</span>
            : <span className="text-yellow-700">Review this concept and try again for mastery!</span>
          }
        </div>
      </div>
    );
  }

  const curr = mcqs[currentIdx];

  function handleAnswer(opt) {
    const correct = opt === curr.answer;
    setAnswers([...answers, { question: curr.question, selected: opt, isCorrect: correct }]);
    if (currentIdx + 1 < mcqs.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setShowResult(true);
    }
  }

  const answered = answers.length === currentIdx + 1;

  return (
    <div className="bg-white border rounded p-4">
      <div className="mb-2 font-semibold">
        Question {currentIdx + 1} / {mcqs.length}
      </div>
      <div className="mb-2">{curr.question}</div>
      <ul>
        {curr.options.map((opt, idx) => (
          <li key={idx}>
            <button
              className="block my-1 px-4 py-2 rounded bg-blue-100 hover:bg-blue-300"
              disabled={answered}
              onClick={() => handleAnswer(opt)}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
      {answered &&
        <div className="mt-3 text-sm">
          {answers[answers.length - 1].isCorrect ? (
              <span className="text-green-700">Correct!</span>
            ) : (
              <span className="text-red-700">
                Incorrect. Correct answer: <strong>{curr.answer}</strong>
              </span>
            )
          }
        </div>
      }
    </div>
  );
}
