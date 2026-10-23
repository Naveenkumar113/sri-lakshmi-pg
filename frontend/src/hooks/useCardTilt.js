import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * High-performance 3D perspective tilt hook using pure CSS transforms.
 * Restrained to +/- 3 degrees for an elegant, non-disruptive tactile feel on desktop.
 * Automatically disabled on touch screens, mobile viewports (< 992px),
 * and when prefers-reduced-motion is active.
 */
export function useCardTilt() {
  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState('');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    const checkInteractivity = () => {
      const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobileWidth = window.innerWidth < 992;
      setIsInteractive(!isTouch && !prefersReduced && !isMobileWidth);
    };

    checkInteractivity();
    window.addEventListener('resize', checkInteractivity);
    return () => window.removeEventListener('resize', checkInteractivity);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isInteractive || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Restrained tilt: max 3 degrees on X and Y
    const rotateX = ((y - centerY) / centerY) * -3;
    const rotateY = ((x - centerX) / centerX) * 3;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTransformStyle(`perspective(1400px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0)`);
    setGlarePosition({ x: glareX, y: glareY, opacity: 0.1 });
  }, [isInteractive]);

  const handleMouseLeave = useCallback(() => {
    if (!isInteractive) return;
    setTransformStyle('perspective(1400px) rotateX(0deg) rotateY(0deg) translateZ(0)');
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  }, [isInteractive]);

  return {
    cardRef,
    transformStyle: isInteractive ? transformStyle : '',
    glarePosition,
    handleMouseMove,
    handleMouseLeave,
    isInteractive,
  };
}
