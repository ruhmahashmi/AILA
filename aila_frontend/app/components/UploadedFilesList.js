// app/components/UploadedFilesList.js
import { useEffect, useState } from "react";

export default function UploadedFilesList({ courseId, week, onRemoved, reloadTrigger }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    async function fetchFiles() {
      const res = await fetch(`http://localhost:8000/api/uploaded-files/?course_id=${courseId}&week=${week}`);
      setFiles(await res.json());
    }
    fetchFiles();
  }, [courseId, week, reloadTrigger]);

  async function handleRemove(id) {
    await fetch("http://localhost:8000/api/upload-file/", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: id }),
    });
    if (onRemoved) onRemoved();
  }

  return (
    <div>
      <ul>
        {files.map(file => (
          <li key={file.id} className="flex items-center gap-2">
            <span>{file.file_name}</span>
            <button onClick={() => handleRemove(file.id)} className="text-red-700">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
