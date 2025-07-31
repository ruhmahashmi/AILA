// components/MCQGenerator.js
import { useState } from "react";

export default function MCQGenerator({ courseId, week, segmentIndex, segmentId, segmentContent }) {
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingKG, setLoadingKG] = useState(false);
  const [error, setError] = useState(null);

  // Generate from RAW segment (main content)
  async function handleGenerateRaw() {
    setLoading(true);
    setError(null);
    setMcqs([]);
    try {
      const body = {
        course_id: String(courseId),
        week: Number(week),
        segment_index: Number(segmentIndex),
        content: segmentContent ?? "", // ensure content is always a string!
      };
      const res = await fetch("http://localhost:8000/api/generate-mcqs/", {
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

  // Generate from Knowledge Graph (RAG)
  async function handleGenerateKG() {
    setLoadingKG(true);
    setError(null);
    setMcqs([]);
    try {
      const body = {
        course_id: String(courseId),
        week: Number(week),
        segment_id: segmentId,
      };
      const res = await fetch("http://localhost:8000/api/generate-mcqs-kg/", {
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
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
        <button
          className="bg-blue-700 text-white px-4 py-1 rounded hover:bg-blue-800"
          onClick={handleGenerateRaw}
          disabled={loading}
        >
          {loading ? "Generating MCQs..." : "Teaching Assistant: Generate MCQs (Raw)"}
        </button>
        <button
          className="bg-purple-700 text-white px-4 py-1 rounded hover:bg-purple-800"
          onClick={handleGenerateKG}
          disabled={loadingKG}
        >
          {loadingKG ? "Generating KG MCQs..." : "Teaching Assistant: Generate MCQs (KG)"}
        </button>
      </div>
      {error && <div className="text-red-700 mb-2">{error}</div>}
      {(loading || loadingKG) && <div className="text-blue-500">MCQs are being generated…</div>}
      {mcqs.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">MCQs</h3>
          <ul>
            {mcqs.map((q, idx) => (
              <li key={idx} className="mb-3">
                <div className="font-medium">{`${idx + 1}. ${q.question}`}</div>
                <ol type="A" className="ml-6">
                  {q.options && q.options.map((opt, oi) => (
                    <li key={oi}>
                      {opt}
                      {q.answer === opt && (
                        <span className="text-green-600 font-bold ml-2">(Answer)</span>
                      )}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
