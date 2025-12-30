import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DxfData, DxfEntity, ViewportState, DrawingTool, Point } from '../types';
import { getDxfColor } from '../services/colorUtils';

interface CanvasProps {
    data: DxfData;
    viewport: ViewportState;
    setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
    selectedIds: string[];
    onSelect: (id: string) => void;
    tool: DrawingTool;
    onAddEntity: (entity: DxfEntity) => void;
}



const distToSegmentSquared = (p: Point, v: Point, w: Point) => {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2);
};

const Canvas: React.FC<CanvasProps> = ({
    data,
    viewport,
    setViewport,
    selectedIds,
    onSelect,
    tool,
    onAddEntity
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
    const [cursorWorldPos, setCursorWorldPos] = useState<Point | null>(null);
    const [drawingStart, setDrawingStart] = useState<Point | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Resize handler with High DPI support
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;

                // Set display size
                canvasRef.current.style.width = `${rect.width}px`;
                canvasRef.current.style.height = `${rect.height}px`;

                // Set actual camera size
                canvasRef.current.width = rect.width * dpr;
                canvasRef.current.height = rect.height * dpr;

                // Scale context to match DPR
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) ctx.scale(dpr, dpr);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Hit detection logic
    const findEntityAt = useCallback((worldPos: Point): string | null => {
        const threshold = 12 / viewport.scale; // 12 pixels hit area
        const thresholdSq = threshold * threshold;

        let nearestId: string | null = null;
        let minDistanceSq = Infinity;

        for (let i = data.entities.length - 1; i >= 0; i--) {
            const e = data.entities[i];
            let currentDistSq = Infinity;

            if (e.type === 'LINE' && e.startPoint && e.endPoint) {
                currentDistSq = distToSegmentSquared(worldPos, e.startPoint, e.endPoint);
            } else if (e.type === 'CIRCLE' && e.center && e.radius !== undefined) {
                const distToCenter = Math.sqrt(Math.pow(worldPos.x - e.center.x, 2) + Math.pow(worldPos.y - e.center.y, 2));
                const distToEdge = Math.abs(distToCenter - e.radius);
                currentDistSq = distToEdge * distToEdge;
            } else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices) {
                for (let j = 0; j < e.vertices.length - 1; j++) {
                    const p1 = e.vertices[j];
                    const p2 = e.vertices[j + 1];
                    let d = Infinity;

                    if (!p1.bulge || Math.abs(p1.bulge) < 0.0001) {
                        d = distToSegmentSquared(worldPos, p1, p2);
                    } else {
                        // Curved hit detection
                        const bulge = p1.bulge;
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const L = Math.sqrt(dx * dx + dy * dy);
                        if (L > 0.000001) {
                            const h = (L / 2) * (1 - bulge * bulge) / (2 * bulge);
                            const cx = (p1.x + p2.x) / 2 - h * (dy / L);
                            const cy = (p1.y + p2.y) / 2 + h * (dx / L);
                            const radius = (L / 2) * (1 + bulge * bulge) / (2 * Math.abs(bulge));
                            const distToCenter = Math.sqrt(Math.pow(worldPos.x - cx, 2) + Math.pow(worldPos.y - cy, 2));
                            const distToArc = Math.abs(distToCenter - radius);

                            // Check if the point's projection on the arc is within start/end angles
                            const angle = Math.atan2(worldPos.y - cy, worldPos.x - cx);
                            const a1 = Math.atan2(p1.y - cy, p1.x - cx);
                            const a2 = Math.atan2(p2.y - cy, p2.x - cx);

                            // Simple angle range check for now
                            if (distToArc * distToArc < thresholdSq) d = distToArc * distToArc;
                        }
                    }
                    if (d < currentDistSq) currentDistSq = d;
                }
            }

            if (currentDistSq < thresholdSq && currentDistSq < minDistanceSq) {
                minDistanceSq = currentDistSq;
                nearestId = e.id;
            }
        }
        return nearestId;
    }, [data.entities, viewport.scale]);

    // Unified rendering loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        const { scale, offset } = viewport;

        ctx.clearRect(0, 0, width, height);

        // Coordinate mapping helper
        const toScreen = (p: Point) => ({
            x: p.x * scale + offset.x,
            y: -p.y * scale + offset.y
        });

        // 1. Draw Grid
        const getGridStep = (minPixels: number) => {
            const worldStep = minPixels / scale;
            if (worldStep === 0) return 1;
            const exponent = Math.floor(Math.log10(worldStep));
            const base = Math.pow(10, exponent);
            if (worldStep / base < 2) return base * 2;
            if (worldStep / base < 5) return base * 5;
            return base * 10;
        };
        const step = getGridStep(20);
        const majorStep = step * 5;

        const drawGrid = (s: number, color: string, opacity: number) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 1;

            const startX = Math.floor((-offset.x / scale) / s) * s;
            const endX = Math.ceil(((width - offset.x) / scale) / s) * s;
            const startY = Math.floor((-offset.y / scale) / s) * s;
            const endY = Math.ceil(((height - offset.y) / scale) / s) * s;

            for (let x = startX; x <= endX; x += s) {
                const p1 = toScreen({ x, y: -startY });
                ctx.moveTo(p1.x, 0);
                ctx.lineTo(p1.x, height);
            }
            for (let y = startY; y <= endY; y += s) {
                const p1 = toScreen({ x: startX, y: -y });
                ctx.moveTo(0, p1.y);
                ctx.lineTo(width, p1.y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        };

        drawGrid(step, '#444', 0.1);
        drawGrid(majorStep, '#666', 0.2);

        // 2. Draw Origin Markers
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.moveTo(offset.x, offset.y);
        ctx.lineTo(offset.x + 80, offset.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.moveTo(offset.x, offset.y);
        ctx.lineTo(offset.x, offset.y + 80);
        ctx.stroke();

        // 3. Draw Entities
        const renderEntityCtx = (e: DxfEntity, isGhost: boolean = false) => {
            const isSelected = selectedIds.includes(e.id);
            const isHovered = hoveredId === e.id;

            let color = isSelected
                ? '#3b82f6'
                : isHovered
                    ? '#ffffff'
                    : getDxfColor(e.color, e.trueColor, e.layer, data.layerColors, data.layerTrueColors);

            if (isGhost) color = 'rgba(59, 130, 246, 0.6)';

            ctx.strokeStyle = color;
            ctx.lineWidth = Math.min(5, (isSelected ? 3 : isHovered ? 2 : 1.2));
            ctx.setLineDash(isGhost ? [4, 4] : []);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (!isGhost) {
                if (isSelected) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#3b82f6';
                } else if (isHovered) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                } else {
                    ctx.shadowBlur = 0;
                }
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            if (e.type === 'LINE' && e.startPoint && e.endPoint) {
                const p1 = toScreen(e.startPoint);
                const p2 = toScreen(e.endPoint);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            } else if (e.type === 'CIRCLE' && e.center && e.radius !== undefined) {
                const p = toScreen(e.center);
                ctx.arc(p.x, p.y, e.radius * scale, 0, Math.PI * 2);
            } else if (e.type === 'ARC' && e.center && e.radius !== undefined && e.startAngle !== undefined && e.endAngle !== undefined) {
                const p = toScreen(e.center);
                // DXF arcs are CCW, angles in degrees. HTML5 canvas arc is CW by default, but we can specify CCW.
                // However, our Y-axis is flipped (standard for CAD -> screen), so we need to adjust.
                const startRad = -e.startAngle * Math.PI / 180;
                const endRad = -e.endAngle * Math.PI / 180;
                ctx.arc(p.x, p.y, e.radius * scale, startRad, endRad, true);
            } else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices && e.vertices.length > 0) {
                const verts = e.vertices;
                const p0 = toScreen(verts[0]);
                ctx.moveTo(p0.x, p0.y);

                for (let j = 0; j < verts.length - 1; j++) {
                    const v1 = verts[j];
                    const v2 = verts[j + 1];

                    if (!v1.bulge || Math.abs(v1.bulge) < 0.0001) {
                        const s2 = toScreen(v2);
                        ctx.lineTo(s2.x, s2.y);
                    } else {
                        const bulge = v1.bulge;
                        const dx = v2.x - v1.x;
                        const dy = v2.y - v1.y;
                        const L = Math.sqrt(dx * dx + dy * dy);

                        if (L > 0.000001) {
                            const h = (L / 2) * (1 - bulge * bulge) / (2 * bulge);
                            const cx = (v1.x + v2.x) / 2 - h * (dy / L);
                            const cy = (v1.y + v2.y) / 2 + h * (dx / L);
                            const radius = (L / 2) * (1 + bulge * bulge) / (2 * Math.abs(bulge));

                            const centerScreen = toScreen({ x: cx, y: cy });
                            const angle1 = Math.atan2(-(v1.y - cy), v1.x - cx);
                            const angle2 = Math.atan2(-(v2.y - cy), v2.x - cx);

                            ctx.arc(centerScreen.x, centerScreen.y, radius * scale, angle1, angle2, bulge > 0);
                        } else {
                            const s2 = toScreen(v2);
                            ctx.lineTo(s2.x, s2.y);
                        }
                    }
                }
            }
            ctx.stroke();

            // Draw handles if selected
            if (isSelected && !isGhost) {
                ctx.fillStyle = 'white';
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                const size = 4;
                const pts: Point[] = [];
                if (e.vertices) pts.push(...e.vertices);
                else if (e.startPoint && e.endPoint) pts.push(e.startPoint, e.endPoint);
                else if (e.center) pts.push(e.center);

                pts.forEach(p => {
                    const sp = toScreen(p);
                    ctx.fillRect(sp.x - size, sp.y - size, size * 2, size * 2);
                    ctx.strokeRect(sp.x - size, sp.y - size, size * 2, size * 2);
                });
            }
        };

        data.entities.forEach(e => renderEntityCtx(e));

        // 4. Draw Ghosting for tools
        if (drawingStart && cursorWorldPos) {
            if (tool === 'line') {
                renderEntityCtx({ id: 'ghost', type: 'LINE', layer: 'ghost', startPoint: drawingStart, endPoint: cursorWorldPos }, true);
            } else if (tool === 'circle') {
                const dx = cursorWorldPos.x - drawingStart.x;
                const dy = cursorWorldPos.y - drawingStart.y;
                renderEntityCtx({ id: 'ghost', type: 'CIRCLE', layer: 'ghost', center: drawingStart, radius: Math.sqrt(dx * dx + dy * dy) }, true);
            } else if (tool === 'rectangle') {
                renderEntityCtx({
                    id: 'ghost', type: 'LWPOLYLINE', layer: 'ghost',
                    vertices: [
                        { x: drawingStart.x, y: drawingStart.y }, { x: cursorWorldPos.x, y: drawingStart.y },
                        { x: cursorWorldPos.x, y: cursorWorldPos.y }, { x: drawingStart.x, y: cursorWorldPos.y },
                        { x: drawingStart.x, y: drawingStart.y }
                    ]
                }, true);
            }
        }

    }, [data, viewport, selectedIds, hoveredId, drawingStart, cursorWorldPos, tool]);

    // Zoom and pan handler
    useEffect(() => {
        const canvas = containerRef.current;
        if (!canvas) return;

        let touchStartDistance = 0;
        let initialScale = 1;
        let initialOffset = { x: 0, y: 0 };
        let touchCenter = { x: 0, y: 0 };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // ctrlKey is set for trackpad pinch-to-zoom gestures
            // Also treat mouse scroll wheel as zoom (when no horizontal delta)
            const isZoom = e.ctrlKey || (e.deltaX === 0 && Math.abs(e.deltaY) > 0 && !e.shiftKey);

            if (isZoom) {
                // Zoom: positive deltaY = scroll down = zoom out, negative deltaY = scroll up = zoom in
                // For trackpad pinch: pinching fingers together = positive deltaY = zoom out
                // Spreading fingers apart = negative deltaY = zoom in
                const zoomIntensity = e.ctrlKey ? 0.01 : 0.002; // Trackpad pinch is more sensitive
                const delta = -e.deltaY * zoomIntensity;
                const scaleFactor = Math.exp(delta);

                setViewport(prev => {
                    const newScale = Math.min(Math.max(0.1, prev.scale * scaleFactor), 512);

                    // Calculate zoom origin in world coordinates using previous values
                    const worldX = (mouseX - prev.offset.x) / prev.scale;
                    const worldY = (mouseY - prev.offset.y) / prev.scale;

                    // Adjust offset to zoom toward mouse position
                    const newOffsetX = mouseX - worldX * newScale;
                    const newOffsetY = mouseY - worldY * newScale;

                    return {
                        scale: newScale,
                        offset: { x: newOffsetX, y: newOffsetY }
                    };
                });
            } else {
                // Two-finger scroll on trackpad - pan the view
                setViewport(prev => ({
                    ...prev,
                    offset: {
                        x: prev.offset.x - e.deltaX,
                        y: prev.offset.y - e.deltaY
                    }
                }));
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                touchStartDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );

                // Capture current viewport state at touch start
                setViewport(prev => {
                    initialScale = prev.scale;
                    initialOffset = { ...prev.offset };
                    return prev;
                });

                // Calculate center point between the two touches
                touchCenter = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && touchStartDistance > 0) {
                e.preventDefault();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );

                // Spread fingers apart = larger distance = zoom in
                // Pinch fingers together = smaller distance = zoom out
                const scaleRatio = currentDistance / touchStartDistance;
                const newScale = Math.min(Math.max(0.1, initialScale * scaleRatio), 512);

                // Get the center point in world coordinates using initial values
                const rect = canvas.getBoundingClientRect();
                const centerX = touchCenter.x - rect.left;
                const centerY = touchCenter.y - rect.top;
                const worldX = (centerX - initialOffset.x) / initialScale;
                const worldY = (centerY - initialOffset.y) / initialScale;

                // Adjust offset to zoom toward the center point
                const newOffsetX = centerX - worldX * newScale;
                const newOffsetY = centerY - worldY * newScale;

                setViewport({
                    scale: newScale,
                    offset: { x: newOffsetX, y: newOffsetY }
                });
            }
        };

        const handleTouchEnd = () => {
            touchStartDistance = 0;
        };

        // Add event listeners
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

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
                        newEntity = { id: newId, type: 'CIRCLE', layer: 'User Drawing', center: drawingStart, radius: Math.sqrt(dx * dx + dy * dy), color: 4 };
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
                const hitId = findEntityAt(cursorWorldPos);
                onSelect(hitId || '');
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
            const wp = { x: worldX, y: worldY, z: 0 };
            setCursorWorldPos(wp);

            if (tool === 'select' && !isPanning) {
                setHoveredId(findEntityAt(wp));
            }
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

    const leftBound = containerRef.current ? -viewport.offset.x / viewport.scale : 0;
    const rightBound = containerRef.current ? (containerRef.current.clientWidth - viewport.offset.x) / viewport.scale : 0;

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
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* Info Overlay */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-1 text-[10px] text-gray-400 font-mono bg-black/95 p-3 rounded-lg border border-white/10 shadow-2xl min-w-[200px] backdrop-blur-sm pointer-events-none">
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
                    <span className="opacity-50 text-[9px]">SCALE</span>
                    <span>x{viewport.scale.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export default Canvas;
