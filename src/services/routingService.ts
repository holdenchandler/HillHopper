import { RouteStep } from '../lib/types';

export const getMountainRoute = async (
  start: [number, number],
  end: [number, number]
): Promise<RouteStep[]> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&steps=true&geometries=geojson`
    );
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('Routing failed');
    }

    const route = data.routes[0];
    const fullGeometry = route.geometry?.coordinates; // [lng, lat][]
    const steps: RouteStep[] = [];

    if (!fullGeometry || !Array.isArray(fullGeometry)) {
      throw new Error('Invalid route geometry');
    }

    // Map geometry to RouteSteps for smooth simulation
    fullGeometry.forEach((coord: [number, number], i: number) => {
      // Find the instruction for this segment if it's a maneuver point
      const instruction = route.legs[0].steps.find((s: any) => 
        Math.abs(s.maneuver.location[0] - coord[0]) < 0.0001 && 
        Math.abs(s.maneuver.location[1] - coord[1]) < 0.0001
      )?.maneuver.instruction || "Continue on road";

      steps.push({
        instruction,
        distance: i === 0 ? 0 : 10, // Approximate
        duration: i === 0 ? 0 : 1, // Approximate
        type: 'straight',
        lat: coord[1],
        lng: coord[0]
      });
    });

    return steps;
  } catch (error) {
    console.error("OSRM Routing failed, falling back to simulation", error);
    // Fallback to simulation if OSRM is down
    const interpolate = (s: number, e: number, t: number) => s + (e - s) * t;
    return [
      {
        instruction: "Head towards destination (Simulation Fallback)",
        distance: 1000,
        duration: 120,
        type: 'straight',
        lat: interpolate(start[0], end[0], 0.5),
        lng: interpolate(start[1], end[1], 0.5)
      },
      {
        instruction: "Arrive at Destination",
        distance: 0,
        duration: 0,
        type: 'straight',
        lat: end[0],
        lng: end[1]
      }
    ];
  }
};
