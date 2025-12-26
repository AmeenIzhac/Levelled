
import React from 'react';
import { 
  Upload, MousePointer2, Move, ZoomIn, ZoomOut, Maximize, FileCode, 
  Minus, Circle, Square, Trash2 
} from 'lucide-react';
import { DrawingTool } from '../types';

interface ToolbarProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tool: DrawingTool;
  setTool: (tool: DrawingTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onClear: () => void;
  fileName: string | null;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onFileUpload, 
  tool, 
  setTool, 
  onZoomIn, 
  onZoomOut, 
  onResetView,
  onClear,
  fileName 
}) => {
  return (
    <div className="h-12 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <FileCode size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline">CAD-VISION</span>
        </div>

        <div className="flex bg-[#2c2c2c] rounded-md p-0.5 mr-2">
          <button 
            title="Select"
            onClick={() => setTool('select')}
            className={`p-1.5 rounded ${tool === 'select' ? 'bg-[#444] text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <MousePointer2 size={18} />
          </button>
          <button 
            title="Pan"
            onClick={() => setTool('pan')}
            className={`p-1.5 rounded ${tool === 'pan' ? 'bg-[#444] text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Move size={18} />
          </button>
        </div>

        <div className="flex bg-[#2c2c2c] rounded-md p-0.5">
          <button 
            title="Draw Line"
            onClick={() => setTool('line')}
            className={`p-1.5 rounded ${tool === 'line' ? 'bg-[#444] text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Minus size={18} />
          </button>
          <button 
            title="Draw Circle"
            onClick={() => setTool('circle')}
            className={`p-1.5 rounded ${tool === 'circle' ? 'bg-[#444] text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Circle size={18} />
          </button>
          <button 
            title="Draw Rectangle"
            onClick={() => setTool('rectangle')}
            className={`p-1.5 rounded ${tool === 'rectangle' ? 'bg-[#444] text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Square size={18} />
          </button>
        </div>

        <div className="h-6 w-[1px] bg-[#333] mx-2" />

        <div className="flex gap-1">
          <button onClick={onZoomIn} className="p-1.5 text-gray-400 hover:text-gray-200"><ZoomIn size={18} /></button>
          <button onClick={onZoomOut} className="p-1.5 text-gray-400 hover:text-gray-200"><ZoomOut size={18} /></button>
          <button onClick={onResetView} className="p-1.5 text-gray-400 hover:text-gray-200"><Maximize size={18} /></button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {fileName && (
          <span className="text-xs text-gray-500 font-mono hidden md:inline truncate max-w-[150px]">
            {fileName}
          </span>
        )}
        <button 
          onClick={onClear}
          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
          title="Clear Canvas"
        >
          <Trash2 size={18} />
        </button>
        <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors">
          <Upload size={14} />
          Import DXF
          <input type="file" accept=".dxf" className="hidden" onChange={onFileUpload} />
        </label>
      </div>
    </div>
  );
};

export default Toolbar;
