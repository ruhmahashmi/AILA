// components/SegmentList.js
'use client';

import { useEffect } from 'react';

export default function SegmentList({ segments, activeSegmentId, onClickSegment }) {
  useEffect(() => {
    console.log('[SegmentList] Rendering', segments.length, 'segments:', segments.map(s => s.id));
  }, [segments]);

  return (
    <div>
      <ul>
        {segments.map(segment => (
          <li key={segment.id}>
            <button
              type="button"
              onClick={() => {
                console.log("[SegmentList] Clicked segment id:", segment.id);
                onClickSegment(segment.id);
              }}
              className={activeSegmentId === segment.id ? 'font-bold underline' : ''}
              style={{
                background: activeSegmentId === segment.id ? '#f0f0f0' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '0.3em',
                display: "block",
                width: "100%",
                textAlign: "left"
              }}
            >
              {segment.title} <span className="text-xs text-gray-400">[{segment.id.slice(0,6)}]</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

