// app/components/UploadLectureForm.js
import axios from "axios";

export default function UploadLectureForm({ courseId, weekNumber, onProcessingStarted }) {
  const handleUpload = async (event) => {
    const files = Array.from(event.target.files);
    for (let file of files) {
      const formData = new FormData();
      formData.append("file", file);
      // Replace with your current course/week logic
      formData.append("week", weekNumber);
      formData.append("course_id", courseId);

      try {
        const res = await axios.post("http://localhost:8000/api/upload-lecture/", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        const { processing_id } = res.data;
        if (onProcessingStarted) onProcessingStarted(processing_id, file.name);
      } catch (e) {
        alert(`Upload failed: ${file.name}`);
        console.error("[UPLOAD] Upload failed:", e);
      }
    }
  };

  return (
    <input
      type="file"
      multiple
      onChange={handleUpload}
      className="border p-2 rounded"
    />
  );
}