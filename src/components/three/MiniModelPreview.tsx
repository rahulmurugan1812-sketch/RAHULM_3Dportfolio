'use client';

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
} from 'react';

import type { ReactNode } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

import { AlertCircle, RefreshCw } from 'lucide-react';


/* ==========================================
   ERROR BOUNDARY
========================================== */

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: (error: Error) => void;
  resetKey: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}


/* ==========================================
   MINI MODEL SCENE
========================================== */

interface MiniSceneProps {
  modelPath: string;
}

function MiniScene({ modelPath }: MiniSceneProps) {

  // IMPORTANT:
  // Do not wrap useGLTF in try/catch.
  // Suspense handles model loading automatically.

  const gltf = useGLTF(modelPath);

  const clonedScene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  const { camera } = useThree();

  const groupRef = useRef<THREE.Group>(null);


  /* Model positioning and camera */

  useEffect(() => {

    const box = new THREE.Box3().setFromObject(clonedScene);

    const center = box.getCenter(new THREE.Vector3());

    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(maxDim) || maxDim <= 0) {
      console.error('Invalid 3D model dimensions:', modelPath);
      return;
    }

    // Centre and ground the model.

    clonedScene.position.set(
      -center.x,
      -box.min.y,
      -center.z
    );

    // Calculate camera distance.

    const perspectiveCamera = camera as THREE.PerspectiveCamera;

    const fov = perspectiveCamera.fov * (Math.PI / 180);

    const distance =
      (maxDim / (2 * Math.tan(fov / 2))) * 1.8;

    perspectiveCamera.position.set(
      distance * 0.8,
      distance * 0.55,
      distance
    );

    perspectiveCamera.lookAt(
      0,
      size.y * 0.35,
      0
    );

    perspectiveCamera.near = Math.max(maxDim / 1000, 0.001);

    perspectiveCamera.far = Math.max(maxDim * 100, 1000);

    perspectiveCamera.updateProjectionMatrix();


    // Preserve original model materials and textures.

    clonedScene.traverse((child) => {

      if (child instanceof THREE.Mesh) {

        child.castShadow = true;

        child.receiveShadow = true;

        if (child.material) {

          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((material) => {

            material.side = THREE.DoubleSide;

            material.needsUpdate = true;

          });

        }

      }

    });

  }, [clonedScene, camera, modelPath]);


  /* Continuous rotation */

  useFrame((_, delta) => {

    if (groupRef.current) {

      groupRef.current.rotation.y += delta * 0.25;

    }

  });


  return (

    <>

      <ambientLight intensity={1.2} />

      <directionalLight
        position={[8, 12, 8]}
        intensity={2}
      />

      <directionalLight
        position={[-8, 8, -8]}
        intensity={1}
      />

      <directionalLight
        position={[0, -4, 4]}
        intensity={0.5}
      />

      <Environment
        preset="studio"
        background={false}
      />

      <group ref={groupRef}>

        <primitive object={clonedScene} />

      </group>

    </>

  );

}
/* ==========================================
   MAIN COMPONENT
========================================== */

interface MiniModelPreviewProps {

  modelPath: string;

  className?: string;

}


export function MiniModelPreview({

  modelPath,

  className = '',

}: MiniModelPreviewProps) {

  const [modelError, setModelError] = useState<string | null>(null);

  const [retryKey, setRetryKey] = useState(0);


  const handleRetry = () => {

    setModelError(null);

    // Clear cached GLTF only when retrying.

    useGLTF.clear(modelPath);

    setRetryKey((previous) => previous + 1);

  };


  return (

    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>

      {/* Actual 3D Canvas */}

      {!modelError && (

        <Canvas

          key={retryKey}

          camera={{
            position: [4, 3, 5],
            fov: 45,
            near: 0.01,
            far: 2000,
          }}

          gl={{

            antialias: true,

            alpha: false,

            powerPreference: 'default',

            stencil: false,

            depth: true,

          }}

          dpr={[1, 1.5]}

          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}

          onCreated={({ gl }) => {

            gl.toneMapping = THREE.ACESFilmicToneMapping;

            gl.toneMappingExposure = 1.15;

            gl.outputColorSpace = THREE.SRGBColorSpace;

            gl.setClearColor(0x0a0a0b, 1);

          }}

        >

          <ModelErrorBoundary

            resetKey={retryKey}

            onError={(error) => {

              console.error(
                '3D Model loading error:',
                modelPath,
                error
              );

              setModelError(error.message || 'Failed to load model');

            }}

          >

            <Suspense fallback={null}>

              <MiniScene
                modelPath={modelPath}
              />

            </Suspense>

          </ModelErrorBoundary>

        </Canvas>

      )}


      {/* Loading indicator */}

      {!modelError && (

        <div className="absolute bottom-3 left-3 pointer-events-none">

          <span className="text-[10px] text-gray-500 font-mono">
            3D PREVIEW
          </span>

        </div>

      )}


      {/* Error screen */}

      {modelError && (

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 p-4 text-center">

          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />

          <span className="text-sm text-red-400 font-medium">
            Failed to Load
          </span>

          <span className="text-[10px] text-gray-500 mt-2 break-all">
            {modelError}
          </span>

          <button

            onClick={handleRetry}

            className="mt-4 flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300"

          >

            <RefreshCw className="w-3 h-3" />

            Retry

          </button>

        </div>

      )}

    </div>

  );

}