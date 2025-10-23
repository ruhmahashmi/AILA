// app/student/course/[id]/page.js

'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectToWeek() {
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    // Redirect to /week/1 for this course
    if (id) router.replace(`/student/course/${id}/week/1`);
  }, [id, router]);

  return <div>Redirecting to Week 1...</div>;
}

