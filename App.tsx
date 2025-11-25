import React, { useState } from 'react';
import { ComicPanel, GenerationMode, LoadingState, ComicStyle, PanelSplitLayout, ComicImage, GridLayout, GutterSize, Character } from './types';
import { PanelCard } from './components/PanelCard';
import { Toolbox } from './components/Toolbox';
import { generateComicImage, editComicImage, generateNarrativeElement, generateImageFromSketch } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [panels, setPanels] = useState<ComicPanel[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null); 
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.CREATE);
  const [gridLayout, setGridLayout] = useState<GridLayout>(GridLayout.STANDARD);
  const [gutterSize, setGutterSize] = useState<GutterSize>('MEDIUM');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false, message: '' });

  const selectedPanel = panels.find(p => p.id === selectedPanelId);
  
  const getLastPanelPrompt = () => {
    if (panels.length === 0) return '';
    const lastPanel = panels[panels.length - 1];
    const reversedImages = [...lastPanel.images].reverse();
    const lastImageWithPrompt = reversedImages.find(img => img.prompt && img.prompt.trim().length > 0);
    return lastImageWithPrompt ? lastImageWithPrompt.prompt : '';
  };
  
  const getCharacterContextString = () => {
    if (characters.length === 0) return '';
    return characters.map(c => `${c.name.trim()}: ${c.description.trim()}`).join('. ');
  };

  const gridRef = React.useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    setTimeout(() => {
      if (gridRef.current) {
        gridRef.current.scrollTop = gridRef.current.scrollHeight;
      }
    }, 100);
  };

  const getStylePrompt = (style: ComicStyle) => {
     const stylePrompts: Record<ComicStyle, string> = {
        'MODERN': 'modern comic book style, crisp lines, vibrant colors, digital art',
        'SUPERHERO': 'classic american superhero comic style, marvel style, dynamic action poses, bold colors, detailed muscle anatomy, cinematic composition',
        'MANGA': 'manga style, anime aesthetic, expressive characters, detailed ink lines, screentones',
        'GHIBLI': 'studio ghibli style, hayao miyazaki art style, beautiful painted backgrounds, whimsical, soft colors, highly detailed nature',
        'NOIR': 'film noir style, high contrast black and white comic, dramatic shadows, mysterious atmosphere, frank miller style',
        'RETRO': 'vintage 1950s comic style, halftone dots, retro color palette, aged paper texture, golden age comics',
        'CYBERPUNK': 'cyberpunk style, neon lights, futuristic city, high tech, rain-slicked streets, vibrant neon colors',
        'FANTASY': 'fantasy comic style, oil painting aesthetic, epic lighting, dungeons and dragons art style',
        'HORROR': 'horror comic style, junji ito style, eerie atmosphere, dark gritty details, high contrast',
        'SKETCH': 'rough sketch comic style, pencil textures, loose lines, charcoal, artistic unfinished look',
        'WATERCOLOR': 'watercolor comic style, artistic, soft edges, bleeding colors, dreamlike atmosphere'
      };
      return stylePrompts[style];
  };

  const handleGenerate = async (prompt: string, style: ComicStyle, sketchBase64?: string) => {
    const stylePrompt = getStylePrompt(style);
    const characterContext = getCharacterContextString();
    
    const fullPrompt = `
      Art Style: ${stylePrompt}.
      ${characterContext ? `Defined Characters (MUST MATCH EXACTLY): ${characterContext}.` : ''}
      Scene Description: ${prompt}.
      (Ensure consistent character details). high quality masterpiece.
    `.trim();
    
    setLoadingState({ isLoading: true, message: sketchBase64 ? 'Transforming sketch...' : `Generating ${style.toLowerCase().replace('_', ' ')} art...` });

    try {
      let imageUrl = '';
      if (sketchBase64) {
        imageUrl = await generateImageFromSketch(sketchBase64, fullPrompt);
      } else {
        imageUrl = await generateComicImage(fullPrompt, '1:1');
      }

      if (selectedPanelId && activeSlotId) {
        const panel = panels.find(p => p.id === selectedPanelId);
        if (panel) {
          const updatedImages = panel.images.map(img => {
            if (img.id === activeSlotId) {
              return { ...img, url: imageUrl, prompt: prompt };
            }
            return img;
          });

          setPanels(prev => prev.map(p => p.id === selectedPanelId ? { ...p, images: updatedImages } : p));
        }
      } else {
        const newPanel: ComicPanel = {
          id: uuidv4(),
          images: [{ id: uuidv4(), url: imageUrl, prompt: prompt }],
          splitLayout: 'SINGLE',
          caption: '',
          aspectRatio: '1:1', 
          overlayType: 'NONE',
          colSpan: 1
        };

        setPanels(prev => [...prev, newPanel]);
        scrollToBottom();
      }

    } catch (error) {
      console.error(error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  const handleEdit = async (editPrompt: string) => {
    if (!selectedPanel || !activeSlotId) return;

    const activeImage = selectedPanel.images.find(img => img.id === activeSlotId);
    if (!activeImage || !activeImage.url) {
      alert("Please select a slot with an image to edit.");
      return;
    }

    setLoadingState({ isLoading: true, message: 'Editing panel...' });
    try {
      const characterContext = getCharacterContextString();
      const fullEditPrompt = characterContext ? `Edit Instruction: ${editPrompt}. (Maintain character consistency: ${characterContext})` : editPrompt;
      const newImageUrl = await editComicImage(activeImage.url, fullEditPrompt);
      
      const updatedImages = selectedPanel.images.map(img => {
        if (img.id === activeSlotId) {
          return { ...img, url: newImageUrl };
        }
        return img;
      });

      setPanels(prev => prev.map(p => p.id === selectedPanel.id ? { ...p, images: updatedImages } : p));
    } catch (error) {
      console.error(error);
      alert('Failed to edit image. Make sure your prompt is clear.');
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  const handleNarrativeAssist = async (type: 'PLOT' | 'DIALOGUE' | 'NEXT_PANEL', context: string) => {
    setLoadingState({ isLoading: true, message: 'Consulting AI Storywriter...' });
    try {
      const charContext = getCharacterContextString();
      const result = await generateNarrativeElement(type, context, charContext);
      return result;
    } catch (error) {
      console.error(error);
      alert('Failed to generate narrative element.');
      return '';
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  const handlePanelSelect = (id: string) => {
    if (selectedPanelId !== id) {
      setSelectedPanelId(id);
      const panel = panels.find(p => p.id === id);
      if (panel && panel.images.length > 0) {
        setActiveSlotId(panel.images[0].id);
      }
    }
  };

  const handleSlotSelect = (panelId: string, imageId: string) => {
    setSelectedPanelId(panelId);
    setActiveSlotId(imageId);
    
    const panel = panels.find(p => p.id === panelId);
    const image = panel?.images.find(img => img.id === imageId);
    if (image && !image.url) {
      setMode(GenerationMode.CREATE);
    } else if (image && image.url && mode === GenerationMode.CREATE) {
       setMode(GenerationMode.EDIT);
    }
  };

  const handleUpdateCaption = (id: string, caption: string) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  const handleToggleOverlay = (id: string, type: any) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, overlayType: type } : p));
  };
  
  const handleUpdatePanelSpan = (id: string, span: 1 | 2 | 3 | 4 | 5 | 6) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, colSpan: span } : p));
  }

  const handleDeletePanel = (id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id));
    if (selectedPanelId === id) {
      setSelectedPanelId(null);
      setActiveSlotId(null);
    }
  };

  const handleChangeSplitLayout = (panelId: string, newLayout: PanelSplitLayout) => {
    setPanels(prev => prev.map(panel => {
      if (panel.id !== panelId) return panel;
      let newImages = [...panel.images];
      let targetCount = 1;
      
      if (['DOUBLE_V', 'DOUBLE_H'].includes(newLayout)) targetCount = 2;
      if (['TRIPLE_V', 'TRIPLE_H', 'BIG_LEFT', 'BIG_RIGHT', 'BIG_TOP', 'BIG_BOTTOM'].includes(newLayout)) targetCount = 3;
      if (newLayout === 'QUAD') targetCount = 4;

      if (newImages.length < targetCount) {
        const needed = targetCount - newImages.length;
        for (let i = 0; i < needed; i++) {
          newImages.push({ id: uuidv4(), url: '', prompt: '' });
        }
      } else if (newImages.length > targetCount) {
        newImages = newImages.slice(0, targetCount);
      }
      return { ...panel, splitLayout: newLayout, images: newImages };
    }));
  };

  const getLayoutClasses = () => {
    const gapClass = {
      'NONE': 'gap-0',
      'TINY': 'gap-2',
      'SMALL': 'gap-5',
      'MEDIUM': 'gap-8',
      'LARGE': 'gap-12',
      'HUGE': 'gap-16'
    }[gutterSize];
    
    const paddingClass = gutterSize === 'NONE' ? 'p-0' : 'p-8';

    switch (gridLayout) {
      case GridLayout.STANDARD:
        return `grid grid-cols-1 md:grid-cols-3 ${gapClass} ${paddingClass} grid-flow-dense auto-rows-min`;
      case GridLayout.CLASSIC:
        return `grid grid-cols-1 md:grid-cols-2 ${gapClass} ${paddingClass} grid-flow-dense auto-rows-min`;
      case GridLayout.VERTICAL:
        return `flex flex-col items-center ${gapClass} p-8 max-w-4xl mx-auto`;
      case GridLayout.DYNAMIC:
        return `grid grid-cols-2 md:grid-cols-4 ${gapClass} ${paddingClass} grid-flow-dense auto-rows-min`;
      case GridLayout.STORYBOARD:
        return `grid grid-cols-2 md:grid-cols-6 ${gapClass} ${paddingClass} grid-flow-dense auto-rows-min`;
      default:
        return `grid grid-cols-1 md:grid-cols-3 ${gapClass} p-8 grid-flow-dense auto-rows-min`;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-comic-dark text-white overflow-hidden">
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className="bg-comic-dark border-b border-gray-800 p-4 flex items-center justify-between z-20 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-comic-accent rounded-lg flex items-center justify-center transform -rotate-3 shadow-lg shadow-red-500/20">
              <span className="font-comic text-2xl text-white">NG</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-comic text-2xl md:text-3xl text-white tracking-wider leading-none">
                NOVELGEN <span className="text-comic-yellow">AI</span>
              </h1>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">AI Graphic Novel Tool</span>
            </div>
          </div>
          
           <div className="hidden md:flex items-center gap-4 text-sm text-gray-500 border-l border-gray-700 pl-4">
              <span>{panels.length} Panels</span>
           </div>
        </header>

        <main 
          ref={gridRef}
          className="flex-1 overflow-y-auto bg-[#121212] scroll-smooth"
        >
          {panels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
               <svg className="w-32 h-32 mb-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               <p className="font-comic text-2xl">Your story starts here...</p>
               <p className="mt-2">Use the panel on the right to generate your first image.</p>
            </div>
          ) : (
            <div className={`${getLayoutClasses()} transition-all duration-500 ease-in-out min-h-full`}>
              {panels.map((panel) => (
                <PanelCard
                  key={panel.id}
                  panel={panel}
                  isSelected={selectedPanelId === panel.id}
                  activeSlotId={activeSlotId}
                  gridLayout={gridLayout}
                  onSelect={handlePanelSelect}
                  onSelectSlot={handleSlotSelect}
                  onCaptionChange={handleUpdateCaption}
                  onDelete={handleDeletePanel}
                  onToggleOverlay={handleToggleOverlay}
                />
              ))}
            </div>
          )}
        </main>

        {loadingState.isLoading && (
          <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="bg-comic-panel p-8 rounded-2xl border-4 border-comic-accent shadow-2xl flex flex-col items-center max-w-sm mx-4 text-center">
              <div className="w-16 h-16 border-4 border-comic-yellow border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="font-comic text-2xl text-white mb-2">Creating Magic</h3>
              <p className="text-gray-300">{loadingState.message}</p>
            </div>
          </div>
        )}
      </div>

      <Toolbox 
        mode={mode}
        setMode={setMode}
        selectedPanel={selectedPanel}
        activeSlotId={activeSlotId}
        isProcessing={loadingState.isLoading}
        onGenerate={handleGenerate}
        onEdit={handleEdit}
        onNarrativeAssist={handleNarrativeAssist}
        onUpdateCaption={handleUpdateCaption}
        onChangeSplitLayout={handleChangeSplitLayout}
        onUpdatePanelSpan={handleUpdatePanelSpan}
        onToggleOverlay={handleToggleOverlay}
        gutterSize={gutterSize}
        setGutterSize={setGutterSize}
        panelsCount={panels.length}
        lastPanelPrompt={getLastPanelPrompt()} 
        characters={characters}
        onUpdateCharacters={setCharacters}
        gridLayout={gridLayout}
        setGridLayout={setGridLayout}
      />
    </div>
  );
};

export default App;