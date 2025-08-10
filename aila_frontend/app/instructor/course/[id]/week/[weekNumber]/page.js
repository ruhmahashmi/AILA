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
const WEEK_COUNT = 11;

export default function CourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();

  const [knowledgeGraph, setKnowledgeGraph] = useState({ nodes: [], edges: [] });
  const [activeConceptId, setActiveConceptId] = useState(null);
  const [processingFiles, setProcessingFiles] = useState([]);

  // Auto-select first concept when knowledgeGraph loads
  useEffect(() => {
    if (knowledgeGraph.nodes.length > 0 && !activeConceptId) {
      setActiveConceptId(knowledgeGraph.nodes[0].id);
    }
  }, [knowledgeGraph.nodes, activeConceptId]);

  // Fetch KG and reset active concept on course/week change
  useEffect(() => {
    fetchKnowledgeGraph();
    setActiveConceptId(null);
  }, [courseId, weekNumber]);

  // Monitor lecture processing
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
          fetchKnowledgeGraph();
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

  function fetchKnowledgeGraph() {
    fetch(`${BACKEND_URL}/api/knowledge-graph/?course_id=${courseId}&week=${weekNumber}`)
      .then(res => res.json())
      .then(data => setKnowledgeGraph(data))
      .catch(() => setKnowledgeGraph({ nodes: [], edges: [] }));
  }

  const handleClickConcept = id => setActiveConceptId(id);

  const handleProcessingStarted = (processingId, fileName) => {
    setProcessingFiles(prev => [...prev, { processingId, fileName }]);
  };

  const WeekSelector = () => (
    <div className="w-48 border-r border-gray-300 p-4 bg-white">
      <h3 className="font-semibold mb-2">Select Week</h3>
      <ul>
        {Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map(w => (
          <li key={w}>
            <button
              className={`block w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${String(weekNumber) === String(w) ? 'bg-blue-200 font-bold text-blue-700' : ''}`}
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

  // Get currently selected concept node
  const activeConcept = knowledgeGraph.nodes.find(node => node.id === activeConceptId);

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
        <div className="flex flex-1 space-x-4">
          <div className="w-1/3" style={{ maxHeight: "90vh", overflowY: "auto" }}>
            {/* Concept navigation */}
            <SegmentList
              concepts={knowledgeGraph.nodes}
              activeConceptId={activeConceptId}
              onClickConcept={handleClickConcept}
            />
            <div className="mt-6">
              <ProcessingHistory courseId={courseId} />
            </div>
          </div>
          <div className="flex-1">
            {/* --- FIX: Pass courseId and weekNumber to SlideViewer --- */}
            <SlideViewer
              concept={activeConcept}
              courseId={courseId}
              week={weekNumber}
            />
          </div>
        </div>
      </div>
    </div>
  );
}