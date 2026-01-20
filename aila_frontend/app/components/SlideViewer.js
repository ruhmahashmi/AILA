// app/components/SlideViewer.js
'use client';

import MCQGenerator from "./MCQGenerator";

export default function SlideViewer({ concept, courseId, week }) {
  if (!concept) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-500">
        Select a concept to view details.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          {concept.label}
        </h2>
        <p className="text-xs text-gray-500">
          <span className="font-medium">Slides:</span>{" "}
          {concept.slide_nums && concept.slide_nums.join(", ")}
        </p>
      </div>

      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-700 mb-1">Summary</h3>
        <div className="bg-blue-50 border border-blue-100 rounded-md p-2 text-xs text-gray-800 whitespace-pre-wrap">
          {concept.summary && concept.summary.trim()
            ? concept.summary
            : <span className="text-gray-400">No summary available.</span>}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-1">
          Combined slide content
        </h3>
        <details className="text-xs">
          <summary className="cursor-pointer text-blue-600 hover:underline">
            Show all content (may be long)
          </summary>
          <pre className="mt-2 bg-gray-50 rounded-md p-2 text-[11px] text-gray-800 whitespace-pre-wrap max-h-64 overflow-auto">
            {concept.contents || ""}
          </pre>
        </details>
      </div>

      <MCQGenerator
        courseId={courseId}
        week={week}
        conceptId={concept.id}
        conceptSummary={concept.summary}
        conceptContents={concept.contents}
      />
    </div>
  );
}