export default function ProgressBar({ value, label }) {
    return (
      <div className="w-full mb-2">
        {label && <div className="mb-1 text-xs text-gray-700">{label}</div>}
        <div className="w-full bg-gray-200 rounded h-3">
          <div
            className="bg-blue-600 h-3 rounded"
            style={{ width: `${value}%`, transition: 'width 0.5s' }}
          ></div>
        </div>
      </div>
    );
  }
  