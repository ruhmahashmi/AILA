// app/components/SegmentList.js
'use client';

export default function SegmentList({ concepts, activeConceptId, onClickConcept }) {
  if (!concepts?.length) {
    return (
      <div className="text-xs text-gray-500">
        No concepts found for this week.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Concepts</h3>
      <ul className="space-y-1">
        {concepts.map((concept) => {
          const active = activeConceptId === concept.id;
          return (
            <li key={concept.id}>
              <button
                type="button"
                onClick={() => onClickConcept(concept.id)}
                className={`w-full text-left px-2 py-1 rounded-md text-sm ${
                  active
                    ? "bg-blue-100 text-blue-800 font-semibold"
                    : "hover:bg-gray-50 text-gray-800"
                }`}
              >
                <span>{concept.label}</span>
                {concept.slide_nums && concept.slide_nums.length > 0 && (
                  <span className="text-[11px] text-gray-500 ml-2">
                    ({concept.slide_nums.length > 1 ? "slides" : "slide"}:{" "}
                    {concept.slide_nums.join(",")})
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}