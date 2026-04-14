import { RouteStep } from '../lib/types';

export const getMountainRoute = async (
  start: [number, number],
  end: [number, number]
): Promise<RouteStep[]> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&steps=true`
    );
    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error('Routing failed');
    }

    const route = data.routes[0];
    const steps: RouteStep[] = [];

    route.legs[0].steps.forEach((step: any) => {
      steps.push({
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
        type: step.maneuver.type === 'turn' ? 'turn' : 'straight',
        lat: step.maneuver.location[1],
        lng: step.maneuver.location[0]
      });
    });

    // Add final destination step
    steps.push({
      instruction: "Arrive at Destination",
      distance: 0,
      duration: 0,
      type: 'straight',
      lat: end[0],
      lng: end[1]
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
