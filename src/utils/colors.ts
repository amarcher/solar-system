import type { PlanetCategory } from '../types/celestialBody';

export const categoryColors: Record<PlanetCategory, string> = {
  'rocky': 'hsl(25, 70%, 55%)',
  'gas-giant': 'hsl(35, 80%, 60%)',
  'ice-giant': 'hsl(200, 70%, 55%)',
  'dwarf': 'hsl(280, 50%, 55%)',
};

export const categoryLabels: Record<PlanetCategory, string> = {
  'rocky': 'Rocky Planet',
  'gas-giant': 'Gas Giant',
  'ice-giant': 'Ice Giant',
  'dwarf': 'Dwarf Planet',
};
