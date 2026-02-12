// components/QuizSettingsForm.js
'use client';

import { useState, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ✅ Bloom level ordering
const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

export default function QuizSettingsForm({ quizId, week }) {
  const [settings, setSettings] = useState({
    mindifficulty: "Easy",
    maxdifficulty: "Hard",
    min_bloom_level: "Remember",  // ✅ Add
    max_bloom_level: "Create",    // ✅ Add
    maxquestions: 10,
    allowedretries: 3,
    feedbackstyle: "Immediate",
    includespaced: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchSettings() {
      if (!quizId) return;
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/quiz/settings/${quizId}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data) {
            setSettings({
              mindifficulty: data.mindifficulty || "Easy",
              maxdifficulty: data.maxdifficulty || "Hard",
              min_bloom_level: data.min_bloom_level || "Remember",  // ✅ Add
              max_bloom_level: data.max_bloom_level || "Create",    // ✅ Add
              maxquestions: data.maxquestions ?? 10,
              allowedretries: data.allowedretries ?? 3,
              feedbackstyle: data.feedbackstyle || "Immediate",
              includespaced: data.includespaced ?? false
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchSettings();
    return () => { active = false; };
  }, [quizId]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
  
    try {
      const payload = {
        week: parseInt(week, 10),
        min_difficulty: settings.mindifficulty,
        max_difficulty: settings.maxdifficulty,
        min_bloom_level: settings.min_bloom_level,
        max_bloom_level: settings.max_bloom_level,
        max_questions: parseInt(settings.maxquestions, 10),
        allowed_retries: parseInt(settings.allowedretries, 10),
        feedback_style: settings.feedbackstyle,
        include_spaced: settings.includespaced,
      };
  
      const res = await fetch(`${BACKEND_URL}/api/quiz/settings/${quizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) throw new Error("Failed to save");
  
      const savedData = await res.json();
      setMessage({ type: "success", text: "Settings saved!" });
      setSettings(prev => ({
        ...prev,
        mindifficulty: savedData.mindifficulty,
        maxdifficulty: savedData.maxdifficulty,
        min_bloom_level: savedData.min_bloom_level,
        max_bloom_level: savedData.max_bloom_level,
        maxquestions: savedData.maxquestions,
        allowedretries: savedData.allowedretries,
        feedbackstyle: savedData.feedbackstyle,
        includespaced: savedData.includespaced,
      }));
    } catch (e) {
      setMessage({ type: "error", text: "Error saving settings." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }
    
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 border-b pb-2">
        Quiz Settings
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Difficulty Range */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Min difficulty</label>
          <select 
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={settings.mindifficulty}
            onChange={(e) => setSettings({...settings, mindifficulty: e.target.value})}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Max difficulty</label>
          <select 
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={settings.maxdifficulty}
            onChange={(e) => setSettings({...settings, maxdifficulty: e.target.value})}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* ✅ Bloom Level Range */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Min Bloom level</label>
          <select 
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={settings.min_bloom_level}
            onChange={(e) => setSettings({...settings, min_bloom_level: e.target.value})}
          >
            {BLOOM_LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Max Bloom level</label>
          <select 
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={settings.max_bloom_level}
            onChange={(e) => setSettings({...settings, max_bloom_level: e.target.value})}
          >
            {BLOOM_LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Counts */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Max questions</label>
          <input 
            type="number" 
            min="1" max="50"
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={settings.maxquestions}
            onChange={(e) => setSettings({...settings, maxquestions: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Allowed retries</label>
          <input 
            type="number" 
            min="1" max="10"
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={settings.allowedretries}
            onChange={(e) => setSettings({...settings, allowedretries: e.target.value})}
          />
        </div>

        {/* Style */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Feedback style</label>
          <select 
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={settings.feedbackstyle}
            onChange={(e) => setSettings({...settings, feedbackstyle: e.target.value})}
          >
            <option value="Immediate">Immediate (Show after each question)</option>
            <option value="Summary">Summary (Show only at end)</option>
          </select>
        </div>

        {/* Spaced Retrieval Toggle */}
        <div className="col-span-2 flex items-center gap-2 mt-1">
          <input 
            type="checkbox" 
            id={`spaced-${quizId}`}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
            checked={settings.includespaced}
            onChange={(e) => setSettings({...settings, includespaced: e.target.checked})}
          />
          <label htmlFor={`spaced-${quizId}`} className="text-sm text-gray-700 cursor-pointer select-none">
            Include spaced-retrieval "old" concepts
          </label>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={saving || loading}
        className={`w-full py-2 px-4 rounded-md text-sm font-semibold text-white shadow-sm transition-all ${
           saving ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"
        }`}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {message && (
        <div className={`mt-3 text-xs text-center p-2 rounded ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
