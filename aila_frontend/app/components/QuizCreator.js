// app/components/QuizCreator.js
'use client';

import { useState } from "react";

const BACKEND_URL = "http://localhost:8000";

export default function QuizCreator({ courseId, week, concepts = [], onQuizCreated }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function toggleConcept(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!name.trim() || !selected.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/create`, {
        method: "POST",
        body: new URLSearchParams({
          name: name.trim(),
          course_id: courseId,
          week: week,
          instructor_id: "YOUR_INSTRUCTOR_ID", // TODO: replace with actual user id
          concept_ids: JSON.stringify(selected),
        }),
      });
      const data = await res.json();
      if (data.quiz) {
        setName("");
        setSelected([]);
        onQuizCreated && onQuizCreated(data.quiz);
      } else {
        setError("Quiz creation failed.");
      }
    } catch {
      setError("Quiz creation failed.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Create a new quiz</h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={name}
          placeholder="Quiz name (e.g. Practice: Command Line Args)"
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-60"
          onClick={handleCreate}
          disabled={!name.trim() || !selected.length || saving}
        >
          {saving ? "Saving…" : "Create Quiz"}
        </button>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-700 mb-1">
          Select concepts
        </div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
          {concepts.length === 0 && (
            <div className="text-xs text-gray-500">
              No concepts available for this week yet.
            </div>
          )}
          {concepts.map((c) => {
            const active = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`px-2 py-1 rounded-full text-xs border ${
                  active
                    ? "bg-green-500 border-green-500 text-white"
                    : "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => toggleConcept(c.id)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
