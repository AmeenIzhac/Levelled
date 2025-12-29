import { DxfData, DxfEntity, Point } from '../types';

/**
 * Converts a Point to [x, y, z] array format
 */
const pointToArray = (pt: Point | undefined): [number, number, number] | null => {
    if (!pt) return null;
    return [pt.x, pt.y, pt.z ?? 0];
};

/**
 * Basic entity info shared by all entity types
 */
const entityBasicInfo = (entity: DxfEntity) => ({
    type: entity.type,
    handle: entity.id, // Use our ID as handle since we don't preserve DXF handles
    layer: entity.layer,
    color: entity.color ?? null,
});

/**
 * Convert LINE entity to Python-compatible format
 */
const lineToJson = (entity: DxfEntity) => ({
    ...entityBasicInfo(entity),
    start: pointToArray(entity.startPoint) ?? [0, 0, 0],
    end: pointToArray(entity.endPoint) ?? [0, 0, 0],
});

/**
 * Convert CIRCLE entity to Python-compatible format
 */
const circleToJson = (entity: DxfEntity) => ({
    ...entityBasicInfo(entity),
    center: pointToArray(entity.center) ?? [0, 0, 0],
    radius: entity.radius ?? 0,
});

/**
 * Convert ARC entity to Python-compatible format
 */
const arcToJson = (entity: DxfEntity) => ({
    ...entityBasicInfo(entity),
    center: pointToArray(entity.center) ?? [0, 0, 0],
    radius: entity.radius ?? 0,
    start_angle_deg: entity.startAngle ?? 0,
    end_angle_deg: entity.endAngle ?? 0,
});

/**
 * Convert LWPOLYLINE entity to Python-compatible format
 * Points are [x, y, z, bulge] arrays
 */
const lwpolylineToJson = (entity: DxfEntity) => {
    const points: [number, number, number, number][] = [];

    if (entity.vertices) {
        for (const v of entity.vertices) {
            points.push([
                v.x,
                v.y,
                v.z ?? 0,
                v.bulge ?? 0
            ]);
        }
    }

    // Check if closed (first and last point are the same)
    const isClosed = entity.vertices && entity.vertices.length >= 2 &&
        entity.vertices[0].x === entity.vertices[entity.vertices.length - 1].x &&
        entity.vertices[0].y === entity.vertices[entity.vertices.length - 1].y;

    return {
        ...entityBasicInfo(entity),
        is_closed: isClosed ?? false,
        points,
    };
};

/**
 * Convert POLYLINE entity to Python-compatible format
 */
const polylineToJson = (entity: DxfEntity) => {
    // Same format as LWPOLYLINE for our purposes
    return lwpolylineToJson(entity);
};

/**
 * Entity type to converter function mapping
 */
const TYPE_HANDLERS: Record<string, (entity: DxfEntity) => object> = {
    LINE: lineToJson,
    CIRCLE: circleToJson,
    ARC: arcToJson,
    LWPOLYLINE: lwpolylineToJson,
    POLYLINE: polylineToJson,
    RECTANGLE: lwpolylineToJson, // Rectangles are just closed polylines
};

/**
 * Convert a single entity to Python-compatible JSON format
 */
const entityToJson = (entity: DxfEntity): object => {
    const handler = TYPE_HANDLERS[entity.type];
    return handler ? handler(entity) : entityBasicInfo(entity);
};

/**
 * Export DxfData to Python-script-compatible JSON format
 */
export const exportToPythonFormat = (data: DxfData, filename?: string): object => {
    return {
        filename: filename ?? 'untitled.dxf',
        acad_version: 'Unknown', // We don't preserve this
        entities: data.entities.map(entityToJson),
        layers: data.layers.map(layerName => ({
            name: layerName,
            color: data.layerColors[layerName] ?? null,
        })),
        blocks: [], // We don't currently support blocks
    };
};

/**
 * Export and download as JSON file in Python-compatible format
 */
export const downloadPythonFormatJson = (data: DxfData, filename?: string) => {
    const exportData = exportToPythonFormat(data, filename);
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const baseName = filename ? filename.replace(/\.(dxf|json)$/i, '') : 'drawing';

    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
