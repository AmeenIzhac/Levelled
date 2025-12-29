
/**
 * AutoCAD Color Index (ACI) standard mapping - Full 255 color palette.
 */
export const ACI_COLORS: Record<number, string> = {
    1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff', 5: '#0000ff',
    6: '#ff00ff', 7: '#ffffff', 8: '#808080', 9: '#c0c0c0',
    10: '#ff0000', 11: '#ff7f7f', 12: '#cc0000', 13: '#cc6666', 14: '#990000',
    15: '#994c4c', 16: '#7f0000', 17: '#7f3f3f', 18: '#4c0000', 19: '#4c2626',
    20: '#ff3f00', 21: '#ff9f7f', 22: '#cc3200', 23: '#cc7f66', 24: '#992600',
    25: '#995f4c', 26: '#7f1f00', 27: '#7f4f3f', 28: '#4c1300', 29: '#4c2f26',
    30: '#ff7f00', 31: '#ffbf7f', 32: '#cc6600', 33: '#cc9966', 34: '#994c00',
    35: '#99724c', 36: '#7f3f00', 37: '#7f5f3f', 38: '#4c2600', 39: '#4c3926',
    40: '#ffbf00', 41: '#ffdf7f', 42: '#cc9900', 43: '#ccb266', 44: '#997200',
    45: '#99854c', 46: '#7f5f00', 47: '#7f6f3f', 48: '#4c3900', 49: '#4c4226',
    50: '#ffff00', 51: '#ffff7f', 52: '#cccc00', 53: '#cccc66', 54: '#999900',
    55: '#99994c', 56: '#7f7f00', 57: '#7f7f3f', 58: '#4c4c00', 59: '#4c4c26',
    60: '#bfff00', 61: '#dfff7f', 62: '#99cc00', 63: '#b2cc66', 64: '#729900',
    65: '#85994c', 66: '#5f7f00', 67: '#6f7f3f', 68: '#394c00', 69: '#424c26',
    70: '#7fff00', 71: '#bfff7f', 72: '#66cc00', 73: '#99cc66', 74: '#4c9900',
    75: '#72994c', 76: '#3f7f00', 77: '#5f7f3f', 78: '#264c00', 79: '#394c26',
    80: '#3fff00', 81: '#9fff7f', 82: '#32cc00', 83: '#7fcc66', 84: '#269900',
    85: '#5f994c', 86: '#1f7f00', 87: '#4f7f3f', 88: '#134c00', 89: '#2f4c26',
    90: '#00ff00', 91: '#7fff7f', 92: '#00cc00', 93: '#66cc66', 94: '#009900',
    95: '#4c994c', 96: '#007f00', 97: '#3f7f3f', 98: '#004c00', 99: '#264c26',
    100: '#00ff3f', 101: '#7fff9f', 102: '#00cc32', 103: '#66cc7f', 104: '#009926',
    105: '#4c995f', 106: '#007f1f', 107: '#3f7f4f', 108: '#004c13', 109: '#264c2f',
    110: '#00ff7f', 111: '#7fffbf', 112: '#00cc66', 113: '#66cc99', 114: '#00994c',
    115: '#4c9972', 116: '#007f3f', 117: '#3f7f5f', 118: '#004c26', 119: '#264c39',
    120: '#00ffbf', 121: '#7fffdf', 122: '#00cc99', 123: '#66ccb2', 124: '#009972',
    125: '#4c9985', 126: '#007f5f', 127: '#3f7f6f', 128: '#004c39', 129: '#264c42',
    130: '#00ffff', 131: '#7fffff', 132: '#00cccc', 133: '#66cccc', 134: '#009999',
    135: '#4c9999', 136: '#007f7f', 137: '#3f7f7f', 138: '#004c4c', 139: '#264c4c',
    140: '#00bfff', 141: '#7fdfff', 142: '#0099cc', 143: '#66b2cc', 144: '#007299',
    145: '#4c8599', 146: '#005f7f', 147: '#3f6f7f', 148: '#00394c', 149: '#26424c',
    150: '#007fff', 151: '#7fbfff', 152: '#0066cc', 153: '#6699cc', 154: '#004c99',
    155: '#4c7299', 156: '#003f7f', 157: '#3f5f7f', 158: '#00264c', 159: '#26394c',
    160: '#003fff', 161: '#7f9fff', 162: '#0032cc', 163: '#667fcc', 164: '#002699',
    165: '#4c5f99', 166: '#001f7f', 167: '#3f4f7f', 168: '#00134c', 169: '#262f4c',
    170: '#0000ff', 171: '#7f7fff', 172: '#0000cc', 173: '#6666cc', 174: '#000099',
    175: '#4c4c99', 176: '#00007f', 177: '#3f3f7f', 178: '#00004c', 179: '#26264c',
    180: '#3f00ff', 181: '#9f7fff', 182: '#3200cc', 183: '#7f66cc', 184: '#260099',
    185: '#5f4c99', 186: '#1f007f', 187: '#4f3f7f', 188: '#13004c', 189: '#2f264c',
    190: '#7f00ff', 191: '#bf7fff', 192: '#6600cc', 193: '#9966cc', 194: '#4c0099',
    195: '#724c99', 196: '#3f007f', 197: '#5f3f7f', 198: '#26004c', 199: '#39264c',
    200: '#bf00ff', 201: '#df7fff', 202: '#9900cc', 203: '#b266cc', 204: '#720099',
    205: '#854c99', 206: '#5f007f', 207: '#6f3f7f', 208: '#39004c', 209: '#42264c',
    210: '#ff00ff', 211: '#ff7fff', 212: '#cc00cc', 213: '#cc66cc', 214: '#990099',
    215: '#994c99', 216: '#7f007f', 217: '#7f3f7f', 218: '#4c004c', 219: '#4c264c',
    220: '#ff00bf', 221: '#ff7fdf', 222: '#cc0099', 223: '#cc66b2', 224: '#990072',
    225: '#994c85', 226: '#7f005f', 227: '#7f3f6f', 228: '#4c0039', 229: '#4c2642',
    230: '#ff007f', 231: '#ff7fbf', 232: '#cc0066', 233: '#cc6699', 234: '#99004c',
    235: '#994c72', 236: '#7f003f', 237: '#7f3f5f', 238: '#4c0026', 239: '#4c2639',
    240: '#ff003f', 241: '#ff7f9f', 242: '#cc0032', 243: '#cc667f', 244: '#990026',
    245: '#994c5f', 246: '#7f001f', 247: '#7f3f4f', 248: '#4c0013', 249: '#4c262f',
    250: '#333333', 251: '#505050', 252: '#696969', 253: '#828282', 254: '#bebebe', 255: '#ffffff'
};

export const trueColorToHex = (trueColor: number): string => {
    return '#' + trueColor.toString(16).padStart(6, '0');
};

export const getDxfColor = (
    colorIndex: number | undefined | null,
    trueColor: number | undefined | null,
    layer: string,
    layerColors: Record<string, number>,
    layerTrueColors: Record<string, number>
): string => {
    // 1. Check entity true color
    if (trueColor !== undefined && trueColor !== null) {
        return trueColorToHex(trueColor);
    }

    // 2. Check if colorIndex is actually a True Color (ACI only goes 1-255)
    if (colorIndex !== undefined && colorIndex !== null && colorIndex > 255) {
        return trueColorToHex(colorIndex);
    }

    // 3. Check entity ACI (if not ByLayer/ByBlock)
    if (colorIndex !== undefined && colorIndex !== null && colorIndex !== 0 && colorIndex !== 256) {
        return ACI_COLORS[colorIndex] || '#9ca3af';
    }

    // 4. Check if layer color is actually a True Color
    const layerAci = layerColors[layer];
    if (layerAci !== undefined && layerAci > 255) {
        return trueColorToHex(layerAci);
    }

    // 5. Fallback to layer true color
    if (layerTrueColors[layer] !== undefined && layerTrueColors[layer] !== null) {
        return trueColorToHex(layerTrueColors[layer]);
    }

    // 6. Fallback to layer ACI
    const finalAci = layerAci ?? 7;
    return ACI_COLORS[finalAci] || '#9ca3af';
};

export const getColorInfo = (
    colorIndex: number | undefined | null,
    trueColor: number | undefined | null,
    layer: string,
    layerColors: Record<string, number>,
    layerTrueColors: Record<string, number>
) => {
    let hex = '#9ca3af';
    let label = 'Unknown';
    let isByLayer = false;
    let finalTrueColor = trueColor;
    let finalAci = colorIndex;

    if (trueColor !== undefined && trueColor !== null) {
        hex = trueColorToHex(trueColor);
        label = `True Color (${hex})`;
    } else if (colorIndex !== undefined && colorIndex !== null && colorIndex > 255) {
        // colorIndex is actually a True Color
        finalTrueColor = colorIndex;
        hex = trueColorToHex(colorIndex);
        label = `True Color (${hex})`;
        finalAci = undefined;
    } else if (colorIndex !== undefined && colorIndex !== null && colorIndex !== 0 && colorIndex !== 256) {
        hex = ACI_COLORS[colorIndex] || '#9ca3af';
        label = `ACI ${colorIndex}`;
    } else {
        isByLayer = true;
        const layerColor = layerColors[layer];

        // Check if layer color is actually a True Color
        if (layerColor !== undefined && layerColor > 255) {
            finalTrueColor = layerColor;
            hex = trueColorToHex(layerColor);
            label = `Layer True Color (${hex})`;
            finalAci = undefined;
        } else if (layerTrueColors[layer] !== undefined && layerTrueColors[layer] !== null) {
            finalTrueColor = layerTrueColors[layer];
            hex = trueColorToHex(finalTrueColor);
            label = `Layer True Color (${hex})`;
        } else {
            finalAci = layerColor ?? 7;
            hex = ACI_COLORS[finalAci] || '#9ca3af';
            label = `Layer ACI ${finalAci}`;
        }
    }

    return {
        hex,
        label,
        isByLayer,
        trueColor: finalTrueColor,
        aci: finalAci
    };
};
