'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function pct(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Color utilities ─────────────────────────────────────────────────────────

function bloomBarColor(p, total) {
  if (!total) return 'bg-gray-200';
  if (p >= 75) return 'bg-green-500';
  if (p >= 50) return 'bg-yellow-400';
  return 'bg-red-400';
}

function scoreColor(p) {
  if (p >= 80) return 'text-green-600';
  if (p >= 60) return 'text-yellow-600';
  return 'text-red-500';
}

function scoreBg(p) {
  if (p >= 80) return 'bg-green-50 text-green-700 border-green-200';
  if (p >= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-red-50 text-red-600 border-red-200';
}

function masteryBadge(status) {
  switch ((status || '').toLowerCase()) {
    case 'mastered':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'learning':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'struggling':
      return 'bg-red-100 text-red-600 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function masteryBarColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'mastered':
      return 'bg-green-500';
    case 'learning':
      return 'bg-yellow-400';
    case 'struggling':
      return 'bg-red-400';
    default:
      return 'bg-gray-300';
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

function CoursesSkeletonLoader() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

function ProgressSkeletonLoader() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

const BLOOM_LEVELS = [
  { key: 'remember',   label: 'Remember',   emoji: '🧠' },
  { key: 'understand', label: 'Understand', emoji: '💡' },
  { key: 'apply',      label: 'Apply',      emoji: '⚙️' },
  { key: 'analyze',    label: 'Analyze',    emoji: '🔍' },
  { key: 'evaluate',   label: 'Evaluate',   emoji: '⚖️' },
  { key: 'create',     label: 'Create',     emoji: '🎨' },
];

function BloomSection({ bloomData }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-5">
        Bloom&rsquo;s Taxonomy Progress
      </h3>
      <div className="space-y-4">
        {BLOOM_LEVELS.map(({ key, label, emoji }) => {
          const data = bloomData?.[key] || { correct: 0, total: 0 };
          const { correct, total } = data;
          const p = pct(correct, total);
          const barColor = bloomBarColor(p, total);

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700">
                  {emoji} {label}
                </span>
                {total === 0 ? (
                  <span className="text-xs text-gray-400 italic">Not tested yet</span>
                ) : (
                  <span className="text-xs text-gray-500">
                    {correct}/{total} correct &middot; {p}%
                  </span>
                )}
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: total === 0 ? '0%' : `${p}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConceptMasterySection({ concepts }) {
  if (!concepts || concepts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Concept Mastery
        </h3>
        <p className="text-sm text-gray-400 italic">
          Complete a quiz to see concept breakdown.
        </p>
      </div>
    );
  }

  const sorted = [...concepts].sort((a, b) => {
    const pa = pct(a.correct ?? 0, a.total ?? 1);
    const pb = pct(b.correct ?? 0, b.total ?? 1);
    return pa - pb;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-5">
        Concept Mastery
      </h3>
      <div className="space-y-3">
        {sorted.map((concept, idx) => {
          const conceptPct = pct(concept.correct ?? 0, concept.total ?? 0);
          const barColor = masteryBarColor(concept.status);
          const badgeClasses = masteryBadge(concept.status);

          return (
            <div
              key={concept.concept_id ?? idx}
              className="flex items-center gap-3"
            >
              {/* Concept chip */}
              <span className="shrink-0 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono font-medium px-2.5 py-1 rounded-full max-w-[180px] truncate">
                {concept.concept_id}
              </span>

              {/* Status badge */}
              <span
                className={`shrink-0 text-xs font-medium border px-2 py-0.5 rounded-full ${badgeClasses}`}
              >
                {concept.status
                  ? concept.status.charAt(0).toUpperCase() +
                    concept.status.slice(1).toLowerCase()
                  : 'Unknown'}
              </span>

              {/* Mini bar */}
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-0">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${conceptPct}%` }}
                />
              </div>

              {/* Fraction */}
              <span className="shrink-0 text-xs text-gray-400 w-10 text-right">
                {concept.correct ?? 0}/{concept.total ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuizHistorySection({ quizHistory }) {
  if (!quizHistory || quizHistory.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Quiz History
        </h3>
        <p className="text-sm text-gray-400 italic">No completed quizzes yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-5">
        Quiz History
      </h3>
      <div className="overflow-x-auto -mx-1">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">
                Quiz
              </th>
              <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">
                Week
              </th>
              <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">
                Score
              </th>
              <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">
                Pct
              </th>
              <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {quizHistory.map((quiz, idx) => {
              const quizPct =
                quiz.score_pct != null
                  ? Math.round(quiz.score_pct)
                  : pct(quiz.score ?? 0, quiz.total ?? 1);
              const colorClass = scoreColor(quizPct);
              const bgClass = scoreBg(quizPct);

              return (
                <tr
                  key={quiz.attempt_id ?? idx}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-gray-800">
                    {quiz.quiz_name || quiz.quiz_title || `Quiz ${idx + 1}`}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {quiz.week != null ? `Week ${quiz.week}` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    {quiz.score ?? '—'}/{quiz.total ?? '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block text-xs font-semibold border px-2 py-0.5 rounded-full ${bgClass}`}
                    >
                      {quizPct}%
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">
                    {formatDate(quiz.submitted_at || quiz.date || quiz.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: My Courses ─────────────────────────────────────────────────────────

function MyCoursesTab({ userId }) {
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollingId, setEnrollingId] = useState(null);
  const [enrollSuccess, setEnrollSuccess] = useState(null);

  useEffect(() => {
    if (!userId) return;
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchCourses() {
    setLoading(true);
    setError(null);
    try {
      const [allRes, enrolledRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/courses`),
        fetch(`${BACKEND_URL}/api/student-courses?student_id=${userId}`),
      ]);

      if (!allRes.ok) throw new Error('Failed to fetch courses');
      if (!enrolledRes.ok) throw new Error('Failed to fetch enrolled courses');

      const allCourses = await allRes.json();
      const enrolledData = await enrolledRes.json();

      const enrolledIds = new Set(
        (enrolledData || []).map((c) => String(c.id ?? c.course_id))
      );

      const enrolled = (allCourses || []).filter((c) =>
        enrolledIds.has(String(c.id))
      );
      const available = (allCourses || []).filter(
        (c) => !enrolledIds.has(String(c.id))
      );

      setEnrolledCourses(enrolled);
      setAvailableCourses(available);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(courseId) {
    setEnrollingId(courseId);
    setEnrollSuccess(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: userId, course_id: courseId }),
      });
      if (!res.ok) throw new Error('Enrollment failed');
      setEnrollSuccess(courseId);
      await fetchCourses();
    } catch (err) {
      alert(err.message || 'Enrollment failed. Please try again.');
    } finally {
      setEnrollingId(null);
    }
  }

  if (loading) return <CoursesSkeletonLoader />;

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-600 text-sm">
        <p className="font-semibold mb-1">Failed to load courses</p>
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchCourses}
          className="mt-3 text-xs font-medium text-red-600 underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enrolled courses */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          My Enrolled Courses
        </h2>
        {enrolledCourses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-400">
              You haven&rsquo;t enrolled in any courses yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <button
                key={course.id}
                onClick={() => router.push(`/student/course/${course.id}`)}
                className="group text-left bg-white border border-green-200 rounded-2xl shadow-sm p-5 hover:shadow-md hover:border-green-400 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-green-700 transition-colors">
                      {course.name || course.title}
                    </p>
                    {course.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-green-400" />
                </div>
                <span className="mt-3 inline-block text-xs font-medium text-green-600">
                  Go to course &rarr;
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Available courses */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Available Courses
        </h2>
        {availableCourses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-400">
              No additional courses available at this time.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 truncate">
                    {course.name || course.title}
                  </p>
                  {course.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleEnroll(course.id)}
                  disabled={enrollingId === course.id}
                  className="mt-4 w-full py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {enrollingId === course.id ? 'Enrolling...' : 'Enroll'}
                </button>
                {enrollSuccess === course.id && (
                  <p className="text-xs text-green-600 text-center mt-1">
                    Enrolled successfully!
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Tab: My Progress ────────────────────────────────────────────────────────

function MyProgressTab({ userId }) {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [activeCourseId, setActiveCourseId] = useState(null);

  const [performance, setPerformance] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState(null);

  // Load enrolled courses once
  useEffect(() => {
    if (!userId) return;
    async function loadCourses() {
      setCoursesLoading(true);
      try {
        const [allRes, enrolledRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/courses`),
          fetch(`${BACKEND_URL}/api/student-courses?student_id=${userId}`),
        ]);
        if (!allRes.ok || !enrolledRes.ok) throw new Error('Fetch failed');
        const allCourses = await allRes.json();
        const enrolledData = await enrolledRes.json();
        const enrolledIds = new Set(
          (enrolledData || []).map((c) => String(c.id ?? c.course_id))
        );
        const enrolled = (allCourses || []).filter((c) =>
          enrolledIds.has(String(c.id))
        );
        setEnrolledCourses(enrolled);
        if (enrolled.length > 0) {
          setActiveCourseId(enrolled[0].id);
        }
      } catch {
        setEnrolledCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    }
    loadCourses();
  }, [userId]);

  // Load performance whenever activeCourseId changes
  useEffect(() => {
    if (!userId || !activeCourseId) return;
    async function loadPerformance() {
      setPerfLoading(true);
      setPerfError(null);
      setPerformance(null);
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/student/performance?student_id=${userId}&course_id=${activeCourseId}`
        );
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setPerformance(data);
      } catch (err) {
        setPerfError(err.message || 'Failed to load performance data');
      } finally {
        setPerfLoading(false);
      }
    }
    loadPerformance();
  }, [userId, activeCourseId]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (coursesLoading) {
    return <ProgressSkeletonLoader />;
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-gray-500 font-medium mb-1">No enrolled courses</p>
        <p className="text-sm text-gray-400">
          Enroll in a course from the My Courses tab to start tracking your
          progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="course-select"
          className="text-sm font-medium text-gray-600 shrink-0"
        >
          Viewing progress for:
        </label>
        <select
          id="course-select"
          value={activeCourseId ?? ''}
          onChange={(e) => setActiveCourseId(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
        >
          {enrolledCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name || course.title}
            </option>
          ))}
        </select>
      </div>

      {/* Loading performance */}
      {perfLoading && <ProgressSkeletonLoader />}

      {/* Error */}
      {!perfLoading && perfError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-600 text-sm">
          <p className="font-semibold mb-1">Failed to load progress</p>
          <p className="text-red-500">{perfError}</p>
        </div>
      )}

      {/* Performance data */}
      {!perfLoading && !perfError && performance && (
        <>
          {/* A. Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Quizzes Taken"
              value={performance.total_attempts ?? 0}
            />
            <StatCard
              label="Overall Score"
              value={
                performance.overall_score_pct != null
                  ? `${Math.round(performance.overall_score_pct)}%`
                  : '—'
              }
            />
            <StatCard
              label="Concepts Tracked"
              value={
                Array.isArray(performance.concept_mastery)
                  ? performance.concept_mastery.length
                  : 0
              }
            />
          </div>

          {/* B. Bloom's Taxonomy */}
          <BloomSection bloomData={performance.blooms_taxonomy} />

          {/* C. Concept Mastery */}
          <ConceptMasterySection
            concepts={performance.concept_mastery}
          />

          {/* D. Quiz History */}
          <QuizHistorySection quizHistory={performance.quiz_history} />
        </>
      )}

      {/* No data yet edge case */}
      {!perfLoading && !perfError && !performance && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-sm text-gray-400">
            No performance data available for this course yet.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'progress'
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const stored = getUser();
    if (!stored || stored.role !== 'student') {
      router.replace('/');
      return;
    }
    setUser(stored);
    setAuthChecked(true);
  }, [router]);

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-300 text-sm">Loading…</div>
      </div>
    );
  }

  const displayName = user.name || user.email || 'Student';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AILA</h1>
            <p className="text-xs text-gray-400 mt-0.5">Student Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">
              {displayName}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('user');
                router.push('/');
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {displayName.split(' ')[0]}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Track your learning journey and course progress.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-8">
          {[
            { id: 'courses', label: 'My Courses' },
            { id: 'progress', label: 'My Progress' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'courses' && <MyCoursesTab userId={user.id} />}
        {activeTab === 'progress' && <MyProgressTab userId={user.id} />}
      </main>
    </div>
  );
}
