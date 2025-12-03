// app/components/ConceptGraph.js
'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useEffect, useState } from 'react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

export default function ConceptGraph({ nodes = [], edges = [], onSelect }) {
  const fgRef = useRef(null);

  // --- build lookup + incoming counts from full KG ---
  const { nodeMap, childrenMap, importantIds } = useMemo(() => {
    const nMap = new Map();
    const incoming = new Map();
    const cMap = new Map();

    nodes.forEach((n) => {
      nMap.set(n.id, n);
      incoming.set(n.id, 0);
      cMap.set(n.id, []);
    });

    edges.forEach((e) => {
      if (!nMap.has(e.source) || !nMap.has(e.target)) return;
      incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
      cMap.get(e.source).push(e.target);
    });

    const important = new Set();

    nodes.forEach((n) => {
      const count = n.count || 0;
      const isRoot = n.isRoot || (incoming.get(n.id) || 0) === 0;
      const isHighCount = count >= 5;
      if (isRoot || n.level === 0 || isHighCount) {
        important.add(n.id);
      }
    });

    return { nodeMap: nMap, childrenMap: cMap, importantIds: important };
  }, [nodes, edges]);

  // --- visible node ids state (what's actually rendered) ---
  const [visibleIds, setVisibleIds] = useState(() => new Set());

  // reset visible set whenever KG changes
  useEffect(() => {
    setVisibleIds(new Set(importantIds));
  }, [importantIds]);

  // --- derive visible graphData from visibleIds + full KG ---
  const baseGraphData = useMemo(() => {
    if (!nodes.length || !visibleIds.size) return { nodes: [], links: [] };

    const vNodes = [];
    visibleIds.forEach((id) => {
      const n = nodeMap.get(id);
      if (!n) return;
      vNodes.push({
        id: n.id,
        name: n.label || n.id,
        val: Math.max(8, Math.min(18, (n.count || 1) * 2)),
        isRoot: !!n.isRoot,
      });
    });

    const vLinks = edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => ({ source: e.source, target: e.target }));

    return { nodes: vNodes, links: vLinks };
  }, [nodes, edges, nodeMap, visibleIds]);

  // --- apply simple radial layout on current visible nodes ---
  const finalGraphData = useMemo(() => {
    const laidOut = { ...baseGraphData, nodes: [...baseGraphData.nodes] };
    if (!laidOut.nodes.length) return laidOut;

    // center = first node
    const center = laidOut.nodes[0];
    center.fx = 0;
    center.fy = 0;

    const others = laidOut.nodes.slice(1);
    const n = others.length || 1;
    const radius = 160;

    others.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n;
      node.fx = radius * Math.cos(angle);
      node.fy = radius * Math.sin(angle);
    });

    return laidOut;
  }, [baseGraphData]);

  // --- zoom to fit when visible graph changes ---
  useEffect(() => {
    if (!fgRef.current || !finalGraphData.nodes.length) return;

    const t = setTimeout(() => {
      try {
        fgRef.current.zoomToFit(500, 80);
      } catch {}
    }, 300);

    return () => clearTimeout(t);
  }, [finalGraphData]);

  // --- expand children on click ---
  const handleNodeClick = (node) => {
    const nodeId = node.id;

    if (onSelect) {
      const original = nodes.find((n) => n.id === nodeId);
      onSelect(original?.id || nodeId);
    }

    setVisibleIds((prev) => {
      const next = new Set(prev);
      const alreadyExpanded =
        next.has(nodeId) && (childrenMap.get(nodeId) || []).every((c) => next.has(c));
      if (alreadyExpanded) return next;

      next.add(nodeId);
      const children = childrenMap.get(nodeId) || [];
      children.forEach((childId) => {
        if (nodeMap.has(childId)) next.add(childId);
      });
      return next;
    });
  };

  if (!nodes.length) {
    return (
      <div className="h-80 flex items-center justify-center text-sm text-gray-500 bg-white rounded-lg border border-gray-200">
        No concepts yet for this week.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800 flex items-center justify-between">
        <span>Concept map</span>
        <span className="text-xs text-gray-500">
          Core concepts first • click to expand related sub‑concepts
        </span>
      </div>

      <div className="h-[420px] bg-gradient-to-b from-gray-50 to-white">
        <ForceGraph2D
          ref={fgRef}
          graphData={finalGraphData}   // <-- use laid-out data
          dagMode={null}
          dagLevelDistance={null}
          d3VelocityDecay={1}
          cooldownTicks={0}
          enableZoomInteraction
          enablePanInteraction
          enableNodeDrag={false}       // fx/fy fix positions; dragging off for now
          onNodeClick={handleNodeClick}
          linkWidth={1.5}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={0.97}
          linkColor={() => 'rgba(148,163,184,0.75)'}
          linkCurvature={0.15}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const radius = 12 / Math.sqrt(globalScale);

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = node.isRoot ? '#3b82f6' : '#6366f1';
            ctx.fill();
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = node.isRoot ? '#f97316' : '#1e40af';
            ctx.stroke();

            const label = node.name || node.id;
            const fontSize = 11 / Math.sqrt(globalScale);
            if (fontSize < 7) return;

            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#111827';
            ctx.fillText(label, node.x, node.y + radius + 2);
          }}
        />
      </div>
    </div>
  );
}
