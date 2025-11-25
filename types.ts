

export interface ComicImage {
  id: string;
  url: string; // Base64 or empty if placeholder
  prompt: string;
}

export type PanelSplitLayout = 
  | 'SINGLE' 
  | 'DOUBLE_V' 
  | 'DOUBLE_H' 
  | 'TRIPLE_V' 
  | 'TRIPLE_H' 
  | 'QUAD' 
  | 'BIG_LEFT' 
  | 'BIG_RIGHT' 
  | 'BIG_TOP' 
  | 'BIG_BOTTOM';

export interface ComicPanel {
  id: string;
  images: ComicImage[]; 
  splitLayout: PanelSplitLayout;
  caption: string;
  aspectRatio: '1:1' | '16:9' | '9:16';
  colSpan: 1 | 2 | 3 | 4 | 5 | 6; // How many grid columns this panel takes up
  overlayType: 'NONE' | 'BUBBLE_LEFT' | 'BUBBLE_RIGHT' | 'THOUGHT' | 'WHISPER' | 'SHOUT' | 'CAPTION_BOX' | 'ONOMATOPOEIA';
}

export enum GenerationMode {
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  STORY = 'STORY'
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

export type ComicStyle = 
  | 'MODERN' 
  | 'SUPERHERO'
  | 'MANGA' 
  | 'GHIBLI'
  | 'NOIR' 
  | 'RETRO' 
  | 'CYBERPUNK' 
  | 'FANTASY'
  | 'HORROR'
  | 'SKETCH'
  | 'WATERCOLOR';

export enum GridLayout {
  STANDARD = 'STANDARD', // 3-col responsive
  CLASSIC = 'CLASSIC',   // 2-col responsive
  VERTICAL = 'VERTICAL', // 1-col webtoon style
  DYNAMIC = 'DYNAMIC',    // 4-col for complex spans
  STORYBOARD = 'STORYBOARD' // 6-col for freeform layouts
}

export type GutterSize = 'NONE' | 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE';

export interface Character {
  id: string;
  name: string;
  description: string;
}