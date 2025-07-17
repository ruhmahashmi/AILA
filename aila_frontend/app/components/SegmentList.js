// app/components/SegmentList.js
export default function SegmentList({ segments, selectedIndex, onSelect }) {
    return (
      <div className="w-60 p-2 border-r">
        <div className="font-semibold mb-2">Slides</div>
        <ul>
          {segments.length === 0 && <li className="text-gray-400">No segments</li>}
          {segments.map((seg, idx) => (
            <li key={seg.id}>
              <button
                className={`block w-full p-2 text-left ${idx === selectedIndex ? 'bg-blue-100 font-bold' : ''}`}
                onClick={() => onSelect(idx)}
              >
                {seg.title || `Slide ${idx + 1}`}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  