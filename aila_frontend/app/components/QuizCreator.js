// app/components/QuizCreator.js
'use client';

import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function QuizCreator({ courseId, week, concepts = [], onQuizCreated, onConceptClick }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function toggleConcept(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    
    // Trigger external handler to update "Concept Details" view
    if (onConceptClick) {
      onConceptClick(id);
    }
  }

  async function handleCreate() {
    // 1. Validate inputs before sending
    if (!name.trim()) {
      setError("Please enter a quiz name.");
      return;
    }
    if (selected.length === 0) {
      setError("Please select at least one concept.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 2. Prepare payload matching QuizCreate Pydantic model exactly
      const payload = {
        name: name.trim(),
        course_id: String(courseId),     // Force string
        week: parseInt(week, 10),        // Force integer
        instructor_id: "unknown",        // Matches default
        concept_ids: selected            // List[str]
      };

      console.log("📤 Sending Payload:", payload);

      const res = await fetch(`${BACKEND_URL}/api/quiz/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // 3. Capture Pydantic validation errors (422) detailed message
        console.error("❌ Backend Error:", data);
        let msg = `Quiz creation failed (HTTP ${res.status})`;
        
        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            // Pydantic returns array of errors: [{loc, msg, type}]
            msg = data.detail.map(e => `${e.loc.join('.')} - ${e.msg}`).join(' | ');
          } else {
            msg = String(data.detail);
          }
        }
        setError(msg);
        setSaving(false);
        return;
      }

      // Success!
      if (data) {
        console.log("✅ Quiz Created:", data);
        setName("");
        setSelected([]);
        onQuizCreated && onQuizCreated();
      }
    } catch (e) {
      console.error("❌ Network Error:", e);
      setError(`Network error: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
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
        <div className="text-xs font-semibold text-gray-700 mb-1">Select concepts</div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
          {concepts.length === 0 && (
            <div className="text-xs text-gray-500">No concepts available for this week yet.</div>
          )}

          {concepts.map((c) => {
            const active = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`px-2 py-1 rounded-full text-xs border transition-colors duration-200 ${
                  active
                    ? "bg-green-500 border-green-500 text-white shadow-sm"
                    : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => toggleConcept(c.id)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="text-xs text-red-600 mt-2 font-mono break-all bg-red-50 p-2 rounded border border-red-200">{error}</div>}
    </div>
  );
}
