// React Component: KnowledgeGraphLoader.js
import React, { useState, useEffect } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';

export default function KnowledgeGraphLoader({ processingId, courseId, week }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    let intervalId;

    const fetchData = async () => {
      try {
        // 1. Check Status
        const statusRes = await fetch(`/api/processing-status/${processingId}`);
        const statusData = await statusRes.json();
        setStatus(statusData.status);

        // 2. Fetch Graph Data (Even if still processing!)
        // The backend is updating this table in real-time, so we get partial results
        const graphRes = await fetch(`/api/knowledge-graph?courseid=${courseId}&week=${week}`);
        const graphData = await graphRes.json();

        if (graphData.nodes && graphData.nodes.length > 0) {
          // Transform backend data to ReactFlow format if needed
          // Assuming backend sends: { id: "Topic", label: "Topic", level: 0 ... }
          // Group nodes by level for proper hierarchical positioning
          const byLevel = {};
          graphData.nodes.forEach(n => {
            const lvl = n.level ?? 0;
            byLevel[lvl] = byLevel[lvl] || [];
            byLevel[lvl].push(n);
          });
          const flowNodes = graphData.nodes.map((n) => {
            const lvl = n.level ?? 0;
            const siblings = byLevel[lvl];
            const idx = siblings.indexOf(n);
            const total = siblings.length;
            return {
              id: n.id,
              data: { label: n.label || n.id },
              position: {
                x: (idx - (total - 1) / 2) * 240,
                y: lvl * 130,
              },
              type: n.type === 'root' ? 'input' : 'default'
            };
          });

          const flowEdges = graphData.edges.map((e, i) => ({
            id: `e-${i}`,
            source: e.source,
            target: e.target,
            animated: true // Animation shows it's "live"
          }));

          setNodes(flowNodes);
          setEdges(flowEdges);
        }

        // Stop polling if done or error
        if (statusData.status === "done" || statusData.status === "error") {
          clearInterval(intervalId);
        }

      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Start Polling every 1 second
    intervalId = setInterval(fetchData, 1000);

    // Initial fetch
    fetchData();

    return () => clearInterval(intervalId);
  }, [processingId, courseId, week]);

  return (
    <div style={{ height: 500, border: '1px solid #ccc' }}>
      {status === "processing" && (
        <div style={{ position: 'absolute', zIndex: 10, background: 'rgba(255,255,255,0.8)', padding: 10 }}>
          Processing... Found {nodes.length} concepts so far.
        </div>
      )}
      
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
