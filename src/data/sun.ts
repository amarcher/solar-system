import type { SunData } from '../types/celestialBody';

export const sun: SunData = {
  name: 'Sun',
  diameter: 1_392_700,
  mass: '1.989 × 10³⁰ kg',
  surfaceTemperature: 5_500,
  coreTemperature: '~15 million °C',
  spectralType: 'G2V',
  age: '~4.6 billion years',
  luminosity: '3.828 × 10²⁶ watts',
  summary:
    'The Sun is the star at the center of our solar system. A nearly perfect sphere of hot plasma, it generates energy through nuclear fusion in its core — fusing hydrogen atoms into helium and releasing an enormous amount of light and heat. That energy drives Earth\'s weather, powers photosynthesis, and makes life on our planet possible.',
  funFacts: [
    'The Sun is so big that about 1.3 million Earths could fit inside it.',
    'Light from the Sun takes about 8 minutes and 20 seconds to travel the 150 million kilometers to Earth.',
    'The Sun converts roughly 600 million tonnes of hydrogen into helium every single second through nuclear fusion.',
    'Even though it looks solid from Earth, the Sun is made entirely of gas — mostly hydrogen (about 73%) and helium (about 25%).',
    'The Sun\'s outer atmosphere, the corona, is mysteriously much hotter than its visible surface — reaching over a million degrees Celsius.',
    'The Sun is about halfway through its life. In about 5 billion years it will expand into a red giant, growing large enough to swallow Mercury and Venus.',
  ],
  layers: [
    {
      name: 'Corona',
      temperature: '1–3 million °C',
      description:
        'The outermost layer of the Sun\'s atmosphere, the corona extends millions of kilometers into space and is only visible from Earth during a total solar eclipse. Despite being far from the energy-producing core, it is mysteriously hotter than the layers below — a puzzle scientists are still working to solve. The solar wind that streams out across the solar system originates here.',
      color: '#fff8e0',
    },
    {
      name: 'Chromosphere',
      temperature: '4,000–25,000 °C',
      description:
        'A thin, reddish layer sitting just above the visible surface of the Sun. The chromosphere is where solar prominences — giant arching streams of plasma — and spicules (small jets of gas) shoot upward. Its pinkish-red color, caused by hydrogen emitting light at a specific wavelength called H-alpha, briefly flashes into view as a crimson ring during total solar eclipses.',
      color: '#ff6b35',
    },
    {
      name: 'Photosphere',
      temperature: '~5,500 °C',
      description:
        'The photosphere is the visible "surface" of the Sun — the layer from which almost all of the sunlight we see is emitted. It is about 500 km thick and has a granular texture caused by convection cells of hot gas rising and falling. Dark patches called sunspots appear here where strong magnetic fields prevent hot plasma from rising, making those regions cooler than their surroundings.',
      color: '#ffd700',
    },
    {
      name: 'Convective Zone',
      temperature: '~2 million °C',
      description:
        'Extending from about 70% of the Sun\'s radius out to the photosphere, the convective zone is where energy travels by convection. Hot plasma rises to the surface, releases its energy as light and heat, cools, and sinks back down — much like a boiling pot of water. This churning motion also generates the Sun\'s powerful magnetic field through a dynamo effect.',
      color: '#ff8c00',
    },
    {
      name: 'Radiative Zone',
      temperature: '2–7 million °C',
      description:
        'Below the convective zone lies the radiative zone, which extends from about 25% to 70% of the Sun\'s radius. Here, energy produced in the core travels outward as photons of light, but the plasma is so dense that a single photon can take anywhere from 10,000 to 170,000 years to make its way through this layer before reaching the convective zone.',
      color: '#ff4500',
    },
    {
      name: 'Core',
      temperature: '~15 million °C',
      description:
        'The core is the powerhouse of the Sun, spanning roughly the inner 25% of its radius. Extreme temperature and pressure — about 250 billion times Earth\'s atmospheric pressure — force hydrogen nuclei to fuse together, forming helium and releasing tremendous energy in the process. Every second, the core converts about 600 million tonnes of hydrogen into helium through this nuclear fusion reaction.',
      color: '#ffffff',
    },
  ],
};
