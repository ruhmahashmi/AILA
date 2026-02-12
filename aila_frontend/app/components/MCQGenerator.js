// components/MCQGenerator.js
import { useState } from "react";

const BACKEND_URL = "http://localhost:8000";

export default function MCQGenerator({
  courseId,
  week,
  conceptId,
  conceptSummary,
  conceptContents,
}) {
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingKG, setLoadingKG] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerateRaw() {
    setLoading(true);
    setError(null);
    setMcqs([]);
    try {
      const body = {
        course_id: courseId,
        week: week,
        concept_id: conceptId,
        summary: conceptSummary ?? "",
        contents: conceptContents ?? "",
      };
      const res = await fetch(`${BACKEND_URL}/api/generate-mcqs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMcqs(Array.isArray(data.mcqs) ? data.mcqs : []);
    } catch (err) {
      setMcqs([]);
      setError("Network or backend error for segment MCQ.");
    }
    setLoading(false);
  }

  async function handleGenerateKG() {
    setLoadingKG(true);
    setError(null);
    setMcqs([]);
    try {
      const body = {
        course_id: String(courseId),
        week: Number(week),
        concept_id: conceptId,
      };
      const res = await fetch(`${BACKEND_URL}/api/generate-mcqs-kg/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMcqs(Array.isArray(data.mcqs) ? data.mcqs : []);
    } catch (err) {
      setMcqs([]);
      setError("Network or backend error for KG MCQ.");
    }
    setLoadingKG(false);
  }

  return (
    <div className="mt-6">
      {/* Action Buttons */}
      <div className="flex gap-4 mb-4">
        <button
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={handleGenerateRaw}
          disabled={loading}
        >
          {loading ? "Generating..." : "🎓 Generate MCQs (Raw)"}
        </button>
        <button
          className="bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={handleGenerateKG}
          disabled={loadingKG}
        >
          {loadingKG ? "Generating..." : "🧠 Generate MCQs (Knowledge Graph)"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {(loading || loadingKG) && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4">
          ⏳ Generating MCQs with AI...
        </div>
      )}

      {/* MCQ Display */}
      {mcqs.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Generated MCQs ({mcqs.length})
            </h3>
          </div>

          <div className="space-y-4">
            {mcqs.map((q, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Question Header with Tags */}
                <div className="flex items-start justify-between mb-3">
                  <div className="font-semibold text-gray-800 flex-1 pr-4">
                    {idx + 1}. {q.question}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* ✅ Difficulty Badge */}
                    <span className={`badge badge-difficulty ${(q.difficulty || 'medium').toLowerCase()}`}>
                      {q.difficulty || "Medium"}
                    </span>
                    {/* ✅ Bloom Level Badge */}
                    <span className="badge badge-bloom">
                      {q.bloom_level || "Remember"}
                    </span>
                  </div>
                </div>

                {/* Options */}
                <ol type="A" className="ml-6 space-y-1.5">
                  {q.options &&
                    q.options.map((opt, oi) => (
                      <li
                        key={oi}
                        className={`py-1 ${
                          q.answer === opt
                            ? "text-green-700 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        {opt}
                        {q.answer === opt && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            ✓ Correct Answer
                          </span>
                        )}
                      </li>
                    ))}
                </ol>

                {/* Optional: Show concept ID */}
                {q.concept_id && (
                  <div className="mt-3 text-xs text-gray-500">
                    Concept: <span className="font-mono">{q.concept_id}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No MCQs State */}
      {!loading && !loadingKG && mcqs.length === 0 && !error && (
        <div className="text-center text-gray-500 py-8">
          Click a button above to generate MCQs
        </div>
      )}

      {/* ✅ Styles */}
      <style jsx>{`
        .badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
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
