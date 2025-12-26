
import React from 'react';
import { Info, MapPin, Eye, Zap } from 'lucide-react';
import { DxfEntity } from '../types';

interface PropertiesPanelProps {
  selectedEntity: DxfEntity | null;
  onAIAssist: () => void;
  isAnalyzing: boolean;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedEntity, onAIAssist, isAnalyzing }) => {
  return (
    <div className="w-72 bg-[#1e1e1e] border-l border-[#333] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-[#333] flex items-center gap-2 font-medium text-xs text-gray-400 uppercase tracking-widest">
        <Info size={14} /> Properties
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!selectedEntity ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Eye size={48} className="text-gray-700 mb-4" />
            <p className="text-sm text-gray-500 italic">Select an element on the canvas to inspect its 3D coordinates.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Entity Info</label>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Type</span>
                  <span className="text-gray-200 font-mono">{selectedEntity.type}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Layer</span>
                  <span className="text-gray-200 font-mono truncate ml-4">{selectedEntity.layer}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 flex items-center gap-1">
                <MapPin size={10} /> X, Y, Z Coordinates
              </label>
              <div className="bg-[#2c2c2c] rounded-lg overflow-hidden border border-[#333]">
                <table className="w-full text-[11px] font-mono">
                  <thead className="bg-[#383838] text-gray-400">
                    <tr>
                      <th className="px-2 py-1.5 text-left border-b border-[#444]">Point</th>
                      <th className="px-2 py-1.5 text-right border-b border-[#444]">X</th>
                      <th className="px-2 py-1.5 text-right border-b border-[#444]">Y</th>
                      <th className="px-2 py-1.5 text-right border-b border-[#444] text-blue-400 font-bold">Z</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEntity.vertices ? selectedEntity.vertices.map((v, i) => (
                      <tr key={i} className="hover:bg-[#444] transition-colors">
                        <td className="px-2 py-1 text-gray-500 border-b border-[#333]">{i}</td>
                        <td className="px-2 py-1 text-right text-gray-200 border-b border-[#333]">{v.x.toFixed(2)}</td>
                        <td className="px-2 py-1 text-right text-gray-200 border-b border-[#333]">{v.y.toFixed(2)}</td>
                        <td className="px-2 py-1 text-right text-blue-300 font-bold border-b border-[#333]">{(v.z || 0).toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr className="hover:bg-[#444] transition-colors">
                        <td className="px-2 py-1 text-gray-500 border-b border-[#333]">Pos</td>
                        <td className="px-2 py-1 text-right text-gray-200 border-b border-[#333]">{selectedEntity.center?.x.toFixed(2) || selectedEntity.startPoint?.x.toFixed(2) || '0'}</td>
                        <td className="px-2 py-1 text-right text-gray-200 border-b border-[#333]">{selectedEntity.center?.y.toFixed(2) || selectedEntity.startPoint?.y.toFixed(2) || '0'}</td>
                        <td className="px-2 py-1 text-right text-blue-300 font-bold border-b border-[#333]">{(selectedEntity.center?.z || selectedEntity.startPoint?.z || 0).toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedEntity.radius !== undefined && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Geometric Details</label>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Radius</span>
                  <span className="text-gray-200 font-mono">{selectedEntity.radius.toFixed(2)} units</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-[#333] bg-[#252525]">
        <button 
          onClick={onAIAssist}
          disabled={isAnalyzing || !selectedEntity}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded-md text-xs font-semibold text-white transition-all shadow-lg"
        >
          <Zap size={14} fill="currentColor" />
          {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
