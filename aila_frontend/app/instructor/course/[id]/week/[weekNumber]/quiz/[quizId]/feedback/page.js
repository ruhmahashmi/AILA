'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ─── Bloom levels config ───────────────────────────────────────────────────

const BLOOM_LEVELS = [
  { name: 'Remember', emoji: '🧠' },
  { name: 'Understand', emoji: '💡' },
  { name: 'Apply', emoji: '🔧' },
  { name: 'Analyze', emoji: '🔍' },
  { name: 'Evaluate', emoji: '⚖️' },
  { name: 'Create', emoji: '✨' },
];

// ─── Score distribution buckets ────────────────────────────────────────────

const SCORE_BUCKETS = [
  { key: '0-20',   label: '0–20%',   colorClass: 'bg-red-500' },
  { key: '21-40',  label: '21–40%',  colorClass: 'bg-orange-400' },
  { key: '41-60',  label: '41–60%',  colorClass: 'bg-yellow-400' },
  { key: '61-80',  label: '61–80%',  colorClass: 'bg-blue-500' },
  { key: '81-100', label: '81–100%', colorClass: 'bg-green-500' },
];

// ─── Helper: accuracy bar color ────────────────────────────────────────────

function accuracyColor(pct) {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-red-500';
}

function accuracyTextColor(pct) {
  if (pct >= 75) return 'text-green-700';
  if (pct >= 50) return 'text-yellow-700';
  return 'text-red-600';
}

// ─── Skeleton components ────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-7 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

function SectionSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 bg-gray-200 rounded w-16 shrink-0" />
          <div className="flex-1 h-4 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-200 rounded w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Overview card ─────────────────────────────────────────────────────────

function OverviewCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-1 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function InstructorQuizFeedbackPage() {
  const params = useParams();
  const router = useRouter();

  const courseId = params?.id;
  const weekNumber = params?.weekNumber;
  const quizId = params?.quizId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch feedback data ──

  useEffect(() => {
    if (!quizId) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/instructor/course/${courseId}/week/${weekNumber}/quiz/${quizId}/feedback`
        );
        if (!res.ok) throw new Error(`Failed to load quiz feedback (${res.status})`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message || 'Could not load quiz feedback.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, weekNumber, quizId]);

  // ── Derived data ──

  const questionBreakdown = data?.question_breakdown ?? [];
  const bloomSummary = data?.bloom_summary ?? {};
  const scoreDistribution = data?.score_distribution ?? {};

  // Sort questions hardest first (lowest accuracy first)
  const sortedQuestions = [...questionBreakdown].sort(
    (a, b) => (a.accuracy_pct ?? 0) - (b.accuracy_pct ?? 0)
  );

  const maxDistributionCount = Math.max(
    1, // avoid divide-by-zero
    ...SCORE_BUCKETS.map((b) => scoreDistribution[b.key] ?? 0)
  );

  const hasAnyDistribution = SCORE_BUCKETS.some(
    (b) => (scoreDistribution[b.key] ?? 0) > 0
  );

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-gray-200 rounded-lg" />
            <div className="space-y-1.5">
              <div className="h-5 bg-gray-200 rounded w-48" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* Cards skeleton */}
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
          {/* Section skeletons */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="h-4 bg-gray-200 rounded w-36 mb-6 animate-pulse" />
            <SectionSkeleton rows={5} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="h-4 bg-gray-200 rounded w-44 mb-6 animate-pulse" />
            <SectionSkeleton rows={6} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Failed to load feedback</h2>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ══════════════════════════════════════════
          HEADER BAR
      ══════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {data?.quiz_name ?? 'Quiz Feedback'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Week {weekNumber} · Course {courseId}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ══════════════════════════════════════════
            OVERVIEW CARDS
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <OverviewCard
            label="Total Attempts"
            value={data?.total_attempts ?? '—'}
          />
          <OverviewCard
            label="Completed"
            value={data?.completed_attempts ?? '—'}
          />
          <OverviewCard
            label="Completion Rate"
            value={data?.completion_rate != null ? `${data.completion_rate.toFixed(1)}%` : '—'}
          />
          <OverviewCard
            label="Avg Score"
            value={data?.avg_score_pct != null ? `${data.avg_score_pct.toFixed(1)}%` : '—'}
          />
          <OverviewCard
            label="Questions"
            value={questionBreakdown.length}
          />
        </div>

        {/* ══════════════════════════════════════════
            SCORE DISTRIBUTION
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Score Distribution</h2>

          {!hasAnyDistribution ? (
            <p className="text-sm text-gray-400 text-center py-6">No completed attempts yet</p>
          ) : (
            <div className="space-y-3">
              {SCORE_BUCKETS.map(({ key, label, colorClass }) => {
                const count = scoreDistribution[key] ?? 0;
                const widthPct = maxDistributionCount > 0
                  ? Math.round((count / maxDistributionCount) * 100)
                  : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    {/* Bucket label */}
                    <span className="text-xs font-medium text-gray-500 w-14 shrink-0 text-right">
                      {label}
                    </span>
                    {/* Bar track */}
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                        style={{ width: `${widthPct}%`, minWidth: count > 0 ? '4px' : '0' }}
                      />
                    </div>
                    {/* Count */}
                    <span className="text-xs font-semibold text-gray-700 w-6 shrink-0 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════
            BLOOM LEVEL SUMMARY
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">
            Performance by Bloom Level
          </h2>

          <div className="space-y-3">
            {BLOOM_LEVELS.map(({ name, emoji }) => {
              const levelData = bloomSummary[name];
              const hasQuestions = levelData && levelData.questions > 0;
              const accuracy = hasQuestions ? levelData.avg_accuracy : null;

              return (
                <div key={name} className="flex items-center gap-3">
                  {/* Level name */}
                  <div className="w-28 shrink-0 flex items-center gap-1.5">
                    <span className="text-base leading-none" aria-hidden="true">{emoji}</span>
                    <span className="text-xs font-medium text-gray-700">{name}</span>
                  </div>

                  {/* Question count chip */}
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                    hasQuestions
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {hasQuestions ? `${levelData.questions}q` : '0q'}
                  </span>

                  {/* Bar or dash */}
                  {hasQuestions ? (
                    <>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${accuracyColor(accuracy)}`}
                          style={{ width: `${Math.min(accuracy, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-10 text-right shrink-0 ${accuracyTextColor(accuracy)}`}>
                        {accuracy.toFixed(0)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex-1" />
                      <span className="text-sm text-gray-300 w-10 text-right shrink-0">—</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            QUESTION BREAKDOWN
        ══════════════════════════════════════════ */}
        {sortedQuestions.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Question Breakdown</h2>
            <p className="text-xs text-gray-400 mb-5">Sorted by difficulty — hardest first</p>

            <div className="space-y-5">
              {sortedQuestions.map((q, idx) => {
                const accuracy = q.accuracy_pct ?? 0;
                return (
                  <div
                    key={q.question_id ?? idx}
                    className="border border-gray-100 rounded-xl p-4 space-y-3"
                  >
                    {/* Question text + index */}
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold text-gray-300 mt-0.5 shrink-0 w-5">
                        {idx + 1}.
                      </span>
                      <p className="text-sm font-medium text-gray-800 leading-snug flex-1">
                        {q.question_text ?? `Question ${idx + 1}`}
                      </p>
                    </div>

                    {/* Chips: bloom / difficulty / concept */}
                    <div className="flex flex-wrap gap-1.5 pl-8">
                      {q.bloom_level && (
                        <span className="text-xs bg-purple-50 text-purple-700 rounded-full px-2.5 py-0.5 font-medium">
                          {q.bloom_level}
                        </span>
                      )}
                      {q.difficulty && (
                        <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                          q.difficulty === 'hard'
                            ? 'bg-red-50 text-red-700'
                            : q.difficulty === 'medium'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                        </span>
                      )}
                      {q.concept && (
                        <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 font-medium">
                          {q.concept}
                        </span>
                      )}
                    </div>

                    {/* Accuracy bar */}
                    <div className="pl-8 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${accuracyColor(accuracy)}`}
                            style={{ width: `${Math.min(accuracy, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold w-10 text-right shrink-0 ${accuracyTextColor(accuracy)}`}>
                          {accuracy.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {q.correct_count ?? 0} of {q.attempt_count ?? 0} correct
                      </p>
                    </div>

                    {/* Most common wrong answer */}
                    {q.most_common_wrong_answer && (
                      <div className="pl-8">
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-amber-700">
                              Most common wrong answer:{' '}
                            </span>
                            <span className="text-xs text-amber-800">
                              "{q.most_common_wrong_answer}"
                            </span>
                            {q.most_common_wrong_count && (
                              <span className="text-xs text-amber-500 ml-1">
                                ({q.most_common_wrong_count}×)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Answer options breakdown (if available) */}
                    {q.answer_options && q.answer_options.length > 0 && (
                      <div className="pl-8 space-y-1.5">
                        <p className="text-xs font-medium text-gray-500">Answer distribution</p>
                        {q.answer_options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <span className={`text-xs w-5 shrink-0 font-mono ${
                              opt.is_correct ? 'text-green-600 font-bold' : 'text-gray-400'
                            }`}>
                              {opt.label ?? String.fromCharCode(65 + oi)}.
                            </span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  opt.is_correct ? 'bg-green-400' : 'bg-gray-300'
                                }`}
                                style={{
                                  width: `${
                                    (q.attempt_count ?? 0) > 0
                                      ? Math.round(((opt.count ?? 0) / q.attempt_count) * 100)
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-6 text-right shrink-0">
                              {opt.count ?? 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty question state */}
        {!loading && questionBreakdown.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-sm text-gray-400">No question data available for this quiz.</p>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
