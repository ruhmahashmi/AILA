'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
// import { supabase } from '../../lib/supabaseClient'; // 

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);

  // SQLite/REST: use fetch to backend endpoint
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('http://localhost:8000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });
    const result = await res.json();

    if (!res.ok) {
      alert(result.error || 'Sign-up failed.');
    } else {
      alert('Sign-up succeeded! Please log in.');
      router.push('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSignUp} className="bg-white p-8 rounded-xl shadow w-full max-w-md flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-center">Create your account</h2>
        <input
          type="email"
          name="email"
          id="email"
          placeholder="Email address"
          className="w-full px-4 py-3 mb-4 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          name="password"
          id="password"
          placeholder="Password"
          className="w-full px-4 py-3 mb-4 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <select
          name="role"
          id="role"
          className="w-full px-4 py-3 mb-4 border border-gray-200 rounded-full"
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
        </select>
        <button type="submit" className="w-full bg-black text-white py-3 rounded-full mb-3 font-semibold text-lg transition hover:bg-gray-900" disabled={loading}>
          {loading ? 'Loading...' : 'Sign up'}
        </button>
        <div className="text-center mb-2 text-gray-700">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 underline">Login</a>
        </div>
      </form>
    </div>
  );
}
