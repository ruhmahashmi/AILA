// app/components/UploadedFilesList.js
import { useEffect, useState } from "react";

const BACKEND_URL = "http://localhost:8000";

export default function UploadedFilesList({ courseId, week, onReload }) {
  const [files, setFiles] = useState([]);        // this week only
  const [history, setHistory] = useState([]);    // all uploads for course
  const [showHistory, setShowHistory] = useState(false);

  async function fetchFiles() {
    if (!courseId) return;
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/lecture-history/?course_id=${courseId}`
      );
      const data = await res.json();
      const all = Array.isArray(data) ? data : [];

      setFiles(all.filter(f => String(f.week) === String(week)));
      setHistory(all);
    } catch {
      setFiles([]);
      setHistory([]);
    }
  }

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, week, onReload]);

  const handleFileDelete = async (uploadId) => {
    try {
      await fetch(`${BACKEND_URL}/api/delete-upload`, {
        method: "POST",
        body: new URLSearchParams({ uploadid: uploadId }),
      });
      setFiles(prev => prev.filter(f => f.id !== uploadId));
      setHistory(prev => prev.filter(f => f.id !== uploadId));
    } catch {
      // optional: toast
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mt-4">
      <h3 className="font-semibold text-sm mb-3">
        Lecture files for Week {week}
      </h3>

      {files.length === 0 ? (
        <div className="text-xs text-gray-500">
          No files uploaded for this week yet.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {files.map(file => (
            <li
              key={file.id}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <div className="flex flex-col">
                <span className="text-gray-800 truncate max-w-xs">
                  {file.file_name}
                </span>
                <span className="text-xs text-gray-500">
                  Uploaded for week {file.week}
                </span>
              </div>
              <button
                onClick={() => handleFileDelete(file.id)}
                className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Toggle for full processing history */}
      {history.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowHistory(s => !s)}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            {showHistory
              ? "Hide full processing history"
              : "View full processing history"}
          </button>

          {showHistory && (
            <div className="mt-3 border-t border-gray-100 pt-2">
              <h4 className="text-xs font-semibold text-gray-700 mb-1">
                All uploads for this course
              </h4>
              <div className="max-h-44 overflow-auto border border-gray-100 rounded">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">File</th>
                      <th className="px-2 py-1 text-left">Week</th>
                      <th className="px-2 py-1 text-left">Status</th>
                      <th className="px-2 py-1 text-left">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(job => (
                      <tr key={job.id} className="border-t border-gray-100">
                        <td className="px-2 py-1 truncate max-w-[160px]">
                          {job.file_name}
                        </td>
                        <td className="px-2 py-1">{job.week}</td>
                        <td className="px-2 py-1">
                          {job.status === "done" && (
                            <span className="text-green-700">Done</span>
                          )}
                          {job.status === "error" && (
                            <span className="text-red-700">Error</span>
                          )}
                          {job.status === "processing" && (
                            <span className="text-blue-700">Processing</span>
                          )}
                          {job.status === "pending" && (
                            <span className="text-yellow-600">Pending</span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          {job.progress != null ? `${job.progress}%` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
