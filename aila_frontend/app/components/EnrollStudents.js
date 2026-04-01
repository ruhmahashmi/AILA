'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ─── Skeleton helpers ───────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="h-7 w-16 bg-gray-200 rounded-lg" />
    </div>
  );
}

function SkeletonEnrolledRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="h-7 w-20 bg-gray-200 rounded-lg" />
    </div>
  );
}

// ─── Date formatting ────────────────────────────────────────────────────────

function formatEnrolledDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function EnrollStudents({ courseId, instructorId, onClose }) {
  // ── Enrolled students state ──
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrolledLoading, setEnrolledLoading] = useState(true);
  const [enrolledError, setEnrolledError] = useState('');

  // ── Manual add state ──
  const [manualInput, setManualInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // ── Browse / search state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [enrollingIds, setEnrollingIds] = useState(new Set()); // student ids currently being enrolled

  // ── Remove error per enrollment_id ──
  const [removeErrors, setRemoveErrors] = useState({});

  const debounceRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // ─── Fetch enrolled students ───────────────────────────────────────────────

  const fetchEnrolled = useCallback(async () => {
    setEnrolledLoading(true);
    setEnrolledError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/course/${courseId}/students`);
      if (!res.ok) throw new Error(`Failed to load enrolled students (${res.status})`);
      const data = await res.json();
      setEnrolledStudents(data);
    } catch (err) {
      setEnrolledError(err.message || 'Could not load enrolled students.');
    } finally {
      setEnrolledLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchEnrolled();
  }, [fetchEnrolled]);

  // ─── Search students ───────────────────────────────────────────────────────

  const runSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/users/students?search=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      setSearchError(err.message || 'Search failed.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(val);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // ─── Enroll by identifier (manual add) ────────────────────────────────────

  const handleManualAdd = async () => {
    const identifier = manualInput.trim();
    if (!identifier) return;

    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    // Optimistic placeholder
    const tempId = `temp-${Date.now()}`;
    const optimisticStudent = {
      student_id: tempId,
      email: identifier,
      enrolled_at: new Date().toISOString(),
      enrollment_id: tempId,
      _optimistic: true,
    };
    setEnrolledStudents((prev) => [optimisticStudent, ...prev]);

    try {
      const res = await fetch(`${BACKEND_URL}/api/instructor/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          instructor_id: instructorId,
          identifier,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `Enrollment failed (${res.status})`);
      }
      const newStudent = await res.json();

      // Replace optimistic entry with real data
      setEnrolledStudents((prev) =>
        prev.map((s) => (s.enrollment_id === tempId ? { ...newStudent, _optimistic: false } : s))
      );

      const displayEmail = newStudent.email || identifier;
      setAddSuccess(`${displayEmail} enrolled successfully.`);
      setManualInput('');

      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setAddSuccess(''), 4000);
    } catch (err) {
      // Rollback
      setEnrolledStudents((prev) => prev.filter((s) => s.enrollment_id !== tempId));
      setAddError(err.message || 'Enrollment failed.');
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Enroll from browse list ───────────────────────────────────────────────

  const handleEnrollFromSearch = async (student) => {
    const { id, email } = student;
    setEnrollingIds((prev) => new Set(prev).add(id));

    // Optimistic
    const tempId = `temp-${Date.now()}`;
    const optimisticStudent = {
      student_id: id,
      email,
      enrolled_at: new Date().toISOString(),
      enrollment_id: tempId,
      _optimistic: true,
    };
    setEnrolledStudents((prev) => [optimisticStudent, ...prev]);

    try {
      const res = await fetch(`${BACKEND_URL}/api/instructor/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          instructor_id: instructorId,
          identifier: email,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `Enrollment failed (${res.status})`);
      }
      const newStudent = await res.json();
      setEnrolledStudents((prev) =>
        prev.map((s) => (s.enrollment_id === tempId ? { ...newStudent, _optimistic: false } : s))
      );
    } catch (err) {
      // Rollback
      setEnrolledStudents((prev) => prev.filter((s) => s.enrollment_id !== tempId));
    } finally {
      setEnrollingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ─── Remove student ────────────────────────────────────────────────────────

  const handleRemove = async (student) => {
    const { email, student_id, enrollment_id } = student;
    const confirmed = window.confirm(`Remove ${email} from this course?`);
    if (!confirmed) return;

    // Optimistic remove
    setEnrolledStudents((prev) => prev.filter((s) => s.enrollment_id !== enrollment_id));
    setRemoveErrors((prev) => {
      const next = { ...prev };
      delete next[enrollment_id];
      return next;
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/instructor/unenroll`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          instructor_id: instructorId,
          student_id,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `Remove failed (${res.status})`);
      }
    } catch (err) {
      // Rollback
      setEnrolledStudents((prev) => [student, ...prev]);
      setRemoveErrors((prev) => ({ ...prev, [enrollment_id]: err.message || 'Remove failed.' }));
    }
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const enrolledIdSet = new Set(enrolledStudents.map((s) => s.student_id));

  // ─── Keyboard close ───────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    /* Overlay */
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal container */}
      <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 my-8 flex flex-col overflow-hidden shadow-2xl max-h-[85vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Enrollment</h2>
            <p className="text-sm text-gray-500 mt-0.5">{courseId}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-row flex-1 overflow-hidden divide-x divide-gray-100">

          {/* ══════════════════════════════════════════
              LEFT PANEL — Add Students (≈45%)
          ══════════════════════════════════════════ */}
          <div className="w-5/12 overflow-y-auto p-6 flex flex-col gap-6 shrink-0">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Add Students
            </h3>

            {/* Section A — Manual add */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Add by email or student ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !addLoading && handleManualAdd()}
                  placeholder="student@university.edu or ID..."
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  disabled={addLoading}
                />
                <button
                  onClick={handleManualAdd}
                  disabled={addLoading || !manualInput.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {addLoading ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Adding…
                    </span>
                  ) : 'Add Student'}
                </button>
              </div>

              {/* Inline feedback */}
              {addSuccess && (
                <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  {addSuccess}
                </p>
              )}
              {addError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {addError}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Section B — Browse students */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Browse all students
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search all students..."
                  className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
              </div>

              {/* Results list */}
              <div className="max-h-[300px] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50">
                {searchLoading ? (
                  <div className="p-3 space-y-0.5">
                    {[...Array(4)].map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </div>
                ) : searchError ? (
                  <p className="text-xs text-red-500 p-4 text-center">{searchError}</p>
                ) : !searchQuery.trim() ? (
                  <p className="text-xs text-gray-400 p-4 text-center">
                    Type to search for students
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No students found</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {searchResults.map((student) => {
                      const alreadyEnrolled = enrolledIdSet.has(student.id);
                      const isEnrolling = enrollingIds.has(student.id);
                      return (
                        <li
                          key={student.id}
                          className={`flex items-center gap-2 px-3 py-2.5 ${alreadyEnrolled ? 'opacity-60' : ''}`}
                        >
                          {/* Email */}
                          <span className="flex-1 text-sm text-gray-800 truncate min-w-0">
                            {student.email}
                          </span>
                          {/* Truncated ID chip */}
                          <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 shrink-0 font-mono">
                            {student.truncated_id}
                          </span>
                          {/* Enroll button */}
                          {alreadyEnrolled ? (
                            <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                              Already enrolled
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEnrollFromSearch(student)}
                              disabled={isEnrolling}
                              className="shrink-0 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isEnrolling ? 'Adding…' : 'Enroll'}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              RIGHT PANEL — Enrolled Students (≈55%)
          ══════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {/* Panel header */}
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Currently Enrolled
                {!enrolledLoading && (
                  <span className="ml-2 text-xs font-normal text-gray-400 normal-case tracking-normal">
                    ({enrolledStudents.length})
                  </span>
                )}
              </h3>
              <button
                onClick={fetchEnrolled}
                disabled={enrolledLoading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Refresh enrolled list"
              >
                <svg
                  className={`w-3.5 h-3.5 ${enrolledLoading ? 'animate-spin' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Enrolled error */}
            {enrolledError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {enrolledError}
              </p>
            )}

            {/* Enrolled list */}
            {enrolledLoading ? (
              <div className="space-y-0.5">
                {[...Array(5)].map((_, i) => (
                  <SkeletonEnrolledRow key={i} />
                ))}
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-gray-400">No students enrolled yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {enrolledStudents.map((student) => (
                  <li key={student.enrollment_id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {student.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enrolled {formatEnrolledDate(student.enrolled_at)}
                      </p>
                      {/* Per-student remove error */}
                      {removeErrors[student.enrollment_id] && (
                        <p className="text-xs text-red-500 mt-1">
                          {removeErrors[student.enrollment_id]}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(student)}
                      className="shrink-0 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors"
                      title={`Remove ${student.email}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
