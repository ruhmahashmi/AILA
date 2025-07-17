'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function StudentCoursePage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourseAndModules() {
      setLoading(true);

      // Fetch course info from backend REST API (SQL-powered)
      const courseRes = await fetch(`/api/course/${id}`);
      const courseData = courseRes.ok ? await courseRes.json() : null;
      setCourse(courseData);

      // Fetch modules from backend REST API (SQL-powered)
      const modulesRes = await fetch(`/api/course/${id}/modules`);
      const modulesData = modulesRes.ok ? await modulesRes.json() : [];
      setModules(modulesData || []);
      setLoading(false);
    }
    if (id) fetchCourseAndModules();
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">{course?.name || 'Course'}</h1>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Modules</h2>
        {modules.length > 0 ? (
          <ul>
            {modules.map(m => (
              <li key={m.id} className="mb-2 p-3 bg-gray-50 rounded border">
                <div className="font-semibold">{m.title || m.name}</div>
                {m.description && <div className="text-gray-500">{m.description}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No modules available yet.</div>
        )}
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Chat with Materials</h2>
        <div className="text-gray-500">[Chat with materials UI coming soon]</div>
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Ask Instructor</h2>
        <div className="text-gray-500">[Ask instructor UI coming soon]</div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Retrieval Practice</h2>
        <div className="text-gray-500">[Retrieval practice UI coming soon]</div>
      </div>
    </div>
  );
}
