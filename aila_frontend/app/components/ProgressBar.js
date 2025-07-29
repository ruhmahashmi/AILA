// app/components/ProgressBar.js
export default function ProgressBar({ percent }) {
  return (
    <div className="w-full h-3 bg-gray-200 rounded">
      <div
        className="h-3 bg-blue-600 rounded"
        style={{
          width: `${percent || 0}%`,
          transition: "width 0.7s"
        }}
      />
    </div>
  );
}
