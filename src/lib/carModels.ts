export type CarModelId = 'sedan' | 'suv' | 'truck' | 'van' | 'sports';

export interface CarModel {
  id: CarModelId;
  name: string;
  emoji: string;
}

export const CAR_MODELS: CarModel[] = [
  { id: 'sedan', name: 'Classic Sedan', emoji: '🚗' },
  { id: 'suv', name: 'Mountain SUV', emoji: '🚙' },
  { id: 'truck', name: 'Hill Truck', emoji: '🛻' },
  { id: 'van', name: 'Adventure Van', emoji: '🚐' },
  { id: 'sports', name: 'Valley Racer', emoji: '🏎️' },
];
