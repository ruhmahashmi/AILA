// components/SlideViewer.js
'use client';
import React from "react";
import MCQGenerator from "./MCQGenerator"; // Adjust if your code location differs

export default function SlideViewer({ segment }) {
  if (!segment) {
    return (
      <div style={{ padding: 16, color: '#888' }}>
        Select a segment to view details
      </div>
    );
  }

  const courseId = segment.course_id || segment.courseId || "";
  const week = segment.week || segment.weekNumber || "";
  const segmentIndex = segment.segment_index;
  const segmentId = segment.id;
  const segmentContent = segment.content || "";

  return (
    <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
      <h2>{segment.title || 'Untitled Segment'}</h2>
      <div style={{ marginBottom: 8, color: '#555', fontWeight: 400 }}>
        <strong>Keywords:</strong> {segment.keywords}
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
          {segment.summary && segment.summary.trim()
            ? segment.summary
            : <span style={{ color: '#aaa' }}>No summary available</span>}
        </div>
      </div>
      <div>
        <strong>Slide Content:</strong>
        <pre style={{
          background: '#f8f8fa',
          borderRadius: 4,
          padding: 10,
          marginTop: 4,
          fontSize: 13
        }}>{segment.content}</pre>
      </div>
      <MCQGenerator
        courseId={courseId}
        week={week}
        segmentIndex={segmentIndex}
        segmentId={segmentId}
        segmentContent={segmentContent}
      />
    </div>
  );
}
