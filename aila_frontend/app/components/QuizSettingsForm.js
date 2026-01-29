// components/QuizSettingsForm.js
'use client';

import { useState, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function QuizSettingsForm({ quizId, week }) {
  // 1. Initialize State with sensible DEFAULTS (matches backend)
  // This prevents the "none" or empty state while loading.
  const [settings, setSettings] = useState({
    mindifficulty: "Easy",
    maxdifficulty: "Hard",
    maxquestions: 10,
    allowedretries: 3,
    feedbackstyle: "Immediate",
    includespaced: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // 2. Fetch settings when the component mounts or quizId changes
  useEffect(() => {
    let active = true;

    async function fetchSettings() {
      if (!quizId) return;
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/quiz/settings/${quizId}`);
        if (res.ok) {
          const data = await res.json();
          // Only update state if the component is still mounted
          if (active && data) {
            setSettings({
              mindifficulty: data.mindifficulty || "Easy",
              maxdifficulty: data.maxdifficulty || "Hard",
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

  // 3. Handle Save
  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        week: parseInt(week, 10),
        mindifficulty: settings.mindifficulty,
        maxdifficulty: settings.maxdifficulty,
        maxquestions: parseInt(settings.maxquestions, 10),
        allowedretries: parseInt(settings.allowedretries, 10),
        feedbackstyle: settings.feedbackstyle,
        includespaced: settings.includespaced
      };

      const res = await fetch(`${BACKEND_URL}/api/quiz/settings/${quizId}`, {
        method: "POST", // Using POST for Upsert (Create or Update)
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save");
      
      const savedData = await res.json();
      setMessage({ type: "success", text: "Settings saved!" });
      
      // Update local state to match exactly what server returned
      setSettings(prev => ({ ...prev, ...savedData }));

    } catch (e) {
      setMessage({ type: "error", text: "Error saving settings." });
    } finally {
      setSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }
  }

  // --- RENDER ---
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
