// components/SegmentList.js
'use client';

export default function SegmentList({ concepts, activeConceptId, onClickConcept }) {
  if (!concepts?.length) return <div>No concepts found for this week.</div>;
  return (
    <div>
      <ul>
        {concepts.map(concept => (
          <li key={concept.id} style={{ marginBottom: "0.2em" }}>
            <button
              type="button"
              onClick={() => onClickConcept(concept.id)}
              className={activeConceptId === concept.id ? 'font-bold underline' : ''}
              style={{
                background: activeConceptId === concept.id ? '#f0f0f0' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 5,
                borderRadius: 4,
                display: "block",
                width: "100%",
                textAlign: "left"
              }}
            >
              {concept.label}
              {concept.slide_nums && concept.slide_nums.length > 0 &&
                <span className="text-xs text-gray-500 ml-2">
                  ({concept.slide_nums.length > 1 ? "slides" : "slide"}: {concept.slide_nums.join(',')})
                </span>
              }
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}