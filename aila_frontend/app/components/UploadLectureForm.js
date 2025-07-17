// app/components/UploadLectureForm.js
import { useRef } from 'react';

export default function UploadLectureForm({ courseId, week, onUpload }) {
  const fileInputRef = useRef();

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileInputRef.current.files[0];
    if (!file) return alert("Select a file!");

    // Prepare form data for backend REST endpoint
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);
    formData.append('week', week);
    formData.append('file_name', file.name);

    // Send to your backend (SQL-based FastAPI or similar)
    const res = await fetch(`/api/course/${courseId}/week/${week}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const msg = (await res.json())?.error || "Upload failed.";
      alert(msg);
      return;
    }
    fileInputRef.current.value = '';
    onUpload?.();
  }

  return (
    <form onSubmit={handleUpload} className="flex gap-2 items-center">
      <input type="file" ref={fileInputRef} accept=".pdf,.pptx" />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Upload
      </button>
    </form>
  );
}

