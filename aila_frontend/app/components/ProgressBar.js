// app/components/ProgressBar.js
export default function ProgressBar({ progress = 0, status }) {
  const pct = Math.max(0, Math.min(100, progress || 0));

  return (
    <div>
      <div className="w-full bg-gray-200 h-2 rounded">
        <div
          className="bg-blue-500 h-2 rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-600">
        {status === "processing" && `Processing... ${pct}%`}
        {status === "done" && "Processing complete (100%)"}
        {status === "error" && "Error during processing"}
        {!status && `Queued (0%)`}
      </div>
    </div>
  );
}