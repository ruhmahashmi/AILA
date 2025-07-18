// app/components/UploadLectureForm.js
'use client';
import axios from 'axios';
import { useState } from 'react';

export default function UploadLectureForm({ courseId, week, onUploadStart }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({}); // { filename: percent }

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', courseId);
      formData.append('week', week);
      // Notify parent/component above that processing should start polling for this file (if applicable)
      onUploadStart && onUploadStart(file.name);

      await axios.post('http://localhost:8000/api/upload-lecture/', formData, {
        onUploadProgress: progressEvent => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
        }
      });
    }
    setSelectedFiles([]);
  };

  return (
    <form onSubmit={handleUpload} className="flex items-center space-x-4 mb-4">
      <input
        type="file"
        name="lectureFiles"
        id="lectureFiles"
        accept=".pdf,.pptx"
        multiple
        onChange={handleFileChange}
        className="border rounded px-2 py-1"
        required
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={selectedFiles.length === 0}
      >
        Upload
      </button>
      {/* Show individual file upload progress bars */}
      <div className="space-y-1">
        {selectedFiles.map(file => (
          uploadProgress[file.name] != null && (
            <div key={file.name} className="w-48">
              <span className="text-xs">{file.name}</span>
              <div className="bg-gray-200 h-2 rounded">
                <div
                  className="bg-green-500 h-2 rounded"
                  style={{ width: `${uploadProgress[file.name]}%` }}
                />
              </div>
            </div>
          )
        ))}
      </div>
    </form>
  );
}
