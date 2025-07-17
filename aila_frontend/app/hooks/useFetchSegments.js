// app/hooks/useFetchSegments.js
import { useEffect, useState } from 'react';

export default function useFetchSegments(courseId, week) {
  const [segments, setSegments] = useState([]);
  useEffect(() => {
    async function fetchSegments() {
      try {
        const res = await fetch(`/api/course/${courseId}/week/${week}/segments`);
        if (!res.ok) throw new Error("Failed to fetch segments");
        const data = await res.json();
        setSegments(data || []);
      } catch (err) {
        setSegments([]);
      }
    }
    if (courseId && week) fetchSegments();
  }, [courseId, week]);
  return segments;
}
