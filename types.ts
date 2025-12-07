export interface Point {
  x: number;
  y: number;
}

export interface Measurement {
  label: string;
  start: Point;
  end: Point;
  value?: string; // Calculated string (e.g., "52.0 cm")
  valueCm?: number; // Raw numeric value
}

export interface AnalysisResult {
  clothingType: 'SHIRT' | 'PANTS' | 'SKIRT' | 'DRESS' | 'OUTER';
  rulerStart: Point;
  rulerEnd: Point;
  rulerLengthCm: number;
  measurements: Measurement[];
  summary?: string; // Kept optional for backward compatibility or if we add it back
}

export type GarmentModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  TESTING = 'TESTING' // Added for Test Mode
}