// aila_frontend/app/components/ProcessingHistory.js
'use client';
import { useEffect, useState } from 'react';

export default function ProcessingHistory({ courseId }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!courseId) return;
    fetch(`http://localhost:8000/api/lecture-history/?course_id=${courseId}`)
      .then(res => res.json())
      .then(data => setHistory(data || []));
  }, [courseId]);

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-2">Processing History</h3>
      <div className="bg-gray-50 border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">File Name</th>
              <th className="px-2 py-1 text-left">Week</th>
              <th className="px-2 py-1 text-left">Status</th>
              <th className="px-2 py-1 text-left">Progress</th>
              <th className="px-2 py-1 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            {history.map(job => (
              <tr key={job.id}>
                <td className="px-2 py-1">{job.file_name}</td>
                <td className="px-2 py-1">{job.week}</td>
                <td className="px-2 py-1">
                  {job.status === "done" && <span className="text-green-700">Done</span>}
                  {job.status === "error" && <span className="text-red-700">Error</span>}
                  {job.status === "processing" && <span className="text-blue-700">Processing</span>}
                  {job.status === "pending" && <span className="text-yellow-600">Pending</span>}
                </td>
                <td className="px-2 py-1">{job.progress}%</td>
                <td className="px-2 py-1 text-red-600">{job.error || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
