'use client';
import { useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function EditableQuestion({ question, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  // ✅ Initialize state with bloom_level
  const [editedData, setEditedData] = useState({
    question: question.question,
    options: question.options || [], 
    answer: question.answer,
    difficulty: question.difficulty || "Medium",
    bloom_level: question.bloom_level || "Remember"
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/mcq/${question.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData)
      });

      if (!res.ok) throw new Error("Failed to update");
      
      const data = await res.json();
      setIsEditing(false);
      // Notify parent to update the list (if needed)
      if (onUpdate) onUpdate(data.mcq); 
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // --- VIEW MODE ---
  if (!isEditing) {
    return (
      <div className="border border-gray-200 p-4 rounded-lg mb-3 bg-white shadow-sm hover:shadow-md transition-shadow relative group">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold text-gray-900 pr-12 leading-relaxed">
            {question.question}
          </h4>
          <button 
            onClick={() => setIsEditing(true)}
            className="text-xs bg-gray-100 hover:bg-blue-50 text-blue-600 px-3 py-1.5 rounded border border-gray-200 transition-colors font-medium"
          >
            Edit
          </button>
        </div>
        
        <ul className="space-y-2 mb-3">
          {question.options.map((opt, i) => (
            <li 
              key={i} 
              className={`text-sm px-3 py-2 rounded transition-colors ${
                opt === question.answer 
                  ? "bg-green-50 text-green-700 border border-green-200 font-medium" 
                  : "text-gray-600 bg-gray-50"
              }`}
            >
              {opt} {opt === question.answer && <span className="ml-2">✓</span>}
            </li>
          ))}
        </ul>
        
        {/* ✅ Enhanced Tags with Bloom Level */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className={`badge badge-difficulty ${(question.difficulty || 'medium').toLowerCase()}`}>
            {question.difficulty || "Medium"}
          </span>
          <span className="badge badge-bloom">
            {question.bloom_level || "Remember"}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
            {question.concept_id || "General"}
          </span>
        </div>

        {/* ✅ Inline Styles */}
        <style jsx>{`
          .badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
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

  // --- EDIT MODE ---
  return (
    <div className="border border-blue-300 p-5 rounded-lg mb-3 bg-blue-50 shadow-inner">
      {/* Question Text */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
          Question Text
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
          rows={3}
          value={editedData.question}
          onChange={(e) => setEditedData({...editedData, question: e.target.value})}
          placeholder="Enter question text..."
        />
      </div>

      {/* Options */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
          Options (Select Correct Answer)
        </label>
        <div className="space-y-2">
          {editedData.options.map((opt, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={editedData.answer === opt}
                onChange={() => setEditedData({...editedData, answer: opt})}
                className="w-4 h-4 text-blue-600 cursor-pointer focus:ring-2 focus:ring-blue-500"
                title="Mark as correct answer"
              />
              <input
                className={`flex-1 p-2.5 border rounded-lg text-sm transition-all ${
                  editedData.answer === opt 
                    ? 'border-green-500 ring-2 ring-green-200 bg-white font-medium' 
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                value={opt}
                onChange={(e) => {
                  const newOpts = [...editedData.options];
                  newOpts[idx] = e.target.value;
                  const wasCorrect = (editedData.answer === opt);
                  setEditedData({
                    ...editedData, 
                    options: newOpts,
                    answer: wasCorrect ? e.target.value : editedData.answer
                  });
                }}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Metadata Controls (Difficulty + Bloom Level) */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Difficulty
          </label>
          <select 
            value={editedData.difficulty}
            onChange={(e) => setEditedData({...editedData, difficulty: e.target.value})}
            className="w-full text-sm p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* ✅ Bloom Level Dropdown */}
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Bloom's Level
          </label>
          <select 
            value={editedData.bloom_level}
            onChange={(e) => setEditedData({...editedData, bloom_level: e.target.value})}
            className="w-full text-sm p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Remember">Remember</option>
            <option value="Understand">Understand</option>
            <option value="Apply">Apply</option>
            <option value="Analyze">Analyze</option>
            <option value="Evaluate">Evaluate</option>
            <option value="Create">Create</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
        <button 
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          className="px-5 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
