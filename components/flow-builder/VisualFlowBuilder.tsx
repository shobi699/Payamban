"use client";

import React, { useState, useRef, useCallback } from "react";
import { FlowNode, FlowEdge, FlowNodeType } from "./types";

interface VisualFlowBuilderProps {
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];
  scenarioName?: string;
  onSave?: (nodes: FlowNode[], edges: FlowEdge[], name: string) => void;
}

const DEFAULT_NODES: FlowNode[] = [
  {
    id: "node_trigger",
    type: "TRIGGER",
    x: 60,
    y: 120,
    data: {
      title: "شروع: کامنت اینستاگرام",
      subtitle: "کلمه کلیدی: تخفیف / قیمت",
      triggerKeyword: "تخفیف",
      triggerType: "COMMENT",
      description: "با ارسال کامنت حاوی کلمه کلیدی توسط کاربر فعال می‌شود",
    },
  },
  {
    id: "node_condition",
    type: "CONDITION_FOLLOW",
    x: 360,
    y: 120,
    data: {
      title: "بررسی شرط فالو",
      subtitle: "آیا پیج را دنبال کرده است؟",
      description: "تفكیك کاربران بر اساس وضعیت فالوور بودن",
    },
  },
  {
    id: "node_dm_followed",
    type: "DIRECT_MESSAGE",
    x: 660,
    y: 50,
    data: {
      title: "ارسال دایرکت تخفیف ویژه",
      subtitle: "کد تخفیف اختصاصی ۳۰٪",
      messageText: "سلام دوست عزیز! ممنون که ما رو فالو داری، اینم کد تخفیف ۳۰٪ ویژه شما: PAYAMBAN30",
      humanDelaySeconds: 4,
    },
  },
  {
    id: "node_dm_not_followed",
    type: "DIRECT_MESSAGE",
    x: 660,
    y: 280,
    data: {
      title: "دعوت به فالو",
      subtitle: "پیام تشویق به دنبال کردن",
      messageText: "سلام عزیزم! کد تخفیف فقط برای فالوورهای پیج فعاله. لطفا پیج رو فالو کن تا کد برات ارسال بشه!",
      humanDelaySeconds: 2,
    },
  },
  {
    id: "node_lead",
    type: "LEAD_FORM",
    x: 960,
    y: 50,
    data: {
      title: "فرم دریافت شماره موبایل",
      subtitle: "ارسال پیامک تایید با کاوه‌نگار",
      description: "دریافت موبایل برای ارسال پیامک پیگیری خودکار",
      formFields: [
        { name: "mobile", label: "شماره موبایل", required: true },
        { name: "fullname", label: "نام و نام خانوادگی", required: false },
      ],
    },
  },
];

const DEFAULT_EDGES: FlowEdge[] = [
  {
    id: "edge_1",
    sourceNodeId: "node_trigger",
    targetNodeId: "node_condition",
  },
  {
    id: "edge_2",
    sourceNodeId: "node_condition",
    targetNodeId: "node_dm_followed",
    label: "فالو دارد ✓",
  },
  {
    id: "edge_3",
    sourceNodeId: "node_condition",
    targetNodeId: "node_dm_not_followed",
    label: "فالو ندارد ✕",
  },
  {
    id: "edge_4",
    sourceNodeId: "node_dm_followed",
    targetNodeId: "node_lead",
  },
];

const NODE_TYPE_CONFIG: Record<
  FlowNodeType,
  { label: string; icon: string; color: string; border: string; bg: string }
> = {
  TRIGGER: {
    label: "محرک (تریگر)",
    icon: "⚡",
    color: "text-amber-400",
    border: "border-amber-500/40",
    bg: "bg-amber-950/20",
  },
  CONDITION_FOLLOW: {
    label: "شرط فالوور",
    icon: "🔀",
    color: "text-purple-400",
    border: "border-purple-500/40",
    bg: "bg-purple-950/20",
  },
  DIRECT_MESSAGE: {
    label: "ارسال دایرکت",
    icon: "💬",
    color: "text-blue-400",
    border: "border-blue-500/40",
    bg: "bg-blue-950/20",
  },
  BUTTONS: {
    label: "دکمه‌های شیشه‌ای",
    icon: "🔘",
    color: "text-emerald-400",
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/20",
  },
  LEAD_FORM: {
    label: "دریافت لید و پیامک",
    icon: "📋",
    color: "text-pink-400",
    border: "border-pink-500/40",
    bg: "bg-pink-950/20",
  },
  AI_AGENT: {
    label: "پاسخگوی هوش مصنوعی",
    icon: "🤖",
    color: "text-cyan-400",
    border: "border-cyan-500/40",
    bg: "bg-cyan-950/20",
  },
  PRODUCT_SHOWCASE: {
    label: "ویترین کالا و پرداخت",
    icon: "🛍️",
    color: "text-emerald-400",
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/20",
  },
};

export function VisualFlowBuilder({
  initialNodes = DEFAULT_NODES,
  initialEdges = DEFAULT_EDGES,
  scenarioName = "سناریوی کمپین جذب مشتری خودکار",
  onSave,
}: VisualFlowBuilderProps) {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialEdges);
  const [name, setName] = useState<string>(scenarioName);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node_trigger");
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSavedBanner, setIsSavedBanner] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Node Drag handlers
  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    setDraggingNodeId(id);
    const node = nodes.find((n) => n.id === id);
    if (node) {
      setDragOffset({
        x: e.clientX - node.x * zoomLevel,
        y: e.clientY - node.y * zoomLevel,
      });
    }
  };

  const handleMouseMoveCanvas = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNodeId) return;
      const newX = Math.max(10, Math.round((e.clientX - dragOffset.x) / zoomLevel));
      const newY = Math.max(10, Math.round((e.clientY - dragOffset.y) / zoomLevel));

      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
      );
    },
    [draggingNodeId, dragOffset, zoomLevel]
  );

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
  };

  // Connect port handler
  const handlePortClick = (nodeId: string, isOutput: boolean) => {
    if (isOutput) {
      setConnectingSourceId(nodeId);
    } else {
      if (connectingSourceId && connectingSourceId !== nodeId) {
        // Create new edge if not existing
        const exists = edges.some(
          (e) => e.sourceNodeId === connectingSourceId && e.targetNodeId === nodeId
        );
        if (!exists) {
          const newEdge: FlowEdge = {
            id: `edge_${Date.now()}`,
            sourceNodeId: connectingSourceId,
            targetNodeId: nodeId,
          };
          setEdges((prev) => [...prev, newEdge]);
        }
        setConnectingSourceId(null);
      }
    }
  };

  // Add new Node
  const addNewNode = (type: FlowNodeType) => {
    const id = `node_${type.toLowerCase()}_${Date.now()}`;
    const cfg = NODE_TYPE_CONFIG[type];
    const newNode: FlowNode = {
      id,
      type,
      x: 200 + Math.random() * 100,
      y: 150 + Math.random() * 100,
      data: {
        title: cfg.label,
        subtitle: "تنظیمات پیش‌فرض",
        description: `نود ${cfg.label} در سناریوی تعاملی`,
        messageText: type === "DIRECT_MESSAGE" ? "متن پیام دایرکت شما در اینجا قرار می‌گیرد." : undefined,
        humanDelaySeconds: 3,
        aiPrompt: type === "AI_AGENT" ? "پاسخ دوستانه و مودبانه به سوالات مشتری در خصوص قیمت و ارسال" : undefined,
        productTitle: type === "PRODUCT_SHOWCASE" ? "دوره جامع اینستاگرام مارکتینگ" : undefined,
        productPrice: type === "PRODUCT_SHOWCASE" ? 490000 : undefined,
      },
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  // Delete Node
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter((e) => e.sourceNodeId !== selectedNodeId && e.targetNodeId !== selectedNodeId)
    );
    setSelectedNodeId(null);
  };

  // Update selected node data
  const updateSelectedNodeData = (patch: Partial<FlowNode["data"]>) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n))
    );
  };

  // Save Flow
  const handleSave = () => {
    if (onSave) {
      onSave(nodes, edges, name);
    }
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 4000);
  };

  // SVG curved path calculation
  const getEdgePath = (edge: FlowEdge) => {
    const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId);
    const targetNode = nodes.find((n) => n.id === edge.targetNodeId);
    if (!sourceNode || !targetNode) return "";

    const NODE_WIDTH = 240;
    const NODE_HEIGHT = 100;

    // RTL: source port on left, target port on right
    const startX = sourceNode.x + NODE_WIDTH;
    const startY = sourceNode.y + NODE_HEIGHT / 2;
    const endX = targetNode.x;
    const endY = targetNode.y + NODE_HEIGHT / 2;

    const dx = Math.abs(endX - startX) * 0.5;
    return `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] min-h-[640px] bg-background text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden select-none" dir="rtl">
      {/* Top Action & Navigation Bar */}
      <div className="h-14 border-b border-border/60 bg-surface/90 backdrop-blur px-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-sm font-bold shadow-sm">
            ⚡
          </div>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-accent rounded px-1.5 py-0.5"
            />
            <p className="text-[10px] text-muted px-1.5">سازنده سناریوی هوشمند جریان مکالمه اینستاگرام</p>
          </div>
        </div>

        {/* Center / Action Buttons */}
        <div className="flex items-center gap-2">
          {isSavedBanner && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full animate-fade-in flex items-center gap-1.5">
              <span>✓</span> سناریو با موفقیت ذخیره شد
            </span>
          )}

          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-foreground transition shadow-sm"
          >
            <span>📱</span>
            <span>پیش‌نمایش در اینستاگرام</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold transition shadow-md shadow-accent/20"
          >
            <span>💾</span>
            <span>ذخیره سناریو</span>
          </button>
        </div>

        {/* Zoom & Canvas Controls */}
        <div className="flex items-center gap-1 bg-surface-hover/80 p-1 rounded-xl border border-border/60 text-xs">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
            className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-muted hover:text-foreground font-bold"
            title="کوچک‌نمایی"
          >
            -
          </button>
          <span className="font-mono text-[11px] px-1.5 text-muted min-w-[40px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
            className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-muted hover:text-foreground font-bold"
            title="بزرگ‌نمایی"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-2 h-7 rounded-lg hover:bg-surface text-[10px] text-muted hover:text-foreground"
            title="بازنشانی اندازه"
          >
            ۱۰۰٪
          </button>
        </div>
      </div>

      {/* Main Workspace (Palette + Infinite Canvas + Properties Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar: Node Palette */}
        <div className="w-56 border-s border-border/50 bg-surface/80 backdrop-blur p-3.5 flex flex-col gap-2 z-10 overflow-y-auto">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1 px-1">
            افزودن مرحله جدید:
          </p>
          {(Object.keys(NODE_TYPE_CONFIG) as FlowNodeType[]).map((type) => {
            const cfg = NODE_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => addNewNode(type)}
                className="w-full text-right p-2.5 rounded-xl border border-border/70 hover:border-accent/50 bg-surface hover:bg-surface-hover transition-all flex items-center gap-2.5 shadow-sm group"
              >
                <span className="text-base p-1.5 rounded-lg bg-surface-hover border border-border/40 group-hover:scale-110 transition-transform">
                  {cfg.icon}
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
                    {cfg.label}
                  </p>
                </div>
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-border/40 text-[11px] text-muted leading-relaxed px-1">
            <span className="font-bold text-foreground">💡 راهنمای اتصال:</span>
            <p className="mt-1">
              برای وصل کردن دو نود، روی دایره خروجی نود مبدا کلیک کنید و سپس روی نود مقصد بزنید.
            </p>
          </div>
        </div>

        {/* Central Canvas with Interactive Nodes & SVG Edges */}
        <div
          ref={canvasRef}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          className="flex-1 relative overflow-auto bg-slate-950/60 cursor-crosshair"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
          }}
        >
          {/* Zoom scaling wrapper */}
          <div
            className="w-[3000px] h-[2000px] relative origin-top-left"
            style={{ transform: `scale(${zoomLevel})` }}
            onClick={() => setConnectingSourceId(null)}
          >
            {/* SVG Connecting Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              {edges.map((edge) => {
                const pathData = getEdgePath(edge);
                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer group">
                    <path
                      d={pathData}
                      fill="none"
                      stroke="url(#edgeGradient)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      className="opacity-80 group-hover:opacity-100 group-hover:stroke-accent transition"
                    />
                    {edge.label && (
                      <text
                        fill="#cbd5e1"
                        fontSize="11"
                        textAnchor="middle"
                        className="font-medium bg-black/80 px-2 py-0.5 rounded shadow"
                      >
                        <textPath href={`#${edge.id}`} startOffset="50%">
                          {edge.label}
                        </textPath>
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Render Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isConnecting = connectingSourceId === node.id;
              const cfg = NODE_TYPE_CONFIG[node.type];

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingSourceId && connectingSourceId !== node.id) {
                      handlePortClick(node.id, false);
                    }
                  }}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  className={`absolute w-60 rounded-2xl border p-4 shadow-xl transition-shadow cursor-move z-10 ${
                    cfg.bg
                  } ${
                    isSelected
                      ? "ring-2 ring-accent border-accent shadow-accent/20"
                      : isConnecting
                      ? "ring-2 ring-amber-400 border-amber-400 animate-pulse"
                      : `${cfg.border} hover:border-border`
                  } bg-surface/95 backdrop-blur`}
                >
                  {/* Left Target Connection Port */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePortClick(node.id, false);
                    }}
                    title="پورت ورودی اتصال"
                    className="absolute -start-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 border-accent hover:scale-125 transition flex items-center justify-center cursor-pointer shadow-md"
                  >
                    <span className="w-2 h-2 rounded-full bg-accent" />
                  </div>

                  {/* Header of Node */}
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cfg.icon}</span>
                      <h4 className="text-xs font-bold text-foreground truncate max-w-[140px]">
                        {node.data.title}
                      </h4>
                    </div>
                    <span className={`text-[10px] font-bold ${cfg.color}`}>
                      {cfg.label.split(" ")[0]}
                    </span>
                  </div>

                  {/* Body description */}
                  <div className="pt-2.5 space-y-1.5">
                    {node.data.subtitle && (
                      <p className="text-[11px] font-semibold text-foreground/90 truncate">
                        {node.data.subtitle}
                      </p>
                    )}
                    {node.data.messageText && (
                      <p className="text-[10px] text-muted line-clamp-2 bg-surface-hover/50 p-1.5 rounded-lg border border-border/30">
                        {node.data.messageText}
                      </p>
                    )}
                    {node.data.triggerKeyword && (
                      <span className="inline-block font-mono text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        کلمه: {node.data.triggerKeyword}
                      </span>
                    )}
                  </div>

                  {/* Right Source Connection Port */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePortClick(node.id, true);
                    }}
                    title="کلیک برای برقراری اتصال به مرحله بعدی"
                    className="absolute -end-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 border-purple-400 hover:scale-125 transition flex items-center justify-center cursor-pointer shadow-md"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar: Node Properties Inspector */}
        <div className="w-80 border-e border-border/50 bg-surface/90 backdrop-blur p-5 flex flex-col gap-5 z-10 overflow-y-auto">
          {selectedNode ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{NODE_TYPE_CONFIG[selectedNode.type].icon}</span>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      تنظیمات مرحله ({NODE_TYPE_CONFIG[selectedNode.type].label})
                    </h3>
                    <p className="text-[10px] text-muted font-mono">{selectedNode.id}</p>
                  </div>
                </div>
                <button
                  onClick={deleteSelectedNode}
                  className="w-7 h-7 rounded-lg hover:bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs transition"
                  title="حذف این مرحله"
                >
                  ✕
                </button>
              </div>

              {/* General Title */}
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  عنوان نمایشی مرحله:
                </label>
                <input
                  type="text"
                  value={selectedNode.data.title}
                  onChange={(e) => updateSelectedNodeData({ title: e.target.value })}
                  className="w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs text-foreground focus:border-accent outline-none"
                />
              </div>

              {/* Specific Editors per type */}
              {selectedNode.type === "TRIGGER" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      کلمه کلیدی فعال‌ساز (Trigger Keyword):
                    </label>
                    <input
                      type="text"
                      value={selectedNode.data.triggerKeyword ?? ""}
                      onChange={(e) =>
                        updateSelectedNodeData({
                          triggerKeyword: e.target.value,
                          subtitle: `کلمه کلیدی: ${e.target.value}`,
                        })
                      }
                      placeholder="مثلاً: تخفیف، قیمت، لینک"
                      className="w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs font-mono text-foreground focus:border-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      نوع ورودی:
                    </label>
                    <select
                      value={selectedNode.data.triggerType ?? "COMMENT"}
                      onChange={(e) =>
                        updateSelectedNodeData({
                          triggerType: e.target.value as "COMMENT" | "STORY_MENTION" | "DIRECT_INBOX",
                        })
                      }
                      className="w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs text-foreground focus:border-accent outline-none"
                    >
                      <option value="COMMENT">کامنت زیر پست یا ریلز اینستاگرام</option>
                      <option value="STORY_MENTION">منشن شدن در استوری مخاطب</option>
                      <option value="DIRECT_INBOX">ارسال پیام مستقیم در دایرکت</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedNode.type === "DIRECT_MESSAGE" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      متن پیام ارسالی در دایرکت:
                    </label>
                    <textarea
                      rows={4}
                      value={selectedNode.data.messageText ?? ""}
                      onChange={(e) => updateSelectedNodeData({ messageText: e.target.value })}
                      placeholder="متن پیام دایرکت را اینجا وارد نمایید..."
                      className="w-full rounded-xl bg-surface border border-border p-3 text-xs text-foreground focus:border-accent outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      شبیه‌سازی تاخیر انسانی (ثانیه):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={selectedNode.data.humanDelaySeconds ?? 3}
                      onChange={(e) =>
                        updateSelectedNodeData({ humanDelaySeconds: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs font-mono text-foreground focus:border-accent outline-none"
                    />
                    <p className="text-[10px] text-muted mt-1">
                      جلوگیری از تشخیص اسپم توسط الگوریتم‌های متا
                    </p>
                  </div>
                </div>
              )}

              {selectedNode.type === "AI_AGENT" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      دستورالعمل لحن و دانش هوش مصنوعی (System Prompt):
                    </label>
                    <textarea
                      rows={5}
                      value={selectedNode.data.aiPrompt ?? ""}
                      onChange={(e) => updateSelectedNodeData({ aiPrompt: e.target.value })}
                      placeholder="دستورالعمل پاسخگویی خودکار..."
                      className="w-full rounded-xl bg-surface border border-border p-3 text-xs text-foreground focus:border-accent outline-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === "PRODUCT_SHOWCASE" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      نام محصول / بسته:
                    </label>
                    <input
                      type="text"
                      value={selectedNode.data.productTitle ?? ""}
                      onChange={(e) => updateSelectedNodeData({ productTitle: e.target.value })}
                      className="w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs text-foreground focus:border-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      مبلغ فروش (تومان):
                    </label>
                    <input
                      type="number"
                      value={selectedNode.data.productPrice ?? 0}
                      onChange={(e) =>
                        updateSelectedNodeData({ productPrice: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs font-mono text-foreground focus:border-accent outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-border/40">
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs transition shadow-sm"
                >
                  اعمال و به‌روزرسانی نود
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted">
              <span className="text-3xl mb-2">👆</span>
              <p className="text-xs">یک مرحله را در صفحه انتخاب کنید تا ویژگی‌های آن ویرایش شود.</p>
            </div>
          )}
        </div>
      </div>

      {/* Instagram Live Simulator Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-border/80 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute top-4 start-4 text-muted hover:text-white text-sm"
            >
              ✕ بستن
            </button>
            <div className="text-center pb-4 border-b border-border/40">
              <p className="text-[10px] text-muted uppercase tracking-wider">Instagram Direct Preview</p>
              <h4 className="text-xs font-bold text-foreground mt-0.5">شبیه‌ساز مکالمه در دایرکت</h4>
            </div>

            {/* Direct messages simulated thread */}
            <div className="py-6 space-y-3 max-h-[420px] overflow-y-auto">
              <div className="flex justify-start">
                <div className="bg-surface-hover border border-border/60 text-foreground px-3.5 py-2 rounded-2xl rounded-tr-sm text-xs max-w-[80%] shadow-sm">
                  تخفیف پیج چقدره؟ 🛍️
                </div>
              </div>

              {nodes
                .filter((n) => n.type === "DIRECT_MESSAGE")
                .map((dm) => (
                  <div key={dm.id} className="flex justify-end">
                    <div className="bg-accent text-white px-3.5 py-2 rounded-2xl rounded-tl-sm text-xs max-w-[85%] leading-relaxed shadow-sm">
                      {dm.data.messageText}
                    </div>
                  </div>
                ))}
            </div>

            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground text-xs font-semibold border border-border mt-3"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
