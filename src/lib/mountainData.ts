export interface CategoryLocation {
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

export const SCENIC_OVERLOOKS: CategoryLocation[] = [
  { name: "Riverview Overlook", lat: 41.3242, lng: -74.8024 },
  { name: "Minisink Overlook", lat: 41.3250, lng: -74.8000 },
  { name: "Tri-State Overlook", lat: 41.3500, lng: -74.7500 },
  { name: "Milford Knob Overlook", lat: 41.3320, lng: -74.7950 },
  { name: "Resort Point Overlook", lat: 41.0000, lng: -75.1500 },
  { name: "The Knob Overlook", lat: 41.1200, lng: -75.3600 },
];

export const COZY_CABINS: CategoryLocation[] = [
  { name: "Babbling Brook Cottages", lat: 41.2200, lng: -74.8800 },
  { name: "Cozy 1-Bedroom Cabin", lat: 41.3500, lng: -74.8200 },
  { name: "Cabin by the Delaware River", lat: 41.3700, lng: -74.7800 },
  { name: "Countryside Cottages", lat: 41.0000, lng: -75.2500 },
  { name: "Mountain Springs Lake Resort Cabins", lat: 41.0500, lng: -75.2800 },
  { name: "Poconos Log Cabin Rentals", lat: 41.0600, lng: -75.7700 },
];

export const HIKING_TRAILS: CategoryLocation[] = [
  { name: "Milford Knob Trailhead", lat: 41.3300, lng: -74.8000 },
  { name: "Raymondskill Falls Trail", lat: 41.2900, lng: -74.8400 },
  { name: "Hornbecks Creek Trail", lat: 41.2500, lng: -74.8600 },
  { name: "Hackers Falls Trail", lat: 41.3000, lng: -74.8300 },
  { name: "McDade Recreational Trail", lat: 41.1500, lng: -75.0000 },
  { name: "Cornelia & Florence Bridge Nature Preserve", lat: 41.3100, lng: -74.8100 },
];

export const WILD_SPOTS: CategoryLocation[] = [
  { name: "Delaware Water Gap National Recreation Area", lat: 41.0000, lng: -75.0000 },
  { name: "Stairway Wild Area", lat: 41.3800, lng: -74.7500 },
  { name: "Bruce Lake Natural Area", lat: 41.3500, lng: -75.2500 },
  { name: "Promised Land State Park", lat: 41.3000, lng: -75.2100 },
  { name: "Cherry Valley National Wildlife Refuge", lat: 40.9500, lng: -75.1500 },
  { name: "Bushkill Falls", lat: 41.1100, lng: -75.0000 },
  { name: "Cornelia & Florence Bridge Nature Preserve", lat: 41.3100, lng: -74.8100 },
];

export const CATEGORIES = [
  { id: 'overlooks', label: 'Scenic Overlooks', icon: 'Camera', color: 'bg-blue-100 text-blue-600', data: SCENIC_OVERLOOKS },
  { id: 'trails', label: 'Hiking Trails', icon: 'Wind', color: 'bg-green-100 text-green-600', data: HIKING_TRAILS },
  { id: 'cabins', label: 'Cozy Cabins', icon: 'Home', color: 'bg-orange-100 text-orange-600', data: COZY_CABINS },
  { id: 'wild', label: 'Wild Spots', icon: 'ShieldAlert', color: 'bg-yellow-100 text-yellow-600', data: WILD_SPOTS },
];
