'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import ProcessingFileStatus from '../../../components/ProcessingFileStatus';
import ProcessingHistory from '../../../components/ProcessingHistory';
import LectureResults from '../../../components/LectureResults';

export default function InstructorCoursePage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingFiles, setProcessingFiles] = useState([]);
  const fileInputRef = useRef();
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    async function fetchCourseAndModules() {
      setLoading(true);
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      setCourse(courseData);
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', id);
      setModules(modulesData || []);
      setLoading(false);
    }
    if (id) fetchCourseAndModules();
  }, [id]);

  async function handleUpload(e) {
    e.preventDefault();
    const files = Array.from(fileInputRef.current.files);
    for (const file of files) {
      setProcessingFiles(prev => [...prev, file.name]);
      const { error } = await supabase.storage
        .from('lecture-materials')
        .upload(`${id}/${file.name}`, file);
      if (error) {
        alert(`Upload failed for ${file.name}: ${error.message}`);
        setProcessingFiles(prev => prev.filter(f => f !== file.name));
        continue;
      }
      await fetch('http://localhost:8000/process-lecture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: id, file_name: file.name }),
      });
    }
    fileInputRef.current.value = '';
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{course?.name || 'Course'}</h1>
      <div className="mb-6 flex gap-4">
        <button className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700" disabled>
          Start Lecturing Assistant
        </button>
        <button className="px-4 py-2 bg-yellow-500 text-white rounded shadow hover:bg-yellow-600" disabled>
          Generate Retrieval Practice
        </button>
        <button className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600" disabled>
          Ask Questions or Chat
        </button>
      </div>
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
      {/* Show per-file processing progress/results */}
      {processingFiles.map(fileName => (
        <ProcessingFileStatus
          key={fileName}
          courseId={id}
          fileName={fileName}
        />
      ))}
      {/* Processing history table */}
      <ProcessingHistory
        courseId={id}
        onViewResult={job => setSelectedJob(job)}
      />
      {/* Modal or section for viewing results from history */}
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
    </div>
  );
}
