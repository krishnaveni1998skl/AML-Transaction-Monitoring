import React, { useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  User,
  CreditCard,
  Building,
  Info
} from 'lucide-react';
import { formatINR, formatCompactINR } from '../../utils/formatters.js';

export const NetworkGraphCanvas = ({
  nodes = [],
  edges = [],
  onSelectNode,
  selectedNodeId = null
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Compute node positions using deterministic hierarchical / force-directed spacing
  const nodePositions = useMemo(() => {
    const pos = new Map();
    if (nodes.length === 0) return pos;

    const width = 850;
    const height = 480;

    // Check if there is a linear chain or layering structure
    const seed = nodes.find((n) => n.isSeed) || nodes[0];
    const n = nodes.length;

    if (n === 1) {
      pos.set(seed.id, { x: width / 2, y: height / 2 });
      return pos;
    }

    // Assign layers based on incoming/outgoing edges (BFS ranks)
    const inDegrees = new Map();
    nodes.forEach((node) => inDegrees.set(node.id, 0));
    edges.forEach((e) => inDegrees.set(e.target, (inDegrees.get(e.target) || 0) + 1));

    // Arrange in 3 to 4 horizontal flow columns
    const columns = [[], [], [], []];
    nodes.forEach((node, i) => {
      const colIndex = i % 4;
      columns[colIndex].push(node);
    });

    columns.forEach((col, cIdx) => {
      const x = 120 + cIdx * 210;
      const count = col.length;
      col.forEach((node, rIdx) => {
        const y = height / (count + 1) * (rIdx + 1);
        pos.set(node.id, { x, y });
      });
    });

    return pos;
  }, [nodes, edges]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getNodeColor = (category) => {
    switch (category) {
      case 'CRITICAL':
        return { border: '#f43f5e', fill: '#881337', badge: 'bg-rose-500/20 text-rose-300' };
      case 'HIGH':
        return { border: '#f97316', fill: '#7c2d12', badge: 'bg-orange-500/20 text-orange-300' };
      case 'MEDIUM':
        return { border: '#eab308', fill: '#713f12', badge: 'bg-yellow-500/20 text-yellow-300' };
      default:
        return { border: '#10b981', fill: '#064e3b', badge: 'bg-emerald-500/20 text-emerald-300' };
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl border border-slate-800 bg-slate-950 overflow-hidden select-none">
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-lg backdrop-blur">
        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Legend Overlay */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 backdrop-blur">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> High
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Low
        </span>
        <span className="flex items-center gap-1 border-l border-slate-700 pl-2">
          <span className="h-0.5 w-3 bg-rose-500" /> Suspicious Flow
        </span>
      </div>

      {/* SVG Canvas */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Default Arrow */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="28"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>

          {/* Suspicious Alert Arrow */}
          <marker
            id="arrow-suspicious"
            viewBox="0 0 10 10"
            refX="28"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges (Transaction Links) */}
          {edges.map((edge) => {
            const srcPos = nodePositions.get(edge.source);
            const tgtPos = nodePositions.get(edge.target);
            if (!srcPos || !tgtPos) return null;

            const isSusp = edge.isSuspicious || edge.hasAlert;
            const midX = (srcPos.x + tgtPos.x) / 2;
            const midY = (srcPos.y + tgtPos.y) / 2;

            return (
              <g key={edge.id} className="group">
                <line
                  x1={srcPos.x}
                  y1={srcPos.y}
                  x2={tgtPos.x}
                  y2={tgtPos.y}
                  stroke={isSusp ? '#f43f5e' : '#475569'}
                  strokeWidth={isSusp ? 2.5 : 1.5}
                  strokeDasharray={isSusp ? '6,3' : 'none'}
                  markerEnd={isSusp ? 'url(#arrow-suspicious)' : 'url(#arrow)'}
                  className="transition"
                />

                {/* Amount Label on Edge */}
                <rect
                  x={midX - 35}
                  y={midY - 10}
                  width={70}
                  height={18}
                  rx={4}
                  fill="#0f172a"
                  stroke={isSusp ? '#f43f5e' : '#334155'}
                  strokeWidth={1}
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fill={isSusp ? '#fda4af' : '#94a3b8'}
                  fontSize={10}
                  fontFamily="monospace"
                  fontWeight={isSusp ? 'bold' : 'normal'}
                >
                  {formatCompactINR(edge.normalizedAmountINR)}
                </text>
              </g>
            );
          })}

          {/* Nodes (Accounts / Customers) */}
          {nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const colors = getNodeColor(node.riskCategory);
            const isSelected = selectedNodeId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                className="cursor-pointer group"
              >
                {/* Node Box */}
                <rect
                  x={-75}
                  y={-32}
                  width={150}
                  height={64}
                  rx={10}
                  fill="#0f172a"
                  stroke={isSelected ? '#38bdf8' : colors.border}
                  strokeWidth={isSelected ? 3 : node.isSeed ? 2.5 : 1.5}
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))"
                  className="transition group-hover:stroke-sky-400"
                />

                {/* Risk Pip */}
                <circle
                  cx={-58}
                  cy={-16}
                  r={4}
                  fill={colors.border}
                />

                {/* Label (Name) */}
                <text
                  x={-48}
                  y={-12}
                  fill="#f8fafc"
                  fontSize={11}
                  fontWeight="bold"
                  className="truncate"
                >
                  {node.label.length > 15 ? `${node.label.slice(0, 15)}...` : node.label}
                </text>

                {/* Account Number */}
                <text
                  x={-48}
                  y={4}
                  fill="#94a3b8"
                  fontSize={9.5}
                  fontFamily="monospace"
                >
                  {node.accountNumber.length > 17 ? `${node.accountNumber.slice(0, 17)}...` : node.accountNumber}
                </text>

                {/* Bank / Role Subtitle */}
                <text
                  x={-48}
                  y={19}
                  fill="#64748b"
                  fontSize={9}
                >
                  {node.bankName.length > 18 ? `${node.bankName.slice(0, 18)}...` : node.bankName}
                </text>

                {/* Alert Badge Indicator */}
                {node.alertCount > 0 && (
                  <g transform="translate(60, -22)">
                    <circle cx={0} cy={0} r={8} fill="#f43f5e" />
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={9}
                      fontWeight="bold"
                    >
                      {node.alertCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default NetworkGraphCanvas;
