// app/components/Navbar.js
'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
            A
          </span>
          <span className="font-semibold text-xl text-blue-700 tracking-tight">
            AILA
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/instructor"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            Instructor
          </Link>
          <Link
            href="/student"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            Student
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium transition"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}