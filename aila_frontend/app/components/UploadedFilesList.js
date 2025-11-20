// app/components/UploadedFilesList.js
// app/components/UploadedFilesList.js
import { useEffect, useState } from "react";

export default function UploadedFilesList({ courseId, week, onReload }) {
  const [files, setFiles] = useState([]);

  // Fetch the uploaded files for a course
  async function fetchFiles() {
    const res = await fetch(`http://localhost:8000/api/lecture-history/?course_id=${courseId}`);
    setFiles(await res.json());
  }

  // Fetch files whenever courseId, week, or the reload flag changes
  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line
  }, [courseId, week, onReload]);

  // Handle deleting a file
  const handleFileDelete = async (uploadId) => {
    await fetch("http://localhost:8000/api/delete-upload", {
      method: "POST",
      body: new URLSearchParams({ uploadid: uploadId }),
    });
    // Instantly remove from UI
    setFiles((prev) => prev.filter(f => f.id !== uploadId));
  };

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-2">Uploaded Files</h3>
      <ul>
        {files.map(file => (
          <li key={file.id} className="flex items-center gap-2">
            <span>{file.file_name}</span>
            <button
              onClick={() => handleFileDelete(file.id)}
              className="ml-2 px-2 py-1 text-sm rounded bg-red-200"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
