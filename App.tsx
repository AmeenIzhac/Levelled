import { scan } from 'react-scan';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { parseDxfFile } from './services/dxfParser';
import { downloadPythonFormatJson, exportToPythonFormat } from './services/jsonExporter';
import { DxfData, ViewportState, DrawingTool, DxfEntity } from './types';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import Canvas from './components/Canvas';

scan({
  enabled: true
});

const DEFAULT_DATA: DxfData = {
  entities: [],
  layers: ['User Drawing'],
  layerColors: {},
  layerTrueColors: {},
  bounds: {
    min: { x: -100, y: -100 },
    max: { x: 100, y: 100 },
    center: { x: 0, y: 0 },
    width: 200,
    height: 200
  }
};

const ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128, 256, 512];

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sectioningStep, setSectioningStep] = useState<'none' | 'RoadEdge' | 'PavementEdge'>('none');
  const isSectioning = sectioningStep !== 'none';
  const [tool, setTool] = useState<DrawingTool>('select');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const [jsonSearch, setJsonSearch] = useState<string>('');
  const [jsonSearchIndex, setJsonSearchIndex] = useState(0);
  const jsonSearchRef = useRef<HTMLInputElement>(null);
  const jsonContainerRef = useRef<HTMLPreElement>(null);

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  const handleSidebarSelect = useCallback((id: string) => {
    if (sectioningStep !== 'none') {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedIds(id ? [id] : []);
    }
  }, [sectioningStep]);

  const jsonMatches = useMemo(() => {
    if (!jsonPreview || !jsonSearch || jsonSearch.length < 2) return [];
    const matches: number[] = [];
    const regex = new RegExp(jsonSearch, 'gi');
    let match;
    while ((match = regex.exec(jsonPreview)) !== null) {
      matches.push(match.index);
    }
    return matches;
  }, [jsonPreview, jsonSearch]);

  useEffect(() => {
    if (jsonMatches.length > 0 && jsonSearchIndex >= jsonMatches.length) {
      setJsonSearchIndex(0);
    }
  }, [jsonMatches, jsonSearchIndex]);

  useEffect(() => {
    if (jsonMatches.length > 0 && jsonContainerRef.current) {
      const activeMatch = jsonContainerRef.current.querySelector('[data-search-match="active"]');
      if (activeMatch) {
        activeMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [jsonSearchIndex, jsonMatches]);

  const resetView = useCallback(() => {
    setViewport(getStandardViewport());
  }, [getStandardViewport]);

  // Escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (jsonPreview) setJsonPreview(null);
        else setSelectedIds([]);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && jsonPreview) {
        e.preventDefault();
        jsonSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jsonPreview]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileName(file.name);

      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const jsonData = JSON.parse(text) as DxfData;

        // Simple validation to check if it's our format
        if (!jsonData.entities || !jsonData.layers) {
          throw new Error('Invalid JSON format for CAD Explorer.');
        }

        setData(jsonData);
      } else {
        const parsedData = await parseDxfFile(file);

        setData(prev => ({
          ...parsedData,
          entities: [...prev.entities, ...parsedData.entities],
          layers: Array.from(new Set([...prev.layers, ...parsedData.layers])),
          layerColors: { ...prev.layerColors, ...parsedData.layerColors }
        }));
      }

      resetView();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to parse file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleExportJSON = () => {
    downloadPythonFormatJson(data, fileName ?? undefined);
  };

  const handleViewJSON = () => {
    const exportData = exportToPythonFormat(data, fileName ?? undefined);
    setJsonPreview(JSON.stringify(exportData, null, 2));
    setJsonSearch('');
    setJsonSearchIndex(0);
  };

  const handleCopyJSON = () => {
    if (jsonPreview) {
      navigator.clipboard.writeText(jsonPreview);
    }
  };

  const handleAddEntity = (entity: DxfEntity) => {
    setData(prev => ({
      ...prev,
      entities: [...prev.entities, entity],
      layers: prev.layers.includes(entity.layer) ? prev.layers : [...prev.layers, entity.layer]
    }));
    setSelectedIds([entity.id]);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
      setData(DEFAULT_DATA);
      setFileName(null);
      setSelectedIds([]);
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
      const prompt = `Analyze this CAD entity: ${entity.type} on layer ${entity.layer}. Geometry: ${JSON.stringify(entity.vertices || { center: entity.center, radius: entity.radius })}. Explain its function in a professional blueprint context.`;
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

  const handleConfirmSectioning = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one entity.");
      return;
    }

    const currentLayer = sectioningStep;

    setData(prev => ({
      ...prev,
      entities: prev.entities.map(e =>
        selectedIds.includes(e.id) ? { ...e, layer: currentLayer } : e
      ),
      layers: [currentLayer, ...prev.layers.filter(l => l !== currentLayer)]
    }));

    if (sectioningStep === 'RoadEdge') {
      setSectioningStep('PavementEdge');
      setSelectedIds([]);
    } else {
      setSectioningStep('none');
      setSelectedIds([]);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f0f] overflow-hidden text-[#e5e7eb]">
      <Toolbar
        onFileUpload={handleFileUpload}
        tool={tool}
        setTool={setTool}
        onClear={handleClear}
        onExportJSON={handleExportJSON}
        onViewJSON={handleViewJSON}
        fileName={fileName}
        isSectioning={isSectioning}
        showSectioningButton={data.entities.length > 0}
        onStartSectioning={() => {
          setSectioningStep('RoadEdge');
          setSelectedIds([]);
          setTool('select');
        }}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          data={data}
          selectedIds={selectedIds}
          onSelect={handleSidebarSelect}
        />
        <Canvas
          data={data} viewport={viewport} setViewport={setViewport}
          selectedIds={selectedIds}
          onSelect={(id) => {
            if (isSectioning) {
              setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
            } else {
              setSelectedIds(id ? [id] : []);
            }
          }}
          tool={tool}
          onAddEntity={handleAddEntity}
        />
        <PropertiesPanel
          selectedEntity={data.entities.find(e => e.id === selectedId) || null}
          onAIAssist={handleAIAssist}
          isAnalyzing={isAnalyzing}
          layerColors={data.layerColors}
          layerTrueColors={data.layerTrueColors}
        />
      </div>
      {isSectioning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#1e1e1e] border border-orange-500/50 rounded-xl px-6 py-4 shadow-2xl z-[80] flex items-center gap-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col">
            <span className="text-orange-400 font-bold text-sm tracking-wider uppercase">
              Sectioning Mode: {sectioningStep === 'RoadEdge' ? 'Road' : 'Pavement'}
            </span>
            <span className="text-gray-300 text-xs">
              Select the {sectioningStep === 'RoadEdge' ? 'road' : 'pavement'} edge and press confirm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSectioningStep('none'); setSelectedIds([]); }}
              className="px-4 py-2 bg-[#2c2c2c] hover:bg-[#3c3c3c] text-gray-300 text-xs font-bold rounded-md transition-colors border border-[#444]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSectioning}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-md transition-colors shadow-lg active:scale-95"
            >
              Confirm {sectioningStep === 'RoadEdge' ? 'Road' : 'Pavement'} ({selectedIds.length})
            </button>
          </div>
        </div>
      )}
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
      {jsonPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-[#1e1e1e] border border-green-500/30 rounded-xl max-w-5xl w-full max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col relative">
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-gradient-to-r from-green-900/20 to-emerald-900/20">
              <h3 className="text-green-400 font-bold flex items-center gap-2">JSON PREVIEW</h3>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#2c2c2c] rounded-md border border-[#444] px-2 py-1 focus-within:border-green-500/50 transition-colors">
                  <Search size={14} className="text-gray-500 mr-2" />
                  <input
                    ref={jsonSearchRef}
                    type="text"
                    placeholder="Find in JSON..."
                    value={jsonSearch}
                    onChange={e => {
                      setJsonSearch(e.target.value);
                      setJsonSearchIndex(0);
                    }}
                    className="bg-transparent border-none outline-none text-xs text-gray-200 w-40"
                  />
                  {jsonSearch && (
                    <div className="flex items-center gap-1 ml-2 border-l border-[#444] pl-2">
                      <span className="text-[10px] text-gray-500 whitespace-nowrap min-w-[40px]">
                        {jsonMatches.length > 0 ? `${jsonSearchIndex + 1} of ${jsonMatches.length}` : '0 of 0'}
                      </span>
                      <button
                        onClick={() => setJsonSearchIndex(prev => (prev > 0 ? prev - 1 : jsonMatches.length - 1))}
                        className="p-0.5 hover:bg-[#444] rounded text-gray-400 disabled:opacity-30"
                        disabled={jsonMatches.length === 0}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => setJsonSearchIndex(prev => (prev < jsonMatches.length - 1 ? prev + 1 : 0))}
                        className="p-0.5 hover:bg-[#444] rounded text-gray-400 disabled:opacity-30"
                        disabled={jsonMatches.length === 0}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => { setJsonSearch(''); setJsonSearchIndex(0); }}
                        className="p-0.5 hover:bg-[#444] rounded text-gray-400 ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => setJsonPreview(null)} className="text-gray-500 hover:text-white text-xl ml-4">&times;</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-[#141414]">
              <pre
                ref={jsonContainerRef}
                className="text-xs text-gray-300 font-mono whitespace-pre selection:bg-green-500/30 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    if (!jsonSearch || jsonSearch.length < 2) return jsonPreview;

                    let lastIdx = 0;
                    let html = '';
                    const regex = new RegExp(jsonSearch, 'gi');
                    let match;
                    let i = 0;

                    while ((match = regex.exec(jsonPreview)) !== null) {
                      const isActive = i === jsonSearchIndex;
                      html += jsonPreview.slice(lastIdx, match.index);
                      html += `<mark ${isActive ? 'data-search-match="active"' : ''} class="${isActive ? 'bg-yellow-500 text-black' : 'bg-green-900/50 text-green-200'} rounded-[1px] px-[1px] transition-colors">${match[0]}</mark>`;
                      lastIdx = regex.lastIndex;
                      i++;
                    }
                    html += jsonPreview.slice(lastIdx);
                    return html;
                  })()
                }}
              />
            </div>

            <div className="p-4 bg-[#1a1a1a] border-t border-[#333] flex justify-end gap-2">
              <button
                onClick={handleCopyJSON}
                className="px-4 py-2 bg-[#2c2c2c] hover:bg-[#3c3c3c] text-gray-300 text-xs font-bold rounded-md transition-colors border border-[#444]"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => { handleExportJSON(); setJsonPreview(null); }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md transition-colors shadow-lg active:scale-95"
              >
                Download JSON
              </button>
              <button
                onClick={() => setJsonPreview(null)}
                className="px-4 py-2 bg-[#2c2c2c] hover:bg-[#3c3c3c] text-gray-300 text-xs font-bold rounded-md transition-colors border border-[#444]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
