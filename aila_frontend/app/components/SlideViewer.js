// components/SlideViewer.js
'use client';
import React, { useState } from 'react';

export default function SlideViewer({ segment }) {
  // Debug log what you receive from the backend
  console.log('[SlideViewer] Received segment:', segment);

  if (!segment) {
    return (
      <div style={{ padding: 16, color: '#888' }}>
        Select a segment to view details
      </div>
    );
  }

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
    </div>
  );
}
