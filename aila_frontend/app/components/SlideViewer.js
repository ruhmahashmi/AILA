// app/components/SlideViewer.js
export default function SlideViewer({ segment }) {
    if (!segment) return <div className="p-8">Select a slide to view its content.</div>;
    return (
      <div className="flex-1 p-6">
        <h2 className="font-bold text-lg mb-2">{segment.title}</h2>
        <pre className="mb-4 bg-gray-50 p-2 rounded whitespace-pre-wrap">{segment.content}</pre>
        {/* Add Teaching Assistant button here in the future */}
      </div>
    );
  }
  