'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleChecked, setRoleChecked] = useState(false);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndRole() {
      const res = await fetch('http://localhost:8000/api/auth/user');
      if (!res.ok) {
        router.replace('/login');
        return;
      }
      const data = await res.json();
      const user = data.user;
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      const profileRes = await fetch(`http://localhost:8000/api/profiles/${user.id}`);
      const profile = await profileRes.json();
      if (!profile || profile.role !== 'student') {
        router.replace('/instructor');
        return;
      }
      setRoleChecked(true);
    }
    checkAuthAndRole();
  }, [router]);

  useEffect(() => {
    if (!roleChecked || !userId) return;
    fetchCourses();
  }, [roleChecked, userId]);

  async function fetchCourses() {
    setLoading(true);
    const allCoursesRes = await fetch('http://localhost:8000/api/courses');
    const allCourses = await allCoursesRes.json();

    const enrollmentsRes = await fetch(`http://localhost:8000/api/enrollments?student_id=${userId}`);
    const enrollments = await enrollmentsRes.json();
    const enrolledIds = enrollments ? enrollments.map(e => e.course_id) : [];

    setEnrolledCourses(allCourses.filter(c => enrolledIds.includes(c.id)));
    setAvailableCourses(allCourses.filter(c => !enrolledIds.includes(c.id)));
    setLoading(false);
  }

  async function handleEnroll(courseId) {
    await fetch('http://localhost:8000/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: userId, course_id: courseId }),
    });
    fetchCourses();
  }

  if (!roleChecked) return <div className="p-8">Checking authorization…</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">My Courses</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <ul className="mb-8">
            {enrolledCourses.length > 0 ? (
              enrolledCourses.map(course => (
                <li
                  key={course.id}
                  className="mb-2 p-4 bg-white rounded shadow flex justify-between items-center"
                >
                  <span>{course.name}</span>
                  <button
                    className="text-blue-600 underline"
                    onClick={() => router.push(`/student/course/${course.id}`)}
                  >
                    Go to Course
                  </button>
                </li>
              ))
            ) : (
              <div className="text-gray-500">You are not enrolled in any courses yet.</div>
            )}
          </ul>
          <h2 className="text-xl font-semibold mb-2">Enroll in a Course</h2>
          <ul>
            {availableCourses.length > 0 ? (
              availableCourses.map(course => (
                <li
                  key={course.id}
                  className="mb-2 p-4 bg-gray-100 rounded shadow flex justify-between items-center"
                >
                  <span>{course.name}</span>
                  <button
                    className="text-green-600 underline"
                    onClick={() => handleEnroll(course.id)}
                  >
                    Enroll
                  </button>
                </li>
              ))
            ) : (
              <div className="text-gray-500">No available courses to enroll in.</div>
            )}
          </ul>
        </>
      )}
    </div>
  );
}

