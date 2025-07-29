'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState('');
  const [roleChecked, setRoleChecked] = useState(false);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  // Role and login check
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
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

  // Defensive fetch: always set courses to array, never null
  async function fetchCourses() {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/courses?instructor_id=${userId}`);
      const data = await res.ok ? await res.json() : [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      setCourses([]); // On network/backend error
    }
    setLoading(false);
  }

  // Fetch courses for this instructor
  useEffect(() => {
    if (!roleChecked || !userId) return;
    fetchCourses();
    // eslint-disable-next-line
  }, [roleChecked, userId]);

  async function handleCreateCourse(e) {
    e.preventDefault();
    if (!newCourse) return;

    const formData = new FormData();
    formData.append("name", newCourse);
    formData.append("instructor_id", userId);

    await fetch('http://localhost:8000/api/courses', {
      method: 'POST',
      body: formData,
    });

    setNewCourse('');
    fetchCourses();
  }

  if (!roleChecked) return <div className="p-8">Checking authorization…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Instructor Dashboard</h1>
      <p className="mb-6 text-gray-600">Welcome! Here are your courses.</p>
      <form onSubmit={handleCreateCourse} className="flex gap-2 mb-8">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          name="courseName"
          id="courseName"
          placeholder="New course name"
          value={newCourse}
          onChange={e => setNewCourse(e.target.value)}
          required
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          type="submit"
        >
          Create Course
        </button>
      </form>
      {loading ? (
        <div className="text-gray-500">Loading courses...</div>
      ) : (
        <div className="grid gap-4">
          {(!courses || courses.length === 0) ? (
            <div className="text-gray-500">No courses yet.</div>
          ) : (
            (Array.isArray(courses) ? courses : []).map(course => (
              <div
                key={course.id}
                className="bg-white shadow rounded p-4 flex items-center justify-between"
              >
                <span className="font-medium">{course.name}</span>
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => router.push(`/instructor/course/${course.id}`)}
                >
                  Go to Course
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
