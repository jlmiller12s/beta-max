'use client';

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

// ─── Glow position constants (tweak these to match your avatar.png) ───────────
// Values are in local plane space relative to the center of the plane.
// (0, 0) = center. Right = +X, Up = +Y.
const EYE_LEFT_POS: [number, number, number] = [-0.18, 0.72, 0.03];
const EYE_RIGHT_POS: [number, number, number] = [0.18, 0.72, 0.03];
const CHEST_POS: [number, number, number] = [0.0, -0.2, 0.03];

const EYE_COLOR = new THREE.Color(0x88ddff);
const CHEST_COLOR = new THREE.Color(0x4488ff);

// ─────────────────────────────────────────────────────────────────────────────

interface GlowSpriteProps {
    position: [number, number, number];
    color: THREE.Color;
    baseScale: number;
    scaleRef: React.MutableRefObject<number>;
    opacityRef: React.MutableRefObject<number>;
}

function GlowSprite({ position, color, baseScale, scaleRef, opacityRef }: GlowSpriteProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (!meshRef.current) return;
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        const s = baseScale * scaleRef.current;
        meshRef.current.scale.set(s, s, 1);
        mat.opacity = opacityRef.current;
    });

    return (
        <mesh ref={meshRef} position={position} renderOrder={1}>
            <circleGeometry args={[0.08, 32]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={0.5}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
}

interface AvatarMeshProps {
    state: AvatarState;
    amplitude: number;
}

function AvatarMesh({ state, amplitude }: AvatarMeshProps) {
    const texture = useTexture('/avatar.png');
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport } = useThree();

    const t = useRef(0);

    // Per-glow animation refs
    const eyeScaleRef = useRef(1);
    const eyeOpacityRef = useRef(0.5);
    const chestScaleRef = useRef(1);
    const chestOpacityRef = useRef(0.4);

    // Blink state for thinking
    const blinkT = useRef(0);

    // Size the plane to fill most of the viewport (portrait aspect)
    const planeH = viewport.height * 0.85;
    const planeW = planeH * 0.65; // roughly portrait

    useFrame((_, delta) => {
        if (!groupRef.current || !meshRef.current) return;
        t.current += delta;
        const s = t.current;

        // Reset
        groupRef.current.rotation.set(0, 0, 0);
        groupRef.current.position.set(0, 0, 0);
        meshRef.current.scale.set(1, 1, 1);

        switch (state) {
            case 'idle': {
                // Gentle breathing float
                groupRef.current.position.y = Math.sin(s * 0.8) * 0.06;
                groupRef.current.rotation.z = Math.sin(s * 0.5) * 0.008;
                // Subtle 3D sway
                groupRef.current.rotation.y = Math.sin(s * 0.3) * 0.03;

                chestScaleRef.current = 1 + Math.sin(s * 1.2) * 0.15;
                chestOpacityRef.current = 0.3 + Math.sin(s * 1.2) * 0.1;
                eyeScaleRef.current = 1;
                eyeOpacityRef.current = 0.4;
                break;
            }
            case 'listening': {
                // Lean forward slightly, as if attentive
                groupRef.current.position.y = Math.sin(s * 0.8) * 0.04;
                groupRef.current.rotation.x = 0.03; // lean forward
                groupRef.current.rotation.y = Math.sin(s * 1.5) * 0.02;

                chestScaleRef.current = 1 + Math.sin(s * 3.0) * 0.2;
                chestOpacityRef.current = 0.5 + Math.sin(s * 3.0) * 0.15;
                eyeScaleRef.current = 1.4;
                eyeOpacityRef.current = 0.9;
                break;
            }
            case 'thinking': {
                // Slow contemplative sway
                groupRef.current.position.y = Math.sin(s * 0.6) * 0.03;
                groupRef.current.rotation.y = Math.sin(s * 0.8) * 0.05;
                groupRef.current.rotation.z = Math.sin(s * 1.8) * 0.015;

                chestScaleRef.current = 1.1;
                chestOpacityRef.current = 0.55;

                blinkT.current += delta * 2.5;
                const blink = Math.abs(Math.sin(blinkT.current));
                eyeScaleRef.current = 1.1 + blink * 0.4;
                eyeOpacityRef.current = 0.5 + blink * 0.45;
                break;
            }
            case 'speaking': {
                const amp = Math.max(0, Math.min(1, amplitude));
                // Dynamic body movement driven by audio amplitude
                // Head/body bob
                groupRef.current.position.y = Math.sin(s * 2.5) * 0.04 + amp * 0.06;
                // Sway side to side
                groupRef.current.rotation.z = Math.sin(s * 3.5) * amp * 0.04;
                // Tilt as if "speaking" - lean back slightly on peaks
                groupRef.current.rotation.x = -amp * 0.04 + Math.sin(s * 4) * amp * 0.02;
                // Y rotation for liveliness
                groupRef.current.rotation.y = Math.sin(s * 2) * amp * 0.06;
                // Subtle scale pulse on beats
                const scl = 1 + amp * 0.03;
                meshRef.current.scale.set(scl, scl, 1);

                chestScaleRef.current = 1 + amp * 0.6;
                chestOpacityRef.current = 0.4 + amp * 0.55;
                eyeScaleRef.current = 1.1 + amp * 0.3;
                eyeOpacityRef.current = 0.6 + amp * 0.35;
                break;
            }
        }
    });

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef}>
                <planeGeometry args={[planeW, planeH]} />
                <meshBasicMaterial
                    map={texture}
                    toneMapped={false}
                />
            </mesh>

            <GlowSprite
                position={EYE_LEFT_POS}
                color={EYE_COLOR}
                baseScale={1}
                scaleRef={eyeScaleRef}
                opacityRef={eyeOpacityRef}
            />
            <GlowSprite
                position={EYE_RIGHT_POS}
                color={EYE_COLOR}
                baseScale={1}
                scaleRef={eyeScaleRef}
                opacityRef={eyeOpacityRef}
            />
            <GlowSprite
                position={CHEST_POS}
                color={CHEST_COLOR}
                baseScale={0.9}
                scaleRef={chestScaleRef}
                opacityRef={chestOpacityRef}
            />
        </group>
    );
}

interface AvatarSceneProps {
    state: AvatarState;
    amplitude: number;
}

export function AvatarScene({ state, amplitude }: AvatarSceneProps) {
    return (
        <Canvas
            camera={{ position: [0, 0, 3.5], fov: 45 }}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                background: 'transparent',
            }}
            gl={{ alpha: true, antialias: true }}
        >
            <ambientLight intensity={0.8} />
            <pointLight position={[0, 1, 3]} intensity={0.4} color={0x4488ff} />
            <Suspense fallback={null}>
                <AvatarMesh state={state} amplitude={amplitude} />
            </Suspense>
        </Canvas>
    );
}
