// app/instructor/course/[id]/week/[weekNumber]/page.js
'use client';
import { useState, useEffect } from 'react';
import UploadLectureForm from '../../../components/UploadLectureForm';
import SegmentList from '../../../components/SegmentList';
import SlideViewer from '../../../components/SlideViewer';
import axios from 'axios';

export default function CourseWeekPage({ params }) {
  const { id: courseId, weekNumber } = params;
  const [segments, setSegments] = useState([]);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);

  // Fetch list of segments (slide list)
  useEffect(() => {
    const fetchSegments = async () => {
      const res = await fetch(`http://localhost:8000/api/segments/?course_id=${courseId}&week=${weekNumber}`);
      const data = await res.json();
      setSegments(data);
      if (data && data.length > 0) setActiveSegmentId(data[0].id);
    };
    fetchSegments();
  }, [courseId, weekNumber]);

  // Fetch full segment detail when active segment changes
  useEffect(() => {
    if (!activeSegmentId) return;
    const fetchSegmentDetail = async () => {
      const res = await fetch(`http://localhost:8000/api/segment/${activeSegmentId}`);
      const data = await res.json();
      setActiveSegment(data);
    };
    fetchSegmentDetail();
  }, [activeSegmentId]);

  // Optionally, after upload, refresh the segment list
  const handleUploadStart = () => {
    setTimeout(() => {
      // Wait for backend processing, then refetch
      fetch(`http://localhost:8000/api/segments/?course_id=${courseId}&week=${weekNumber}`)
        .then(res => res.json())
        .then(data => setSegments(data));
    }, 4000); // adjust timeout as needed
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <UploadLectureForm courseId={courseId} week={weekNumber} onUploadStart={handleUploadStart} />
      <div className="flex space-x-4">
        <div className="w-1/3">
          <SegmentList
            segments={segments}
            activeSegmentId={activeSegmentId}
            onClickSegment={setActiveSegmentId}
          />
        </div>
        <div className="flex-1">
          <SlideViewer segment={activeSegment} />
        </div>
      </div>
    </div>
  );
}
