// app/instructor/course/[id]/page.js
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectToWeek() {
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      router.replace(`/instructor/course/${id}/week/1`);
    }
  }, [id, router]);

  return (
    <div className="max-w-6xl mx-auto p-8 text-gray-600">
      Redirecting to Week 1…
    </div>
  );
}
