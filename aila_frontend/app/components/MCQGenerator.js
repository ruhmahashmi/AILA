import { useState } from 'react';
export default function MCQGenerator({ courseId, week, segmentIndex }) {
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setMcqs([]);
    try {
      const res = await fetch('http://localhost:8000/api/generate-mcqs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, week, segment_index: segmentIndex }),
      });
      if (res.ok) {
        const data = await res.json();
        setMcqs(Array.isArray(data.mcqs) ? data.mcqs : []);
      } else {
        setMcqs([]);
      }
    } catch {
      setMcqs([]);
    }
    setLoading(false);
  }

  return (
    <div>
      <button
        className="bg-blue-700 text-white px-4 py-1 rounded hover:bg-blue-800"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? 'Generating MCQs...' : 'Teaching Assistant: Generate MCQs'}
      </button>
      {mcqs.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">MCQs</h3>
          <ul>
            {mcqs.map((q, idx) => (
              <li key={idx} className="mb-3">
                <div className="font-medium">{`${idx + 1}. ${q.question}`}</div>
                <ol type="A" className="ml-6">
                  {q.options.map((opt, oi) => (
                    <li key={oi}>{opt}{q.answer === opt && <span className="text-green-600 font-bold ml-2">(Answer)</span>}</li>
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
