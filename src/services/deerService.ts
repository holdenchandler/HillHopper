import { RiskLevel, DeerZone, WildlifeReport, WildlifeType } from '../lib/types';
import { getHours, getMonth } from 'date-fns';

export const calculateWildlifeRisk = (
  lat: number,
  lng: number,
  reports: WildlifeReport[] = [],
  time: Date = new Date()
): { level: RiskLevel; reason: string } => {
  const hour = getHours(time);
  const month = getMonth(time);

  let score = 0;
  let reasons: string[] = [];

  // Time of day logic (Dawn/Dusk are highest)
  if ((hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 20)) {
    score += 3;
    reasons.push("Peak activity hours (dawn/dusk)");
  } else if (hour > 20 || hour < 5) {
    score += 2;
    reasons.push("Nighttime visibility risk");
  }

  // Seasonal logic (Rut season in PA is Oct-Dec)
  if (month >= 9 && month <= 11) {
    score += 3;
    reasons.push("Peak rut season (mating)");
  } else if (month >= 4 && month <= 6) {
    score += 1;
    reasons.push("Fawn season (mother deer nearby)");
  }

  // Terrain logic
  if (lat > 41.2 && lat < 41.5 && lng > -75.0 && lng < -74.7) {
    score += 2;
    reasons.push("High-density forest corridor (Milford/Delaware region)");
  }

  // User reports logic
  const nearbyReports = reports.filter(r => {
    const dist = Math.sqrt(Math.pow(r.lat - lat, 2) + Math.pow(r.lng - lng, 2));
    return dist < 0.01; // Approx 1km
  });

  if (nearbyReports.length > 0) {
    const counts = nearbyReports.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (counts['deer-live']) {
      score += 4;
      reasons.push(`Active deer sightings (${counts['deer-live']} reports)`);
    }
    if (counts['bear']) {
      score += 5;
      reasons.push(`Bear activity reported! (${counts['bear']} reports)`);
    }
    if (counts['deer-dead']) {
      score += 2;
      reasons.push(`Roadkill hazards (${counts['deer-dead']} reports)`);
    }
    if (counts['raccoon'] || counts['squirrel']) {
      score += 1;
      reasons.push("Small wildlife activity nearby");
    }
  }

  if (score >= 10) return { level: 'extreme', reason: reasons.join(". ") };
  if (score >= 6) return { level: 'high', reason: reasons.join(". ") };
  if (score >= 3) return { level: 'moderate', reason: reasons.join(". ") };
  return { level: 'low', reason: "Clear visibility and low activity period" };
};

export const getWildlifeZones = (center: [number, number], reports: WildlifeReport[] = []): DeerZone[] => {
  const baseZones: DeerZone[] = [
    {
      id: '1',
      center: [center[0] + 0.01, center[1] + 0.01],
      radius: 500,
      riskLevel: 'high',
      reason: 'Historical deer-strike hotspot',
      activeTimes: ['dusk', 'night']
    },
    {
      id: '2',
      center: [center[0] - 0.015, center[1] + 0.005],
      radius: 800,
      riskLevel: 'extreme',
      reason: 'Active herd migration corridor',
      activeTimes: ['dawn', 'dusk']
    }
  ];

  // Create dynamic zones from clusters of reports
  const dynamicZones: DeerZone[] = [];
  const processedIds = new Set<string>();

  reports.forEach(report => {
    if (processedIds.has(report.id)) return;

    const cluster = reports.filter(r => {
      const dist = Math.sqrt(Math.pow(r.lat - report.lat, 2) + Math.pow(r.lng - report.lng, 2));
      return dist < 0.005; // 500m cluster
    });

    if (cluster.length >= 1) {
      cluster.forEach(r => processedIds.add(r.id));
      
      const avgLat = cluster.reduce((sum, r) => sum + r.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((sum, r) => sum + r.lng, 0) / cluster.length;
      
      const isBear = cluster.some(r => r.type === 'bear');
      const isDeer = cluster.some(r => r.type === 'deer-live');

      dynamicZones.push({
        id: `dynamic-${report.id}`,
        center: [avgLat, avgLng],
        radius: 400 + (cluster.length * 100),
        riskLevel: (isBear || cluster.length > 2) ? 'extreme' : (isDeer ? 'high' : 'moderate'),
        reason: `User-reported ${isBear ? 'bear' : 'wildlife'} activity (${cluster.length} reports)`,
        activeTimes: ['all']
      });
    }
  });

  return [...baseZones, ...dynamicZones];
};

export const createWildlifeReport = (
  lat: number,
  lng: number,
  type: WildlifeType
): WildlifeReport => {
  const now = Date.now();
  
  const durations: Record<WildlifeType, number> = {
    'deer-live': 4 * 60 * 60 * 1000,
    'deer-dead': 48 * 60 * 60 * 1000,
    'raccoon': 24 * 60 * 60 * 1000,
    'squirrel': 12 * 60 * 60 * 1000,
    'bear': 12 * 60 * 60 * 1000
  };

  return {
    id: Math.random().toString(36).substr(2, 9),
    lat,
    lng,
    type,
    timestamp: now,
    expiresAt: now + durations[type],
    reportCount: 1
  };
};
