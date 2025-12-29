
import { DxfData, DxfEntity, Point } from '../types';
import DxfParser from 'https://esm.sh/dxf-parser';

const getMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[half];
  return (sorted[half - 1] + sorted[half]) / 2.0;
};

export const parseDxfFile = async (file: File): Promise<DxfData> => {
  const text = await file.text();
  const parser = new DxfParser();
  const dxf = parser.parseSync(text);

  if (!dxf || !dxf.entities) {
    throw new Error('Invalid DXF file or no entities found.');
  }

  // Extract layer colors from tables
  const layerColors: Record<string, number> = {};
  const layerTrueColors: Record<string, number> = {};
  if (dxf.tables && dxf.tables.layer && dxf.tables.layer.layers) {
    Object.values(dxf.tables.layer.layers).forEach((layer: any) => {
      layerColors[layer.name] = layer.color;

      // Check multiple possible property names for True Color
      let layerTC = layer.trueColor ?? layer.truecolor ?? layer.color24bit ?? layer.TRUECOLOR;
      if (layerTC !== undefined) {
        // Handle negative values
        if (layerTC < 0) {
          layerTC = Math.abs(layerTC) & 0xFFFFFF;
        }
        layerTrueColors[layer.name] = layerTC;
      }
    });
  }

  // 1. Initial extraction of raw coordinates to find medians
  const xCoords: number[] = [];
  const yCoords: number[] = [];

  const collectPoints = (e: any) => {
    const points: any[] = [];
    if (e.vertices) points.push(...e.vertices);
    if (e.center) points.push(e.center);
    if (e.position) points.push(e.position);
    if (e.start) points.push(e.start);
    if (e.end) points.push(e.end);

    points.forEach(p => {
      if (typeof p.x === 'number') xCoords.push(p.x);
      if (typeof p.y === 'number') yCoords.push(p.y);
    });
  };

  dxf.entities.forEach(collectPoints);

  const medianX = getMedian(xCoords);
  const medianY = getMedian(yCoords);

  // 2. Map entities and shift coordinates
  const shiftPoint = (p: Point | undefined): Point | undefined => {
    if (!p) return undefined;
    return {
      x: p.x - medianX,
      y: p.y - medianY,
      z: p.z || 0,
      bulge: p.bulge
    };
  };

  const entities: DxfEntity[] = dxf.entities.map((e: any, index: number) => {
    const type = e.type;
    const layer = e.layer;
    const color = e.color;
    // DXF parsers may use different property names for True Color
    // Also, some DXF files encode true color as negative values
    let trueColor = e.trueColor ?? e.truecolor ?? e.color24bit ?? e.TRUECOLOR;

    // Handle negative true color values (some DXF formats use this)
    if (trueColor && trueColor < 0) {
      trueColor = Math.abs(trueColor) & 0xFFFFFF;
    }

    const shiftedVertices = e.vertices ? e.vertices.map((v: any) => shiftPoint(v)) : undefined;
    const shiftedCenter = shiftPoint(e.center);
    const shiftedStart = shiftPoint(e.vertices ? e.vertices[0] : (e.position || e.start));
    const shiftedEnd = shiftPoint(e.vertices ? e.vertices[e.vertices.length - 1] : e.end);

    return {
      type,
      layer,
      color,
      trueColor,
      vertices: shiftedVertices,
      center: shiftedCenter,
      radius: e.radius,
      startAngle: e.startAngle,
      endAngle: e.endAngle,
      startPoint: shiftedStart,
      endPoint: shiftedEnd,
      id: `entity-${index}-${type}`,
    };
  });

  const layers = Array.from(new Set(entities.map(e => e.layer)));

  // 3. Calculate Bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  entities.forEach(e => {
    const points: Point[] = [];
    if (e.vertices) points.push(...e.vertices);
    if (e.center) {
      const r = e.radius || 0;
      points.push({ x: e.center.x - r, y: e.center.y - r });
      points.push({ x: e.center.x + r, y: e.center.y + r });
    }
    if (e.startPoint) points.push(e.startPoint);
    if (e.endPoint) points.push(e.endPoint);

    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
  });

  if (minX === Infinity) { minX = -50; minY = -50; maxX = 50; maxY = 50; }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    entities,
    layers,
    layerColors,
    layerTrueColors,
    bounds: {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
      center: { x: minX + width / 2, y: minY + height / 2 },
      width,
      height
    }
  };
};
