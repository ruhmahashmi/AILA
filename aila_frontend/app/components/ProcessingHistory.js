import { useEffect, useState } from 'react';
import ProgressBar from './ProgressBar';

export default function ProcessingHistory({ courseId, onViewResult }) {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      const res = await fetch(`http://localhost:8000/lecture-history/?course_id=${courseId}`);
      const data = await res.json();
      setJobs(data || []);
    }
    if (courseId) fetchHistory();
  }, [courseId]);

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-2">Processing History</h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">File Name</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(job => (
            <tr key={job.id}>
              <td>{job.file_name}</td>
              <td>{job.status}</td>
              <td style={{ minWidth: 100 }}>
                <ProgressBar value={job.progress || 0} />
              </td>
              <td>
                {job.status === 'done' && (
                  <button
                    className="text-blue-700 underline"
                    onClick={() => onViewResult(job)}
                  >
                    View Results
                  </button>
                )}
                {job.status === 'error' && (
                  <span className="text-red-600">Error</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
