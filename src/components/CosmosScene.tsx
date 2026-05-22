import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { useEffect, useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { particlesData, ParticleData } from '../data/particles';
import { routeMarkerPositions, getRouteSymbol, getRouteNoteData } from '../data/route';
import { CustomControls } from './CustomControls';
import { ExhibitionWork, fetchWorks } from '../lib/api';

const WHITE = '#f8fbff';

function createNoteTexture(symbol: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 156px "Arial Unicode MS", "Times New Roman", Georgia, serif';

  for (const blur of [34, 22, 12]) {
    ctx.shadowColor = 'rgba(245, 249, 255, 1)';
    ctx.shadowBlur = blur;
    ctx.fillStyle = 'rgba(245, 249, 255, 0.28)';
    ctx.fillText(symbol, 128, 126);
  }

  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3;
  ctx.strokeText(symbol, 128, 126);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(symbol, 128, 126);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createRouteCardTexture(image: HTMLImageElement, symbol: string, cornerIndex: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const cardX = 34;
  const cardY = 42;
  const cardW = 700;
  const cardH = 428;
  const radius = 38;
  const sourceAspect = image.width / image.height;
  const cardAspect = cardW / cardH;
  const drawH = sourceAspect > cardAspect ? cardH : cardW / sourceAspect;
  const drawW = sourceAspect > cardAspect ? cardH * sourceAspect : cardW;
  const drawX = cardX + (cardW - drawW) / 2;
  const drawY = cardY + (cardH - drawH) / 2;
  const corners = [
    [cardX + 50, cardY + 50],
    [cardX + cardW - 50, cardY + 50],
    [cardX + cardW - 50, cardY + cardH - 50],
    [cardX + 50, cardY + cardH - 50],
  ];
  const [noteX, noteY] = corners[cornerIndex % corners.length];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.shadowColor = 'rgba(170, 210, 255, 0.55)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.fill();

  ctx.save();
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.clip();
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.stroke();

  ctx.shadowColor = 'rgba(123, 62, 235, 0.48)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(noteX, noteY, 39, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 48px "Arial Unicode MS", "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#7c2de2';
  ctx.fillText(symbol, noteX, noteY + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 58);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 16;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(64, 4);
  ctx.lineTo(64, 124);
  ctx.moveTo(4, 64);
  ctx.lineTo(124, 64);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

function Particle({ data }: { data: ParticleData }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => createNoteTexture(data.symbol), [data.symbol]);

  useFrame(({ clock }) => {
    if (spriteRef.current) {
      const time = clock.elapsedTime;
      spriteRef.current.position.y = Math.sin(time * data.drift + data.position[0]) * (0.34 + data.depth * 0.42);
      spriteRef.current.material.rotation = data.rotation + Math.sin(time * 0.35 + data.position[2]) * 0.08;
    }
  });

  return (
    <group position={data.position}>
      <sprite
        ref={spriteRef}
        scale={[data.scale, data.scale, 1]}
      >
        <spriteMaterial
          map={texture}
          color={WHITE}
          transparent
          opacity={0.9 - data.depth * 0.48}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

function RouteNote({
  position,
  symbol,
  noteIndex,
  work,
}: {
  position: THREE.Vector3;
  symbol: string;
  noteIndex: number;
  work?: ExhibitionWork;
}) {
  const [hovered, setHovered] = useState(false);
  const routeImageTexture = useLoader(THREE.TextureLoader, work?.coverUrl || '/assets/route-note-card.png');
  const texture = useMemo(
    () => createRouteCardTexture(routeImageTexture.image as HTMLImageElement, symbol, noteIndex),
    [routeImageTexture, symbol, noteIndex]
  );
  const displayPosition = useMemo(() => {
    const lane = noteIndex % 6;
    const heightOffset = lane < 4 ? -0.42 - lane * 0.08 : 0.08 + (lane - 4) * 0.12;
    return new THREE.Vector3(position.x, position.y + heightOffset, position.z);
  }, [position, noteIndex]);
  const cardScale = useMemo(() => {
    const depthRatio = noteIndex / Math.max(1, routeMarkerPositions.length - 1);
    const height = THREE.MathUtils.lerp(0.98, 0.34, depthRatio);
    const hoverFactor = hovered ? 1.12 : 1;
    return [height * 1.5 * hoverFactor, height * hoverFactor, 1] as [number, number, number];
  }, [hovered, noteIndex]);
  const spriteRef = useRef<THREE.Sprite>(null);
  const noteData = getRouteNoteData(noteIndex);
  const targetUrl = work?.url || noteData.url;

  useCursor(hovered, 'pointer', 'auto');

  useFrame(({ clock }) => {
    if (spriteRef.current) {
      const time = clock.elapsedTime;
      const phase = noteIndex * 1.37;
      const sideBias = noteIndex % 2 === 0 ? -1 : 1;
      const sideSweep = Math.sin(time * 0.34 + phase) * (0.16 + (noteIndex % 4) * 0.045);
      const orbitSweep = Math.cos(time * 0.28 + phase * 0.7) * (0.08 + (noteIndex % 3) * 0.03);
      const lowPass = noteIndex % 6 < 4 ? -0.08 : 0;
      const xDrift = sideBias * (0.08 + (noteIndex % 5) * 0.018) + sideSweep;
      const yDrift = lowPass + Math.cos(time * 0.38 + phase * 0.8) * (0.025 + (noteIndex % 3) * 0.012);
      const zDrift = Math.sin(time * 0.32 + phase * 1.2) * (0.08 + (noteIndex % 4) * 0.025) + orbitSweep;
      spriteRef.current.material.rotation = Math.sin(time * 0.45 + displayPosition.x + phase) * 0.08;
      spriteRef.current.position.set(
        displayPosition.x + xDrift,
        displayPosition.y + yDrift,
        displayPosition.z + zDrift
      );
    }
  });

  return (
    <sprite
      ref={spriteRef}
      position={displayPosition}
      scale={cardScale}
      onClick={() => {
        window.dispatchEvent(new CustomEvent('route-pause'));
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <spriteMaterial
        map={texture}
        transparent
        opacity={hovered ? 1 : 0.94}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function SparkleField() {
  const texture = useMemo(createStarTexture, []);
  const stars = useMemo(() => {
    return Array.from({ length: 34 }).map((_, i) => {
      const x = -28 + ((i * 13) % 56);
      const y = -5 + ((i * 19) % 34);
      const z = -14 + ((i * 17) % 22);
      return {
        position: [x, y, z] as [number, number, number],
        scale: 0.35 + (i % 5) * 0.18,
        rotation: (i % 7) * 0.35,
      };
    });
  }, []);

  return (
    <>
      {stars.map((star, i) => (
        <sprite key={i} position={star.position} scale={[star.scale, star.scale, 1]}>
          <spriteMaterial
            map={texture}
            rotation={star.rotation}
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </>
  );
}

function GroundDust() {
  const { fine, bright } = useMemo(() => {
    const fineCount = 18000;
    const finePositions = new Float32Array(fineCount * 3);
    for (let i = 0; i < fineCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.28) * 380;
      finePositions[i * 3] = Math.cos(angle) * radius;
      finePositions[i * 3 + 1] = -12.2 + Math.random() * 0.42;
      finePositions[i * 3 + 2] = Math.sin(angle) * radius * 0.48 - Math.random() * 34;
    }

    const brightCount = 2600;
    const brightPositions = new Float32Array(brightCount * 3);
    for (let i = 0; i < brightCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.42) * 190;
      brightPositions[i * 3] = Math.cos(angle) * radius;
      brightPositions[i * 3 + 1] = -11.95 + Math.random() * 0.6;
      brightPositions[i * 3 + 2] = Math.sin(angle) * radius * 0.5 - Math.random() * 26;
    }

    const fineGeometry = new THREE.BufferGeometry();
    fineGeometry.setAttribute('position', new THREE.BufferAttribute(finePositions, 3));
    const brightGeometry = new THREE.BufferGeometry();
    brightGeometry.setAttribute('position', new THREE.BufferAttribute(brightPositions, 3));
    return { fine: fineGeometry, bright: brightGeometry };
  }, []);

  return (
    <>
      <points geometry={fine}>
        <pointsMaterial
          size={0.16}
          color={WHITE}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <points geometry={bright}>
        <pointsMaterial
          size={0.34}
          color={WHITE}
          transparent
          opacity={0.78}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </>
  );
}

function SpiralRings() {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => {
    return [12, 23, 36].map((radius, ringIndex) => {
      const group = new THREE.Group();
      const segmentCount = 34;
      const visibleFraction = 0.46;

      for (let segment = 0; segment < segmentCount; segment += 1) {
        const start = (segment / segmentCount) * Math.PI * 2;
        const end = start + (Math.PI * 2 / segmentCount) * visibleFraction;
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= 10; i += 1) {
          const angle = start + (end - start) * (i / 10);
          points.push(new THREE.Vector3(Math.cos(angle) * radius, -11.55, Math.sin(angle) * radius * 0.42));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const core = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 12, 0.035 + ringIndex * 0.012, 8, false),
          new THREE.MeshBasicMaterial({
            color: WHITE,
            transparent: true,
            opacity: 0.22 - ringIndex * 0.04,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          })
        );
        const glow = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 12, 0.24 + ringIndex * 0.08, 10, false),
          new THREE.MeshBasicMaterial({
            color: WHITE,
            transparent: true,
            opacity: 0.045,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          })
        );

        group.add(glow);
        group.add(core);
      }

      group.rotation.y = ringIndex * 0.1;
      return group;
    });
  }, []);

  const halo = useMemo(() => {
    const count = 2200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 34 + Math.random() * 180;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -12.05 + Math.random() * 0.32;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.42;
    }
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return bufferGeometry;
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.02;
  });

  return (
    <group ref={groupRef}>
      <points geometry={halo}>
        <pointsMaterial
          size={0.06}
          color={WHITE}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      {rings.map((ring, i) => (
        <primitive key={i} object={ring} />
      ))}
    </group>
  );
}

export function CosmosScene() {
  const [works, setWorks] = useState<ExhibitionWork[]>([]);

  useEffect(() => {
    let ignore = false;

    async function loadWorks() {
      try {
        const nextWorks = await fetchWorks();
        if (!ignore) setWorks(nextWorks);
      } catch (error) {
        console.warn('Unable to load submitted works', error);
      }
    }

    loadWorks();
    const interval = window.setInterval(loadWorks, 30000);
    window.addEventListener('works-updated', loadWorks);

    return () => {
      ignore = true;
      window.clearInterval(interval);
      window.removeEventListener('works-updated', loadWorks);
    };
  }, []);

  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas camera={{ position: [0, 7, 35], fov: 52 }}>
        {/* Scene Environment */}
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 28, 82]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[0, -4, 8]} intensity={34} color={WHITE} distance={44} />
        <pointLight position={[0, 14, -8]} intensity={18} color={WHITE} distance={60} />

        <GroundDust />
        <SpiralRings />
        <SparkleField />

        {routeMarkerPositions.map((position, i) => (
          <RouteNote
            key={`route-note-${i}`}
            position={position}
            symbol={getRouteSymbol(i)}
            noteIndex={i}
            work={works.length > 0 ? works[i % works.length] : undefined}
          />
        ))}

        {/* Render all exhibition particles */}
        {particlesData.map((p, i) => (
          <Particle key={i} data={p} />
        ))}

        {/* Orbit + Flight Controls */}
        <CustomControls />
      </Canvas>
    </div>
  );
}
