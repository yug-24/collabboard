import { useEffect, useRef } from 'react';
import { cn } from '../../utils/helpers';

/**
 * Renders all remote users' cursors as floating labels over the canvas.
 * cursors: Map<socketId, { name, cursorColor, x, y }>
 */
const CursorOverlay = ({ cursors = new Map(), canvasRef }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {Array.from(cursors.entries()).map(([socketId, cursor]) => (
        <RemoteCursor key={socketId} cursor={cursor} />
      ))}
    </div>
  );
};

const RemoteCursor = ({ cursor }) => {
  const { name, cursorColor, x, y } = cursor;
  const labelRef = useRef(null);

  if (x == null || y == null) return null;

  return (
    <div
      className="absolute transition-[left,top] duration-75 ease-linear"
      style={{ left: x, top: y }}
    >
      {/* SVG cursor arrow */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className="drop-shadow-md"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M4 2L16 10L10 11.5L7.5 17L4 2Z"
          fill={cursorColor}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name label */}
      <div
        ref={labelRef}
        className="absolute top-4 left-3 px-2 py-0.5 rounded-full text-white text-xs font-medium
                   whitespace-nowrap shadow-md"
        style={{ backgroundColor: cursorColor }}
      >
        {name}
      </div>
    </div>
  );
};

export default CursorOverlay;
