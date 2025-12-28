
export interface SensorData {
  id: string;
  x: number;
  y: number;
  z: number;
  temperature: number;
  humidity: number;
  type: 'pillar' | 'wall' | 'ceiling';
  status: 'online' | 'offline';
  drift?: number; // Rate of change per second
}

export type AnalysisFocus = 'HSE' | 'MAINTENANCE' | 'DIAGNOSTIC';

export interface SiteStatus {
  averageTemp: number;
  peakTemp: number;
  minTemp: number;
  hvacActive: boolean;
  fireAlarm: boolean;
  energyMode: 'ECO' | 'PERFORMANCE' | 'SAFETY';
  lastAIAnalysis: string;
  logs?: string[];
  activeIncidents: number;
  stabilityIndex: number; // 0-10 score
  estimatedKva: number; // Power draw
  analysisFocus: AnalysisFocus;
}

export type AlertLevel = 'Normal' | 'Warning' | 'Critical';

export interface Alert {
  id: string;
  category: 'FIRE' | 'CRYO' | 'MAINTENANCE' | 'SYSTEM';
  timestamp: string;
  message: string;
  level: AlertLevel;
  sensorId?: string;
  resolved: boolean;
}
