// app/components/ConceptGraph.js
'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="h-[420px] flex items-center justify-center text-gray-500">Loading graph...</div>
});

export default function ConceptGraph({ nodes = [], edges = [], onSelect }) {
  const fgRef = useRef(null);
  const [visibleIds, setVisibleIds] = useState(new Set());

  const { nodeMap, childrenMap, importantIds } = useMemo(() => {
    console.log('Building maps: nodes=', nodes.length, 'edges=', edges.length);
    const nMap = new Map();
    const incoming = new Map();
    const cMap = new Map();

    nodes.forEach((n) => {
      const id = n.id?.toString();
      if (id) {
        nMap.set(id, n);
        incoming.set(id, 0);
        cMap.set(id, []);
      }
    });

    edges.forEach((e) => {
      const source = e.source?.toString();
      const target = e.target?.toString();
      if (nMap.has(source) && nMap.has(target)) {
        incoming.set(target, (incoming.get(target) || 0) + 1);
        cMap.get(source).push(target);
      }
    });

    const important = new Set();
    nodes.forEach((n) => {
      const id = n.id?.toString();
      if (!id) return;
      const count = n.count || 0;
      const inc = incoming.get(id) || 0;
      const isRoot = inc === 0 || n.isRoot;
      const isHighCount = count >= 3;
      if (isRoot || n.level === 0 || isHighCount) {
        important.add(id);
      }
    });

    console.log('Important IDs:', important.size, Array.from(important));
    return { nodeMap: nMap, childrenMap: cMap, importantIds: important };
  }, [nodes, edges]);

  useEffect(() => {
    if (importantIds.size > 0) {
      console.log('Resetting visible to important:', importantIds.size);
      setVisibleIds(new Set(importantIds));
    }
  }, [importantIds]);

  const graphData = useMemo(() => {
    if (!nodes.length || !visibleIds.size) {
      return { nodes: [], links: [] };
    }

    const gNodes = [];
    const gLinks = [];

    visibleIds.forEach((id) => {
      const n = nodeMap.get(id);
      if (n) {
        gNodes.push({
          id,
          name: n.label?.slice(0, 25) || id,
          val: Math.max(5, Math.min(25, (n.count || 1) * 1.5)),
          isRoot: !!n.isRoot,
          level: n.level || 0
        });
      }
    });

    edges.forEach((e) => {
      const source = e.source?.toString();
      const target = e.target?.toString();
      if (visibleIds.has(source) && visibleIds.has(target)) {
        gLinks.push({
          source,
          target,
          relation: e.relation || 'links'
        });
      }
    });

    console.log('Graph data:', gNodes.length, 'nodes,', gLinks.length, 'links');
    return { nodes: gNodes, links: gLinks };
  }, [nodes, edges, nodeMap, visibleIds]);

  const handleNodeClick = useCallback((node) => {
    console.log('Node clicked:', node);
    onSelect?.(node.id);

    setVisibleIds((prev) => {
      const next = new Set(prev);
      const children = childrenMap.get(node.id) || [];
      next.add(node.id);
      children.slice(0, 8).forEach((childId) => {
        if (nodeMap.has(childId)) next.add(childId);
      });
      console.log('Expanded to:', next.size, 'nodes');
      return next;
    });
  }, [onSelect, childrenMap, nodeMap]);

  const handleNodeHover = useCallback((node) => {
    if (fgRef.current) {
      fgRef.current.canvas().style.cursor = node ? 'pointer' : 'default';
    }
  }, []);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      const timeout = setTimeout(() => {
        try {
          fgRef.current?.zoomToFit(400, 50);
        } catch (e) {
          console.log('Zoom failed:', e);
        }
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [graphData]);

  if (!nodes.length) {
    return (
      <div className="h-[420px] flex flex-col items-center justify-center text-sm text-gray-500 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-dashed border-gray-300">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            💡
          </div>
          <p>No concepts extracted yet.</p>
          <p className="text-xs mt-1">Upload lecture slides to generate concept map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[500px] flex flex-col">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            📊 Concept Map ({visibleIds.size}/{nodes.length})
          </span>
          <span className="text-xs text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">
            Click to expand
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[420px] relative bg-gradient-to-br from-slate-50/70 via-white to-indigo-50/30">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.6}
          cooldownTicks={120}
          warmupTicks={50}
          enableZoomInteraction
          enablePanInteraction
          enableNodeDrag={true}
          linkWidth={1.8}
          linkDirectionalParticles={1}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.2}
          linkColor="rgba(99, 102, 241, 0.6)"
          linkOpacity={0.85}
          nodeLabel="name"
          nodeAutoColorBy="level"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const size = node.val * (node.isRoot ? 1.3 : 1);
            const fontSize = Math.max(9, 12 / globalScale);

            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.isRoot 
              ? 'radial-gradient(circle, #3b82f6, #1d4ed8)' 
              : 'radial-gradient(circle, #6366f1, #3730a3)';
            ctx.fill();
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;

            ctx.lineWidth = 1.5 / globalScale;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${fontSize}px system-ui, -apple-system`;
            ctx.fillStyle = globalScale > 0.7 ? '#111827' : '#6b7280';
            ctx.fillText(node.name, node.x, node.y + size + fontSize * 0.6);
            ctx.restore();
          }}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
        
        {graphData.nodes.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/5 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-gray-700 border">
            {graphData.nodes.length} nodes
          </div>
        )}
      </div>
    </div>
  );
}
