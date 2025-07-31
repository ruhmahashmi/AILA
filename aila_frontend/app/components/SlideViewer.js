// components/SlideViewer.js
'use client';

import MCQGenerator from "./MCQGenerator"; // Adjust path if needed

export default function SlideViewer({ concept, courseId, week }) {
  if (!concept) {
    return (
      <div style={{ padding: 16, color: '#888' }}>
        Select a concept to view details
      </div>
    );
  }

  // Use parent-passed courseId/week, NOT from the concept node!
  const segmentIndex = concept.slide_indices?.[0] ?? 0;

  return (
    <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
      <h2>{concept.label}</h2>
      <div style={{ marginBottom: 8, color: '#555', fontWeight: 400 }}>
        <strong>Slides:</strong> {concept.slide_nums && concept.slide_nums.join(', ')}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Summary:</strong>
        <div style={{
          background: '#f0f6ff',
          border: '1px solid #bbd8fd',
          borderRadius: 4,
          padding: 10,
          marginTop: 4,
          marginBottom: 4
        }}>
          {concept.summary && concept.summary.trim()
            ? concept.summary
            : <span style={{ color: '#aaa' }}>No summary available</span>}
        </div>
      </div>
      <div>
        <strong>Combined Slide Content:</strong>
        <details>
          <summary style={{ cursor: "pointer" }}>Show all content (may be long!)</summary>
          <pre style={{
            background: '#f8f8fa',
            borderRadius: 4,
            padding: 10,
            marginTop: 4,
            fontSize: 13
          }}>{concept.contents || ""}</pre>
        </details>
      </div>
      {/* --- FIX: pass courseId and week as received from parent --- */}
      <MCQGenerator
        courseId={courseId}
        week={week}
        segmentIndex={segmentIndex}
        segmentId={concept.id}
        segmentContent={concept.contents}
      />
    </div>
  );
}
