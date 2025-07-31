// app/instructor/course/[id]/week/[weekNumber]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import UploadLectureForm from '../../../../../components/UploadLectureForm';
import ProcessingFileStatus from '../../../../../components/ProcessingFileStatus';
import ProcessingHistory from '../../../../../components/ProcessingHistory';
import SegmentList from '../../../../../components/SegmentList';
import SlideViewer from '../../../../../components/SlideViewer';

const BACKEND_URL = "http://localhost:8000";
const WEEK_COUNT = 11; // Weeks 1–11

console.log('🟢 [WEEK PAGE] is rendering!');

export default function CourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();

  const [segments, setSegments] = useState([]);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);
  const [processingFiles, setProcessingFiles] = useState([]);

  // --- New: for KG auto-refresh/use (optional: use if needed elsewhere)
  const [knowledgeGraph, setKnowledgeGraph] = useState({ nodes: [], edges: [] });

  // Debug: render info
  useEffect(() => {
    console.log('[RENDER]', {
      activeSegmentId,
      weekNumber,
      courseId,
      segmentTitles: segments.map(s => `${s.title} (${s.id})`),
    });
  }, [activeSegmentId, weekNumber, courseId, segments]);

  // Fetch all segments when course or week changes
  useEffect(() => {
    fetchSegments();
    fetchKnowledgeGraph();
    setActiveSegmentId(null);
    setActiveSegment(null);
  }, [courseId, weekNumber]);

  // Auto-select first segment if none selected/invalid
  useEffect(() => {
    if (segments.length > 0 && (!activeSegmentId || !segments.some(s => s.id === activeSegmentId))) {
      setActiveSegmentId(segments[0].id);
    }
  }, [segments]); // only segments

  // Fetch segment details whenever activeSegmentId changes
  useEffect(() => {
    if (!activeSegmentId) {
      setActiveSegment(null);
      return;
    }
    fetch(`${BACKEND_URL}/api/segment/${activeSegmentId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch segment ${activeSegmentId}: ${res.statusText}`);
        return res.json();
      })
      .then(data => setActiveSegment(data))
      .catch(err => {
        console.error('[FetchDetail] Error:', err);
        setActiveSegment(null);
      });
  }, [activeSegmentId]);

  // Polling for processing jobs, refresh when done
  useEffect(() => {
    if (processingFiles.length === 0) return;
    const interval = setInterval(() => {
      Promise.all(
        processingFiles.map(({ processingId }) =>
          fetch(`${BACKEND_URL}/api/lecture-status/?processing_id=${processingId}`)
            .then(res => res.json())
            .then(data => ({ ...data, processingId }))
            .catch(() => ({ status: 'error', processingId }))
        )
      ).then(results => {
        const doneJobs = results.filter(r => r.status === 'done');
        if (doneJobs.length > 0) {
          fetchSegments();
          fetchKnowledgeGraph();    // also refresh KG after processing is done!
          // Remove finished jobs from the list
          setProcessingFiles(prev =>
            prev.filter(f => !doneJobs.some(done => done.processingId === f.processingId))
          );
        } else {
          setProcessingFiles(prev =>
            prev.filter(f =>
              results.some(r =>
                r.processingId === f.processingId && (r.status === 'pending' || r.status === 'processing')
              )
            )
          );
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [processingFiles, courseId, weekNumber]);

  // Fetch segments
  function fetchSegments() {
    fetch(`${BACKEND_URL}/api/segments/?course_id=${courseId}&week=${weekNumber}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch segments');
        return res.json();
      })
      .then(data => setSegments(data))
      .catch(err => {
        console.error('[fetchSegments] error:', err);
        setSegments([]);
      });
  }

  // Fetch KG for this course/week (used for auto-refresh after processing, can be passed down as needed)
  function fetchKnowledgeGraph() {
    fetch(`${BACKEND_URL}/api/knowledge-graph/?course_id=${courseId}&week=${weekNumber}`)
      .then(res => res.json())
      .then(data => setKnowledgeGraph(data))
      .catch(() => setKnowledgeGraph({ nodes: [], edges: [] }));
  }
  
  // On segment list click
  const handleClickSegment = id => {
    setActiveSegmentId(id);
  };

  // New file processing
  const handleProcessingStarted = (processingId, fileName) => {
    setProcessingFiles(prev => [...prev, { processingId, fileName }]);
  };

  // Sidebar UI - Weeks 1–11, with link routing
  const WeekSelector = () => (
    <div className="w-48 border-r border-gray-300 p-4 bg-white">
      <h3 className="font-semibold mb-2">Select Week</h3>
      <ul>
        {Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map(w => (
          <li key={w}>
            <button
              className={`block w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${
                String(weekNumber) === String(w) ? 'bg-blue-200 font-bold text-blue-700' : ''
              }`}
              onClick={() => {
                if (String(weekNumber) !== String(w))
                  router.push(`/instructor/course/${courseId}/week/${w}`);
              }}
            >
              Week {w}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex space-x-0 h-screen bg-gray-50">
      <WeekSelector />

      <div className="flex-1 flex flex-col space-y-4 p-4">
        <h1>Upload Lecture Materials</h1>
        <UploadLectureForm
          courseId={courseId}
          weekNumber={weekNumber}
          onProcessingStarted={handleProcessingStarted}
        />

        {processingFiles.length > 0 && (
          <>
            <h2>Currently Processing</h2>
            {processingFiles.map(({ processingId, fileName }) => (
              <ProcessingFileStatus
                key={processingId}
                processingId={processingId}
                fileName={fileName}
              />
            ))}
          </>
        )}

        <button
          onClick={() => fetchSegments()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mb-2 w-40"
        >
          🔄 Refresh Segments
        </button>

        <div className="flex flex-1 space-x-4">
          <div className="w-1/3">
            <SegmentList
              segments={segments}
              activeSegmentId={activeSegmentId}
              onClickSegment={handleClickSegment}
            />
            <div className="mt-6">
              <ProcessingHistory courseId={courseId} />
            </div>
          </div>
          <div className="flex-1">
            <SlideViewer segment={activeSegment} />
            {/* Pass knowledgeGraph to SlideViewer if you want to display it directly */}
            {/* <SlideViewer segment={activeSegment} knowledgeGraph={knowledgeGraph} /> */}
          </div>
        </div>
      </div>
    </div>
  );
}
