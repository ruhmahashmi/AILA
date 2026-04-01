'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ─── Bloom level color mapping ────────────────────────────────────────────────
const BLOOM_COLORS = {
  Remember:   { bg: 'bg-violet-100',  text: 'text-violet-800',  bar: 'bg-violet-500'  },
  Understand: { bg: 'bg-blue-100',    text: 'text-blue-800',    bar: 'bg-blue-500'    },
  Apply:      { bg: 'bg-sky-100',     text: 'text-sky-800',     bar: 'bg-sky-500'     },
  Analyze:    { bg: 'bg-amber-100',   text: 'text-amber-800',   bar: 'bg-amber-500'   },
  Evaluate:   { bg: 'bg-orange-100',  text: 'text-orange-800',  bar: 'bg-orange-500'  },
  Create:     { bg: 'bg-emerald-100', text: 'text-emerald-800', bar: 'bg-emerald-500' },
};

const BLOOM_FALLBACK = { bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-400' };

// ─── Difficulty badge colors ──────────────────────────────────────────────────
const DIFFICULTY_COLORS = {
  Easy:   'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard:   'bg-red-100 text-red-800',
};

// ─── Accuracy bar color by pct ────────────────────────────────────────────────
function accuracyBarColor(pct) {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-red-500';
}

// ─── Row highlight by score_pct ───────────────────────────────────────────────
function scoreRowClass(pct) {
  if (pct >= 80) return 'bg-green-50';
  if (pct >= 60) return 'bg-yellow-50';
  return 'bg-red-50';
}

// ─── Skeleton helpers ─────────────────────────────────────────────────────────
function SkeletonLine({ width = 'w-full', height = 'h-4' }) {
  return (
    <div
      className={`${width} ${height} bg-gray-200 rounded animate-pulse`}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3">
      <SkeletonLine width="w-1/2" height="h-3" />
      <SkeletonLine width="w-1/4" height="h-8" />
    </div>
  );
}

// ─── Format date ──────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function QuizFeedbackPage() {
  const router = useRouter();
  const { id: courseId, weekNumber, quizId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch feedback data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!quizId) return;

    const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const user = raw ? JSON.parse(raw) : null;

    const fetchFeedback = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${BACKEND_URL}/api/instructor/quiz/feedback?quiz_id=${encodeURIComponent(quizId)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(user?.id ? { 'X-User-Id': user.id } : {}),
            },
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Server error ${res.status}`);
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message || 'Failed to load quiz feedback.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [quizId]);

  // ── Bloom summary: aggregate question_breakdown by bloom_level ───────────────
  const bloomSummary = useMemo(() => {
    if (!data?.question_breakdown?.length) return [];

    const map = {};
    for (const q of data.question_breakdown) {
      const lvl = q.bloom_level || 'Unknown';
      if (!map[lvl]) map[lvl] = { total: 0, count: 0 };
      map[lvl].total += q.accuracy_pct ?? 0;
      map[lvl].count += 1;
    }

    return Object.entries(map)
      .map(([level, { total, count }]) => ({
        level,
        avgAccuracy: count > 0 ? total / count : 0,
        count,
      }))
      .sort((a, b) => a.avgAccuracy - b.avgAccuracy); // hardest first
  }, [data]);

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header skeleton */}
        <div className="mb-6 flex flex-col gap-2">
          <SkeletonLine width="w-24" height="h-4" />
          <SkeletonLine width="w-72" height="h-7" />
          <SkeletonLine width="w-40" height="h-4" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Question skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex flex-col gap-4">
          <SkeletonLine width="w-48" height="h-5" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
              <SkeletonLine width="w-full" height="h-4" />
              <SkeletonLine width="w-2/3" height="h-3" />
              <SkeletonLine width="w-full" height="h-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Failed to load feedback</h2>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // ─── No data guard ────────────────────────────────────────────────────────────
  if (!data) return null;

  const {
    quiz_name,
    total_attempts,
    avg_score_pct,
    completion_rate,
    question_breakdown = [],
    student_scores = [],
  } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── 1. Header bar ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mb-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Week
          </button>

          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {quiz_name ? `${quiz_name} — Quiz Feedback` : 'Quiz Feedback'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Week {weekNumber} · Course {courseId}
          </p>
        </div>

        {/* ── 2. Overview stats row ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Attempts"
            value={total_attempts ?? '—'}
            sub="submissions"
          />
          <StatCard
            label="Avg Score"
            value={avg_score_pct != null ? `${avg_score_pct.toFixed(1)}%` : '—'}
            sub="class average"
          />
          <StatCard
            label="Completion Rate"
            value={completion_rate != null ? `${Math.round(completion_rate)}%` : '—'}
            sub="of enrolled students"
          />
          <StatCard
            label="Questions"
            value={question_breakdown.length}
            sub="total items"
          />
        </div>

        {/* ── 3. Question Difficulty Breakdown ────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Question Analysis
          </h2>
          <p className="text-xs text-gray-400 mb-5">
            Sorted by difficulty — hardest first (lowest accuracy)
          </p>

          {question_breakdown.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No question data available.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {question_breakdown.map((q, idx) => {
                const bloom = BLOOM_COLORS[q.bloom_level] || BLOOM_FALLBACK;
                const diffClass = DIFFICULTY_COLORS[q.difficulty] || 'bg-gray-100 text-gray-700';
                const barColor = accuracyBarColor(q.accuracy_pct ?? 0);
                const widthPct = Math.min(Math.max(q.accuracy_pct ?? 0, 0), 100);

                return (
                  <div
                    key={q.mcq_id || idx}
                    className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                  >
                    {/* Question header */}
                    <div className="flex gap-3 items-start mb-3">
                      {/* Number badge */}
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-800 leading-snug flex-1">
                        {q.question}
                      </p>
                    </div>

                    {/* Chips row */}
                    <div className="flex flex-wrap gap-2 mb-3 ml-10">
                      {/* Bloom level */}
                      {q.bloom_level && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bloom.bg} ${bloom.text}`}>
                          {q.bloom_level}
                        </span>
                      )}
                      {/* Difficulty */}
                      {q.difficulty && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${diffClass}`}>
                          {q.difficulty}
                        </span>
                      )}
                      {/* Concept ID */}
                      {q.concept_id && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {q.concept_id}
                        </span>
                      )}
                    </div>

                    {/* Accuracy bar */}
                    <div className="ml-10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {q.correct_count}/{q.total_answers} correct &nbsp;·&nbsp; {(q.accuracy_pct ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>

                      {/* Most common wrong answer */}
                      {q.most_common_wrong_answer && (
                        <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-md px-2.5 py-1.5 inline-block">
                          Most missed: <span className="font-semibold">{q.most_common_wrong_answer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 4. Student Scores ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            Student Performance
          </h2>

          {student_scores.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No completed attempts yet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Student ID
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Score
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      %
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Completed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {student_scores.map((s, idx) => {
                    const rowBg = scoreRowClass(s.score_pct ?? 0);
                    const shortId = s.student_id
                      ? s.student_id.length > 8
                        ? `${s.student_id.slice(0, 8)}…`
                        : s.student_id
                      : '—';

                    return (
                      <tr key={s.student_id || idx} className={`${rowBg} transition-colors`}>
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-700">
                          {shortId}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-gray-800">
                          {s.score}/{s.total}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                              ${(s.score_pct ?? 0) >= 80
                                ? 'bg-green-100 text-green-800'
                                : (s.score_pct ?? 0) >= 60
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {(s.score_pct ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">
                          {formatDate(s.completed_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 5. Bloom Level Summary ───────────────────────────────────────── */}
        {bloomSummary.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Bloom Level Summary
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Average accuracy per cognitive level — sorted from weakest to strongest
            </p>

            <div className="flex flex-col gap-3">
              {bloomSummary.map(({ level, avgAccuracy, count }) => {
                const bloom = BLOOM_COLORS[level] || BLOOM_FALLBACK;
                const widthPct = Math.min(Math.max(avgAccuracy, 0), 100);

                return (
                  <div key={level} className="flex items-center gap-3">
                    {/* Level label */}
                    <div className="w-28 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-full justify-center ${bloom.bg} ${bloom.text}`}
                      >
                        {level}
                      </span>
                    </div>

                    {/* Bar track */}
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-700 ${bloom.bar}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>

                    {/* Stats */}
                    <div className="w-28 flex-shrink-0 text-right">
                      <span className="text-sm font-semibold text-gray-800">
                        {avgAccuracy.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-400 ml-1.5">
                        ({count} Q{count !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interpretation hint */}
            <p className="mt-5 text-xs text-gray-400 border-t border-gray-50 pt-4">
              Levels with low accuracy may benefit from additional instructional focus or re-teaching.
            </p>
          </section>
        )}

      </div>
    </div>
  );
}
