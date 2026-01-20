// app/hooks/useProcessingStatus.js
import { useState, useEffect } from "react";
import axios from "axios";

export default function useProcessingStatus(processingId) {
  const [status, setStatus] = useState("pending");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!processingId) return;

    let interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/lecture-status/?processing_id=${processingId}`
        );
        setStatus(res.data.status);
        setProgress(res.data.progress);
        setError(res.data.error || null);
        if (["done", "error"].includes(res.data.status)) clearInterval(interval);
      } catch (e) {
        setError("Network error");
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [processingId]);

  return { progress, status, error };
}