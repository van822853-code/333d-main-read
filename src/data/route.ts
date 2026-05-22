import * as THREE from 'three';

export interface RouteNoteData {
  title: string;
  url: string;
}

export const routePoints = [
  new THREE.Vector3(0, 0, 30),
  new THREE.Vector3(-3.5, 1.8, 16),
  new THREE.Vector3(-1.4, 0.6, 2),
  new THREE.Vector3(1.9, -0.8, -12),
  new THREE.Vector3(0.8, 1.3, -26),
  new THREE.Vector3(0, 1.8, -42),
  new THREE.Vector3(0, 2.2, -56),
];

export const routeCurve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.85);
export const routeMarkerPositions = routeCurve.getPoints(19);
export const routeSymbolSequence = ['♪', '♫', '♬', '♩', '♭', '♯', '♮'];

export const routeNotesData: RouteNoteData[] = [
  { title: 'Nexus Start', url: 'https://nexus.example.com' },
  { title: 'Cosmos Echo', url: 'https://cosmos.example.com' },
  { title: 'Sound Waves', url: 'https://sound.example.com' },
  { title: 'Digital Realm', url: 'https://digital.example.com' },
  { title: 'Neural Network', url: 'https://neural.example.com' },
  { title: 'Data Stream', url: 'https://data.example.com' },
  { title: 'Signal Flow', url: 'https://signal.example.com' },
  { title: 'Harmonic Pulse', url: 'https://harmonic.example.com' },
  { title: 'Quantum Echo', url: 'https://quantum.example.com' },
  { title: 'Stellar Light', url: 'https://stellar.example.com' },
  { title: 'Void Gateway', url: 'https://void.example.com' },
  { title: 'Resonance', url: 'https://resonance.example.com' },
  { title: 'Frequency', url: 'https://frequency.example.com' },
  { title: 'Amplitude', url: 'https://amplitude.example.com' },
  { title: 'Wavelength', url: 'https://wavelength.example.com' },
  { title: 'Spectrum', url: 'https://spectrum.example.com' },
  { title: 'Vibration', url: 'https://vibration.example.com' },
  { title: 'Oscillation', url: 'https://oscillation.example.com' },
  { title: 'Modulation', url: 'https://modulation.example.com' },
  { title: 'Nexus End', url: 'https://nexus-end.example.com' },
];

export function getRouteSymbol(index: number) {
  return routeSymbolSequence[index % routeSymbolSequence.length];
}

export function getRouteNoteData(index: number) {
  return routeNotesData[index % routeNotesData.length];
}
