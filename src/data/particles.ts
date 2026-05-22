export interface ParticleData {
  position: [number, number, number];
  color: string;
  title: string;
  url: string;
  symbol: string;
  scale: number;
  rotation: number;
  drift: number;
  depth: number;
}

const sites = [
  { title: "Google", url: "https://google.com" },
  { title: "Wikipedia", url: "https://wikipedia.org" },
  { title: "GitHub", url: "https://github.com" },
  { title: "NASA", url: "https://nasa.gov" },
  { title: "MDN Web Docs", url: "https://developer.mozilla.org" },
  { title: "Three.js", url: "https://threejs.org" },
  { title: "React", url: "https://react.dev" },
  { title: "Vercel", url: "https://vercel.com" },
  { title: "CodePen", url: "https://codepen.io" },
  { title: "CSS-Tricks", url: "https://css-tricks.com" }
];

const noteSymbols = [
  '♪',
  '♫',
  '♬',
  '♩',
  '♭',
  '♯',
  '♮',
];

function seededRandom(index: number, salt = 0) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const particlesData: ParticleData[] = Array.from({ length: 158 }).map((_, i) => {
  const site = sites[Math.floor(seededRandom(i, 0) * sites.length)];
  const depth = seededRandom(i, 3);
  const layer = Math.floor(depth * 5);
  const perspective = 0.55 + depth * 1.25;
  const width = 54 + layer * 24;
  const height = 30 + layer * 8;
  const x = (seededRandom(i, 1) - 0.5) * width;
  const y = -9 + seededRandom(i, 2) * height;
  const z = -16 - depth * 118;
  const scale = (0.9 + seededRandom(i, 4) * 2.35) / perspective;

  return {
    position: [x, y, z],
    color: '#f8fbff',
    title: `${site.title} Node ${i}`,
    url: site.url,
    symbol: noteSymbols[i % noteSymbols.length],
    scale,
    rotation: -1.05 + seededRandom(i, 5) * 2.1,
    drift: 0.16 + seededRandom(i, 6) * 0.34,
    depth,
  };
});
