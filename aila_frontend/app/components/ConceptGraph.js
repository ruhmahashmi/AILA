// components/ConceptGraph.js
"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const styles = TYPE_STYLES[typeKey] || TYPE_STYLES.concept;
  const labelLen = (data.label || '').length;
  const minW = Math.max(150, labelLen * 8 + 32);

  return (
    <div
      className={`px-4 py-3 shadow-md rounded-xl border-2 text-center transition-all cursor-pointer hover:shadow-lg ${styles.card}`}
      style={{ minWidth: minW }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />

      <div className="font-bold text-sm mb-1 leading-snug">{data.label}</div>

      {data.isRoot && (
        <div className="text-[10px] uppercase tracking-wider opacity-80">Main Topic</div>
      )}
      {!data.isRoot && styles.badge && (
        <div className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${styles.badge}`}>
          {TYPE_LABELS[typeKey] || typeKey}
        </div>
      )}
      {data.quizCount > 0 && (
        <div className="text-[9px] mt-1 bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full inline-block ml-1">
          {data.quizCount}Q
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
};

// --- LEGEND COMPONENT ---
const GraphLegend = () => (
  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-3 rounded-xl shadow border border-slate-200 text-xs z-10">
    <p className="font-bold text-slate-700 mb-2 text-[11px] uppercase tracking-wider">Node Types</p>
    {[
      { type: 'algorithm', color: 'bg-blue-500',   label: 'Algorithm' },
      { type: 'structure', color: 'bg-purple-500', label: 'Structure' },
      { type: 'concept',   color: 'bg-slate-400',  label: 'Concept'   },
      { type: 'detail',    color: 'bg-gray-400',   label: 'Detail'    },
      { type: 'example',   color: 'bg-green-500',  label: 'Example'   },
    ].map(({ color, label }) => (
      <div key={label} className="flex items-center gap-2 mb-1">
        <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
        <span className="text-slate-600">{label}</span>
      </div>
    ))}
  </div>
);

const nodeTypes = { concept: ConceptNode };

// --- LAYOUT ENGINE (DAGRE) ---
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Dynamic width based on label length (~8px per char + padding)
    const labelLen = (node.data?.label || node.id || '').length;
    const nodeWidth = Math.max(180, labelLen * 8 + 32);
    dagreGraph.setNode(node.id, { width: nodeWidth, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      // Shift position to center (Dagre gives center, React Flow needs top-left)
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function ConceptGraph({ nodes = [], edges = [], onSelect }) {
  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null); // detail panel state

  // 1. Convert Data & Apply Layout
  useEffect(() => {
    if (nodes.length === 0) return;

    // A. Transform to React Flow format
    const initialNodes = nodes.map(n => ({
      id: n.id,
      type: 'concept', // Use our custom card component
      data: {
        label:     n.label || n.id,
        isRoot:    n.isRoot,
        type:      n.type || 'concept',
        summary:   n.summary   || null,
        contents:  n.contents  || null,
        slide_nums: n.slide_nums || [],
        quizCount: n.quizCount || 0,
      },
      position: { x: 0, y: 0 } // Placeholder, will be fixed by dagre
    }));

    const initialEdges = edges.map((e, i) => ({
      id: `e${i}`,
      source: typeof e.source === 'object' ? e.source.id : e.source,
      target: typeof e.target === 'object' ? e.target.id : e.target,
      type: 'smoothstep',
      animated: true,
      label: (e.relation && e.relation !== 'related concept' && e.relation !== 'topic') ? e.relation : undefined,
      labelStyle: { fontSize: 9, fill: '#64748b' },
      labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 },
      labelBgPadding: [3, 2],
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    }));

    // B. Calculate Layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  // 2. Click Handler — opens detail panel + fires onSelect for parent
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node.data);
    if (onSelect) onSelect(node.id);
  }, [onSelect]);

  const closePanel = useCallback(() => setSelectedNode(null), []);

  return (
    <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative">

      {/* DETAIL PANEL — slides in from the right when a node is selected */}
      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className={`px-4 py-3 flex items-start justify-between border-b border-slate-100
            ${selectedNode.isRoot ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
            <div className="flex-1 pr-2">
              <p className="font-bold text-sm leading-snug">{selectedNode.label}</p>
              {selectedNode.type && !selectedNode.isRoot && (
                <p className="text-[10px] uppercase tracking-widest mt-0.5 opacity-60">
                  {selectedNode.type}
                </p>
              )}
            </div>
            <button
              onClick={closePanel}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-lg leading-none
                ${selectedNode.isRoot ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
            >
              ×
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">

            {/* Summary */}
            {selectedNode.summary && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Summary</p>
                <p className="text-slate-700 leading-relaxed">{selectedNode.summary}</p>
              </div>
            )}

            {/* Slide numbers */}
            {selectedNode.slide_nums && selectedNode.slide_nums.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Slides</p>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.slide_nums.map(n => (
                    <span key={n} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                      #{n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Slide content excerpt */}
            {selectedNode.contents && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">From Slides</p>
                <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed max-h-64 overflow-y-auto font-sans">
                  {selectedNode.contents}
                </pre>
              </div>
            )}

            {/* Quiz coverage */}
            {selectedNode.quizCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-amber-800 text-xs font-semibold">
                  {selectedNode.quizCount} quiz question{selectedNode.quizCount !== 1 ? 's' : ''} target this concept
                </p>
              </div>
            )}

            {!selectedNode.summary && !selectedNode.contents && (
              <p className="text-slate-400 italic text-xs">No additional details available for this concept.</p>
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
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1} // Allow zooming out far
        attributionPosition="bottom-right"
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls className="!bg-white !border-slate-200 !shadow-sm !text-slate-600" />
        <MiniMap 
            nodeColor={n => n.data.isRoot ? '#4f46e5' : '#e2e8f0'} 
            maskColor="rgba(241, 245, 249, 0.7)"
            className="!bg-white !border-slate-200"
        />
        
        {/* Helper Badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-500">
           <p className="font-semibold text-slate-700 mb-1">Interactive Map</p>
           <p>• Drag nodes to reorganize</p>
           <p>• Scroll to zoom</p>
           <p>• Click to view details</p>
        </div>
        <GraphLegend />
      </ReactFlow>
    </div>
  );
}