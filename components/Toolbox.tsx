import React, { useState, useRef } from 'react';
import { GenerationMode, ComicPanel, ComicStyle, PanelSplitLayout, GutterSize, GridLayout, Character } from '../types';
import { Button } from './Button';
import { v4 as uuidv4 } from 'uuid';

interface ToolboxProps {
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  selectedPanel: ComicPanel | undefined;
  activeSlotId: string | null;
  isProcessing: boolean;
  onGenerate: (prompt: string, style: ComicStyle, sketchBase64?: string) => void;
  onEdit: (prompt: string) => void;
  onNarrativeAssist: (type: 'PLOT' | 'DIALOGUE' | 'NEXT_PANEL', context: string, charContext?: string) => Promise<string>;
  onUpdateCaption: (id: string, caption: string) => void;
  onChangeSplitLayout: (id: string, layout: PanelSplitLayout) => void;
  onUpdatePanelSpan: (id: string, span: 1 | 2 | 3 | 4 | 5 | 6) => void;
  onToggleOverlay: (id: string, type: any) => void;
  gutterSize: GutterSize;
  setGutterSize: (size: GutterSize) => void;
  panelsCount: number;
  lastPanelPrompt?: string;
  characters: Character[];
  onUpdateCharacters: (characters: Character[]) => void;
  gridLayout: GridLayout;
  setGridLayout: (layout: GridLayout) => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  mode,
  setMode,
  selectedPanel,
  activeSlotId,
  isProcessing,
  onGenerate,
  onEdit,
  onNarrativeAssist,
  onUpdateCaption,
  onChangeSplitLayout,
  onUpdatePanelSpan,
  onToggleOverlay,
  gutterSize,
  setGutterSize,
  panelsCount,
  lastPanelPrompt,
  characters,
  onUpdateCharacters,
  gridLayout,
  setGridLayout
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<ComicStyle>('MODERN');
  const [narrativeContext, setNarrativeContext] = useState('');
  const [uploadedSketch, setUploadedSketch] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styles: { id: ComicStyle; label: string }[] = [
    { id: 'MODERN', label: 'Modern' },
    { id: 'SUPERHERO', label: 'Superhero (Marvel)' },
    { id: 'MANGA', label: 'Manga / Anime' },
    { id: 'GHIBLI', label: 'Studio Ghibli' },
    { id: 'NOIR', label: 'Noir (B&W)' },
    { id: 'RETRO', label: 'Vintage 50s' },
    { id: 'CYBERPUNK', label: 'Cyberpunk' },
    { id: 'FANTASY', label: 'Epic Fantasy' },
    { id: 'HORROR', label: 'Horror / Dark' },
    { id: 'SKETCH', label: 'Sketch' },
    { id: 'WATERCOLOR', label: 'Watercolor' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedSketch(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    if (mode === GenerationMode.CREATE) {
      onGenerate(prompt, style, uploadedSketch || undefined);
      setPrompt('');
      setUploadedSketch(null); 
    } else if (mode === GenerationMode.EDIT) {
      onEdit(prompt);
      setPrompt('');
    }
  };
  
  const getCharacterContextString = () => {
    if (characters.length === 0) return '';
    return characters.map(c => `${c.name}: ${c.description}`).join('. ');
  };

  const handleStoryAssist = async (type: 'PLOT' | 'DIALOGUE' | 'NEXT_PANEL') => {
    let context = narrativeContext;
    const charContext = getCharacterContextString();
    
    if (type === 'DIALOGUE' && selectedPanel) {
       const activeImage = selectedPanel.images.find(img => img.id === activeSlotId);
       context = activeImage ? activeImage.prompt : selectedPanel.images[0]?.prompt || '';
    } else if (type === 'NEXT_PANEL' && lastPanelPrompt) {
      context = lastPanelPrompt;
    }

    try {
      const result = await onNarrativeAssist(type, context, charContext);
      
      if (type === 'PLOT' || type === 'NEXT_PANEL') {
        setPrompt(result);
        setMode(GenerationMode.CREATE);
      } else if (type === 'DIALOGUE' && selectedPanel) {
        onUpdateCaption(selectedPanel.id, result);
      }
      setNarrativeContext(''); 
    } catch (e) {
      // Error handled in App
    }
  };

  React.useEffect(() => {
    if (selectedPanel) {
      if(mode !== GenerationMode.STORY) setMode(GenerationMode.EDIT);
    }
  }, [selectedPanel?.id]); 

  const isActiveSlotEmpty = selectedPanel?.images.find(img => img.id === activeSlotId)?.url === '';

  const renderLayoutButton = (layout: PanelSplitLayout, icon: React.ReactNode, title: string) => (
    <button
      type="button"
      onClick={() => onChangeSplitLayout(selectedPanel!.id, layout)}
      className={`p-3 border rounded-xl flex items-center justify-center transition-all ${selectedPanel?.splitLayout === layout ? 'bg-comic-yellow text-black border-comic-yellow ring-2 ring-comic-yellow/30' : 'bg-black/30 border-gray-600 text-gray-400 hover:bg-white/10 hover:border-gray-400'}`}
      title={title}
    >
      {icon}
    </button>
  );
  
  const handleAddCharacter = () => {
    onUpdateCharacters([...characters, { id: uuidv4(), name: '', description: '' }]);
  };

  const handleUpdateCharacter = (id: string, field: 'name' | 'description', value: string) => {
    onUpdateCharacters(characters.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoveCharacter = (id: string) => {
    onUpdateCharacters(characters.filter(c => c.id !== id));
  };
  
  const maxSpanForLayout: Record<GridLayout, number> = {
    [GridLayout.STANDARD]: 3,
    [GridLayout.CLASSIC]: 2,
    [GridLayout.VERTICAL]: 1,
    [GridLayout.DYNAMIC]: 4,
    [GridLayout.STORYBOARD]: 6,
  };
  const maxSpan = maxSpanForLayout[gridLayout];


  return (
    <div className="bg-comic-panel border-l border-gray-800 w-full lg:w-[450px] flex-shrink-0 flex flex-col h-[40vh] lg:h-screen sticky top-0 overflow-y-auto transition-all">
      
      <div className="p-6 border-b border-gray-700 bg-comic-dark/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="font-comic text-4xl text-comic-yellow tracking-wide">
          {mode === GenerationMode.CREATE && (selectedPanel && isActiveSlotEmpty ? 'FILL SLOT' : 'NEW PANEL')}
          {mode === GenerationMode.EDIT && 'TOOLS'}
          {mode === GenerationMode.STORY && 'STORY ASSIST'}
        </h2>
        <p className="text-gray-400 text-sm mt-2 font-medium">
          {mode === GenerationMode.CREATE && 'Generate art or fill empty splits.'}
          {mode === GenerationMode.EDIT && 'Global page and specific panel adjustments.'}
          {mode === GenerationMode.STORY && 'Generate ideas, dialogue, and continue the story.'}
        </p>
      </div>

      <div className="flex p-3 gap-3 m-4 bg-black/30 rounded-xl overflow-x-auto">
        <button
          onClick={() => setMode(GenerationMode.CREATE)}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center justify-center gap-2 ${mode === GenerationMode.CREATE ? 'bg-comic-accent text-white shadow-md scale-105' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
          title="Create"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" y1="5" x2="22" y2="5"/><line x1="19" y1="2" x2="19" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          <span>Create</span>
        </button>
        <button
          onClick={() => setMode(GenerationMode.EDIT)}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center justify-center gap-2 ${mode === GenerationMode.EDIT ? 'bg-comic-yellow text-black shadow-md scale-105' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
          title="Tools"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          <span>Tools</span>
        </button>
        <button
          onClick={() => setMode(GenerationMode.STORY)}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center justify-center gap-2 ${mode === GenerationMode.STORY ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
          title="Story"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <span>Story</span>
        </button>
      </div>

      <div className="px-6 flex-1 flex flex-col gap-6 pb-10">
        
        {/* GLOBAL & LAYOUT SETTINGS */}
        {mode === GenerationMode.EDIT && (
           <div className="space-y-6">
              <div className="p-5 bg-black/30 rounded-xl border border-gray-700 space-y-6">
                 <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Global Settings</span>
                 </div>
                 
                  {/* PAGE LAYOUT */}
                 <div>
                   <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Grid Layout</label>
                   <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
                     {(Object.keys(GridLayout) as Array<keyof typeof GridLayout>).map(key => (
                       <button
                         key={key}
                         onClick={() => setGridLayout(GridLayout[key])}
                         className={`py-3 px-2 text-[10px] font-bold rounded-lg border transition-colors capitalize ${gridLayout === GridLayout[key] ? 'bg-gray-200 text-black border-white' : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:bg-white/5'}`}
                       >
                         {key.toLowerCase()}
                       </button>
                     ))}
                   </div>
                 </div>

                  <div>
                   <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                     Gutter Size
                   </label>
                   <div className="grid grid-cols-3 gap-2">
                     {(['NONE', 'TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE'] as GutterSize[]).map((size) => (
                       <button
                         key={size}
                         onClick={() => setGutterSize(size)}
                         className={`py-3 text-[10px] font-bold rounded-lg border transition-colors capitalize ${gutterSize === size ? 'bg-gray-200 text-black border-white' : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:bg-white/5'}`}
                       >
                         {size.toLowerCase()}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* CHARACTER CONTEXT */}
                 <div>
                   <label className="block text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">
                     Character Definitions
                   </label>
                   <div className="space-y-3">
                     {characters.map((char, index) => (
                       <div key={char.id} className="p-3 bg-black/50 border border-gray-600 rounded-lg space-y-2 relative">
                         <input
                           type="text"
                           value={char.name}
                           onChange={(e) => handleUpdateCharacter(char.id, 'name', e.target.value)}
                           placeholder={`Character ${index + 1} Name`}
                           className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
                         />
                         <textarea
                           value={char.description}
                           onChange={(e) => handleUpdateCharacter(char.id, 'description', e.target.value)}
                           placeholder="Visual description (e.g., blonde warrior, red armor)"
                           className="w-full bg-transparent text-xs text-gray-300 h-10 resize-none focus:outline-none"
                         />
                         <button onClick={() => handleRemoveCharacter(char.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                         </button>
                       </div>
                     ))}
                     <Button onClick={handleAddCharacter} variant="ghost" className="w-full border border-dashed border-gray-600">
                       Add Character
                     </Button>
                   </div>
                   <p className="text-[10px] text-gray-500 mt-2">These details are added to every generation prompt.</p>
                 </div>
              </div>

              {selectedPanel ? (
                 <div className="p-5 bg-black/30 rounded-xl border border-gray-700 space-y-6 animate-fade-in">
                    <div className="flex items-center gap-3">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-comic-yellow"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                       <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Panel Tools</span>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Panel Size (Columns)</label>
                      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                        {([1, 2, 3, 4, 5, 6] as const).map(span => (
                          <button 
                            key={span}
                            type="button" 
                            onClick={() => onUpdatePanelSpan(selectedPanel.id, span)} 
                            disabled={span > maxSpan}
                            className={`py-3 text-sm font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${selectedPanel.colSpan === span ? 'bg-comic-yellow text-black' : 'bg-black/30 text-gray-400 hover:bg-white/10'}`}>
                              {span}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">Max size depends on the current Grid Layout.</p>
                    </div>
                    
                     <div>
                       <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Text & Overlays</label>
                       <div className="grid grid-cols-3 gap-3">
                          <button type="button" onClick={() => onToggleOverlay(selectedPanel.id, 'BUBBLE_LEFT')} className="p-2 flex flex-col items-center text-center bg-white text-black text-[10px] font-bold rounded-lg border border-gray-600 hover:bg-gray-200 shadow-sm active:scale-95 transition-transform">Speech L</button>
                          <button type="button" onClick={() => onToggleOverlay(selectedPanel.id, 'BUBBLE_RIGHT')} className="p-2 flex flex-col items-center text-center bg-white text-black text-[10px] font-bold rounded-lg border border-gray-600 hover:bg-gray-200 shadow-sm active:scale-95 transition-transform">Speech R</button>
                          <button type="button" onClick={() => onToggleOverlay(selectedPanel.id, 'THOUGHT')} className="p-2 flex flex-col items-center text-center bg-white text-black text-[10px] font-bold rounded-full border-dashed border-2 border-gray-600 hover:bg-gray-200 shadow-sm active:scale-95 transition-transform">Thought</button>
                          <button type="button" onClick={() => onToggleOverlay(selectedPanel.id, 'WHISPER')} className="p-2 flex flex-col items-center text-center bg-white text-gray-600 text-[10px] font-bold rounded-lg border-dashed border-2 border-gray-500 hover:bg-gray-200 shadow-sm active:scale-95 transition-transform">Whisper</button>
                          <button type="button" onClick={() => onToggleOverlay(selectedPanel.id, 'SHOUT')} className="p-2 flex flex-col items-center text-center bg-red-100 text-red-900 text-[10px] font-bold rounded-lg border border-red-900 hover:bg-red-200 shadow-sm active:scale-95 transition-transform">SHOUT!</button>
                          <button type="button" onClick={() => onToggleOverlay(selectedPanel.id, 'CAPTION_BOX')} className="p-2 flex flex-col items-center text-center bg-comic-yellow text-black text-[10px] font-bold rounded-lg border border-black hover:opacity-80 shadow-sm active:scale-95 transition-transform">Caption</button>
                          <button type="button" onClick={() => onToggleOverlay(selectedPanel.id, 'ONOMATOPOEIA')} className="p-2 flex flex-col items-center text-center bg-transparent text-comic-yellow text-[10px] font-bold border border-comic-yellow rounded-lg hover:bg-white/10 font-comic shadow-sm active:scale-95 transition-transform">Sound FX</button>
                       </div>
                     </div>
                     
                     <div>
                       <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Internal Layout</label>
                       <div className="grid grid-cols-4 gap-3">
                         {renderLayoutButton('SINGLE', <div className="w-6 h-6 border-2 border-current"></div>, "Single")}
                         {renderLayoutButton('DOUBLE_V', <div className="w-6 h-6 border-2 border-current flex"><div className="w-1/2 border-r-2 border-current"></div></div>, "Split V")}
                         {renderLayoutButton('DOUBLE_H', <div className="w-6 h-6 border-2 border-current flex flex-col"><div className="h-1/2 border-b-2 border-current"></div></div>, "Split H")}
                         {renderLayoutButton('TRIPLE_V', <div className="w-6 h-6 border-2 border-current grid grid-cols-3"><div className="border-r-2 border-current"></div><div className="border-r-2 border-current"></div></div>, "3 Columns")}
                         {renderLayoutButton('TRIPLE_H', <div className="w-6 h-6 border-2 border-current grid grid-rows-3"><div className="border-b-2 border-current"></div><div className="border-b-2 border-current"></div></div>, "3 Rows")}
                         {renderLayoutButton('BIG_LEFT', <div className="w-6 h-6 border-2 border-current grid grid-cols-2 grid-rows-2"><div className="row-span-2 border-r-2 border-current"></div><div className="border-b-2 border-current"></div></div>, "Big Left")}
                         {renderLayoutButton('BIG_RIGHT', <div className="w-6 h-6 border-2 border-current grid grid-cols-2 grid-rows-2"><div className="border-b-2 border-current border-r-2"></div><div className="row-span-2"></div><div className="border-r-2 border-current"></div></div>, "Big Right")}
                         {renderLayoutButton('BIG_TOP', <div className="w-6 h-6 border-2 border-current grid grid-cols-2 grid-rows-2"><div className="col-span-2 border-b-2 border-current"></div><div className="border-r-2 border-current"></div></div>, "Big Top")}
                         {renderLayoutButton('BIG_BOTTOM', <div className="w-6 h-6 border-2 border-current grid grid-cols-2 grid-rows-2"><div className="border-r-2 border-current border-b-2"></div><div className="border-b-2 border-current"></div><div className="col-span-2"></div></div>, "Big Bottom")}
                         {renderLayoutButton('QUAD', <div className="w-6 h-6 border-2 border-current grid grid-cols-2 grid-rows-2"><div className="border-r border-b border-current"></div><div className="border-b border-current"></div><div className="border-r border-current"></div></div>, "Quad")}
                       </div>
                     </div>
                 </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 border-2 border-dashed border-gray-800 rounded-xl p-4">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><path d="m12 3-1.41 1.41L5 10l7 7 7-7-5.59-5.59L12 3z"/><path d="m5 10 7 7 7-7"/><path d="m12 17 7-7-7-7"/></svg>
                   <p className="font-comic text-xl text-gray-600 mb-2">Panel Tools</p>
                   <p className="text-xs text-center px-4">Select a panel to see its specific tools for layout, text, and editing.</p>
                </div>
              )}
           </div>
        )}

        {mode === GenerationMode.STORY ? (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-300 uppercase">1. Idea Generator</h3>
              <textarea 
                value={narrativeContext}
                onChange={(e) => setNarrativeContext(e.target.value)}
                placeholder="Ex: Sci-fi city chase scene..."
                className="w-full bg-black/30 border border-gray-700 rounded-xl p-4 text-sm text-white h-32 resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button 
                variant="primary" 
                onClick={() => handleStoryAssist('PLOT')}
                isLoading={isProcessing}
                className="w-full py-4 text-base bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
              >
                Generate Scene Idea
              </Button>
            </div>
            <div className="space-y-3 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-bold text-gray-300 uppercase">2. Quick Assists</h3>
              <div className="grid gap-3">
                <Button 
                  variant="secondary" 
                  onClick={() => handleStoryAssist('NEXT_PANEL')}
                  disabled={panelsCount === 0 || isProcessing}
                  className="w-full justify-between py-4"
                >
                  <span>Continue Story</span>
                  <span className="text-xs opacity-60 bg-black/20 px-2 py-1 rounded">Next Panel</span>
                </Button>
                 <Button 
                  variant="secondary" 
                  onClick={() => handleStoryAssist('DIALOGUE')}
                  disabled={!selectedPanel || isProcessing}
                  className="w-full justify-between py-4"
                >
                  <span>Write Caption</span>
                  <span className="text-xs opacity-60 bg-black/20 px-2 py-1 rounded">For Selected</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          (mode === GenerationMode.CREATE || (mode === GenerationMode.EDIT && selectedPanel)) ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-fade-in">
            {mode === GenerationMode.CREATE && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Art Style
                  </label>
                  <div className="relative">
                    <select 
                      value={style}
                      onChange={(e) => setStyle(e.target.value as ComicStyle)}
                      className="w-full bg-black/50 border border-gray-600 rounded-xl p-4 text-white text-base focus:border-comic-accent focus:ring-1 focus:ring-comic-accent focus:outline-none appearance-none"
                    >
                      {styles.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/20 border-2 border-dashed border-gray-600 hover:border-gray-400 hover:bg-black/30 transition-all cursor-pointer group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  {!uploadedSketch ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center py-6 text-gray-400 group-hover:text-white"
                    >
                       <svg className="mb-2" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                       <span className="text-sm font-bold uppercase tracking-wide">Upload Sketch (Optional)</span>
                    </div>
                  ) : (
                    <div className="relative group-hover:opacity-90">
                      <img src={uploadedSketch} alt="Sketch" className="w-full h-48 object-contain rounded-lg bg-black/50" />
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUploadedSketch(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-transform hover:scale-110 shadow-lg"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                      <div className="absolute bottom-2 left-2 bg-comic-accent text-white text-xs font-bold px-2 py-1 rounded shadow">SKETCH MODE</div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                 {mode === GenerationMode.CREATE 
                  ? (isActiveSlotEmpty ? 'Description for Empty Slot' : 'Panel Description')
                  : 'Edit Instruction for Slot'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === GenerationMode.CREATE 
                  ? "Describe the scene..."
                  : "Ex: Add a red cape, make the day sunny..."
                }
                className="w-full bg-black/50 border border-gray-600 rounded-xl p-4 text-white text-base focus:border-comic-accent focus:ring-1 focus:ring-comic-accent focus:outline-none resize-none h-32 transition-all"
                disabled={isProcessing}
              />
            </div>

            <Button 
              type="submit" 
              isLoading={isProcessing} 
              disabled={!prompt.trim() || (mode === GenerationMode.EDIT && !selectedPanel)}
              variant={mode === GenerationMode.CREATE ? 'primary' : 'secondary'}
              className="w-full py-5 text-lg uppercase tracking-widest shadow-lg"
            >
              {mode === GenerationMode.CREATE 
                ? (isActiveSlotEmpty ? 'Generate in Slot' : (uploadedSketch ? 'Transform Sketch' : 'Generate Panel')) 
                : 'Apply Edit'}
            </Button>
          </form>
          ) : (
             <></> // No form if in edit mode without a selected panel
          )
        )}
      </div>
    </div>
  );
};