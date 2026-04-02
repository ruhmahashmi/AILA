// components/ConceptGraph.js
"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  Handle, 
  Position,
  MarkerType 
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

// --- TYPE → STYLE MAP ---
const TYPE_STYLES = {
  root:      { card: 'bg-indigo-600 border-indigo-500 text-white',       badge: null },
  algorithm: { card: 'bg-blue-50   border-blue-500   text-blue-900',     badge: 'bg-blue-500 text-white' },
  structure: { card: 'bg-purple-50 border-purple-500 text-purple-900',   badge: 'bg-purple-500 text-white' },
  concept:   { card: 'bg-white     border-slate-300  text-slate-700',     badge: 'bg-slate-400 text-white' },
  detail:    { card: 'bg-gray-50   border-gray-300   text-gray-600',      badge: 'bg-gray-400 text-white' },
  example:   { card: 'bg-green-50  border-green-500  text-green-900',     badge: 'bg-green-500 text-white' },
};

const TYPE_LABELS = {
  algorithm: 'Algorithm',
  structure: 'Structure',
  concept:   'Concept',
  detail:    'Detail',
  example:   'Example',
};

// --- CUSTOM NODE: "Concept Card" ---
const ConceptNode = ({ data }) => {
  const typeKey = data.isRoot ? 'root' : (data.type || 'concept');
  const styles  = TYPE_STYLES[typeKey] || TYPE_STYLES.concept;
  const width   = getNodeWidth(data.label || '');

  const depth = data.slide_depth || (data.inferred ? 3 : 1);
  const depthStyle = depth === 3 ? 'border-dashed opacity-80' : 'border-solid';

  // Compact single badge line: type + coverage + quiz
  const coverageBadge = depth === 3
    ? <span className="text-[9px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">★ AI</span>
    : depth === 2
      ? <span className="text-[9px] bg-sky-100 text-sky-700 font-semibold px-1.5 py-0.5 rounded-full">~</span>
      : null;

  return (
    <div
      className={`px-3 py-2.5 shadow-md rounded-xl border-2 text-center transition-all
        cursor-pointer hover:shadow-lg hover:scale-[1.02] ${styles.card} ${depthStyle}`}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <Handle type="target" position={Position.Top}
        className="!bg-slate-400 !w-2 !h-2 !-top-1" />

      {/* Label */}
      <div className="font-semibold text-[13px] leading-tight">{data.label}</div>

      {/* Badge row — single line, no stacking */}
      {!data.isRoot && (
        <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
          {styles.badge && (
            <span className={`text-[9px] uppercase tracking-widest font-semibold
              px-1.5 py-0.5 rounded-full ${styles.badge}`}>
              {TYPE_LABELS[typeKey] || typeKey}
            </span>
          )}
          {coverageBadge}
          {data.quizCount > 0 && (
            <span className="text-[9px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full">
              {data.quizCount}Q
            </span>
          )}
        </div>
      )}
      {data.isRoot && (
        <div className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">Main Topic</div>
      )}

      <Handle type="source" position={Position.Bottom}
        className="!bg-slate-400 !w-2 !h-2 !-bottom-1" />
    </div>
  );
};

// --- LEGEND COMPONENT ---
const GraphLegend = () => (
  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-3 rounded-xl shadow border border-slate-200 text-xs z-10">
    <p className="font-bold text-slate-700 mb-2 text-[11px] uppercase tracking-wider">Node Types</p>
    {[
      { color: 'bg-blue-500',   label: 'Algorithm' },
      { color: 'bg-purple-500', label: 'Structure' },
      { color: 'bg-slate-400',  label: 'Concept'   },
      { color: 'bg-gray-400',   label: 'Detail'    },
      { color: 'bg-green-500',  label: 'Example'   },
    ].map(({ color, label }) => (
      <div key={label} className="flex items-center gap-2 mb-1">
        <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
        <span className="text-slate-600">{label}</span>
      </div>
    ))}
    <div className="border-t border-slate-100 mt-2 pt-2 space-y-1">
      <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-1">Coverage</p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border-2 border-solid border-slate-400" />
        <span className="text-slate-600">Covered in slides</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border-2 border-solid border-sky-400 opacity-80" />
        <span className="text-sky-700">Mentioned briefly</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border-2 border-dashed border-amber-500 opacity-75" />
        <span className="text-amber-700">Inferred by AI</span>
      </div>
    </div>
  </div>
);

const nodeTypes = { concept: ConceptNode };

// Node dimensions — must match exactly what dagre uses for spacing
const NODE_HEIGHT = 72;
const getNodeWidth = (label = '') => Math.max(160, label.length * 9 + 48);

// --- LAYOUT ENGINE (DAGRE) ---
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir:  direction,
    ranksep:  120,   // vertical gap between levels (was ~40 default)
    nodesep:  80,    // horizontal gap between nodes on same level
    edgesep:  40,    // min gap between edges
    marginx:  40,
    marginy:  40,
  });

  nodes.forEach((node) => {
    const w = getNodeWidth(node.data?.label || node.id || '');
    dagreGraph.setNode(node.id, { width: w, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    const w   = getNodeWidth(node.data?.label || node.id || '');
    return {
      ...node,
      targetPosition: isHorizontal ? 'left'  : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      // Dagre gives center-x/center-y; React Flow needs top-left corner
      position: {
        x: pos.x - w / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function ConceptGraph({ nodes = [], edges = [], onSelect }) {
  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null); // detail panel
  const [focusedId,    setFocusedId]    = useState(null); // focus-mode node id

  // Keep a stable edge-list ref for focus-mode lookups without re-layout
  const edgeListRef = useRef([]);

  // 1. Build layout once when data changes
  useEffect(() => {
    if (nodes.length === 0) return;

    const initialNodes = nodes.map(n => ({
      id: n.id,
      type: 'concept',
      data: {
        label:       n.label || n.id,
        isRoot:      n.isRoot,
        type:        n.type || 'concept',
        summary:     n.summary    || null,
        contents:    n.contents   || null,
        slide_nums:  n.slide_nums || [],
        quizCount:   n.quizCount  || 0,
        inferred:    n.inferred   || false,
        slide_depth: n.slide_depth || (n.inferred ? 3 : 1),
      },
      position: { x: 0, y: 0 },
    }));

    const SILENT_RELATIONS = new Set(['has_part', 'topic', 'related concept', 'related_concept']);

    const initialEdges = edges.map((e, i) => {
      const src      = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt      = typeof e.target === 'object' ? e.target.id : e.target;
      const relation = e.relation || 'has_part';
      const showLabel = !SILENT_RELATIONS.has(relation);
      const isLateral = ['enables','requires','extends','contrasts_with',
                         'precedes','uses','implements','produces','example_of','is_a']
                        .includes(relation);
      return {
        id:     `e${i}-${src}-${tgt}`,
        source: src,
        target: tgt,
        type:   'smoothstep',
        animated: false,
        label:  showLabel ? relation : undefined,
        labelStyle:   { fontSize: 10, fill: isLateral ? '#6366f1' : '#64748b', fontWeight: isLateral ? 600 : 400 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
        labelBgPadding: [4, 3],
        labelBgBorderRadius: 4,
        style: {
          stroke:          isLateral ? '#818cf8' : '#cbd5e1',
          strokeWidth:     isLateral ? 2 : 1.5,
          strokeDasharray: isLateral ? '6 3' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: isLateral ? '#818cf8' : '#cbd5e1', width: 14, height: 14 },
        // store for focus-mode lookups
        _src: src, _tgt: tgt,
      };
    });

    edgeListRef.current = initialEdges;

    const { nodes: ln, edges: le } = getLayoutedElements(initialNodes, initialEdges);
    setNodes(ln);
    setEdges(le);
    setFocusedId(null); // reset focus whenever data reloads
  }, [nodes, edges, setNodes, setEdges]);

  // 2. Focus-mode overlay — runs on every focusedId change WITHOUT re-layout
  useEffect(() => {
    if (rfNodes.length === 0) return;

    if (!focusedId) {
      // Restore everything to full opacity
      setNodes(ns => ns.map(n => ({ ...n, style: { ...n.style, opacity: 1 } })));
      setEdges(es => es.map(e => ({ ...e, style: { ...e.style, opacity: 1 }, animated: false })));
      return;
    }

    // Build set of node IDs that are directly connected to focusedId
    const connected = new Set([focusedId]);
    edgeListRef.current.forEach(e => {
      if (e._src === focusedId) connected.add(e._tgt);
      if (e._tgt === focusedId) connected.add(e._src);
    });

    setNodes(ns => ns.map(n => ({
      ...n,
      style: { ...n.style, opacity: connected.has(n.id) ? 1 : 0.12 },
    })));

    setEdges(es => es.map(e => {
      const active = e._src === focusedId || e._tgt === focusedId;
      return {
        ...e,
        animated: active,
        style: { ...e.style, opacity: active ? 1 : 0.06 },
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId]);

  // 3. Click: toggle focus on the node; also open detail panel
  const onNodeClick = useCallback((event, node) => {
    const clickedId = node.id;
    setSelectedNode(node.data);
    if (onSelect) onSelect(clickedId);
    // Toggle: click same node again to exit focus mode
    setFocusedId(prev => prev === clickedId ? null : clickedId);
  }, [onSelect]);

  // Click on empty canvas — exit focus mode but keep panel open
  const onPaneClick = useCallback(() => {
    setFocusedId(null);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedNode(null);
    setFocusedId(null);
  }, []);

  return (
    <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative">

      {/* DETAIL PANEL */}
      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col overflow-hidden">
          <div className={`px-4 py-3 flex items-start justify-between border-b border-slate-100
            ${selectedNode.isRoot ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
            <div className="flex-1 pr-2">
              <p className="font-bold text-sm leading-snug">{selectedNode.label}</p>
              {selectedNode.type && !selectedNode.isRoot && (
                <p className="text-[10px] uppercase tracking-widest mt-0.5 opacity-60">{selectedNode.type}</p>
              )}
            </div>
            <button onClick={closePanel}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-lg leading-none
                ${selectedNode.isRoot ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {selectedNode.summary && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Summary</p>
                <p className="text-slate-700 leading-relaxed">{selectedNode.summary}</p>
              </div>
            )}
            {!selectedNode.isRoot && (() => {
              const depth = selectedNode.slide_depth || (selectedNode.inferred ? 3 : 1);
              const coverageMap = {
                1: { label: 'Covered in slides',              color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                2: { label: 'Mentioned briefly in slides',    color: 'bg-sky-50     border-sky-200     text-sky-800'     },
                3: { label: 'Inferred by AI — not in slides', color: 'bg-amber-50   border-amber-200   text-amber-800'   },
              };
              const c = coverageMap[depth] || coverageMap[1];
              return <div className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${c.color}`}>{c.label}</div>;
            })()}
            {selectedNode.slide_nums?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Slides</p>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.slide_nums.map(n => (
                    <span key={n} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">#{n}</span>
                  ))}
                </div>
              </div>
            )}
            {selectedNode.contents && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">From Slides</p>
                <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed max-h-64 overflow-y-auto font-sans">
                  {selectedNode.contents}
                </pre>
              </div>
            )}
            {selectedNode.quizCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-amber-800 text-xs font-semibold">
                  {selectedNode.quizCount} quiz question{selectedNode.quizCount !== 1 ? 's' : ''} cover this concept
                </p>
              </div>
            )}
            {!selectedNode.summary && !selectedNode.contents && (
              <p className="text-slate-400 italic text-xs">No additional details available.</p>
            )}
          </div>
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.08}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={24} size={1} variant="dots" />
        <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-xl" showInteractive={false} />
        <MiniMap
          nodeColor={n => n.data?.isRoot ? '#4f46e5' : n.data?.slide_depth === 3 ? '#fbbf24' : '#94a3b8'}
          maskColor="rgba(241,245,249,0.75)"
          className="!bg-white !border-slate-200 !rounded-xl"
          zoomable pannable
        />
        {/* Help hint */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1.5
          rounded-lg shadow-sm border border-slate-200 text-[10px] text-slate-400 leading-relaxed pointer-events-none">
          <span className="font-semibold text-slate-600">Concept Map</span>
          &nbsp;&middot;&nbsp;click to focus &nbsp;&middot;&nbsp;click again or tap canvas to reset
        </div>
        {focusedId && (
          <div className="absolute top-3 right-3 z-10 bg-indigo-600 text-white text-[10px] font-semibold
            px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
            Focus mode · tap canvas to exit
          </div>
        )}
        <GraphLegend />
      </ReactFlow>
    </div>
  );
}