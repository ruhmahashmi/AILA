// app/instructor/course/[id]/week/[weekNumber]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UploadLectureForm from '../../../../../components/UploadLectureForm';
import ProcessingFileStatus from '../../../../../components/ProcessingFileStatus';
import ProcessingHistory from '../../../../../components/ProcessingHistory';
import SegmentList from '../../../../../components/SegmentList';
import SlideViewer from '../../../../../components/SlideViewer';
import QuizCreator from '../../../../../components/QuizCreator';
import UploadedFilesList from '../../../../../components/UploadedFilesList';

const BACKEND_URL = "http://localhost:8000";
const WEEK_COUNT = 11;

export default function CourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();

  const [knowledgeGraph, setKnowledgeGraph] = useState({ nodes: [], edges: [] });
  const [activeConceptId, setActiveConceptId] = useState(null);

  const [processingFiles, setProcessingFiles] = useState([]); 
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizStats, setQuizStats] = useState(null);
  
  

  // Fetch knowledge graph for selected course/week
  const fetchKnowledgeGraph = () => {
    fetch(`${BACKEND_URL}/api/knowledge-graph/?course_id=${courseId}&week=${weekNumber}`)
      .then(res => res.json())
      .then(data => setKnowledgeGraph(data))
      .catch(() => setKnowledgeGraph({ nodes: [], edges: [] }));
  };

  // Fetch quizzes for selected course/week
  const fetchQuizzes = () => {
    fetch(`${BACKEND_URL}/api/quiz/list?course_id=${courseId}&week=${weekNumber}`)
      .then(res => res.json())
      .then(setQuizzes);
  };

  // Fetch quiz stats for selected quiz
  const fetchQuizStats = () => {
    if (!selectedQuizId) {
      setQuizStats(null);
      return;
    }
    fetch(`${BACKEND_URL}/api/quiz/stats?quiz_id=${selectedQuizId}`)
      .then(res => res.json())
      .then(setQuizStats);
  };

  // On course or week change, reload KG and quizzes
  useEffect(() => {
    fetchKnowledgeGraph();
    fetchQuizzes();
    setActiveConceptId(null);
    setSelectedQuizId(null);
    setQuizStats(null);
  }, [courseId, weekNumber]);

  // Auto-select first concept when concepts load
  useEffect(() => {
    if (knowledgeGraph.nodes.length > 0 && !activeConceptId) {
      setActiveConceptId(knowledgeGraph.nodes[0].id);
    }
  }, [knowledgeGraph.nodes, activeConceptId]);

  // Fetch quiz stats when selected quiz changes
  useEffect(() => {
    fetchQuizStats();
  }, [selectedQuizId]);

  // Poll processing status for active uploads
  useEffect(() => {
    if (processingFiles.length === 0) return;

    const intervalId = setInterval(() => {
      Promise.all(processingFiles.map(({ processingId }) =>
        fetch(`${BACKEND_URL}/api/lecture-status/?processing_id=${processingId}`)
          .then(res => res.json())
          .then(data => ({ ...data, processingId }))
          .catch(() => ({ status: 'error', processingId }))
      )).then(results => {
        const doneJobs = results.filter(r => r.status === 'done');
        if (doneJobs.length > 0) {
          // When any job finished, reload KG and remove from processing
          fetchKnowledgeGraph();
          setProcessingFiles(prev =>
            prev.filter(f => !doneJobs.some(done => done.processingId === f.processingId))
          );
        } else {
          // Keep only running jobs
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

    return () => clearInterval(intervalId);
  }, [processingFiles, courseId, weekNumber]);

  // Called by UploadLectureForm to add new processing job
  const handleProcessingStarted = (processingId, fileName) => {
    setProcessingFiles(prev => [...prev, { processingId, fileName }]);
  };  

  // Handle concept button click
  const handleClickConcept = (id) => {
    setActiveConceptId(id);
  };

  const activeConcept = knowledgeGraph.nodes.find(node => node.id === activeConceptId);

  // Week selector sidebar UI
  const WeekSelector = () => (
    <div className="w-48 border-r border-gray-300 p-4 bg-white">
      <h3 className="font-semibold mb-2">Select Week</h3>
      <ul>
        {Array.from({ length: WEEK_COUNT }).map((_, i) => {
          const w = i + 1;
          return (
            <li key={w}>
              <button
                className={`block w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${
                  String(weekNumber) === String(w)
                    ? 'bg-blue-200 font-bold text-blue-700'
                    : ''
                }`}
                onClick={() => {
                  if (String(weekNumber) !== String(w))
                    router.push(`/instructor/course/${courseId}/week/${w}`);
                }}
              >
                Week {w}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <WeekSelector />
      <div className="flex-1 flex flex-col space-y-4 p-4 overflow-auto">
        <h1 className="text-2xl font-bold">Upload Lecture Materials</h1>
        <UploadLectureForm
          courseId={courseId}
          weekNumber={weekNumber}
          onUploadComplete={handleProcessingStarted}
        />
        <UploadedFilesList
          courseId={courseId}
          week={weekNumber}
          onReload={fetchKnowledgeGraph} // or whatever function refetches the KG
        />
        {processingFiles.length > 0 && (
          <div className="mt-4">
            <h2 className="font-semibold mb-2">Currently Processing</h2>
            {processingFiles.map(({ processingId, fileName }) => (
              <ProcessingFileStatus
                key={processingId}
                processingId={processingId}
                fileName={fileName}
              />
            ))}
          </div>
        )}
        <div className="flex flex-1 space-x-4 mt-6">
          <div
            className="w-1/3 max-h-[90vh] overflow-y-auto"
            style={{ minWidth: "280px" }}
          >
            <SegmentList
              concepts={knowledgeGraph.nodes}
              activeConceptId={activeConceptId}
              onClickConcept={handleClickConcept}
            />
            <ProcessingHistory courseId={courseId} />
          </div>
          <div className="flex-1 flex flex-col">
            <SlideViewer
              concept={activeConcept}
              courseId={courseId}
              week={weekNumber}
            />
            {/* Quiz creation UI */}
            <div className="mt-6">
              <QuizCreator
                courseId={courseId}
                week={weekNumber}
                concepts={knowledgeGraph.nodes}
                onQuizCreated={fetchQuizzes}
              />
            </div>
            {/* Quizzes list */}
            <div className="mt-6">
              <h2 className="font-semibold text-xl mb-2">Quizzes for this week</h2>
              {quizzes.length === 0 && (
                <div className="text-gray-600">No quizzes created yet.</div>
              )}
              <ul className="space-y-2">
                {quizzes.map(q => (
                  <li key={q.id}>
                    <button
                      className={`text-left w-full px-3 py-2 rounded ${
                        q.id === selectedQuizId
                          ? 'bg-blue-100 font-bold text-blue-700'
                          : 'hover:bg-blue-50'
                      }`}
                      onClick={() => setSelectedQuizId(q.id)}
                    >
                      <div>{q.name}</div>
                      <div className="text-xs text-gray-500">
                        Concepts:{" "}
                        {q.concept_ids
                          .map((cid) => {
                            const concept = knowledgeGraph.nodes.find(n => n.id === cid);
                            return concept ? concept.label : cid;
                          })
                          .join(", ")}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {selectedQuizId && quizStats && (
                <div className="mt-4 p-4 bg-white border rounded shadow">
                  <h3 className="font-semibold mb-2">Quiz Analytics (Anonymous)</h3>
                  <div><strong>Total Attempts:</strong> {quizStats.total_attempts}</div>
                  <div><strong>Performance:</strong></div>
                  <ul className="list-disc pl-6">
                    {quizStats.stats.map((s, i) => (
                      <li key={i}>
                        Attempted: {s.attempted}, Correct: {s.correct}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
