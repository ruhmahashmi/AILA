// app/student/course/[id]/week/[weekNumber]/page.js

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdaptiveQuiz from '../../../../../components/AdaptiveQuiz';

const BACKEND_URL = 'http://localhost:8000';
const WEEK_COUNT = 11;

export default function StudentCourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const router = useRouter();
  const [kg, setKg] = useState({ nodes: [], edges: [] });
  const [selectedConceptId, setSelectedConceptId] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/knowledge-graph/?course_id=${courseId}&week=${weekNumber}`)
      .then(res => res.json())
      .then(data => {
        setKg(data ?? {nodes: [], edges: []});
        setSelectedConceptId(data.nodes?.[0]?.id || null);
      });
  }, [courseId, weekNumber]);

  const selectedConcept = kg.nodes.find(n => n.id === selectedConceptId);

  // Week sidebar
  const WeekSelector = () => (
    <div className="w-48 border-r border-gray-300 p-4 bg-white">
      <h3 className="font-semibold mb-2">Select Week</h3>
      <ul>
        {Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map(w => (
          <li key={w}>
            <button
              className={`block w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${String(weekNumber) === String(w) ? 'bg-blue-200 font-bold text-blue-700' : ''}`}
              onClick={() => router.push(`/student/course/${courseId}/week/${w}`)}
            >
              Week {w}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  // Concept sidebar
  const ConceptSelector = () => (
    <div>
      <h3 className="font-semibold mb-2">Concepts</h3>
      <ul>
        {kg.nodes.map(concept => (
          <li key={concept.id}>
            <button
              className={`block w-full text-left px-2 py-1 my-1 rounded border ${selectedConceptId === concept.id ? 'bg-green-200' : 'bg-white'}`}
              onClick={() => setSelectedConceptId(concept.id)}
            >
              {concept.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <WeekSelector />
      <div className="flex-1 flex space-x-6 p-6">
        <div style={{ width: 280 }}>
          <ConceptSelector />
        </div>
        <div className="flex-1">
          {selectedConcept ? (
            <div className="bg-gray-100 rounded p-4 shadow mb-6">
              <div className="font-bold text-xl mb-2">{selectedConcept.label}</div>
              <div className="mb-2 text-gray-700 whitespace-pre-line">{selectedConcept.summary}</div>
              <hr className="my-3"/>
              <AdaptiveQuiz segmentId={selectedConcept.id} />
            </div>
          ) : (
            <div>Select a concept to begin.</div>
          )}
        </div>
      </div>
    </div>
  );
}
