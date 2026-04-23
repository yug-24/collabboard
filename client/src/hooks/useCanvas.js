import { useEffect, useRef, useCallback, useState } from 'react';
import { fabric } from 'fabric';

// ── Constants ─────────────────────────────────────────────────
export const TOOLS = {
  SELECT:    'select',
  PEN:       'pen',
  ERASER:    'eraser',
  LINE:      'line',
  RECT:      'rect',
  CIRCLE:    'circle',
  ARROW:     'arrow',
  TEXT:      'text',
  STICKY:    'sticky',
  IMAGE:     'image',
  PAN:       'pan',
};

const HISTORY_LIMIT = 60;
const DEFAULT_STROKE  = '#1e293b';
const DEFAULT_FILL    = 'transparent';
const DEFAULT_STROKE_W = 2;

// ── useCanvas ─────────────────────────────────────────────────
const useCanvas = ({ canvasId, onCanvasChange, isReady = true }) => {
  const fabricRef  = useRef(null);   // fabric.Canvas instance
  const isDrawingRef = useRef(false);
  const erasedRef    = useRef(false);
  const startPointRef = useRef(null);
  const activeShapeRef = useRef(null);
  const historyRef  = useRef([]);
  const historyIdxRef = useRef(-1);
  const isPushingRef  = useRef(false);
  const panStartRef   = useRef(null);

  const [activeTool,  setActiveTool]  = useState(TOOLS.SELECT);
  const [strokeColor, setStrokeColor] = useState(DEFAULT_STROKE);
  const [fillColor,   setFillColor]   = useState(DEFAULT_FILL);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_W);
  const [zoom,        setZoom]        = useState(1);
  const [canUndo,     setCanUndo]     = useState(false);
  const [canRedo,     setCanRedo]     = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Expose refs for socket sync (Phase 3)
  const toolRef         = useRef(TOOLS.SELECT);
  const strokeColorRef  = useRef(DEFAULT_STROKE);
  const fillColorRef    = useRef(DEFAULT_FILL);
  const strokeWidthRef  = useRef(DEFAULT_STROKE_W);

  // Keep refs in sync
  useEffect(() => { toolRef.current        = activeTool;  }, [activeTool]);
  useEffect(() => { strokeColorRef.current = strokeColor; }, [strokeColor]);
  useEffect(() => { fillColorRef.current   = fillColor;   }, [fillColor]);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);

  // ── History helpers ─────────────────────────────────────────
  const pushHistory = useCallback(() => {
    if (isPushingRef.current || !fabricRef.current) return;
    const json = fabricRef.current.toJSON(['id', 'selectable', 'evented']);
    const idx  = historyIdxRef.current;
    // Truncate redo stack
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIdxRef.current <= 0) return;
    isPushingRef.current = true;
    historyIdxRef.current--;
    canvas.loadFromJSON(historyRef.current[historyIdxRef.current], () => {
      canvas.renderAll();
      isPushingRef.current = false;
      setCanUndo(historyIdxRef.current > 0);
      setCanRedo(true);
      onCanvasChange?.(canvas.toJSON(['id']));
    });
  }, [onCanvasChange]);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIdxRef.current >= historyRef.current.length - 1) return;
    isPushingRef.current = true;
    historyIdxRef.current++;
    canvas.loadFromJSON(historyRef.current[historyIdxRef.current], () => {
      canvas.renderAll();
      isPushingRef.current = false;
      setCanUndo(true);
      setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
      onCanvasChange?.(canvas.toJSON(['id']));
    });
  }, [onCanvasChange]);

  // ── Canvas init ─────────────────────────────────────────────
  useEffect(() => {
    const el = document.getElementById(canvasId);
    if (!el || fabricRef.current) return;

    // Get the wrapper BEFORE Fabric creates a .canvas-container around our el
    const wrapper = el.parentElement;

    const canvas = new fabric.Canvas(canvasId, {
      backgroundColor:     '#ffffff',
      selection:           true,
      preserveObjectStacking: true,
      enableRetinaScaling: true,
    });

    fabricRef.current = canvas;
    setIsCanvasReady(true);

    // Responsive resize
    const resize = () => {
      if (!wrapper) return;
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      canvas.setWidth(w);
      canvas.setHeight(h);
      canvas.calcOffset();
      canvas.renderAll();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    // Record first history state
    pushHistory();

    // ── Keyboard shortcuts ──────────────────────────────────
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = canvas.getActiveObjects();
        if (active.length) {
          active.forEach((o) => canvas.remove(o));
          canvas.discardActiveObject();
          canvas.renderAll();
          pushHistory();
          onCanvasChange?.(canvas.toJSON(['id']));
        }
      }
      if (e.key === 'Escape') {
        canvas.discardActiveObject();
        canvas.renderAll();
      }
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        const map = { v: TOOLS.SELECT, p: TOOLS.PEN, e: TOOLS.ERASER,
                      t: TOOLS.TEXT,   r: TOOLS.RECT, c: TOOLS.CIRCLE,
                      h: TOOLS.PAN,    s: TOOLS.STICKY };
        if (map[key]) setActiveTool(map[key]);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      canvas.dispose();
      fabricRef.current = null;
      setIsCanvasReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId, isReady]);

  // ── Tool switching ──────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Reset all modes
    canvas.isDrawingMode   = false;
    canvas.selection       = false;
    canvas.defaultCursor   = 'default';
    canvas.hoverCursor     = 'move';
    canvas.getObjects().forEach((o) => {
      o.selectable = false;
      o.evented    = false;
    });

    if (activeTool === TOOLS.SELECT) {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.getObjects().forEach((o) => {
        o.selectable = true;
        o.evented    = true;
      });
    } else if (activeTool === TOOLS.PEN) {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = strokeColorRef.current;
      canvas.freeDrawingBrush.width = strokeWidthRef.current;
      canvas.defaultCursor = 'crosshair';
    } else if (activeTool === TOOLS.ERASER) {
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'cell';
      canvas.hoverCursor   = 'cell';
      canvas.getObjects().forEach((o) => { o.selectable = true; o.evented = true; });
    } else if (activeTool === TOOLS.PAN) {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor   = 'grab';
    } else {
      // Shape tools
      canvas.defaultCursor = 'crosshair';
    }
    canvas.renderAll();
  }, [activeTool]);

  // Update active object colors when toolbar state changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    // Update pen brush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    }

    // Update selected objects
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      let modified = false;
      activeObjects.forEach(obj => {
        if (obj.isType('path') || obj.isType('line')) {
           // Paths/lines only update stroke
           if (obj.stroke !== strokeColor) { obj.set('stroke', strokeColor); modified = true; }
           if (obj.strokeWidth !== strokeWidth) { obj.set('strokeWidth', strokeWidth); modified = true; }
        } else if (obj.isType('textbox') && !obj._isSticky) {
           // Text updates textColor (which is 'fill' in fabric)
           if (obj.fill !== strokeColor) { obj.set('fill', strokeColor); modified = true; }
        } else {
           // Shapes update both
           if (obj.fill !== fillColor) { obj.set('fill', fillColor); modified = true; }
           if (obj.stroke !== strokeColor) { obj.set('stroke', strokeColor); modified = true; }
           if (obj.strokeWidth !== strokeWidth) { obj.set('strokeWidth', strokeWidth); modified = true; }
        }
      });
      if (modified) {
        canvas.renderAll();
        pushHistory();
        onCanvasChange?.(canvas.toJSON(['id']));
      }
    }
  }, [strokeColor, fillColor, strokeWidth, pushHistory, onCanvasChange]);

  // ── Shape drawing (mouse events) ───────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const getPos = (e) => {
      const ptr = canvas.getPointer(e.e);
      return { x: ptr.x, y: ptr.y };
    };

    const onMouseDown = (e) => {
      if (!e.e) return;
      const pos = getPos(e);

      if (activeTool === TOOLS.PAN) {
        panStartRef.current = { x: e.e.clientX, y: e.e.clientY };
        canvas.defaultCursor = 'grabbing';
        return;
      }

      if (activeTool === TOOLS.ERASER) {
        isDrawingRef.current = true;
        erasedRef.current = false;
        const target = canvas.findTarget(e.e);
        if (target) {
          canvas.remove(target);
          canvas.renderAll();
          erasedRef.current = true;
          onCanvasChange?.(canvas.toJSON(['id']));
        }
        return;
      }

      if (activeTool === TOOLS.TEXT) {
        const target = canvas.findTarget(e.e);
        if (target && target.isType && target.isType('textbox')) return;
        addText(pos);
        return;
      }

      if (activeTool === TOOLS.STICKY) {
        const target = canvas.findTarget(e.e);
        if (target && target.isType && target.isType('textbox')) return;
        addSticky(pos);
        return;
      }

      const shapeTools = [TOOLS.RECT, TOOLS.CIRCLE, TOOLS.LINE, TOOLS.ARROW];
      if (!shapeTools.includes(activeTool)) return;

      isDrawingRef.current = true;
      startPointRef.current = pos;

      let shape;
      const baseOpts = {
        left: pos.x, top: pos.y, width: 0, height: 0,
        stroke: strokeColorRef.current,
        strokeWidth: strokeWidthRef.current,
        fill: fillColorRef.current,
        selectable: false, evented: false,
        originX: 'left', originY: 'top',
        strokeUniform: true,
      };

      if (activeTool === TOOLS.RECT) {
        shape = new fabric.Rect({ ...baseOpts, rx: 4, ry: 4 });
      } else if (activeTool === TOOLS.CIRCLE) {
        shape = new fabric.Ellipse({ ...baseOpts, rx: 0, ry: 0 });
      } else if (activeTool === TOOLS.LINE || activeTool === TOOLS.ARROW) {
        shape = new fabric.Line([pos.x, pos.y, pos.x, pos.y], {
          stroke: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
          selectable: false, evented: false,
          strokeLineCap: 'round',
        });
        if (activeTool === TOOLS.ARROW) {
          // Will add arrowhead on mouseup
          shape._isArrow = true;
        }
      }

      if (shape) {
        activeShapeRef.current = shape;
        canvas.add(shape);
      }
    };

    const onMouseMove = (e) => {
      if (activeTool === TOOLS.PAN && panStartRef.current) {
        const dx = e.e.clientX - panStartRef.current.x;
        const dy = e.e.clientY - panStartRef.current.y;
        const vpt = canvas.viewportTransform.slice();
        vpt[4] += dx; vpt[5] += dy;
        canvas.setViewportTransform(vpt);
        panStartRef.current = { x: e.e.clientX, y: e.e.clientY };
        return;
      }

      if (activeTool === TOOLS.ERASER) {
        if (!isDrawingRef.current) return;
        const target = canvas.findTarget(e.e);
        if (target) {
          canvas.remove(target);
          canvas.renderAll();
          erasedRef.current = true;
          onCanvasChange?.(canvas.toJSON(['id']));
        }
        return;
      }

      if (!isDrawingRef.current || !activeShapeRef.current) return;
      const pos   = getPos(e);
      const start = startPointRef.current;
      const shape = activeShapeRef.current;
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;

      // Hold shift = constrain proportions
      const constrain = e.e?.shiftKey;

      if (shape instanceof fabric.Rect) {
        const w = Math.abs(dx);
        const h = constrain ? w : Math.abs(dy);
        shape.set({
          left:  dx < 0 ? pos.x : start.x,
          top:   dy < 0 ? pos.y : start.y,
          width: w, height: h,
        });
      } else if (shape instanceof fabric.Ellipse) {
        const rx = Math.abs(dx) / 2;
        const ry = constrain ? rx : Math.abs(dy) / 2;
        shape.set({
          left:  Math.min(start.x, pos.x),
          top:   Math.min(start.y, pos.y),
          rx, ry,
        });
      } else if (shape instanceof fabric.Line) {
        shape.set({ x2: pos.x, y2: pos.y });
      }
      shape.setCoords();
      canvas.renderAll();
    };

    const onMouseUp = (e) => {
      if (activeTool === TOOLS.PAN) {
        panStartRef.current = null;
        canvas.defaultCursor = 'grab';
        return;
      }

      if (activeTool === TOOLS.ERASER) {
        if (isDrawingRef.current) {
          if (erasedRef.current) pushHistory();
          isDrawingRef.current = false;
          erasedRef.current = false;
        }
        return;
      }

      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      const shape = activeShapeRef.current;
      if (!shape) return;

      // Add arrowhead for arrow tool
      if (shape._isArrow) {
        const pos   = getPos(e);
        const start = startPointRef.current;
        addArrowHead(canvas, start, pos, strokeColorRef.current, strokeWidthRef.current);
      }

      // If shape too small, remove it (accidental click)
      const tooSmall =
        (shape instanceof fabric.Rect   && (shape.width  < 5 || shape.height < 5)) ||
        (shape instanceof fabric.Ellipse && (shape.rx    < 3 || shape.ry     < 3));

      if (tooSmall) {
        canvas.remove(shape);
      } else {
        shape.set({ selectable: false, evented: false });
        if (toolRef.current === TOOLS.SELECT) {
          shape.set({ selectable: true, evented: true });
        }
        pushHistory();
        onCanvasChange?.(canvas.toJSON(['id']));
      }

      activeShapeRef.current = null;
      canvas.renderAll();
    };

    // Path created (pen tool)
    const onPathCreated = () => {
      canvas.getObjects().forEach((o) => {
        if (toolRef.current !== TOOLS.SELECT) {
          o.selectable = false;
          o.evented    = false;
        }
      });
      pushHistory();
      onCanvasChange?.(canvas.toJSON(['id']));
    };

    // Selection modified
    const onModified = () => {
      pushHistory();
      onCanvasChange?.(canvas.toJSON(['id']));
    };

    // Sync toolbar with selected object
    const onSelection = (e) => {
      const selected = e.selected;
      if (selected && selected.length === 1) {
        const obj = selected[0];
        if (obj.isType('textbox') && !obj.backgroundColor) { // Normal text
          if (obj.fill) setStrokeColor(obj.fill);
        } else {
          if (obj.stroke) setStrokeColor(obj.stroke);
          if (obj.fill) setFillColor(obj.fill);
          if (obj.strokeWidth) setStrokeWidth(Math.round(obj.strokeWidth));
        }
      }
    };

    canvas.on('mouse:down',    onMouseDown);
    canvas.on('mouse:move',    onMouseMove);
    canvas.on('mouse:up',      onMouseUp);
    canvas.on('path:created',  onPathCreated);
    canvas.on('object:modified', onModified);
    canvas.on('selection:created', onSelection);
    canvas.on('selection:updated', onSelection);

    return () => {
      canvas.off('mouse:down',    onMouseDown);
      canvas.off('mouse:move',    onMouseMove);
      canvas.off('mouse:up',      onMouseUp);
      canvas.off('path:created',  onPathCreated);
      canvas.off('object:modified', onModified);
      canvas.off('selection:created', onSelection);
      canvas.off('selection:updated', onSelection);
    };
  }, [activeTool, pushHistory, onCanvasChange]);

  // ── Scroll to zoom ──────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const onWheel = (opt) => {
      if (!opt.e.ctrlKey && !opt.e.metaKey) return;
      opt.e.preventDefault();
      let z = canvas.getZoom() * (opt.e.deltaY > 0 ? 0.9 : 1.1);
      z = Math.min(Math.max(z, 0.2), 5);
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, z);
      setZoom(parseFloat(z.toFixed(2)));
    };
    canvas.on('mouse:wheel', onWheel);
    return () => canvas.off('mouse:wheel', onWheel);
  }, []);

  // ── Helper: add text ────────────────────────────────────────
  const addText = useCallback((pos) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new fabric.Textbox('Click to edit', {
      left: pos.x, top: pos.y,
      width: 200,
      fontSize: 18,
      fontFamily: 'Inter, sans-serif',
      fill: strokeColorRef.current,
      selectable: true, evented: true,
      editable: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    setActiveTool(TOOLS.SELECT);
    text.enterEditing();
    text.selectAll();
    pushHistory();
    onCanvasChange?.(canvas.toJSON(['id']));
  }, [pushHistory, onCanvasChange]);

  // ── Helper: add sticky note ─────────────────────────────────
  const addSticky = useCallback((pos) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const colors = ['#fef08a', '#86efac', '#93c5fd', '#f9a8d4', '#fdba74'];
    const bg     = colors[Math.floor(Math.random() * colors.length)];

    const text = new fabric.Textbox(' Note...\n', {
      left: pos.x, top: pos.y,
      width: 160,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: '#1e293b',
      backgroundColor: bg,
      padding: 12,
      selectable: true, evented: true,
      editable: true,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.12)', blur: 8, offsetX: 2, offsetY: 2 }),
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    setActiveTool(TOOLS.SELECT);
    text.enterEditing();
    text.selectAll();
    
    canvas.renderAll();
    pushHistory();
    onCanvasChange?.(canvas.toJSON(['id']));
  }, [pushHistory, onCanvasChange]);

  // ── Helper: arrow head ──────────────────────────────────────
  const addArrowHead = (canvas, from, to, color, width) => {
    const angle   = Math.atan2(to.y - from.y, to.x - from.x);
    const size    = Math.max(width * 5, 14);
    const spread  = Math.PI / 6;
    const x1 = to.x - size * Math.cos(angle - spread);
    const y1 = to.y - size * Math.sin(angle - spread);
    const x2 = to.x - size * Math.cos(angle + spread);
    const y2 = to.y - size * Math.sin(angle + spread);

    const head = new fabric.Polygon(
      [{ x: to.x, y: to.y }, { x: x1, y: y1 }, { x: x2, y: y2 }],
      { fill: color, stroke: color, strokeWidth: 1, selectable: false, evented: false }
    );
    canvas.add(head);
  };

  // ── Public actions ──────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (!confirm('Clear the entire board? This cannot be undone.')) return;
    canvas.clear();
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
    pushHistory();
    onCanvasChange?.(canvas.toJSON(['id']));
  }, [pushHistory, onCanvasChange]);

  const selectAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setActiveTool(TOOLS.SELECT);
    canvas.getObjects().forEach((o) => { o.selectable = true; o.evented = true; });
    canvas.setActiveObject(new fabric.ActiveSelection(canvas.getObjects(), { canvas }));
    canvas.renderAll();
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
    pushHistory();
    onCanvasChange?.(canvas.toJSON(['id']));
  }, [pushHistory, onCanvasChange]);

  const exportPNG = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collabboard-export.png';
    a.click();
  }, []);

  const exportSVG = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const svg = canvas.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'collabboard-export.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const zoomTo = useCallback((level) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const center = canvas.getCenter();
    canvas.zoomToPoint({ x: center.left, y: center.top }, level);
    setZoom(level);
  }, []);

  const fitToScreen = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
  }, []);

  const loadFromJSON = useCallback((json) => {
    const canvas = fabricRef.current;
    if (!canvas || !json) return;
    isPushingRef.current = true;
    canvas.loadFromJSON(json, () => {
      canvas.renderAll();
      isPushingRef.current = false;
    });
  }, []);

  const getCanvasJSON = useCallback(() => {
    return fabricRef.current?.toJSON(['id']) ?? null;
  }, []);

  return {
    fabricRef,
    activeTool, setActiveTool,
    strokeColor, setStrokeColor,
    fillColor,   setFillColor,
    strokeWidth, setStrokeWidth,
    zoom, zoomTo, fitToScreen,
    canUndo, canRedo, undo, redo,
    clearCanvas, selectAll, deleteSelected,
    exportPNG, exportSVG,
    loadFromJSON, getCanvasJSON,
    addText, addSticky,
    isCanvasReady,
  };
};

export default useCanvas;
