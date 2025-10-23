// app/student/page.js

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [enrolling, setEnrolling] = useState(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  // Check session and user role
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!stored) {
      router.replace('/login');
      return;
    }
    try {
      const user = JSON.parse(stored);
      setUserId(user.id);
      if (user.role !== 'student') {
        router.replace('/instructor');
        return;
      }
      setRoleChecked(true);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  // Fetch all available courses for enrollment
  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch('http://localhost:8000/api/courses');
        const data = res.ok ? await res.json() : [];
        console.log("Available courses fetched:", data); // Debug log
        setCourses(data || []);
      } catch (e) {
        console.error("Fetch courses error:", e);
        setCourses([]);
      }
    }
    if (roleChecked) fetchCourses();
  }, [roleChecked]);

  // Fetch student-enrolled courses
  useEffect(() => {
    async function fetchStudentCourses() {
      if (!userId) return;
      try {
        const res = await fetch(`http://localhost:8000/api/student-courses?student_id=${userId}`);
        const data = res.ok ? await res.json() : [];
        console.log("Enrolled courses fetched:", data); // Debug log
        setEnrolledCourses(data || []);
      } catch (e) {
        console.error("Fetch enrolled courses error:", e);
        setEnrolledCourses([]);
      }
    }
    if (userId && roleChecked) fetchStudentCourses();
  }, [userId, roleChecked]);

  // Enroll student in selected course
  async function handleEnroll(courseId) {
    setEnrolling(courseId);
    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('student_id', userId);
    try {
      const res = await fetch('http://localhost:8000/api/enroll', {
        method: 'POST',
        body: formData,
      });
      setEnrolling(null);
      if (res.ok) {
        alert('Enrolled successfully!');
        // Refetch enrolled courses
        const updated = await fetch(`http://localhost:8000/api/student-courses?student_id=${userId}`).then(r => r.json());
        setEnrolledCourses(updated);
      } else {
        const err = await res.json();
        alert(err.detail || err.error || 'Enrollment failed');
      }
    } catch (e) {
      setEnrolling(null);
      alert('Network error during enrollment');
    }
  }

  // Prepare courses not yet enrolled in
  const enrolledIds = new Set(enrolledCourses.map(c => c.id));
  const availableCourses = courses.filter(c => !enrolledIds.has(c.id));

  if (!roleChecked) return <div className="p-8">Checking authorization…</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Your Enrolled Courses</h1>
      <ul>
        {enrolledCourses.length === 0
          ? <div className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</div>
          : enrolledCourses.map(course => (
              <li
                key={course.id}
                className="mb-3 bg-green-50 p-3 rounded border font-semibold cursor-pointer"
                onClick={() => router.push(`/student/course/${course.id}`)}
              >
                {course.name}
              </li>
            ))}
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-3">Available Courses</h2>
      <ul>
        {availableCourses.length === 0
          ? <div className="text-gray-500">No courses to enroll in at this time.</div>
          : availableCourses.map(course => (
              <li key={course.id} className="p-3 mb-2 bg-gray-100 rounded border">
                <div className="font-semibold">{course.name}</div>
                <button
                  disabled={enrolling === course.id}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
                  onClick={() => handleEnroll(course.id)}
                >
                  {enrolling === course.id ? 'Enrolling...' : 'Enroll'}
                </button>
              </li>
            ))}
      </ul>
    </div>
  );
}
