
import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { parseDxfFile } from './services/dxfParser';
import { DxfData, ViewportState, DrawingTool, DxfEntity } from './types';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import Canvas from './components/Canvas';

const DEFAULT_DATA: DxfData = {
  entities: [],
  layers: ['User Drawing'],
  layerColors: {},
  bounds: {
    min: { x: -100, y: -100 },
    max: { x: 100, y: 100 },
    center: { x: 0, y: 0 },
    width: 200,
    height: 200
  }
};

const App: React.FC = () => {
  const sidebarLeftWidth = 256;
  const sidebarRightWidth = 288;
  const toolbarHeight = 48;

  const getStandardViewport = useCallback((): ViewportState => {
    const canvasWidth = window.innerWidth - sidebarLeftWidth - sidebarRightWidth;
    const canvasHeight = window.innerHeight - toolbarHeight;
    const effectiveWidth = Math.max(canvasWidth, 100);
    const effectiveHeight = Math.max(canvasHeight, 100);

    const targetWorldWidth = 120;
    const scale = effectiveWidth / targetWorldWidth;

    const offsetX = effectiveWidth / 2;
    const offsetY = effectiveHeight / 2;

    return { scale, offset: { x: offsetX, y: offsetY } };
  }, [sidebarLeftWidth, sidebarRightWidth, toolbarHeight]);

  const [data, setData] = useState<DxfData>(DEFAULT_DATA);
  const [viewport, setViewport] = useState<ViewportState>(getStandardViewport);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<DrawingTool>('select');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const resetView = useCallback(() => {
    setViewport(getStandardViewport());
  }, [getStandardViewport]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileName(file.name);
      const parsedData = await parseDxfFile(file);
      
      setData(prev => ({
        ...parsedData,
        entities: [...prev.entities, ...parsedData.entities],
        layers: Array.from(new Set([...prev.layers, ...parsedData.layers])),
        layerColors: { ...prev.layerColors, ...parsedData.layerColors }
      }));
      
      resetView();
      setSelectedId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to parse DXF file.');
    }
  };

  const handleAddEntity = (entity: DxfEntity) => {
    setData(prev => ({
      ...prev,
      entities: [...prev.entities, entity],
      layers: prev.layers.includes(entity.layer) ? prev.layers : [...prev.layers, entity.layer]
    }));
    setSelectedId(entity.id);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
      setData(DEFAULT_DATA);
      setFileName(null);
      setSelectedId(null);
      resetView();
    }
  };

  const handleAIAssist = async () => {
    if (!selectedId || !data) return;
    const entity = data.entities.find(e => e.id === selectedId);
    if (!entity) return;

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze this CAD entity: ${entity.type} on layer ${entity.layer}. Geometry: ${JSON.stringify(entity.vertices || {center: entity.center, radius: entity.radius})}. Explain its function in a professional blueprint context.`;
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiMessage(result.text);
    } catch (err) {
      setAiMessage("AI analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f0f] overflow-hidden text-[#e5e7eb]">
      <Toolbar 
        onFileUpload={handleFileUpload} tool={tool} setTool={setTool}
        onZoomIn={() => setViewport(v => ({ ...v, scale: v.scale * 1.5 }))}
        onZoomOut={() => setViewport(v => ({ ...v, scale: v.scale / 1.5 }))}
        onResetView={resetView} onClear={handleClear} fileName={fileName}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar data={data} selectedId={selectedId} onSelect={setSelectedId} />
        <Canvas 
          data={data} viewport={viewport} setViewport={setViewport}
          selectedId={selectedId} onSelect={setSelectedId} tool={tool} onAddEntity={handleAddEntity}
        />
        <PropertiesPanel 
          selectedEntity={data.entities.find(e => e.id === selectedId) || null}
          onAIAssist={handleAIAssist} isAnalyzing={isAnalyzing}
        />
      </div>
      {aiMessage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-[#1e1e1e] border border-blue-500/30 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-purple-900/20">
              <h3 className="text-blue-400 font-bold flex items-center gap-2">AI GEOMETRIC INSIGHT</h3>
              <button onClick={() => setAiMessage(null)} className="text-gray-500 hover:text-white">&times;</button>
            </div>
            <div className="p-6 text-sm leading-relaxed text-gray-300 max-h-[60vh] overflow-y-auto whitespace-pre-wrap selection:bg-blue-500/30">{aiMessage}</div>
            <div className="p-4 bg-[#1a1a1a] border-t border-[#333] flex justify-end">
              <button onClick={() => setAiMessage(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition-colors shadow-lg active:scale-95">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
