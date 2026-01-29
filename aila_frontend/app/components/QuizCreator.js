// app/components/QuizCreator.js
'use client';

import { useState, useEffect, useRef } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function QuizCreator({ courseId, week, concepts = [], onQuizCreated, onConceptClick }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Track if the user has manually edited the name to stop overwriting it
  const [userHasEditedName, setUserHasEditedName] = useState(false);

  // Debounce timer ref
  const debounceTimer = useRef(null);

  function toggleConcept(id) {
    const newSelection = selected.includes(id) 
      ? selected.filter((x) => x !== id) 
      : [...selected, id];
      
    setSelected(newSelection);
    
    // Trigger external handler (for "Concept Details" view)
    if (onConceptClick) {
      onConceptClick(id);
    }

    // --- AUTO-GENERATE TITLE LOGIC ---
    // Only generate if user hasn't manually typed a name (or if the box is empty)
    if (!userHasEditedName || name.trim() === "") {
        
        // Clear previous timer
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        // If selection is empty, clear name
        if (newSelection.length === 0) {
            setName("");
            setIsAutoGenerating(false);
            return;
        }

        setIsAutoGenerating(true);

        // Set new timer (wait 1 second after last click)
        debounceTimer.current = setTimeout(async () => {
            const selectedLabels = concepts
                .filter(c => newSelection.includes(c.id))
                .map(c => c.label);
            
            try {
                const res = await fetch(`${BACKEND_URL}/api/quiz/generate-title`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ concepts: selectedLabels })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.title) {
                        setName(data.title);
                        // We do NOT set userHasEditedName to true here, 
                        // so future clicks can still update it.
                    }
                }
            } catch (e) {
                console.error("Auto-title failed", e);
            } finally {
                setIsAutoGenerating(false);
            }
        }, 800); 
    }
  }

  function handleNameChange(e) {
      setName(e.target.value);
      setUserHasEditedName(true); // Lock it so auto-gen stops interfering
  }

  async function handleCreate() {
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
      const payload = {
        name: name.trim(),
        course_id: String(courseId),
        week: parseInt(week, 10),
        instructor_id: "unknown",
        concept_ids: selected
      };

      const res = await fetch(`${BACKEND_URL}/api/quiz/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        let msg = `Quiz creation failed (HTTP ${res.status})`;
        if (data?.detail) {
            msg = Array.isArray(data.detail) 
                ? data.detail.map(e => e.msg).join(' | ') 
                : String(data.detail);
        }
        setError(msg);
        return;
      }

      if (data) {
        // Reset everything on success
        setName("");
        setSelected([]);
        setUserHasEditedName(false);
        onQuizCreated && onQuizCreated();
      }
    } catch (e) {
      setError(`Network error: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      
      {/* Name Input Section */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">
          <span>Quiz Name</span>
          {isAutoGenerating && <span className="text-blue-500 animate-pulse font-normal normal-case">✨ Generating title...</span>}
        </label>
        <div className="flex gap-2">
          <input
            className={`flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isAutoGenerating ? "bg-blue-50 border-blue-200 text-blue-800" : "border-gray-300"
            }`}
            value={name}
            placeholder={selected.length === 0 ? "Select concepts below..." : "Quiz Name"}
            onChange={handleNameChange}
            disabled={saving}
          />
          <button
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition disabled:opacity-60"
            onClick={handleCreate}
            disabled={!name.trim() || !selected.length || saving}
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </div>

      {/* Concept Selection Section */}
      <div>
        <div className="flex justify-between items-end mb-2">
           <div className="text-xs font-bold text-gray-500 uppercase">Select Concepts</div>
           <span className="text-[10px] text-gray-400">{selected.length} selected</span>
        </div>
        
        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
          {concepts.length === 0 && (
            <div className="text-xs text-gray-500 italic p-2 border border-dashed rounded w-full text-center">
                No concepts available. Upload slides first.
            </div>
          )}

          {concepts.map((c) => {
            const active = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white shadow-md transform scale-105"
                    : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                }`}
                onClick={() => toggleConcept(c.id)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 font-medium bg-red-50 p-3 rounded border border-red-200">
            ⚠️ {error}
        </div>
      )}
    </div>
  );
}
