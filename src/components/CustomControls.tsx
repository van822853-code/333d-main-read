import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { routeCurve } from '../data/route';

const BASE_ROUTE_SPEED = 0.011;

export function CustomControls() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  // Track currently pressed keys
  const keys = useRef({ w: false, a: false, s: false, d: false });

  const routeProgress = useRef(0);
  const routeComplete = useRef(false);
  const routeStarted = useRef(false);
  const routeEndSent = useRef(false);
  const routePaused = useRef(false);
  const routeSpeed = useRef(1);

  useEffect(() => {
    camera.position.copy(routeCurve.points[0]);
    if (controlsRef.current) {
      controlsRef.current.target.copy(routeCurve.getPoint(0.05));
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keys.current[key as keyof typeof keys.current] = true;
      }
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keys.current[key as keyof typeof keys.current] = false;
      }
    };
    
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);

    const handleStartRoute = () => {
      routeStarted.current = true;
      routeComplete.current = false;
      routeEndSent.current = false;
      routePaused.current = false;
      window.dispatchEvent(new CustomEvent('route-resumed'));
    };

    const handleResetView = () => {
      routeStarted.current = false;
      routeProgress.current = 0;
      routeComplete.current = false;
      routeEndSent.current = false;
      routePaused.current = false;
      camera.position.copy(routeCurve.points[0]);
      if (controlsRef.current) {
        controlsRef.current.target.copy(routeCurve.getPoint(0.05));
      }
    };

    const handlePauseRoute = () => {
      if (!routeStarted.current || routeComplete.current) return;
      routePaused.current = true;
      window.dispatchEvent(new CustomEvent('route-paused'));
    };

    const handleResumeRoute = () => {
      if (!routeStarted.current || routeComplete.current) return;
      routePaused.current = false;
      window.dispatchEvent(new CustomEvent('route-resumed'));
    };

    const handleSpeedChange = (event: Event) => {
      const nextSpeed = (event as CustomEvent<number>).detail;
      if (typeof nextSpeed !== 'number' || Number.isNaN(nextSpeed)) return;
      routeSpeed.current = THREE.MathUtils.clamp(nextSpeed, 0.25, 3);
    };

    window.addEventListener('start-route', handleStartRoute);
    window.addEventListener('reset-view', handleResetView);
    window.addEventListener('route-pause', handlePauseRoute);
    window.addEventListener('route-resume', handleResumeRoute);
    window.addEventListener('route-speed-change', handleSpeedChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('start-route', handleStartRoute);
      window.removeEventListener('reset-view', handleResetView);
      window.removeEventListener('route-pause', handlePauseRoute);
      window.removeEventListener('route-resume', handleResumeRoute);
      window.removeEventListener('route-speed-change', handleSpeedChange);
    };
  }, [camera]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (routeStarted.current && !routeComplete.current) {
      if (routePaused.current) {
        controlsRef.current.update();
        return;
      }

      routeProgress.current = Math.min(1, routeProgress.current + delta * BASE_ROUTE_SPEED * routeSpeed.current);
      const currentPoint = routeCurve.getPoint(routeProgress.current);
      const nextPoint = routeCurve.getPoint(Math.min(1, routeProgress.current + 0.04));
      camera.position.copy(currentPoint);
      controlsRef.current.target.copy(nextPoint);
      controlsRef.current.update();

      if (routeProgress.current >= 1 && !routeEndSent.current) {
        routeComplete.current = true;
        routeEndSent.current = true;
        window.dispatchEvent(new CustomEvent('route-end'));
      }

      return;
    }

    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();

    camera.getWorldDirection(direction);
    right.crossVectors(direction, camera.up).normalize();

    if (keys.current.w) velocity.add(direction);
    if (keys.current.s) velocity.sub(direction);
    if (keys.current.d) velocity.add(right);
    if (keys.current.a) velocity.sub(right);

    if (velocity.lengthSq() > 0) {
      velocity.normalize().multiplyScalar(30 * delta);
      camera.position.add(velocity);
      controlsRef.current.target.add(velocity);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      makeDefault
      enablePan={false}
      enableZoom
      zoomSpeed={1.2}
      rotateSpeed={1.8}
      minPolarAngle={Math.PI / 2}
      maxPolarAngle={Math.PI / 2}
    />
  );
}
