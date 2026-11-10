'use client';

import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  Component,
  Suspense
} from 'react';

import type { ReactNode } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';

import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
  useProgress
} from '@react-three/drei';

import * as THREE from 'three';

import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  Box,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

import { Heading, Text, Button } from '../../components/ui';

// ==========================================
// MODEL PATH RESOLVER
// Supports localhost and GitHub Pages
// ==========================================

const resolveModelPath = (path: string): string => {
  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  const base = import.meta.env.BASE_URL || '/';

  const normalizedBase = base.endsWith('/')
    ? base
    : `${base}/`;

  if (path.startsWith(normalizedBase)) {
    return path;
  }

  return `${normalizedBase}${path.replace(/^\/+/, '')}`;
};

// ==========================================
// ERROR BOUNDARY
// ==========================================

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: (error: Error) => void;
}

class ModelErrorBoundary extends Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  state = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

// ==========================================
// COMPONENT PROPS
// ==========================================

interface ModelViewerProps {
  modelPath: string;
  showWireframe?: boolean;
  autoRotate?: boolean;
  enableControls?: boolean;
  className?: string;
  cameraPosition?: [number, number, number];
  environment?: 'studio' | 'city' | 'apartment' | 'sunset' | 'dawn' | 'night';
  onLoad?: () => void;
  showControls?: boolean;
  projectName?: string;
  category?: string;
  software?: string[];
}

// ==========================================
// MAIN MODEL VIEWER
// ==========================================

export function ModelViewer({
  modelPath,
  showWireframe = false,
  autoRotate = false,
  enableControls = true,
  className = '',
  cameraPosition = [0, 1, 5],
  onLoad,
  showControls = true,
  projectName,
  category,
  software = []
}: ModelViewerProps) {

  const [modelLoaded, setModelLoaded] = useState(false);

  const [modelError, setModelError] = useState<string | null>(null);

  const [autoRotateEnabled, setAutoRotateEnabled] = useState(autoRotate);

  const [showWireframeEnabled, setShowWireframeEnabled] = useState(showWireframe);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(100);

  const [retryKey, setRetryKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const controlsRef = useRef<any>(null);

  const resolvedModelPath = useMemo(
    () => resolveModelPath(modelPath),
    [modelPath]
  );

  const { active, progress } = useProgress();

  // ==========================================
  // RESET WHEN MODEL CHANGES
  // ==========================================

  useEffect(() => {
    setModelLoaded(false);
    setModelError(null);
    setRetryKey(0);
  }, [modelPath]);

  // ==========================================
  // FULLSCREEN
  // ==========================================

  useEffect(() => {

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
    };

  }, []);

  // ==========================================
  // MODEL CALLBACKS
  // ==========================================

  const handleLoad = useCallback(() => {

    setModelLoaded(true);
    setModelError(null);

    onLoad?.();

  }, [onLoad]);

  const handleError = useCallback((error: Error) => {

    console.error('3D Model Loading Error:', error);

    setModelError(error.message || 'Unable to load 3D model');

    setModelLoaded(false);

  }, []);

  // ==========================================
  // RETRY
  // ==========================================

  const handleRetry = () => {

    useGLTF.clear(resolvedModelPath);

    setModelError(null);
    setModelLoaded(false);

    setRetryKey(previous => previous + 1);

  };

  // ==========================================
  // ZOOM
  // ==========================================

  const handleZoom = (delta: number) => {

    const controls = controlsRef.current;

    if (!controls) return;

    const camera = controls.object as THREE.PerspectiveCamera;

    const target = controls.target;

    const direction = new THREE.Vector3()
      .subVectors(camera.position, target);

    const distance = direction.length();

    const factor = delta > 0 ? 0.8 : 1.25;

    const newDistance = THREE.MathUtils.clamp(
      distance * factor,
      controls.minDistance || 0.5,
      controls.maxDistance || 100
    );

    direction.normalize().multiplyScalar(newDistance);

    camera.position.copy(target).add(direction);

    controls.update();

    setZoomLevel(Math.round((distance / newDistance) * zoomLevel));

  };

  // ==========================================
  // RESET CAMERA
  // ==========================================

  const handleResetCamera = () => {

    controlsRef.current?.reset();

    setZoomLevel(100);

  };

  // ==========================================
  // FULLSCREEN TOGGLE
  // ==========================================

  const toggleFullscreen = () => {

    const container = containerRef.current;

    if (!container) return;

    if (!document.fullscreenElement) {

      container.requestFullscreen().catch(console.error);

    } else {

      document.exitFullscreen().catch(console.error);

    }

  };

  // ==========================================
  // MAIN UI
  // ==========================================

  return (

    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black rounded-2xl overflow-hidden select-none ${className}`}
      onDoubleClick={handleResetCamera}
    >

      {/* PROJECT HEADER */}

      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap pointer-events-none">

        {projectName && (

          <div className="bg-bg/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-border/60">

            <span className="text-sm font-semibold text-text">
              {projectName}
            </span>

          </div>

        )}

        {category && (

          <div className="bg-accent/15 px-3 py-1.5 rounded-xl border border-accent/25">

            <span className="text-xs font-medium text-accent uppercase">
              {category}
            </span>

          </div>

        )}

        {software.length > 0 && (

          <div className="hidden sm:flex items-center gap-2 bg-bg-elevated/80 px-3 py-1.5 rounded-xl">

            <Box className="w-3.5 h-3.5 text-accent" />

            <span className="text-xs text-text-muted">
              {software.join(' • ')}
            </span>

          </div>

        )}

      </div>

      {/* TOP CONTROLS */}

      {showControls && enableControls && (

        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-bg/90 backdrop-blur-md p-1.5 rounded-xl border border-border/60">

          <button
            onClick={() => handleZoom(1)}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-text-subtle px-1">
            {zoomLevel}%
          </span>

          <button
            onClick={() => handleZoom(-1)}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border/60" />

          <button
            onClick={handleResetCamera}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated"
            title="Reset Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated"
            title="Fullscreen"
          >
            {isFullscreen
              ? <Minimize2 className="w-4 h-4" />
              : <Maximize2 className="w-4 h-4" />
            }
          </button>

        </div>

      )}

      {/* BOTTOM CONTROLS */}

      {showControls && enableControls && (

        <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">

          <div className="hidden md:flex gap-3 bg-bg/85 px-3 py-2 rounded-xl text-xs text-text-subtle pointer-events-auto">

            <span>🖱️ Rotate</span>
            <span>•</span>
            <span>✋ Pan</span>
            <span>•</span>
            <span>🔍 Zoom</span>

          </div>

          <div className="flex items-center gap-2 bg-bg/90 p-1.5 rounded-xl border border-border/60 pointer-events-auto ml-auto">

            <button
              onClick={() => setAutoRotateEnabled(!autoRotateEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${
                autoRotateEnabled
                  ? 'bg-accent text-bg'
                  : 'text-text-muted hover:text-text'
              }`}
            >

              <RefreshCw className="w-3.5 h-3.5" />

              Turntable

            </button>

            <button
              onClick={() => setShowWireframeEnabled(!showWireframeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${
                showWireframeEnabled
                  ? 'bg-accent text-bg'
                  : 'text-text-muted hover:text-text'
              }`}
            >

              <Eye className="w-3.5 h-3.5" />

              Wireframe

            </button>

          </div>

        </div>

      )}

      {/* 3D CANVAS */}

      <Canvas

        key={retryKey}

        camera={{
          position: cameraPosition,
          fov: 45,
          near: 0.1,
          far: 1000
        }}

        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}

        style={{
          touchAction: 'none'
        }}

        onCreated={({ gl }) => {

          gl.setPixelRatio(
            Math.min(window.devicePixelRatio, 2)
          );

          gl.toneMapping = THREE.ACESFilmicToneMapping;

          gl.toneMappingExposure = 1.1;

          gl.outputColorSpace = THREE.SRGBColorSpace;

        }}

      >

        <Suspense fallback={null}>

          <ModelErrorBoundary
            key={retryKey}
            onError={handleError}
          >

            <ModelScene
              modelPath={resolvedModelPath}
              showWireframe={showWireframeEnabled}
              autoRotate={autoRotateEnabled}
              enableControls={enableControls}
              onLoad={handleLoad}
              controlsRef={controlsRef}
            />

          </ModelErrorBoundary>

        </Suspense>

      </Canvas>

      {/* LOADING OVERLAY */}

      {!modelLoaded && !modelError && (

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">

          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />

          <p className="text-sm text-white font-semibold">
            Loading 3D Model...
          </p>

          {active && progress > 0 && (

            <div className="w-48 h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">

              <div
                className="h-full bg-accent transition-all"
                style={{
                  width: `${progress}%`
                }}
              />

            </div>

          )}

          <p className="text-xs text-zinc-400 mt-3 font-mono">
            {resolvedModelPath}
          </p>

        </div>

      )}

      {/* ERROR OVERLAY */}

      {modelError && (

        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 p-6 text-center">

          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">

            <AlertCircle className="w-8 h-8 text-red-400" />

          </div>

          <Heading
            as="h3"
            size="h4"
            weight="bold"
            animate={false}
            className="mb-2 text-red-400"
          >
            Failed to Load Model
          </Heading>

          <Text
            size="sm"
            color="muted"
            className="max-w-md mb-4"
          >
            {modelError}
          </Text>

          <p className="text-xs text-zinc-400 font-mono mb-5 break-all">
            {resolvedModelPath}
          </p>

          <div className="flex gap-3 flex-wrap justify-center">

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetry}
            >

              <RefreshCw className="w-4 h-4 mr-2" />

              Retry

            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(resolvedModelPath, '_blank')}
            >

              <ExternalLink className="w-4 h-4 mr-2" />

              Open Model

            </Button>

          </div>

        </div>

      )}

    </div>

  );

}

// ==========================================
// 3D MODEL SCENE
// ==========================================

interface ModelSceneProps {
  modelPath: string;
  showWireframe: boolean;
  autoRotate: boolean;
  enableControls: boolean;
  onLoad: () => void;
  controlsRef: React.MutableRefObject<any>;
}

function ModelScene({
  modelPath,
  showWireframe,
  autoRotate,
  enableControls,
  onLoad,
  controlsRef
}: ModelSceneProps) {

  const gltf = useGLTF(modelPath);

  const { camera } = useThree();

  const modelRef = useRef<THREE.Group>(null);

  const clonedScene = useMemo(
    () => gltf.scene.clone(true),
    [gltf.scene]
  );

  // ==========================================
  // AUTOMATIC CAMERA FRAMING
  // ==========================================

  useEffect(() => {

    if (!clonedScene) return;

    const box = new THREE.Box3().setFromObject(clonedScene);

    const center = box.getCenter(new THREE.Vector3());

    const size = box.getSize(new THREE.Vector3());

    const maxDimension = Math.max(
      size.x,
      size.y,
      size.z
    );

    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      console.error('Invalid 3D model dimensions:', modelPath);
      return;
    }

    // Center the model

    clonedScene.position.set(
      -center.x,
      -center.y,
      -center.z
    );

    const perspectiveCamera = camera as THREE.PerspectiveCamera;

    const fov = perspectiveCamera.fov * Math.PI / 180;

    const cameraDistance =
      (maxDimension / (2 * Math.tan(fov / 2))) * 1.5;

    // Position camera

    perspectiveCamera.position.set(
      cameraDistance * 0.8,
      cameraDistance * 0.6,
      cameraDistance * 1.2
    );

    perspectiveCamera.lookAt(0, 0, 0);

    perspectiveCamera.updateProjectionMatrix();

    // Preserve original materials and textures

    clonedScene.traverse((child) => {

      if (child instanceof THREE.Mesh) {

        child.castShadow = true;

        child.receiveShadow = true;

      }

    });

    // Update controls

    if (controlsRef.current) {

      controlsRef.current.target.set(0, 0, 0);

      controlsRef.current.minDistance = Math.max(
        maxDimension * 0.3,
        0.5
      );

      controlsRef.current.maxDistance = Math.max(
        maxDimension * 10,
        100
      );

      controlsRef.current.update();

      controlsRef.current.saveState();

    }

    onLoad();

  }, [clonedScene, camera, modelPath, onLoad, controlsRef]);

  // ==========================================
  // WIREFRAME
  // ==========================================

  useEffect(() => {

    if (!clonedScene) return;

    clonedScene.traverse((child) => {

      if (!(child instanceof THREE.Mesh)) return;

      const existingWireframe = child.userData.wireframe as THREE.LineSegments | undefined;

      if (showWireframe && !existingWireframe) {

        const geometry = new THREE.WireframeGeometry(
          child.geometry
        );

        const material = new THREE.LineBasicMaterial({

          color: 0x93c5fd,

          transparent: true,

          opacity: 0.4

        });

        const lines = new THREE.LineSegments(
          geometry,
          material
        );

        child.add(lines);

        child.userData.wireframe = lines;

      }

      if (!showWireframe && existingWireframe) {

        child.remove(existingWireframe);

        existingWireframe.geometry.dispose();

        const material = existingWireframe.material;

        if (Array.isArray(material)) {

          material.forEach(item => item.dispose());

        } else {

          material.dispose();

        }

        delete child.userData.wireframe;

      }

    });

  }, [showWireframe, clonedScene]);

  // ==========================================
  // AUTO ROTATION
  // ==========================================

  useFrame((_, delta) => {

    if (autoRotate && modelRef.current) {

      modelRef.current.rotation.y += delta * 0.4;

    }

  });

  // ==========================================
  // RENDER MODEL
  // ==========================================

  return (

    <>

      <ambientLight intensity={1.2} />

      <directionalLight
        position={[10, 15, 10]}
        intensity={2}
        castShadow
      />

      <directionalLight
        position={[-10, 10, -10]}
        intensity={1}
      />

      <directionalLight
        position={[0, -5, 5]}
        intensity={0.5}
      />

      <Environment
        preset="studio"
        background={false}
      />

      <ContactShadows
        opacity={0.25}
        scale={25}
        blur={2.5}
        far={15}
        resolution={512}
        position={[0, -0.01, 0]}
      />

      <group ref={modelRef}>

        <primitive object={clonedScene} />

      </group>

      {enableControls && (

        <OrbitControls

          ref={controlsRef}

          makeDefault

          enablePan={true}

          enableZoom={true}

          enableRotate={true}

          enableDamping={true}

          dampingFactor={0.06}

          minPolarAngle={0.05}

          maxPolarAngle={Math.PI / 2 + 0.05}

          zoomSpeed={1.2}

          panSpeed={1}

          rotateSpeed={0.9}

        />

      )}

    </>

  );

}