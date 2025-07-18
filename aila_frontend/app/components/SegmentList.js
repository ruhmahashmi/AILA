// app/components/SegmentList.js
'use client';
export default function SegmentList({ segments, activeSegmentId, onClickSegment }) {
  return (
    <div className="border-b border-gray-300 py-2 overflow-auto max-h-56">
      <ul>
        {segments.map(segment => (
          <li key={segment.id}>
            <button
              className={`block w-full text-left px-2 py-1 rounded hover:bg-gray-200 ${
                activeSegmentId === segment.id ? 'bg-blue-100 font-semibold' : ''
              }`}
              onClick={() => onClickSegment(segment.id)}
            >
              {segment.title || `Slide ${segment.segment_index + 1}`}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
