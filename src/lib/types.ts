export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

export interface DeerZone {
  id: string;
  center: [number, number]; // [lat, lng]
  radius: number; // in meters
  riskLevel: RiskLevel;
  reason: string;
  activeTimes: string[]; // e.g., ["dawn", "dusk"]
}

export interface MountainPoint {
  lat: number;
  lng: number;
  elevation: number;
  type: 'peak' | 'overlook' | 'cabin' | 'hazard' | 'deer-crossing';
  label?: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  type: 'turn' | 'straight' | 'hazard' | 'scenic';
  hazardInfo?: string;
  lat: number;
  lng: number;
}

export type WildlifeType = 'deer-live' | 'deer-dead' | 'raccoon' | 'squirrel' | 'bear';

export interface WildlifeReport {
  id: string;
  lat: number;
  lng: number;
  type: WildlifeType;
  timestamp: number;
  expiresAt: number;
  reportCount: number;
}

export interface NavigationState {
  currentLocation: [number, number];
  destination: [number, number] | null;
  route: RouteStep[];
  currentStepIndex: number;
  isNavigating: boolean;
}
