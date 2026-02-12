// components/InstructorDashboard.js
'use client';

import { useState, useEffect, useRef } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const WS_URL = BACKEND_URL.replace('http', 'ws');

export default function InstructorDashboard({ quizId }) {
  const [stats, setStats] = useState({
    total_submissions: 0,
    average_score: 0,
    submissions: []
  });
  const [liveUpdates, setLiveUpdates] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!quizId) return;

    // Fetch initial stats
    async function fetchStats() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/quiz/${quizId}/live-stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    }

    fetchStats();

    // Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}/ws/quiz/${quizId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to live dashboard");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "submission") {
        setLiveUpdates(prev => [{
          student_id: data.student_id,
          score: data.score,
          total: data.total,
          timestamp: new Date(data.timestamp).toLocaleTimeString()
        }, ...prev].slice(0, 10));

        fetchStats();
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("❌ Disconnected from live dashboard");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [quizId]);

  if (!quizId) {
    return (
      <div className="bg-gray-100 p-6 rounded-lg text-center text-gray-500 text-sm">
        Select a quiz to view live stats
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-lg border shadow-sm">
          <div className="text-xs text-gray-500 font-semibold">Submissions</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total_submissions}</div>
        </div>
        
        <div className="bg-white p-3 rounded-lg border shadow-sm">
          <div className="text-xs text-gray-500 font-semibold">Avg Score</div>
          <div className="text-2xl font-bold text-blue-600">{stats.average_score}%</div>
        </div>
      </div>

      {/* Live Feed */}
      {liveUpdates.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h3 className="text-xs font-bold text-green-800 mb-2">📡 Live</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {liveUpdates.slice(0, 5).map((update, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                <span className="font-medium text-gray-700">Student {update.student_id.slice(0, 6)}</span>
                <span className="text-gray-600">{update.score}/{update.total}</span>
                <span className="text-[10px] text-gray-400">{update.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      {stats.submissions.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b">
            <h3 className="text-xs font-bold text-gray-800">Recent</h3>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {stats.submissions.slice(0, 5).map((sub, idx) => (
              <div key={idx} className="px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">{sub.student_name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    sub.percentage >= 80 ? 'bg-green-100 text-green-700' :
                    sub.percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {sub.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
