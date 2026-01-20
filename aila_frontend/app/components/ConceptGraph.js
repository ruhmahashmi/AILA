// components/ConceptGraph.js
"use client";

import { useCallback, useEffect, useMemo } from 'react';
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

// --- CUSTOM NODE: "Concept Card" ---
// This makes the nodes look like modern UI cards instead of basic circles
const ConceptNode = ({ data }) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-xl border-2 min-w-[150px] text-center transition-all
      ${data.isRoot 
        ? 'bg-indigo-600 border-indigo-500 text-white' 
        : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
      }
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
      
      <div className="font-bold text-sm mb-1">{data.label}</div>
      {data.isRoot && <div className="text-[10px] uppercase tracking-wider opacity-80">Main Topic</div>}
      
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
};

const nodeTypes = { concept: ConceptNode };

// --- LAYOUT ENGINE (DAGRE) ---
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // We approximate width/height for layout calculations
    dagreGraph.setNode(node.id, { width: 180, height: 80 });
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

  // 1. Convert Data & Apply Layout
  useEffect(() => {
    if (nodes.length === 0) return;

    // A. Transform to React Flow format
    const initialNodes = nodes.map(n => ({
      id: n.id,
      type: 'concept', // Use our custom card component
      data: { label: n.label || n.id, isRoot: n.isRoot },
      position: { x: 0, y: 0 } // Placeholder, will be fixed by dagre
    }));

    const initialEdges = edges.map((e, i) => ({
      id: `e${i}`,
      source: typeof e.source === 'object' ? e.source.id : e.source,
      target: typeof e.target === 'object' ? e.target.id : e.target,
      type: 'smoothstep', // Nice 90-degree curved lines
      animated: true,
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

  // 2. Click Handler
  const onNodeClick = useCallback((event, node) => {
     if (onSelect) onSelect(node.id);
  }, [onSelect]);

  return (
    <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
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
      </ReactFlow>
    </div>
  );
}