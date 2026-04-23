import { useState, useRef, useEffect } from 'react';
import {
  MousePointer2, Pencil, Eraser, Minus, Square, Circle,
  MoveRight, Type, StickyNote, Hand, Trash2, ZoomIn,
  ZoomOut, Maximize2, Download, ChevronDown,
} from 'lucide-react';
import { TOOLS } from '../../hooks/useCanvas';
import { cn } from '../../utils/helpers';

// ── Color palette ─────────────────────────────────────────────
const STROKE_COLORS = [
  { value: '#1e293b', label: 'Black' },
  { value: '#ffffff', label: 'White' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#64748b', label: 'Gray' },
];

const FILL_COLORS = [
  { value: 'transparent', label: 'None' },
  ...STROKE_COLORS.slice(0, 8).map(c => ({
    ...c, value: c.value + '33' // 20% opacity fills
  })),
  { value: '#fef08a', label: 'Yellow' },
  { value: '#86efac', label: 'Green' },
  { value: '#93c5fd', label: 'Blue' },
];

const STROKE_WIDTHS = [1, 2, 3, 5, 8, 12];

// ── Tool button ───────────────────────────────────────────────
const ToolBtn = ({ icon: Icon, label, active, onClick, shortcut, danger }) => (
  <button
    onClick={onClick}
    title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    className={cn(
      'relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
      'hover:bg-surface-100',
      active && !danger && 'bg-brand-100 text-brand-700 hover:bg-brand-100',
      !active && !danger && 'text-surface-600',
      danger && 'text-red-500 hover:bg-red-50',
    )}
  >
    <Icon size={17} />
    {active && (
      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-600" />
    )}
  </button>
);

// ── Divider ───────────────────────────────────────────────────
const Sep = () => <div className="w-px h-5 bg-surface-200 mx-1" />;

// ── Color swatch ──────────────────────────────────────────────
const Swatch = ({ color, active, onClick, size = 'md' }) => (
  <button
    onClick={onClick}
    className={cn(
      'rounded-lg border-2 transition-all flex-shrink-0',
      size === 'sm' ? 'w-5 h-5' : 'w-6 h-6',
      active ? 'border-brand-500 scale-110' : 'border-transparent hover:border-surface-300',
      color === 'transparent' && 'bg-white border-surface-300',
    )}
    style={{ backgroundColor: color === 'transparent' ? undefined : color }}
    title={color}
  >
    {color === 'transparent' && (
      <svg viewBox="0 0 20 20" className="w-full h-full opacity-40">
        <line x1="2" y1="2" x2="18" y2="18" stroke="#ef4444" strokeWidth="2"/>
      </svg>
    )}
  </button>
);

// ── Popover wrapper ───────────────────────────────────────────
const Popover = ({ trigger, children, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className={cn(
          'absolute top-full mt-2 bg-white rounded-2xl border border-surface-200 shadow-card-lg p-3 z-50 animate-scale-in',
          align === 'right' ? 'right-0' : 'left-0',
        )}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Main Toolbar ──────────────────────────────────────────────
const Toolbar = ({
  activeTool, setActiveTool,
  strokeColor, setStrokeColor,
  fillColor,   setFillColor,
  strokeWidth, setStrokeWidth,
  zoom, zoomTo, fitToScreen,
  canUndo, canRedo, undo, redo,
  clearCanvas, deleteSelected,
  exportPNG, exportSVG,
}) => {
  const toolGroups = [
    {
      label: 'Select & Navigate',
      tools: [
        { tool: TOOLS.SELECT, icon: MousePointer2, label: 'Select',    shortcut: 'V' },
        { tool: TOOLS.PAN,    icon: Hand,          label: 'Pan',       shortcut: 'H' },
      ],
    },
    {
      label: 'Draw',
      tools: [
        { tool: TOOLS.PEN,    icon: Pencil,    label: 'Pen',    shortcut: 'P' },
        { tool: TOOLS.ERASER, icon: Eraser,    label: 'Eraser', shortcut: 'E' },
      ],
    },
    {
      label: 'Shapes',
      tools: [
        { tool: TOOLS.LINE,   icon: Minus,     label: 'Line',   shortcut: 'L' },
        { tool: TOOLS.ARROW,  icon: MoveRight, label: 'Arrow',  shortcut: 'A' },
        { tool: TOOLS.RECT,   icon: Square,    label: 'Rect',   shortcut: 'R' },
        { tool: TOOLS.CIRCLE, icon: Circle,    label: 'Circle', shortcut: 'C' },
      ],
    },
    {
      label: 'Insert',
      tools: [
        { tool: TOOLS.TEXT,   icon: Type,       label: 'Text',   shortcut: 'T' },
        { tool: TOOLS.STICKY, icon: StickyNote, label: 'Sticky', shortcut: 'S' },
      ],
    },
  ];

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-3 z-30 flex items-center gap-1
                    bg-white border border-surface-200 rounded-2xl shadow-card-md px-2 py-1.5
                    select-none">

      {/* Tool groups */}
      {toolGroups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <Sep />}
          {group.tools.map(({ tool, icon, label, shortcut }) => (
            <ToolBtn
              key={tool}
              icon={icon}
              label={label}
              shortcut={shortcut}
              active={activeTool === tool}
              onClick={() => setActiveTool(tool)}
            />
          ))}
        </div>
      ))}

      <Sep />

      {/* Stroke color */}
      <Popover
        align="left"
        trigger={
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-surface-100 gap-1"
            title="Stroke color"
          >
            <div
              className="w-5 h-5 rounded-md border border-surface-200"
              style={{ backgroundColor: strokeColor }}
            />
            <ChevronDown size={10} className="text-surface-400" />
          </button>
        }
      >
        <div className="w-56">
          <p className="text-xs font-medium text-surface-500 mb-2">Stroke</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {STROKE_COLORS.map((c) => (
              <Swatch
                key={c.value}
                color={c.value}
                active={strokeColor === c.value}
                onClick={() => setStrokeColor(c.value)}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-surface-500 mb-2 mt-1">Custom</p>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-full h-8 rounded-lg border border-surface-200 cursor-pointer"
          />
        </div>
      </Popover>

      {/* Fill color */}
      <Popover
        align="left"
        trigger={
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-surface-100 gap-1"
            title="Fill color"
          >
            <div
              className={cn(
                'w-5 h-5 rounded-md border border-surface-200',
                fillColor === 'transparent' && 'bg-white'
              )}
              style={{ backgroundColor: fillColor !== 'transparent' ? fillColor : undefined }}
            >
              {fillColor === 'transparent' && (
                <svg viewBox="0 0 20 20" className="w-full h-full opacity-40">
                  <line x1="2" y1="2" x2="18" y2="18" stroke="#ef4444" strokeWidth="2.5"/>
                </svg>
              )}
            </div>
            <ChevronDown size={10} className="text-surface-400" />
          </button>
        }
      >
        <div className="w-56">
          <p className="text-xs font-medium text-surface-500 mb-2">Fill</p>
          <div className="flex flex-wrap gap-2">
            {FILL_COLORS.map((c) => (
              <Swatch
                key={c.value}
                color={c.value}
                active={fillColor === c.value}
                onClick={() => setFillColor(c.value)}
              />
            ))}
          </div>
        </div>
      </Popover>

      {/* Stroke width */}
      <Popover
        align="left"
        trigger={
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-surface-100"
            title="Stroke width"
          >
            <div
              className="bg-surface-700 rounded-full"
              style={{ width: Math.min(strokeWidth * 3, 20), height: Math.min(strokeWidth * 3, 20) }}
            />
          </button>
        }
      >
        <div className="w-40">
          <p className="text-xs font-medium text-surface-500 mb-2">Stroke width</p>
          <div className="flex flex-col gap-2">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={cn(
                  'flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-50 transition-colors',
                  strokeWidth === w && 'bg-brand-50'
                )}
              >
                <div
                  className="bg-surface-700 rounded-full flex-shrink-0"
                  style={{ width: 32, height: w }}
                />
                <span className="text-xs text-surface-500">{w}px</span>
              </button>
            ))}
          </div>
        </div>
      </Popover>

      <Sep />

      {/* Undo / Redo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-600
                   hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6"/><path d="M3 13C5.5 6.5 16 4 20 10"/>
        </svg>
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-600
                   hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6"/><path d="M21 13C18.5 6.5 8 4 4 10"/>
        </svg>
      </button>

      <Sep />

      {/* Zoom */}
      <button onClick={() => zoomTo(Math.max(zoom - 0.25, 0.2))} title="Zoom out"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-600 hover:bg-surface-100">
        <ZoomOut size={16} />
      </button>
      <button
        onClick={fitToScreen}
        className="px-2 h-9 rounded-xl text-xs font-mono text-surface-600 hover:bg-surface-100 min-w-[48px]"
        title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button onClick={() => zoomTo(Math.min(zoom + 0.25, 5))} title="Zoom in"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-600 hover:bg-surface-100">
        <ZoomIn size={16} />
      </button>

      <Sep />

      {/* Export */}
      <Popover
        align="right"
        trigger={
          <button title="Export" className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-600 hover:bg-surface-100">
            <Download size={16} />
          </button>
        }
      >
        <div className="w-36 flex flex-col gap-1">
          <p className="text-xs font-medium text-surface-500 mb-1">Export as</p>
          <button
            onClick={exportPNG}
            className="text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-xl transition-colors"
          >
             PNG image
          </button>
          <button
            onClick={exportSVG}
            className="text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-xl transition-colors"
          >
             SVG vector
          </button>
        </div>
      </Popover>

      {/* Delete / Clear */}
      <button
        onClick={deleteSelected}
        title="Delete selected (Del)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default Toolbar;
