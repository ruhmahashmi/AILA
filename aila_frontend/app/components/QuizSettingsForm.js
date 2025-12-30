// components/QuizSettingsForm.js
"use client";

import { useEffect, useState } from "react";

export default function QuizSettingsForm({ quizId, week }) {
  const [form, setForm] = useState({
    week,
    min_difficulty: "",
    max_difficulty: "",
    max_questions: "",
    allowed_retries: "",
    feedback_style: "",
    include_spaced: false,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // 1) Load existing settings
  useEffect(() => {
    if (!quizId) return;
    async function loadSettings() {
      try {
        const res = await fetch(
          `http://localhost:8000/api/quiz/settings/${quizId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;
        setForm({
          week: data.week,
          min_difficulty: data.min_difficulty || "",
          max_difficulty: data.max_difficulty || "",
          max_questions: data.max_questions ?? "",
          allowed_retries: data.allowed_retries ?? "",
          feedback_style: data.feedback_style || "",
          include_spaced: data.include_spaced ?? false,
        });
      } catch (e) {
        console.error("Failed to load quiz settings", e);
      }
    }
    loadSettings();
  }, [quizId]);

  // 2) Handle updates
  const updateField = (field) => (e) => {
    const value =
      field === "include_spaced" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  // 3) Save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!quizId) return;
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch(
        `http://localhost:8000/api/quiz/settings/${quizId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            week: form.week,
            min_difficulty: form.min_difficulty || null,
            max_difficulty: form.max_difficulty || null,
            max_questions:
              form.max_questions === "" ? null : Number(form.max_questions),
            allowed_retries:
              form.allowed_retries === ""
                ? null
                : Number(form.allowed_retries),
            feedback_style: form.feedback_style || null,
            include_spaced: !!form.include_spaced,
          }),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      await res.json();
      setSaved(true);
    } catch (err) {
      console.error(err);
      alert("Could not save quiz settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 border p-4 rounded-md">
      <h3 className="font-semibold text-lg">Quiz settings</h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-sm">
          Min difficulty
          <select
            value={form.min_difficulty}
            onChange={updateField("min_difficulty")}
            className="border rounded px-2 py-1"
          >
            <option value="">(none)</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Max difficulty
          <select
            value={form.max_difficulty}
            onChange={updateField("max_difficulty")}
            className="border rounded px-2 py-1"
          >
            <option value="">(none)</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Max questions per session
          <input
            type="number"
            min="1"
            className="border rounded px-2 py-1"
            value={form.max_questions}
            onChange={updateField("max_questions")}
          />
        </label>

        <label className="flex flex-col text-sm">
          Allowed retries
          <input
            type="number"
            min="0"
            className="border rounded px-2 py-1"
            value={form.allowed_retries}
            onChange={updateField("allowed_retries")}
          />
        </label>

        <label className="flex flex-col text-sm col-span-2">
          Feedback style
          <select
            value={form.feedback_style}
            onChange={updateField("feedback_style")}
            className="border rounded px-2 py-1"
          >
            <option value="">(default)</option>
            <option value="show_answer">Show correct answer</option>
            <option value="hint_only">Hint only</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.include_spaced}
          onChange={updateField("include_spaced")}
        />
        Include spaced-retrieval “old” concepts
      </label>

      <button
        type="submit"
        disabled={loading}
        className="px-3 py-1 bg-black text-white rounded text-sm"
      >
        {loading ? "Saving..." : "Save settings"}
      </button>

      {saved && <span className="text-xs text-green-600 ml-2">Saved!</span>}
    </form>
  );
}
