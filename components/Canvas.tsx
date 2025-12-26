
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DxfData, DxfEntity, ViewportState, DrawingTool, Point } from '../types';

interface CanvasProps {
  data: DxfData;
  viewport: ViewportState;
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  tool: DrawingTool;
  onAddEntity: (entity: DxfEntity) => void;
}

/**
 * AutoCAD Color Index (ACI) standard mapping.
 */
const ACI_COLORS: Record<number, string> = {
  1: '#ff0000', // Red
  2: '#ffff00', // Yellow
  3: '#00ff00', // Green
  4: '#00ffff', // Cyan
  5: '#0000ff', // Blue
  6: '#ff00ff', // Magenta
  7: '#ffffff', // White
  8: '#808080', // Dark Grey
  9: '#c0c0c0', // Light Grey
};

const getDxfColor = (colorIndex: number | undefined, layer: string, layerColors: Record<string, number>): string => {
  let resolvedIndex = colorIndex;
  if (resolvedIndex === undefined || resolvedIndex === 0 || resolvedIndex === 256) {
    resolvedIndex = layerColors[layer] ?? 7; 
  }
  if (ACI_COLORS[resolvedIndex]) return ACI_COLORS[resolvedIndex];
  return resolvedIndex >= 1 && resolvedIndex <= 255 ? '#9ca3af' : '#9ca3af';
};

const Canvas: React.FC<CanvasProps> = ({ 
  data, 
  viewport, 
  setViewport, 
  selectedId, 
  onSelect, 
  tool,
  onAddEntity
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [cursorWorldPos, setCursorWorldPos] = useState<Point | null>(null);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey) {
        const delta = -e.deltaY;
        const zoomSensitivity = 0.015;
        const factor = Math.exp(delta * zoomSensitivity);
        setViewport(prev => {
          const newScale = Math.max(0.000001, Math.min(200000, prev.scale * factor));
          const worldX = (mouseX - prev.offset.x) / prev.scale;
          const worldY = (mouseY - prev.offset.y) / prev.scale;
          const newOffsetX = mouseX - worldX * newScale;
          const newOffsetY = mouseY - worldY * newScale;
          return { scale: newScale, offset: { x: newOffsetX, y: newOffsetY } };
        });
      } else {
        setViewport(prev => ({
          ...prev,
          offset: { x: prev.offset.x - e.deltaX, y: prev.offset.y - e.deltaY }
        }));
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [setViewport]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    if (cursorWorldPos) {
      if (['line', 'circle', 'rectangle'].includes(tool)) {
        if (!drawingStart) {
          setDrawingStart(cursorWorldPos);
        } else {
          const newId = `user-${Date.now()}`;
          let newEntity: DxfEntity | null = null;
          if (tool === 'line') {
            newEntity = { id: newId, type: 'LINE', layer: 'User Drawing', startPoint: drawingStart, endPoint: cursorWorldPos, color: 4 };
          } else if (tool === 'circle') {
            const dx = cursorWorldPos.x - drawingStart.x;
            const dy = cursorWorldPos.y - drawingStart.y;
            newEntity = { id: newId, type: 'CIRCLE', layer: 'User Drawing', center: drawingStart, radius: Math.sqrt(dx*dx + dy*dy), color: 4 };
          } else if (tool === 'rectangle') {
            newEntity = {
              id: newId, type: 'LWPOLYLINE', layer: 'User Drawing', color: 4,
              vertices: [
                { x: drawingStart.x, y: drawingStart.y, z: 0 }, { x: cursorWorldPos.x, y: drawingStart.y, z: 0 },
                { x: cursorWorldPos.x, y: cursorWorldPos.y, z: 0 }, { x: drawingStart.x, y: cursorWorldPos.y, z: 0 },
                { x: drawingStart.x, y: drawingStart.y, z: 0 }
              ]
            };
          }
          if (newEntity) onAddEntity(newEntity);
          setDrawingStart(null);
        }
      } else if (tool === 'select') {
        onSelect(''); 
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - viewport.offset.x) / viewport.scale;
      const worldY = -(mouseY - viewport.offset.y) / viewport.scale;
      setCursorWorldPos({ x: worldX, y: worldY, z: 0 });
    }

    if (isPanning) {
      const dx = (e.clientX - lastMouse.x);
      const dy = (e.clientY - lastMouse.y);
      setViewport(prev => ({
        ...prev,
        offset: { x: prev.offset.x + dx, y: prev.offset.y + dy }
      }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const renderEntity = (e: DxfEntity, isGhost: boolean = false) => {
    const isSelected = selectedId === e.id;
    const isHovered = hoveredId === e.id;

    let strokeWidth = (isSelected ? 3 : isHovered ? 2 : 1.2) / viewport.scale;
    const maxStrokeScreenPx = 5; 
    if (strokeWidth * viewport.scale > maxStrokeScreenPx) {
      strokeWidth = maxStrokeScreenPx / viewport.scale;
    }

    const hitStrokeWidth = 24 / viewport.scale;

    let color = isSelected 
      ? '#3b82f6' 
      : isHovered 
        ? '#ffffff' 
        : getDxfColor(e.color, e.layer, data.layerColors);

    if (isGhost) {
      color = '#3b82f6aa';
      strokeWidth = 1.5 / viewport.scale;
    }

    const visualProps = {
      stroke: color,
      strokeWidth,
      fill: 'none',
      strokeDasharray: isGhost ? '4 4' : 'none',
      strokeLinecap: 'round' as any,
      strokeLinejoin: 'round' as any,
      style: { pointerEvents: 'none', transition: 'stroke 0.1s ease' } as any
    };

    const hitAreaProps = {
      stroke: 'transparent',
      strokeWidth: hitStrokeWidth,
      fill: 'none',
      strokeLinecap: 'round' as any,
      strokeLinejoin: 'round' as any,
      onClick: (evt: React.MouseEvent) => {
        if (isGhost) return;
        evt.stopPropagation();
        if (tool === 'select') onSelect(e.id);
      },
      onMouseEnter: () => {
        if (!isGhost && tool === 'select') setHoveredId(e.id);
      },
      onMouseLeave: () => {
        setHoveredId(null);
      },
      style: { pointerEvents: tool === 'select' && !isGhost ? 'auto' : 'none' } as any
    };

    const renderPoints = () => {
      if (!isSelected || isGhost) return null;
      
      const points: Point[] = [];
      if (e.vertices) points.push(...e.vertices);
      else if (e.startPoint && e.endPoint) points.push(e.startPoint, e.endPoint);
      else if (e.center) points.push(e.center);

      // Half-size of the square handle in world coordinates
      const size = 3.5 / viewport.scale;
      const pointStroke = 1 / viewport.scale;

      return points.map((p, i) => (
        <rect 
          key={`point-${e.id}-${i}`}
          x={p.x - size} 
          y={-p.y - size} 
          width={size * 2}
          height={size * 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={pointStroke}
          style={{ pointerEvents: 'none' }}
        />
      ));
    };

    const renderGeometry = (props: any) => {
      switch (e.type) {
        case 'LINE':
          if (!e.startPoint || !e.endPoint) return null;
          return <line {...props} x1={e.startPoint.x} y1={-e.startPoint.y} x2={e.endPoint.x} y2={-e.endPoint.y} />;
        case 'CIRCLE':
          if (!e.center || e.radius === undefined) return null;
          return <circle {...props} cx={e.center.x} cy={-e.center.y} r={e.radius} />;
        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (!e.vertices || e.vertices.length < 2) return null;
          const pts = e.vertices.map(v => `${v.x},${-v.y}`).join(' ');
          return <polyline {...props} points={pts} />;
        default:
          return null;
      }
    };

    return (
      <g key={e.id}>
        {renderGeometry(hitAreaProps)}
        {renderGeometry(visualProps)}
        {renderPoints()}
      </g>
    );
  };

  const getGridStep = (minPixels: number) => {
    const worldStep = minPixels / viewport.scale;
    const exponent = Math.floor(Math.log10(worldStep));
    const base = Math.pow(10, exponent);
    if (worldStep / base < 2) return base * 2;
    if (worldStep / base < 5) return base * 5;
    return base * 10;
  };

  const step = getGridStep(20);
  const majorStep = step * 5;

  const rect = containerRef.current?.getBoundingClientRect();
  const visibleWidth = rect ? rect.width / viewport.scale : 0;
  const leftBound = rect ? -viewport.offset.x / viewport.scale : 0;
  const rightBound = leftBound + visibleWidth;

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-[#0f0f0f] relative overflow-hidden select-none outline-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsPanning(false)}
      onMouseLeave={() => { setIsPanning(false); setCursorWorldPos(null); setHoveredId(null); }}
      tabIndex={0}
      style={{ cursor: tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.1]"
        style={{
          backgroundImage: `linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)`,
          backgroundSize: `${step * viewport.scale}px ${step * viewport.scale}px`,
          backgroundPosition: `${viewport.offset.x}px ${viewport.offset.y}px`
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #666 1px, transparent 1px), linear-gradient(to bottom, #666 1px, transparent 1px)`,
          backgroundSize: `${majorStep * viewport.scale}px ${majorStep * viewport.scale}px`,
          backgroundPosition: `${viewport.offset.x}px ${viewport.offset.y}px`
        }}
      />

      <svg className="w-full h-full">
        <g transform={`translate(${viewport.offset.x}, ${viewport.offset.y}) scale(${viewport.scale})`}>
          {data.entities.map(e => renderEntity(e))}
          
          {drawingStart && cursorWorldPos && (
            <>
              {tool === 'line' && renderEntity({
                id: 'ghost-line', type: 'LINE', layer: 'ghost', startPoint: drawingStart, endPoint: cursorWorldPos, color: 4
              }, true)}
              {tool === 'circle' && renderEntity({
                id: 'ghost-circle', type: 'CIRCLE', layer: 'ghost', center: drawingStart, 
                radius: Math.sqrt(Math.pow(cursorWorldPos.x - drawingStart.x, 2) + Math.pow(cursorWorldPos.y - drawingStart.y, 2)),
                color: 4
              }, true)}
              {tool === 'rectangle' && renderEntity({
                id: 'ghost-rect', type: 'LWPOLYLINE', layer: 'ghost', color: 4,
                vertices: [
                  { x: drawingStart.x, y: drawingStart.y }, { x: cursorWorldPos.x, y: drawingStart.y },
                  { x: cursorWorldPos.x, y: cursorWorldPos.y }, { x: drawingStart.x, y: cursorWorldPos.y },
                  { x: drawingStart.x, y: drawingStart.y }
                ]
              }, true)}
            </>
          )}
        </g>
      </svg>

      <div 
        className="absolute w-6 h-6 pointer-events-none"
        style={{ left: viewport.offset.x, top: viewport.offset.y }}
      >
        <div className="w-20 h-[1px] bg-red-500/30 absolute top-0 rounded-full" />
        <div className="w-[1px] h-20 bg-green-500/30 absolute left-0 rounded-full" />
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col gap-1 text-[10px] text-gray-400 font-mono bg-black/95 p-3 rounded-lg border border-white/10 shadow-2xl min-w-[200px] backdrop-blur-sm">
        {cursorWorldPos && (
          <div className="text-blue-400 border-b border-white/10 pb-1.5 mb-1 flex justify-between items-center">
            <span className="opacity-50 text-[9px]">POSITION</span>
            <span className="font-bold tracking-tight">{cursorWorldPos.x.toFixed(2)}, {cursorWorldPos.y.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="opacity-50 text-[9px]">RANGE</span>
          <span>{leftBound.toFixed(0)} to {rightBound.toFixed(0)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="opacity-50 text-[9px]">GRID</span>
          <span>{step.toExponential(1)} units</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="opacity-50 text-[9px]">SCALE</span>
          <span>x{viewport.scale.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
