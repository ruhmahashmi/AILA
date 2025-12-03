// app/instructor/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = 'http://localhost:8000';

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState('');
  const [roleChecked, setRoleChecked] = useState(false);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  // Role and login check
  useEffect(() => {
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!stored) {
      router.replace('/login');
      return;
    }
    try {
      const user = JSON.parse(stored);
      setUserId(user.id);
      if (user.role !== 'instructor') {
        router.replace('/student');
        return;
      }
      setRoleChecked(true);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  async function fetchCourses() {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/courses?instructor_id=${userId}`
      );
      const data = res.ok ? await res.json() : [];
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setCourses([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!roleChecked || !userId) return;
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleChecked, userId]);

  async function handleCreateCourse(e) {
    e.preventDefault();
    if (!newCourse.trim()) return;

    const formData = new FormData();
    formData.append('name', newCourse.trim());
    formData.append('instructor_id', userId);

    await fetch(`${BACKEND_URL}/api/courses`, {
      method: 'POST',
      body: formData,
    });

    setNewCourse('');
    fetchCourses();
  }

  if (!roleChecked) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-gray-600">
        Checking authorization…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Instructor Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Manage your courses and weekly lecture materials.
          </p>
        </div>
      </header>

      <section className="mb-8 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3">Create a new course</h2>
        <form onSubmit={handleCreateCourse} className="flex gap-3 flex-wrap">
          <input
            className="flex-1 min-w-[220px] px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            name="courseName"
            id="courseName"
            placeholder="Course name (e.g., CS 171 – Programming I)"
            value={newCourse}
            onChange={e => setNewCourse(e.target.value)}
            required
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition"
            type="submit"
          >
            Create Course
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your courses</h2>
        {loading ? (
          <div className="text-gray-500 text-sm">Loading courses...</div>
        ) : !courses || courses.length === 0 ? (
          <div className="text-gray-500 text-sm">
            You don&apos;t have any courses yet. Create one above to get
            started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map(course => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-sm">{course.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created:{' '}
                    {course.created_at
                      ? new Date(course.created_at).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
                <button
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
                  onClick={() =>
                    router.push(`/instructor/course/${course.id}`)
                  }
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
