// components/QuizCreator.js

'use client';
import { useState } from "react";

export default function QuizCreator({ courseId, week, concepts = [], onQuizCreated }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function toggleConcept(id) {
    setSelected(selected =>
      selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]
    );
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/quiz/create", {
        method: "POST",
        body: new URLSearchParams({
          name: name,
          course_id: courseId,
          week: week,
          instructor_id: "YOUR_INSTRUCTOR_ID", // Replace with auth
          concept_ids: JSON.stringify(selected)
        }),
      });
      const data = await res.json();
      if (data.quiz) {
        setName(""); setSelected([]);
        onQuizCreated && onQuizCreated(data.quiz);
      }
    } catch {
      setError("Quiz creation failed.");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-1 font-semibold">Create a New Quiz</div>
      <input
        className="border p-1 mr-3"
        value={name}
        placeholder="Quiz name (e.g. Practice Algorithms)"
        onChange={e => setName(e.target.value)}
      />
      <div className="mt-2 mb-1">Select concepts:</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {concepts.map(c => (
          <button
            key={c.id}
            type="button"
            className={
              selected.includes(c.id)
                ? "bg-green-400 text-white rounded px-2"
                : "bg-gray-200 rounded px-2"
            }
            onClick={() => toggleConcept(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <button
        className="bg-blue-700 text-white px-4 py-1 rounded"
        onClick={handleCreate}
        disabled={!name || !selected.length || saving}
      >
        {saving ? "Saving..." : "Create Quiz"}
      </button>
      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}
