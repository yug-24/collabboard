import { cn } from '../../utils/helpers';
import { TOOLS } from '../../hooks/useCanvas';

const toolTips = {
  [TOOLS.SELECT]: 'Click to select • Drag to move • Del to delete',
  [TOOLS.PEN]:    'Click and drag to draw freely',
  [TOOLS.ERASER]: 'Click any object to erase it',
  [TOOLS.LINE]:   'Click and drag to draw a line',
  [TOOLS.ARROW]:  'Click and drag to draw an arrow',
  [TOOLS.RECT]:   'Click and drag to draw a rectangle • Shift = square',
  [TOOLS.CIRCLE]: 'Click and drag to draw an ellipse • Shift = circle',
  [TOOLS.TEXT]:   'Click anywhere to add text',
  [TOOLS.STICKY]: 'Click anywhere to add a sticky note',
  [TOOLS.PAN]:    'Click and drag to pan the canvas • Ctrl+Scroll to zoom',
};

const CanvasStatusBar = ({ activeTool, zoom, objectCount, isSaving }) => {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30
                    flex items-center gap-3 px-4 py-1.5
                    bg-white/80 backdrop-blur-sm border border-surface-200
                    rounded-full shadow-card text-xs text-surface-500 select-none">

      {/* Tool hint */}
      <span className="hidden sm:block">{toolTips[activeTool] || ''}</span>

      {/* Divider */}
      <span className="hidden sm:block text-surface-200">|</span>

      {/* Zoom */}
      <span className="font-mono">{Math.round(zoom * 100)}%</span>

      {/* Object count */}
      {objectCount > 0 && (
        <>
          <span className="text-surface-200">|</span>
          <span>{objectCount} {objectCount === 1 ? 'object' : 'objects'}</span>
        </>
      )}

      {/* Save status */}
      {isSaving !== undefined && (
        <>
          <span className="text-surface-200">|</span>
          <span className={cn(
            'flex items-center gap-1',
            isSaving ? 'text-amber-500' : 'text-emerald-500'
          )}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            )} />
            {isSaving ? 'Saving…' : 'Saved'}
          </span>
        </>
      )}

      {/* Keyboard hint */}
      <span className="hidden lg:block text-surface-200">|</span>
      <span className="hidden lg:block text-surface-400">Ctrl+Z undo • Ctrl+Scroll zoom</span>
    </div>
  );
};

export default CanvasStatusBar;
