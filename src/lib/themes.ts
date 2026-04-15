export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    text: string;
    map: {
      grass: string;
      forest: string;
      road: string;
      water: string;
      mountain: string;
    }
  };
}

export const THEMES: Theme[] = [
  {
    id: 'forest',
    name: 'Deep Forest',
    colors: {
      primary: '#40513B',
      secondary: '#609966',
      accent: '#9DC08B',
      background: '#F5F5F0',
      card: '#FFFFFF',
      text: '#141414',
      map: {
        grass: '#9DC08B',
        forest: '#40513B',
        road: '#444444',
        water: '#6096B4',
        mountain: '#606C5D',
      }
    }
  },
  {
    id: 'sunset',
    name: 'Mountain Sunset',
    colors: {
      primary: '#7C2D12',
      secondary: '#B45309',
      accent: '#F59E0B',
      background: '#FFF7ED',
      card: '#FFFFFF',
      text: '#431407',
      map: {
        grass: '#FDE68A',
        forest: '#7C2D12',
        road: '#57534E',
        water: '#38B2AC',
        mountain: '#78350F',
      }
    }
  },
  {
    id: 'midnight',
    name: 'Midnight Trail',
    colors: {
      primary: '#1E293B',
      secondary: '#334155',
      accent: '#6366F1',
      background: '#0F172A',
      card: '#1E293B',
      text: '#F8FAFC',
      map: {
        grass: '#0F172A',
        forest: '#1E293B',
        road: '#334155',
        water: '#1E40AF',
        mountain: '#020617',
      }
    }
  },
  {
    id: 'classic',
    name: 'HillHopper Classic',
    colors: {
      primary: '#141414',
      secondary: '#404040',
      accent: '#E5E5E5',
      background: '#F5F5F5',
      card: '#FFFFFF',
      text: '#000000',
      map: {
        grass: '#D1D5DB',
        forest: '#4B5563',
        road: '#1F2937',
        water: '#3B82F6',
        mountain: '#374151',
      }
    }
  },
  {
    id: 'autumn',
    name: 'Autumn Ridge',
    colors: {
      primary: '#92400E',
      secondary: '#B45309',
      accent: '#F97316',
      background: '#FFFBEB',
      card: '#FFFFFF',
      text: '#451A03',
      map: {
        grass: '#FDE68A',
        forest: '#92400E',
        road: '#4B5563',
        water: '#0891B2',
        mountain: '#78350F',
      }
    }
  },
  {
    id: 'winter',
    name: 'Winter Peak',
    colors: {
      primary: '#1E3A8A',
      secondary: '#3B82F6',
      accent: '#93C5FD',
      background: '#F0F9FF',
      card: '#FFFFFF',
      text: '#0C4A6E',
      map: {
        grass: '#E0F2FE',
        forest: '#1E3A8A',
        road: '#64748B',
        water: '#0EA5E9',
        mountain: '#1E293B',
      }
    }
  },
  {
    id: 'retro',
    name: 'Retro Valley',
    colors: {
      primary: '#701A75',
      secondary: '#A21CAF',
      accent: '#F472B6',
      background: '#FDF2F8',
      card: '#FFFFFF',
      text: '#4A044E',
      map: {
        grass: '#FBCFE8',
        forest: '#701A75',
        road: '#1E293B',
        water: '#22D3EE',
        mountain: '#4C1D95',
      }
    }
  }
];
