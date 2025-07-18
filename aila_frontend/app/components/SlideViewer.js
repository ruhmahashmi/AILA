// app/components/SlideViewer.js
'use client';
export default function SlideViewer({ segment }) {
  if (!segment) return <div className="p-4">No segment selected.</div>;

  return (
    <div className="p-4 border border-gray-300 rounded shadow-sm overflow-auto h-64 bg-white">
      <h2 className="font-semibold mb-2">{segment.title}</h2>
      <div className="mb-2">
        {segment.summary && (
          <div>
            <span className="font-medium">Summary: </span>
            <span>{segment.summary}</span>
          </div>
        )}
        {segment.keywords && segment.keywords.length > 0 && (
          <div>
            <span className="font-medium">Keywords: </span>
            <span>{typeof segment.keywords === 'string' ? segment.keywords : segment.keywords.join(', ')}</span>
          </div>
        )}
      </div>
      <hr className="my-2" />
      <div className="whitespace-pre-wrap">{segment.content}</div>
    </div>
  );
}
