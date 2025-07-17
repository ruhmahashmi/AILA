'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import ProcessingFileStatus from '../../../../components/ProcessingFileStatus';
import ProcessingHistory from '../../../../components/ProcessingHistory';
import LectureResults from '../../../../components/LectureResults';
import WeekSelector from '../../../../components/WeekSelector';

export default function WeekDetailPage({ params }) {
  // Get course and week from params
  const { id: courseId, weekNumber } = params;
  const week = Number(weekNumber);

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingFiles, setProcessingFiles] = useState([]);
  const fileInputRef = useRef();
  const [selectedJob, setSelectedJob] = useState(null);

  // Fetch course/modules info from REST API (SQL backend)
  useEffect(() => {
    async function fetchCourseAndModules() {
      setLoading(true);
      try {
        const courseRes = await fetch(`/api/course/${courseId}`);
        const courseData = courseRes.ok ? await courseRes.json() : null;
        setCourse(courseData);

        const modulesRes = await fetch(`/api/course/${courseId}/modules`);
        const modulesData = modulesRes.ok ? await modulesRes.json() : [];
        setModules(modulesData || []);
      } catch (err) {
        setCourse(null);
        setModules([]);
      }
      setLoading(false);
    }
    if (courseId) fetchCourseAndModules();
  }, [courseId]);

  // Per-week multi-file upload handler (sends to SQL backend endpoint)
  async function handleUpload(e) {
    e.preventDefault();
    const files = Array.from(fileInputRef.current.files);
    for (const file of files) {
      setProcessingFiles(prev => [...prev, file.name]);

      // Prepare for file upload via REST API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', courseId);
      formData.append('week', week);
      formData.append('file_name', file.name);

      // Send file and metadata to backend endpoint
      const res = await fetch(`/api/course/${courseId}/week/${week}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const msg = (await res.json())?.error || `Upload failed for ${file.name}`;
        alert(msg);
        setProcessingFiles(prev => prev.filter(f => f !== file.name));
        continue;
      }

      // After a successful upload, trigger backend processing (if needed)
      await fetch('http://localhost:8000/process-lecture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, week, file_name: file.name }),
      });
    }
    fileInputRef.current.value = '';
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="flex h-screen">
      <WeekSelector selectedWeek={week} onSelect={w => window.location.href = `/instructor/course/${courseId}/week/${w}`} />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-2">{course?.name || 'Course'} – Week {week}</h1>
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Modules</h2>
          <div className="grid gap-3">
            {modules.length === 0 ? (
              <div className="text-gray-500">No modules yet.</div>
            ) : (
              modules.map(m => (
                <div key={m.id} className="bg-gray-50 p-3 rounded shadow">
                  {m.name}
                </div>
              ))
            )}
          </div>
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Upload Lecture Materials</h2>
          <form onSubmit={handleUpload} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="block w-full text-sm text-gray-600
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              accept=".pdf,.pptx"
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              type="submit"
            >
              Upload
            </button>
          </form>
        </section>
        {/* Show per-file processing progress/results (per week) */}
        {processingFiles.map(fileName => (
          <ProcessingFileStatus
            key={fileName}
            courseId={courseId}
            week={week}
            fileName={fileName}
          />
        ))}
        {/* Processing history table scoped to this course+week */}
        <ProcessingHistory
          courseId={courseId}
          week={week}
          onViewResult={job => setSelectedJob(job)}
        />
        {/* Modal/section for viewing per-week results from history */}
        {selectedJob && selectedJob.status === 'done' && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-xl max-w-lg w-full relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                onClick={() => setSelectedJob(null)}
              >
                &times;
              </button>
              <div className="mb-4 font-bold">{selectedJob.file_name} Results</div>
              <LectureResults
                status={selectedJob.status}
                result={selectedJob.result}
                progress={selectedJob.progress}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
