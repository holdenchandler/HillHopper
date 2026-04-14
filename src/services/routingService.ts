import { RouteStep } from '../lib/types';

export const getMountainRoute = async (
  start: [number, number],
  end: [number, number]
): Promise<RouteStep[]> => {
  // In a real app, this would call a routing API with custom weightings
  // for elevation and road type.
  // For this demo, we'll return a simulated "Mountain Flow" route.
  
  return [
    {
      instruction: "Head North on Broad St towards the Poconos",
      distance: 1200,
      duration: 180,
      type: 'straight'
    },
    {
      instruction: "Turn left onto Mountain Rd. Caution: Steep Grade (12%)",
      distance: 3500,
      duration: 600,
      type: 'hazard',
      hazardInfo: "Steep incline ahead. Downshift for control."
    },
    {
      instruction: "Keep right at the fork. Scenic Overlook coming up on your left.",
      distance: 2000,
      duration: 300,
      type: 'scenic'
    },
    {
      instruction: "Entering High Deer-Risk Zone. Reducing speed recommended.",
      distance: 5000,
      duration: 900,
      type: 'hazard',
      hazardInfo: "Active migration corridor. Watch the forest edges!"
    },
    {
      instruction: "Arrive at Hillside Cabin",
      distance: 0,
      duration: 0,
      type: 'straight'
    }
  ];
};
