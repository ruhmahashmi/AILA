// app/components/QuizCreator.js
'use client';

import { useState, useEffect, useRef, useMemo } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ─── AI SUGGESTION ENGINE ───────────────────────────────────────────────────
// Builds suggested quiz "bundles" from the concept graph structure.
// Strategy:
//   1. Parent + children  — every level-1 sub-topic with its children
//   2. Related pairs      — concepts linked by a semantic edge (enables,
//      requires, contrasts_with, extends, precedes)
//   3. Inferred spotlight — all inferred (depth=3) concepts grouped together
//      so instructor can test domain knowledge gaps
function buildSuggestions(concepts, edges = []) {
  if (!concepts || concepts.length === 0) return [];

  const byId = Object.fromEntries(concepts.map(c => [c.id, c]));
  const SEMANTIC = new Set(['enables','requires','extends','contrasts_with',
                            'precedes','uses','implements','is_a']);

  const suggestions = [];
  const seen = new Set(); // dedup by sorted concept-id key

  const key = (ids) => [...ids].sort().join('|');

  // 1. Parent → children bundles
  const childrenOf = {};
  edges.forEach(e => {
    const src = typeof e.source === 'object' ? e.source.id : e.source;
    const tgt = typeof e.target === 'object' ? e.target.id : e.target;
    const srcNode = byId[src];
    const tgtNode = byId[tgt];
    if (!srcNode || !tgtNode) return;
    if (srcNode.isRoot) return; // skip root→subtopic
    if (!childrenOf[src]) childrenOf[src] = [];
    childrenOf[src].push(tgt);
  });

  Object.entries(childrenOf).forEach(([parentId, childIds]) => {
    if (childIds.length < 1) return;
    const ids = [parentId, ...childIds.slice(0, 4)];
    const k = key(ids);
    if (seen.has(k)) return;
    seen.add(k);
    const parent = byId[parentId];
    suggestions.push({
      id: k,
      type: 'parent_children',
      label: `${parent?.label || parentId} & its sub-concepts`,
      reason: `Tests ${parent?.label} along with ${childIds.length} related sub-concept${childIds.length > 1 ? 's' : ''}`,
      conceptIds: ids,
    });
  });

  // 2. Semantic pairs / groups
  edges.forEach((e, i) => {
    const src = typeof e.source === 'object' ? e.source.id : e.source;
    const tgt = typeof e.target === 'object' ? e.target.id : e.target;
    const rel = e.relation || '';
    if (!SEMANTIC.has(rel)) return;
    const srcNode = byId[src];
    const tgtNode = byId[tgt];
    if (!srcNode || !tgtNode || srcNode.isRoot || tgtNode.isRoot) return;

    const ids = [src, tgt];
    const k = key(ids);
    if (seen.has(k)) return;
    seen.add(k);
    suggestions.push({
      id: k,
      type: 'semantic',
      label: `${srcNode.label} & ${tgtNode.label}`,
      reason: `These concepts are linked — "${srcNode.label}" ${rel.replace(/_/g,' ')} "${tgtNode.label}"`,
      conceptIds: ids,
    });
  });

  // 3. Inferred spotlight
  const inferred = concepts.filter(c => c.inferred || c.slide_depth === 3);
  if (inferred.length >= 2) {
    const ids = inferred.map(c => c.id);
    const k = key(ids);
    if (!seen.has(k)) {
      seen.add(k);
      suggestions.push({
        id: k,
        type: 'inferred',
        label: 'AI-inferred concepts',
        reason: `${inferred.length} concepts weren't explicitly covered in slides — good stretch questions`,
        conceptIds: ids,
      });
    }
  }

  return suggestions.slice(0, 8); // cap at 8 suggestions
}

// ─── CONCEPT PILL ────────────────────────────────────────────────────────────
function ConceptPill({ concept, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const depth = concept.slide_depth || (concept.inferred ? 3 : 1);

  const baseStyle = active
    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50';

  const depthDot = depth === 3
    ? 'bg-amber-400'
    : depth === 2
      ? 'bg-sky-400'
      : 'bg-emerald-400';

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 flex items-center gap-1.5 ${baseStyle}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-white/70' : depthDot}`} />
        {concept.label}
      </button>

      {/* Inline summary tooltip */}
      {hovered && concept.summary && (
        <div className="absolute bottom-full left-0 mb-1.5 z-50 w-64 bg-gray-900 text-white text-xs
          rounded-xl px-3 py-2 shadow-xl leading-relaxed pointer-events-none">
          <p className="font-semibold mb-0.5 text-indigo-300">{concept.label}</p>
          <p className="opacity-90">{concept.summary}</p>
          {depth === 3 && <p className="mt-1 text-amber-300 text-[10px]">★ AI-inferred — not explicitly in slides</p>}
          {depth === 2 && <p className="mt-1 text-sky-300 text-[10px]">~ Briefly mentioned in slides</p>}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4
            border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// ─── SUGGESTION CARD ─────────────────────────────────────────────────────────
function SuggestionCard({ suggestion, concepts, onUse }) {
  const [expanded, setExpanded] = useState(false);
  const byId = Object.fromEntries(concepts.map(c => [c.id, c]));

  const typeColors = {
    parent_children: 'bg-purple-50 border-purple-200 text-purple-700',
    semantic:        'bg-indigo-50 border-indigo-200 text-indigo-700',
    inferred:        'bg-amber-50  border-amber-200  text-amber-700',
  };
  const typeIcons = {
    parent_children: '🌿',
    semantic:        '🔗',
    inferred:        '✨',
  };

  return (
    <div className={`rounded-xl border p-3 transition-all ${typeColors[suggestion.type] || 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span>{typeIcons[suggestion.type]}</span>
            <p className="font-semibold text-xs truncate">{suggestion.label}</p>
          </div>
          <p className="text-[11px] opacity-75 leading-snug">{suggestion.reason}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-current opacity-70 hover:opacity-100 transition-opacity"
          >
            {expanded ? 'Hide' : 'Preview'}
          </button>
          <button
            onClick={() => onUse(suggestion.conceptIds)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/60 border border-current hover:bg-white transition-colors"
          >
            Use
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-current/20 flex flex-wrap gap-1.5">
          {suggestion.conceptIds.map(id => {
            const c = byId[id];
            if (!c) return null;
            return (
              <span key={id} className="text-[10px] px-2 py-0.5 bg-white/60 rounded-full border border-current/30 font-medium">
                {c.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function QuizCreator({ courseId, week, concepts = [], edges = [], onQuizCreated, onConceptClick }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [userHasEditedName, setUserHasEditedName] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const debounceTimer = useRef(null);

  // Concepts excluding the root node
  const selectableConcepts = useMemo(
    () => concepts.filter(c => !c.isRoot),
    [concepts]
  );

  const suggestions = useMemo(
    () => buildSuggestions(selectableConcepts, edges),
    [selectableConcepts, edges]
  );

  // Currently hovered/selected concept for the summary strip
  const [hoveredConceptId, setHoveredConceptId] = useState(null);
  const focusConcept = hoveredConceptId
    ? concepts.find(c => c.id === hoveredConceptId)
    : selected.length === 1
      ? concepts.find(c => c.id === selected[0])
      : null;

  function toggleConcept(id) {
    const newSelection = selected.includes(id)
      ? selected.filter(x => x !== id)
      : [...selected, id];
    setSelected(newSelection);
    if (onConceptClick) onConceptClick(id);
    autoGenerateTitle(newSelection);
  }

  function applyBundle(conceptIds) {
    // Merge with existing selection
    const merged = [...new Set([...selected, ...conceptIds])];
    setSelected(merged);
    autoGenerateTitle(merged);
    setShowSuggestions(false);
  }

  function autoGenerateTitle(newSelection) {
    if (userHasEditedName && name.trim() !== "") return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (newSelection.length === 0) { setName(""); setIsAutoGenerating(false); return; }

    setIsAutoGenerating(true);
    debounceTimer.current = setTimeout(async () => {
      const labels = concepts.filter(c => newSelection.includes(c.id)).map(c => c.label);
      try {
        const res = await fetch(`${BACKEND_URL}/api/quiz/generate-title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concepts: labels })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.title) setName(data.title);
        }
      } catch { /* silent */ } finally {
        setIsAutoGenerating(false);
      }
    }, 800);
  }

  function handleNameChange(e) {
    setName(e.target.value);
    setUserHasEditedName(true);
  }

  async function handleCreate() {
    if (!name.trim()) { setError("Please enter a quiz name."); return; }
    if (selected.length === 0) { setError("Please select at least one concept."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          course_id: String(courseId),
          week: parseInt(week, 10),
          instructor_id: "unknown",
          concept_ids: selected
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.detail
          ? (Array.isArray(data.detail) ? data.detail.map(e => e.msg).join(' | ') : String(data.detail))
          : `Quiz creation failed (HTTP ${res.status})`;
        setError(msg); return;
      }
      if (data) {
        setName(""); setSelected([]); setUserHasEditedName(false);
        setShowSuggestions(true);
        onQuizCreated?.(data.quiz_id);
      }
    } catch (e) {
      setError(`Network error: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

      {/* ── LEFT: Concept selection + name + create ── */}
      <div className="lg:col-span-2 space-y-5">

        {/* Name row */}
        <div>
          <label className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase mb-1.5">
            <span>Quiz Name</span>
            {isAutoGenerating && (
              <span className="text-indigo-500 animate-pulse font-normal normal-case text-[11px]">
                ✨ Auto-generating title…
              </span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
                isAutoGenerating ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'border-gray-300'
              }`}
              value={name}
              placeholder={selected.length === 0 ? 'Select concepts to auto-fill…' : 'Quiz Name'}
              onChange={handleNameChange}
              disabled={saving}
            />
            <button
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
              onClick={handleCreate}
              disabled={!name.trim() || !selected.length || saving}
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>

        {/* Concept pills */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Select Concepts</span>
            <div className="flex items-center gap-2">
              {selected.length > 0 && (
                <button
                  onClick={() => { setSelected([]); setName(""); setUserHasEditedName(false); }}
                  className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              )}
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {selected.length} selected
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[60px] p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            {selectableConcepts.length === 0 && (
              <p className="text-xs text-gray-400 italic w-full text-center py-2">
                No concepts yet — upload slides first
              </p>
            )}
            {selectableConcepts.map(c => (
              <ConceptPill
                key={c.id}
                concept={c}
                active={selected.includes(c.id)}
                onClick={() => toggleConcept(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Inline concept summary strip — appears when exactly 1 concept is selected or hovered */}
        {focusConcept && (
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <div className="w-1.5 h-full min-h-[2rem] bg-indigo-400 rounded-full flex-shrink-0 self-stretch" />
            <div>
              <p className="text-xs font-bold text-indigo-700 mb-0.5">{focusConcept.label}</p>
              <p className="text-xs text-indigo-600/80 leading-relaxed">
                {focusConcept.summary || 'No summary available for this concept.'}
              </p>
              {(focusConcept.slide_depth === 3 || focusConcept.inferred) && (
                <p className="text-[10px] text-amber-600 mt-1">★ AI-inferred — not explicitly in slides</p>
              )}
              {focusConcept.slide_depth === 2 && (
                <p className="text-[10px] text-sky-600 mt-1">~ Briefly mentioned in slides</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-200">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* ── RIGHT: AI Suggested Quizzes ── */}
      <div className="space-y-3 lg:border-l lg:border-gray-100 lg:pl-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quiz Suggestions</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Concepts that work well together</p>
          </div>
          {suggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(v => !v)}
              className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showSuggestions ? 'Hide' : 'Show'}
            </button>
          )}
        </div>

        {showSuggestions && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {suggestions.length === 0 && (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-2xl mb-1">🤖</p>
                <p className="text-xs">Suggestions appear once<br/>concepts are loaded</p>
              </div>
            )}
            {suggestions.map(s => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                concepts={concepts}
                onUse={applyBundle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
