// app/components/UploadLectureForm.js
import axios from "axios";
import { useState } from "react";

export default function UploadLectureForm({ courseId, weekNumber, onUploadComplete }) {
  const [uploadProgress, setUploadProgress] = useState({}); // { filename: percent }

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files);

    for (let file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("week", weekNumber);
      formData.append("course_id", courseId);

      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: 0,
      }));

      try {
        const res = await axios.post(
          "http://localhost:8000/api/upload-lecture/",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            // This callback is called many times during upload:
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: percentCompleted,
              }));
            },
          }
        );
        if (onUploadComplete && res.data.processing_id) {
          onUploadComplete(res.data.processing_id, file.name);
        }
        // Remove bar as soon as upload is done
        setTimeout(() =>
          setUploadProgress(prev => {
            const { [file.name]: _, ...rest } = prev;
            return rest;
          }), 1000);
      } catch (e) {
        alert(`Upload failed: ${file.name}`);
        setUploadProgress(prev => {
          const { [file.name]: _, ...rest } = prev;
          return rest;
        });
      }
    }
    // Reset file input
    event.target.value = '';
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={handleUpload}
        className="border p-2 rounded"
      />
      <div className="mt-2">
        {Object.entries(uploadProgress).map(([fname, percent]) => (
          <div className="mb-2" key={fname}>
            <span className="block text-xs mb-1">{fname} ({percent}%)</span>
            <div className="w-full h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-green-600 rounded"
                style={{
                  width: `${percent}%`,
                  transition: "width 0.4s"
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
