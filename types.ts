
export interface Point {
  x: number;
  y: number;
  z?: number;
}

export type EntityType = 'LINE' | 'CIRCLE' | 'ARC' | 'LWPOLYLINE' | 'POLYLINE' | 'RECTANGLE';

export interface DxfEntity {
  type: EntityType;
  layer: string;
  color?: number;
  vertices?: Point[];
  center?: Point;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  startPoint?: Point;
  endPoint?: Point;
  thickness?: number;
  id: string;
}

export interface DxfData {
  entities: DxfEntity[];
  layers: string[];
  layerColors: Record<string, number>;
  bounds: {
    min: Point;
    max: Point;
    center: Point;
    width: number;
    height: number;
  };
}

export interface ViewportState {
  scale: number;
  offset: { x: number; y: number };
}

export type DrawingTool = 'select' | 'pan' | 'line' | 'circle' | 'rectangle';
