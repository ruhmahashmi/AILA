import { useEffect, useState } from 'react';

export default function useProcessingStatus(courseId, fileName) {
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!fileName) return;
    setStatus('processing');
    setProgress(0);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/lecture-status?course_id=${courseId}&file_name=${fileName}`);
        const data = await res.json();
        setStatus(data.status);
        setProgress(data.progress || 0);
        if (data.status === 'done' || data.status === 'error') {
          setResult(data.result || data.error);
          clearInterval(interval);
        }
      } catch (err) {
        setStatus('error');
        setResult('Network error');
        setProgress(100);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [courseId, fileName]);

  return { status, result, progress };
}
