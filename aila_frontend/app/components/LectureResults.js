// app/components/LectureResults.js
import ProgressBar from './ProgressBar';
export default function LectureResults({ status, result, progress }) {
  if (status === 'pending' || status === 'processing') {
    return <ProgressBar value={progress} label={`Processing: ${progress.toFixed(0)}%`} />;
  }
  if (status === 'error') {
    return <div className="mb-4 text-red-600">Error: {result}</div>;
  }
  if (status === 'done' && result) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-2">Lecture Segments & Summaries</h2>
        <div className="space-y-4">
          {result.segments.map((seg, i) => (
            <div key={i} className="bg-white shadow rounded p-4">
              <div className="text-gray-700 mb-2 whitespace-pre-line">
                <span className="font-bold">Segment {i + 1}:</span> {seg}
              </div>
              <div className="text-blue-800 bg-blue-50 rounded p-2">
                <span className="font-semibold">Summary:</span> {result.summaries[i]}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  return null;
}