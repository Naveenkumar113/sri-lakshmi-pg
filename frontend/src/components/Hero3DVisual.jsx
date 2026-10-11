import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Hero3DVisual() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(220, 220);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Group for 3D hostel emblem
    const group = new THREE.Group();
    scene.add(group);

    // Modern glass-like isometric building cube
    const geometry = new THREE.BoxGeometry(1.6, 2.0, 1.4);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xEA580C,
      roughness: 0.15,
      transmission: 0.85,
      thickness: 0.6,
      transparent: true,
      opacity: 0.9,
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    // Subtle edge wireframe
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xFDBA74, linewidth: 2 })
    );
    group.add(line);

    // Inner glowing core
    const innerGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B, wireframe: true });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFDBA74, 2, 50);
    pointLight.position.set(3, 3, 3);
    scene.add(pointLight);

    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle floating oscillation
      group.rotation.y = elapsedTime * 0.35;
      group.rotation.x = Math.sin(elapsedTime * 0.5) * 0.1;
      group.position.y = Math.sin(elapsedTime * 0.8) * 0.08;

      innerMesh.rotation.y = -elapsedTime * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      innerGeo.dispose();
      innerMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="d-none d-lg-block pointer-events-none"
      style={{
        width: '220px',
        height: '220px',
        opacity: 0.92,
      }}
    />
  );
}
