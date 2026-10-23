import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Auth3DCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Do not initialize heavy 3D WebGL context on mobile/tablet viewports where hero panel is hidden
    if (window.innerWidth < 992) {
      return;
    }

    // Dimensions
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 560;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 5.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Group for 3D Hostel Living Tower & Room Visuals
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Futuristic Glass Isometric Building Tower (Sri Lakshmi PG)
    const baseGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.15, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0F172A,
      roughness: 0.3,
      metalness: 0.8,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.6;
    mainGroup.add(baseMesh);

    // Glowing Neon Base Ring
    const ringGeo = new THREE.TorusGeometry(1.9, 0.04, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xF4510B });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -1.52;
    mainGroup.add(ringMesh);

    // Tower Structure — Stack of modern stylized living modules
    const towerGroup = new THREE.Group();
    mainGroup.add(towerGroup);

    const floorCount = 4;
    const floorHeight = 0.65;
    const floors = [];

    for (let i = 0; i < floorCount; i++) {
      const fGroup = new THREE.Group();
      fGroup.position.y = -1.2 + i * floorHeight;

      // Outer Frosted Glass Room Block
      const roomGeo = new THREE.BoxGeometry(1.7, 0.52, 1.7);
      const roomMat = new THREE.MeshPhysicalMaterial({
        color: i % 2 === 0 ? 0x1E293B : 0x0F172A,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.7,
        thickness: 0.8,
        transparent: true,
        opacity: 0.88,
      });
      const roomMesh = new THREE.Mesh(roomGeo, roomMat);
      fGroup.add(roomMesh);

      // Edge outline
      const edges = new THREE.EdgesGeometry(roomGeo);
      const edgeLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: i === 2 ? 0xF4510B : 0x38BDF8,
          linewidth: 1.5,
          transparent: true,
          opacity: 0.65,
        })
      );
      fGroup.add(edgeLine);

      // Stylized glowing interior element (Warm light inside PG rooms)
      const lightCoreGeo = new THREE.BoxGeometry(0.8, 0.28, 0.8);
      const lightCoreMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xFB923C : 0xFDBA74,
        transparent: true,
        opacity: 0.75,
      });
      const lightCore = new THREE.Mesh(lightCoreGeo, lightCoreMat);
      fGroup.add(lightCore);

      towerGroup.add(fGroup);
      floors.push(fGroup);
    }

    // 2. Floating Orbiting Amenities Spheres & Badges (Wi-Fi, Security, Food, Power)
    const orbitGroup = new THREE.Group();
    mainGroup.add(orbitGroup);

    const iconCount = 3;
    const icons = [];
    const orbitRadius = 2.2;

    for (let j = 0; j < iconCount; j++) {
      const angle = (j / iconCount) * Math.PI * 2;
      const orbGeo = new THREE.IcosahedronGeometry(0.24, 2);
      const orbMat = new THREE.MeshStandardMaterial({
        color: j === 0 ? 0xF4510B : j === 1 ? 0x10B981 : 0x3B82F6,
        roughness: 0.2,
        metalness: 0.85,
        emissive: j === 0 ? 0x9A3412 : j === 1 ? 0x065F46 : 0x1E40AF,
        emissiveIntensity: 0.4,
      });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      orbMesh.position.set(Math.cos(angle) * orbitRadius, 0.2 + (j - 1) * 0.5, Math.sin(angle) * orbitRadius);
      orbitGroup.add(orbMesh);

      // Surrounding mini ring
      const miniRingGeo = new THREE.TorusGeometry(0.35, 0.015, 8, 32);
      const miniRingMat = new THREE.MeshBasicMaterial({
        color: 0xFFEDD5,
        transparent: true,
        opacity: 0.5,
      });
      const miniRing = new THREE.Mesh(miniRingGeo, miniRingMat);
      orbMesh.add(miniRing);

      icons.push({ mesh: orbMesh, ring: miniRing, baseAngle: angle, speed: 0.4 + j * 0.1 });
    }

    // 3. Floating Holographic Particles (Dust motes / tech ambience)
    const particleCount = 65;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount * 3; p += 3) {
      particlePos[p] = (Math.random() - 0.5) * 5.0;
      particlePos[p + 1] = (Math.random() - 0.5) * 4.0;
      particlePos[p + 2] = (Math.random() - 0.5) * 4.0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xFDBA74,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.4);
    scene.add(ambientLight);

    const mainOrangeLight = new THREE.PointLight(0xF4510B, 4.5, 20);
    mainOrangeLight.position.set(3, 4, 3);
    scene.add(mainOrangeLight);

    const fillBlueLight = new THREE.PointLight(0x38BDF8, 3, 20);
    fillBlueLight.position.set(-3, 1, 2);
    scene.add(fillBlueLight);

    // Interactive Mouse Tracking
    let targetRotationX = 0.2;
    let targetRotationY = -0.4;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 0.8;
      mouseY = y * 0.6;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera / group rotation with mouse reaction
      targetRotationY = -0.4 + mouseX;
      targetRotationX = 0.2 + mouseY;

      mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y) * 0.05;
      mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.05;

      // Gentle continuous floating motion
      mainGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.08;

      // Rotate individual floor accents slightly
      floors.forEach((f, idx) => {
        f.rotation.y = Math.sin(elapsedTime * 0.6 + idx) * 0.04;
      });

      // Orbiting spheres
      icons.forEach((item, idx) => {
        const curAngle = item.baseAngle + elapsedTime * item.speed;
        item.mesh.position.x = Math.cos(curAngle) * orbitRadius;
        item.mesh.position.z = Math.sin(curAngle) * orbitRadius;
        item.mesh.position.y = 0.2 + Math.sin(elapsedTime * 2 + idx) * 0.25;
        item.ring.rotation.x = elapsedTime * 1.5;
        item.ring.rotation.y = elapsedTime * 1.2;
      });

      // Slowly rotate particle field
      particleSystem.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-100 h-100 position-absolute top-0 start-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
