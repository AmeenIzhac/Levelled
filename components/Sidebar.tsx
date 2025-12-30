
import React from 'react';
import { Layers, Hash, Circle, Square, Minus } from 'lucide-react';
import { DxfData, DxfEntity } from '../types';

interface SidebarProps {
  data: DxfData | null;
  selectedIds: string[];
  onSelect: (id: string) => void;
}

// Pre-created icon elements - same reference avoids DOM recreation
const ENTITY_ICONS: Record<string, React.ReactNode> = {
  CIRCLE: <Circle size={14} />,
  LWPOLYLINE: <Square size={14} />,
  POLYLINE: <Square size={14} />,
  LINE: <Minus size={14} />,
  DEFAULT: <Hash size={14} />,
};

const getEntityIcon = (type: string) => ENTITY_ICONS[type] || ENTITY_ICONS.DEFAULT;

const Sidebar: React.FC<SidebarProps> = ({ data, selectedIds, onSelect }) => {
  if (!data) return (
    <div className="w-64 bg-[#1e1e1e] border-r border-[#333] flex flex-col items-center justify-center p-8 text-center">
      <Layers className="text-gray-700 mb-4" size={48} />
      <p className="text-sm text-gray-500">Upload a DXF file to see layers and entities.</p>
    </div>
  );

  return (
    <div className="w-64 bg-[#1e1e1e] border-r border-[#333] flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-[#333] flex items-center gap-2 font-medium text-xs text-gray-400 uppercase tracking-widest">
        <Layers size={14} /> Layers & Entities
      </div>
      <div className="flex-1 overflow-y-auto">
        {data.layers.map(layer => (
          <div key={layer}>
            <div className="px-3 py-2 bg-[#252525] text-xs font-semibold text-gray-500 border-y border-[#333]">
              {layer}
            </div>
            {data.entities.filter(e => e.layer === layer).map(entity => (
              <button
                key={entity.id}
                onClick={() => onSelect(entity.id)}
                className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors border-l-2 ${selectedIds.includes(entity.id)
                  ? 'bg-blue-900/20 text-blue-400 border-blue-500'
                  : 'text-gray-400 border-transparent hover:bg-[#2c2c2c] hover:text-gray-200'
                  }`}
              >
                {getEntityIcon(entity.type)}
                <span className="truncate">{entity.type}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(Sidebar);

