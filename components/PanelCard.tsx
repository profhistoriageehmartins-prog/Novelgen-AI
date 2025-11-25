import React from 'react';
import { ComicPanel, PanelSplitLayout, GridLayout } from '../types';

interface PanelCardProps {
  panel: ComicPanel;
  isSelected: boolean;
  activeSlotId: string | null;
  gridLayout: GridLayout;
  onSelect: (id: string) => void;
  onSelectSlot: (panelId: string, imageId: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onDelete: (id: string) => void;
  onToggleOverlay: (id: string, type: any) => void; // Type loose for internal handling
  className?: string;
}

export const PanelCard: React.FC<PanelCardProps> = ({ 
  panel, 
  isSelected, 
  activeSlotId,
  gridLayout,
  onSelect, 
  onSelectSlot,
  onCaptionChange,
  onDelete,
  onToggleOverlay,
  className = ''
}) => {
  // Map aspect ratio to Tailwind classes
  const aspectRatioClass = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]'
  }[panel.aspectRatio] || 'aspect-square';

  const isOverlayEnabled = panel.overlayType !== 'NONE';
  const isVerticalLayout = gridLayout === GridLayout.VERTICAL;

  // Calculate Column Span Class
  const getColSpanClass = () => {
    if (isVerticalLayout) return 'w-full';
    switch (panel.colSpan) {
      case 2: return 'col-span-1 md:col-span-2';
      case 3: return 'col-span-1 md:col-span-3';
      case 4: return 'col-span-1 md:col-span-4';
      case 5: return 'col-span-1 md:col-span-5';
      case 6: return 'col-span-1 md:col-span-6';
      default: return 'col-span-1';
    }
  };

  // Grid Configuration for Internal Layouts
  const getGridConfig = (layout: PanelSplitLayout) => {
    switch (layout) {
      case 'SINGLE': return 'grid-cols-1 grid-rows-1';
      case 'DOUBLE_V': return 'grid-cols-2 grid-rows-1';
      case 'DOUBLE_H': return 'grid-cols-1 grid-rows-2';
      case 'TRIPLE_V': return 'grid-cols-3 grid-rows-1';
      case 'TRIPLE_H': return 'grid-cols-1 grid-rows-3';
      case 'QUAD': return 'grid-cols-2 grid-rows-2';
      case 'BIG_LEFT': return 'grid-cols-2 grid-rows-2';
      case 'BIG_RIGHT': return 'grid-cols-2 grid-rows-2';
      case 'BIG_TOP': return 'grid-cols-2 grid-rows-2';
      case 'BIG_BOTTOM': return 'grid-cols-2 grid-rows-2';
      default: return 'grid-cols-1 grid-rows-1';
    }
  };

  // Individual Item Spans based on Layout and Index
  const getItemStyle = (layout: PanelSplitLayout, index: number) => {
    if (layout === 'BIG_LEFT') {
      if (index === 0) return { gridRow: 'span 2' }; // Left item
    }
    if (layout === 'BIG_RIGHT') {
       if (index === 2) return { gridColumn: '2', gridRow: '1 / span 2' };
    }
    if (layout === 'BIG_TOP') {
      if (index === 0) return { gridColumn: 'span 2' }; // Top item
    }
    if (layout === 'BIG_BOTTOM') {
      if (index === 2) return { gridColumn: 'span 2' };
    }
    return {};
  };

  // Dynamic styling for the card container
  let containerClasses = `relative group flex flex-col transition-all duration-300 ${getColSpanClass()} ${className} `;
  
  if (isVerticalLayout) {
     containerClasses += `bg-white border-4 w-full max-w-4xl mx-auto ${isSelected ? 'border-comic-accent ring-4 ring-comic-accent/30 z-30' : 'border-black z-0'}`;
  } else {
     // Standard Framed
     containerClasses += `bg-white border-4 shadow-lg ${isSelected ? 'border-comic-accent ring-4 ring-comic-accent/30 scale-[1.01] z-30' : 'border-black hover:border-gray-600 z-0'}`;
  }

  const innerContainerClasses = `relative w-full overflow-hidden bg-black ${aspectRatioClass}`;

  // Helper to render different bubble types
  const renderOverlay = () => {
    const text = panel.caption || "TEXT...";

    switch (panel.overlayType) {
      case 'BUBBLE_LEFT':
        return (
          <div className="absolute top-4 left-4 max-w-[70%] bg-white border-2 border-black text-black p-3 rounded-[2rem] rounded-bl-none shadow-lg text-center leading-tight font-comic text-sm uppercase transform -rotate-2 min-w-[60px] flex items-center justify-center z-20">
             {text}
          </div>
        );
      case 'BUBBLE_RIGHT':
        return (
          <div className="absolute top-8 right-4 max-w-[70%] bg-white border-2 border-black text-black p-3 rounded-[2rem] rounded-br-none shadow-lg text-center leading-tight font-comic text-sm uppercase transform rotate-1 min-w-[60px] flex items-center justify-center z-20">
             {text}
          </div>
        );
      case 'THOUGHT':
        return (
          <div className="absolute top-4 right-4 max-w-[70%] bg-white border-2 border-black text-black p-4 rounded-[50%] shadow-lg text-center leading-tight font-comic text-sm uppercase min-w-[80px] flex items-center justify-center z-20 border-dashed">
             <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-white border-2 border-black rounded-full"></div>
             <div className="absolute -bottom-4 -left-5 w-2 h-2 bg-white border-2 border-black rounded-full"></div>
             <span className="relative z-10">{text}</span>
          </div>
        );
      case 'WHISPER':
         return (
          <div className="absolute bottom-4 right-4 max-w-[60%] bg-white border-2 border-gray-500 border-dashed text-gray-600 p-2 rounded-xl shadow-md text-center leading-tight font-sans text-xs italic min-w-[60px] flex items-center justify-center z-20">
             {text}
          </div>
        );
      case 'SHOUT':
        return (
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-[80%] z-20">
             <div 
               className="bg-white border-2 border-black text-black p-6 shadow-xl text-center leading-tight font-comic text-lg font-bold uppercase flex items-center justify-center"
               style={{ clipPath: 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)' }}
             >
               <span className="relative z-10 transform rotate-[-5deg]">{text}</span>
             </div>
           </div>
        );
      case 'ONOMATOPOEIA':
         return (
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
             <h1 
                className="font-comic text-5xl md:text-6xl font-extrabold text-comic-yellow tracking-widest uppercase transform -rotate-12 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] stroke-black"
                style={{ WebkitTextStroke: '2px black' }}
              >
               {text}
             </h1>
           </div>
         );
      case 'CAPTION_BOX':
        return (
          <div className="absolute bottom-0 left-0 w-full bg-comic-yellow border-t-2 border-black text-black p-2 font-comic text-sm font-bold uppercase tracking-wider shadow-lg min-h-[30px] z-20">
             {text}
           </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={containerClasses}
      onClick={() => onSelect(panel.id)}
    >
      {/* Internal Grid Container */}
      <div className={innerContainerClasses}>
        
        <div className={`grid h-full w-full gap-1 bg-black ${getGridConfig(panel.splitLayout)}`}>
          {panel.images.map((img, index) => (
            <div 
              key={img.id} 
              style={getItemStyle(panel.splitLayout, index)}
              className={`relative w-full h-full overflow-hidden cursor-pointer transition-all group/slot bg-white
                ${activeSlotId === img.id && isSelected ? 'ring-4 ring-inset ring-comic-yellow' : ''}
                ${!img.url ? 'bg-gray-800 hover:bg-gray-700 flex items-center justify-center' : ''}
              `}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(panel.id);
                onSelectSlot(panel.id, img.id);
              }}
            >
              {img.url ? (
                <img 
                  src={img.url} 
                  alt={img.prompt} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 transform transition-transform group-hover/slot:scale-110">
                  <span className="block text-5xl text-gray-500 group-hover/slot:text-comic-yellow mb-2">+</span>
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-widest group-hover/slot:text-white">Select Slot</span>
                </div>
              )}
              
              {/* Slot Indicator */}
              {activeSlotId === img.id && isSelected && (
                <div className="absolute top-1 left-1 bg-comic-yellow text-black text-[10px] font-bold px-2 py-0.5 rounded z-10 shadow-sm">
                  ACTIVE
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Overlay Narrative Elements */}
        {isOverlayEnabled && (
          <div className={`absolute pointer-events-none p-2 z-10 w-full h-full top-0 left-0`}>
            {renderOverlay()}
          </div>
        )}

        {/* Quick Overlay Toggle Buttons (Visible on Selection) */}
        {isSelected && (
           <div className="absolute top-2 left-2 flex gap-1 bg-black/60 p-1.5 rounded backdrop-blur-sm z-30 border border-gray-600">
             <button 
               onClick={(e) => { e.stopPropagation(); onToggleOverlay(panel.id, 'NONE'); }}
               className="p-1 rounded hover:bg-white/20 transition-colors text-gray-300" title="Remove Text"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
           </div>
        )}

        {/* Delete Button */}
        <div className={`absolute top-2 right-2 z-30 transition-opacity ${isSelected || 'group-hover:opacity-100 opacity-0'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(panel.id); }}
            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-md border border-red-800"
            title="Delete Panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Footer Caption Area (Standard) */}
      {!isOverlayEnabled && (
        <div className={`
          p-3 flex flex-col justify-center
          bg-white border-t-4 border-black h-full
        `}>
          <textarea
            value={panel.caption}
            onChange={(e) => onCaptionChange(panel.id, e.target.value)}
            placeholder="Write dialogue..."
            className={`
              w-full font-comic text-lg uppercase placeholder-gray-400 bg-transparent border-none resize-none focus:ring-0 p-0 leading-tight text-center h-full text-black
            `}
            onClick={(e) => e.stopPropagation()} 
            style={{ minHeight: '3rem' }}
          />
        </div>
      )}
      
      {/* Overlay Text Input (Only visible when overlay is active) */}
      {isOverlayEnabled && isSelected && (
         <div className={`
           p-2 relative z-40 bg-gray-100 border-t-4 border-black
         `}>
           <input
            value={panel.caption}
            onChange={(e) => onCaptionChange(panel.id, e.target.value)}
            placeholder="Enter overlay text..."
            className={`
              w-full font-comic text-base bg-transparent border-none focus:ring-0 p-2 text-center text-gray-700 placeholder-gray-400
            `}
            autoFocus
            onClick={(e) => e.stopPropagation()} 
           />
         </div>
      )}
    </div>
  );
};