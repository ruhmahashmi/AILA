// app/components/UploadedFilesList.js
import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ADDED onReload to the props here 👇
export default function UploadedFilesList({ courseId, week, refreshTrigger, onReload }) {
  const [files, setFiles] = useState([]);        // files for this week only
  const [history, setHistory] = useState([]);    // all uploads for course
  const [showHistory, setShowHistory] = useState(false);

  // Unified fetch function
  const fetchFiles = async () => {
    if (!courseId) return;
    try {
      // Add timestamp (t=Date.now()) to prevent browser caching after uploads/deletes
      const res = await fetch(
        `${BACKEND_URL}/api/lecture-history/?course_id=${courseId}&t=${Date.now()}`
      );
      const data = await res.json();
      const all = Array.isArray(data) ? data : [];

      // Filter for current week (ensure string comparison for safety)
      setFiles(all.filter(f => String(f.week) === String(week)));
      setHistory(all);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setFiles([]);
      setHistory([]);
    }
  };

  // Single Effect: Runs on mount AND when course, week, or refreshTrigger changes
  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, week, refreshTrigger]); 

  const handleFileDelete = async (uploadId) => {
    if (!confirm("Are you sure you want to delete this file? This will also remove the Concept Map.")) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload/${uploadId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // 1. Update List UI immediately
        setFiles(prev => prev.filter(f => f.id !== uploadId));
        setHistory(prev => prev.filter(f => f.id !== uploadId));
        
        // 2. CRITICAL FIX: Wait 500ms before reloading graph to ensure DB commit
        if (onReload) {
            setTimeout(() => {
                onReload();
            }, 500); 
        }
      } else {
        alert("Failed to delete file.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mt-4 h-full flex flex-col">
      <h3 className="font-semibold text-sm mb-3 text-gray-800">
        Lecture files for Week {week}
      </h3>

      <div className="flex-1">
        {files.length === 0 ? (
          <div className="text-xs text-gray-500 italic py-2">
            No files uploaded for this week yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {files.map(file => (
              <li
                key={file.id}
                className="flex items-center justify-between py-2 text-sm group"
              >
                <div className="flex flex-col overflow-hidden mr-2">
                  <span className="text-gray-800 truncate font-medium" title={file.file_name}>
                    {file.file_name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {file.status === 'done' ? 'Processed' : file.status}
                  </span>
                </div>
                <button
                  onClick={() => handleFileDelete(file.id)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      

      {/* History Toggle */}
      {history.length > 0 && (
        <div className="mt-4 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowHistory(s => !s)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium"
          >
            {showHistory ? "Hide full history" : `View all course uploads (${history.length})`}
          </button>

          {showHistory && (
            <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="max-h-40 overflow-auto border border-gray-100 rounded-md scrollbar-thin scrollbar-thumb-gray-200">
                <table className="w-full text-[10px]">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">File</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Wk</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50/50">
                        <td className="px-2 py-1.5 truncate max-w-[120px]" title={job.file_name}>
                          {job.file_name}
                        </td>
                        <td className="px-2 py-1.5 text-gray-500">{job.week}</td>
                        <td className="px-2 py-1.5">
                          <span className={`
                            px-1.5 py-0.5 rounded-full font-semibold
                            ${job.status === "done" ? "bg-green-100 text-green-700" : 
                              job.status === "error" ? "bg-red-100 text-red-700" : 
                              "bg-blue-100 text-blue-700"}
                          `}>
                            {job.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
