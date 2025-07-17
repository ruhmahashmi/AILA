// app/hooks/useFetchUploadedFiles.js
import { useEffect, useState } from 'react';

export default function useFetchUploadedFiles(courseId, week) {
  const [files, setFiles] = useState([]);
  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch(`/api/course/${courseId}/week/${week}/uploads`);
        if (!res.ok) throw new Error("Failed to fetch uploaded files");
        const data = await res.json();
        setFiles(data || []);
      } catch (err) {
        setFiles([]);
      }
    }
    if (courseId && week) fetchFiles();
  }, [courseId, week]);
  return files;
}
