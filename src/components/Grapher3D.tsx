import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { compile3DFunction } from '../utils/mathEngine';
import { LatexRenderer } from './LatexRenderer';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Camera,
  Layers,
  Sliders,
  ChevronDown,
  Info,
  Maximize2,
  RefreshCw,
  Palette,
  CloudUpload
} from 'lucide-react';

interface Grapher3DProps {
  currentExpression: string;
  onExpressionChange: (expr: string) => void;
  onAnalyzeWithAi: (expr: string, xRange: [number, number], yRange: [number, number]) => void;
  onSaveScreenshotToDrive?: (dataUrl: string) => void;
}

export type ColorMapType = 'viridis' | 'plasma' | 'neon' | 'rainbow' | 'ocean';

const COLOR_MAPS: Record<ColorMapType, { name: string; stops: [number, string][] }> = {
  viridis: {
    name: 'Viridis',
    stops: [
      [0.0, '#440154'],
      [0.25, '#3b528b'],
      [0.5, '#21918c'],
      [0.75, '#5ec962'],
      [1.0, '#fde725'],
    ],
  },
  plasma: {
    name: 'Plasma',
    stops: [
      [0.0, '#0d0887'],
      [0.25, '#6a00a8'],
      [0.5, '#b12a90'],
      [0.75, '#e16462'],
      [1.0, '#f0f921'],
    ],
  },
  neon: {
    name: 'Cyberpunk Neon',
    stops: [
      [0.0, '#03001e'],
      [0.3, '#7303c0'],
      [0.6, '#ec38bc'],
      [1.0, '#fdeff9'],
    ],
  },
  rainbow: {
    name: 'Turbo Rainbow',
    stops: [
      [0.0, '#30123b'],
      [0.25, '#4686fb'],
      [0.5, '#1ae4b6'],
      [0.75, '#faba39'],
      [1.0, '#7a0403'],
    ],
  },
  ocean: {
    name: 'Deep Ocean',
    stops: [
      [0.0, '#081d58'],
      [0.3, '#225ea8'],
      [0.6, '#41b6c4'],
      [0.9, '#c7e9b4'],
      [1.0, '#ffffd9'],
    ],
  },
};

const PRESETS = [
  {
    name: 'Sombrero (Bessel)',
    expr: 'sin(sqrt(x^2 + y^2)) / (sqrt(x^2 + y^2) + 0.1)',
    xRange: [-6, 6] as [number, number],
    yRange: [-6, 6] as [number, number],
    desc: 'Radial wave pulse with central peak and decay',
  },
  {
    name: 'Hyperbolic Paraboloid',
    expr: 'x^2 / 4 - y^2 / 4',
    xRange: [-5, 5] as [number, number],
    yRange: [-5, 5] as [number, number],
    desc: 'Classic saddle surface with negative Gaussian curvature',
  },
  {
    name: 'Dynamic Ripple Wave',
    expr: 'cos(sqrt(x^2 + y^2) - 3*t) / (1 + 0.15*sqrt(x^2 + y^2))',
    xRange: [-8, 8] as [number, number],
    yRange: [-8, 8] as [number, number],
    desc: 'Expanding concentric acoustic/fluid wave packet',
  },
  {
    name: 'Wave Interference',
    expr: 'sin(x - 2*t) + cos(y - 2*t)',
    xRange: [-6, 6] as [number, number],
    yRange: [-6, 6] as [number, number],
    desc: 'Two orthogonal plane waves creating dynamic 2D interference nodes',
  },
  {
    name: 'Monkey Saddle',
    expr: '(x^3 - 3*x*y^2) / 6',
    xRange: [-4, 4] as [number, number],
    yRange: [-4, 4] as [number, number],
    desc: 'Saddle with three descending valleys (two for legs, one for tail)',
  },
  {
    name: 'Gaussian Potential Well',
    expr: '-4 * exp(-(x^2 + y^2) / 4)',
    xRange: [-5, 5] as [number, number],
    yRange: [-5, 5] as [number, number],
    desc: 'Gravitational or electrostatic attractive potential well',
  },
  {
    name: 'Egg Carton (Periodic)',
    expr: 'sin(x) * sin(y)',
    xRange: [-6, 6] as [number, number],
    yRange: [-6, 6] as [number, number],
    desc: 'Periodic doubly-sinusoidal energy landscape',
  },
  {
    name: 'Rosenbrock Banana',
    expr: '( (1 - x)^2 + 10*(y - x^2)^2 ) / 25',
    xRange: [-2.5, 2.5] as [number, number],
    yRange: [-1.5, 3.5] as [number, number],
    desc: 'Famous non-convex optimization benchmark valley',
  },
];

export const Grapher3D: React.FC<Grapher3DProps> = ({
  currentExpression,
  onExpressionChange,
  onAnalyzeWithAi,
  onSaveScreenshotToDrive,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const wireframeMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.Group | null>(null);

  // Graph Settings
  const [exprInput, setExprInput] = useState(currentExpression);
  const [xRange, setXRange] = useState<[number, number]>([-6, 6]);
  const [yRange, setYRange] = useState<[number, number]>([-6, 6]);
  const [zScale, setZScale] = useState(1.0);
  const [resolution, setResolution] = useState(50); // 50x50 grid
  const [colorMap, setColorMap] = useState<ColorMapType>('plasma');
  const [showWireframe, setShowWireframe] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [isTimePlaying, setIsTimePlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [timeSpeed, setTimeSpeed] = useState(1.0);
  const [sliceZ, setSliceZ] = useState<number | null>(null);
  const [slicePlaneActive, setSlicePlaneActive] = useState(false);

  // Sync prop changes
  useEffect(() => {
    setExprInput(currentExpression);
  }, [currentExpression]);

  // Color interpolator
  const getColor = useCallback((normalizedVal: number, map: ColorMapType) => {
    const stops = COLOR_MAPS[map].stops;
    const clamped = Math.max(0, Math.min(1, normalizedVal));

    for (let i = 0; i < stops.length - 1; i++) {
      const [pos1, col1] = stops[i];
      const [pos2, col2] = stops[i + 1];
      if (clamped >= pos1 && clamped <= pos2) {
        const factor = (clamped - pos1) / (pos2 - pos1);
        const c1 = new THREE.Color(col1);
        const c2 = new THREE.Color(col2);
        return c1.lerp(c2, factor);
      }
    }
    return new THREE.Color(stops[stops.length - 1][1]);
  }, []);

  // Update Mesh Geometry
  const updateGeometry = useCallback((tVal: number) => {
    if (!meshRef.current) return;

    const func = compile3DFunction(exprInput);
    const nx = resolution;
    const ny = resolution;
    const dx = (xRange[1] - xRange[0]) / (nx - 1);
    const dy = (yRange[1] - yRange[0]) / (ny - 1);

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Evaluate z values and find min/max
    const zVals: number[][] = [];
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < nx; i++) {
      zVals[i] = [];
      const x = xRange[0] + i * dx;
      for (let j = 0; j < ny; j++) {
        const y = yRange[0] + j * dy;
        let z = func(x, y, tVal);
        if (isNaN(z) || !isFinite(z)) z = 0;
        // Clamp extreme values for visual sanity
        z = Math.max(-25, Math.min(25, z));
        zVals[i][j] = z;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    if (maxZ === minZ) {
      maxZ += 0.001;
    }

    // Build vertices and vertex colors
    for (let i = 0; i < nx; i++) {
      const x = xRange[0] + i * dx;
      for (let j = 0; j < ny; j++) {
        const y = yRange[0] + j * dy;
        const z = zVals[i][j];

        positions.push(x, z * zScale, y);

        const normZ = (z - minZ) / (maxZ - minZ);
        const col = getColor(normZ, colorMap);
        colors.push(col.r, col.g, col.b);
      }
    }

    // Build indices for triangles
    for (let i = 0; i < nx - 1; i++) {
      for (let j = 0; j < ny - 1; j++) {
        const p1 = i * ny + j;
        const p2 = (i + 1) * ny + j;
        const p3 = (i + 1) * ny + (j + 1);
        const p4 = i * ny + (j + 1);

        indices.push(p1, p2, p4);
        indices.push(p2, p3, p4);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    meshRef.current.geometry.dispose();
    meshRef.current.geometry = geometry;

    if (wireframeMeshRef.current) {
      wireframeMeshRef.current.geometry.dispose();
      wireframeMeshRef.current.geometry = geometry;
    }
  }, [exprInput, xRange, yRange, zScale, resolution, colorMap, getColor]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(16, 12, 16);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(15, 25, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x6366f1, 0.5);
    dirLight2.position.set(-15, -10, -15);
    scene.add(dirLight2);

    // Surface Mesh
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.15,
      flatShading: false,
    });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    scene.add(mesh);
    meshRef.current = mesh;

    // Wireframe Mesh overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const wireMesh = new THREE.Mesh(new THREE.BufferGeometry(), wireMat);
    scene.add(wireMesh);
    wireframeMeshRef.current = wireMesh;

    // Coordinate Grid and Axes
    const axesGroup = new THREE.Group();
    const grid = new THREE.GridHelper(20, 20, 0x475569, 0x1e293b);
    grid.position.y = -0.01;
    axesGroup.add(grid);

    // Custom 3D Arrow Axes (X: Red, Y: Green, Z: Blue in math notation)
    const axisLen = 10;
    // Math X (Three.js X)
    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), axisLen, 0xf43f5e, 0.8, 0.4);
    // Math Z (Three.js Y - vertical elevation)
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), axisLen, 0x38bdf8, 0.8, 0.4);
    // Math Y (Three.js Z)
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), axisLen, 0x10b981, 0.8, 0.4);
    axesGroup.add(arrowX, arrowZ, arrowY);

    scene.add(axesGroup);
    gridHelperRef.current = axesGroup;

    // Mouse Controls (Rotate / Pan / Zoom)
    let isDragging = false;
    let isPanning = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = new THREE.Spherical().setFromVector3(camera.position);

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isDragging = true;
      if (e.button === 2) isPanning = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      if (isDragging) {
        spherical.theta -= deltaX * 0.008;
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi - deltaY * 0.008));
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);
      } else if (isPanning) {
        const panSpeed = 0.03;
        camera.position.x -= deltaX * panSpeed;
        camera.position.z -= deltaY * panSpeed;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      isPanning = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(5, Math.min(80, spherical.radius + e.deltaY * 0.03));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', e => e.preventDefault());

    // Window Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Wireframe / Axes visibility
  useEffect(() => {
    if (wireframeMeshRef.current) {
      wireframeMeshRef.current.visible = showWireframe;
    }
  }, [showWireframe]);

  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showAxes;
    }
  }, [showAxes]);

  // Initial Geometry build
  useEffect(() => {
    updateGeometry(time);
  }, [updateGeometry, time]);

  // Animation Loop (Orbit Rotation & Time-varying Functions)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Auto-rotation around scene
      if (isRotating && cameraRef.current) {
        const cam = cameraRef.current;
        const spherical = new THREE.Spherical().setFromVector3(cam.position);
        spherical.theta += 0.4 * dt;
        cam.position.setFromSpherical(spherical);
        cam.lookAt(0, 0, 0);
      }

      // Time parameter update for functions with 't'
      if (isTimePlaying) {
        setTime(prev => {
          const next = prev + dt * timeSpeed;
          updateGeometry(next);
          return next;
        });
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRotating, isTimePlaying, timeSpeed, updateGeometry]);

  // Capture Screenshot
  const handleScreenshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `omnimath-3d-${Date.now()}.png`;
    a.click();
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setExprInput(preset.expr);
    setXRange(preset.xRange);
    setYRange(preset.yRange);
    onExpressionChange(preset.expr);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExpressionChange(exprInput);
    updateGeometry(time);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* Top Header Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 backdrop-blur z-10">
        <form onSubmit={handleFormSubmit} className="flex-1 min-w-[280px] flex items-center gap-2">
          <div className="flex items-center px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl flex-1 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition">
            <span className="text-indigo-400 font-mono text-sm mr-2 font-semibold">z = f(x, y) =</span>
            <input
              type="text"
              value={exprInput}
              onChange={e => setExprInput(e.target.value)}
              placeholder="e.g. sin(sqrt(x^2 + y^2) - 2*t)"
              className="bg-transparent border-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none flex-1 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Plot 3D
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onAnalyzeWithAi(exprInput, xRange, yRange)}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-medium shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
            AI Surface Analysis
          </button>

          <button
            onClick={handleScreenshot}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
            title="Download 3D Screenshot (PNG)"
          >
            <Camera className="w-4 h-4" />
          </button>

          {onSaveScreenshotToDrive && (
            <button
              onClick={() => {
                if (rendererRef.current) {
                  const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
                  onSaveScreenshotToDrive(dataUrl);
                }
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-xl border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
              title="Save 3D Surface Snapshot to Google Drive"
            >
              <CloudUpload className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Drive Snapshot</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div className="relative flex-1 min-h-[380px] w-full">
        <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Live LaTeX Formula Floating Overlay */}
        <div className="absolute top-3 left-3 px-3 py-2 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg pointer-events-none max-w-sm">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-0.5">Active Surface</div>
          <div className="text-sm font-serif text-indigo-200">
            <LatexRenderer latex={`z = ${exprInput}`} displayMode={false} />
          </div>
        </div>

        {/* 3D Axis Legend Floating Badge */}
        <div className="absolute top-3 right-3 px-2.5 py-1.5 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-800 text-[11px] font-mono flex items-center gap-3 pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            +X
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            +Y
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            +Z (Height)
          </span>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl">
          {/* Time Controller */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTimePlaying(!isTimePlaying)}
              className="p-1.5 px-3 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg text-xs flex items-center gap-1.5 transition"
              title="Animate variable t"
            >
              {isTimePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="font-mono">t = {time.toFixed(1)}</span>
            </button>
            <button
              onClick={() => {
                setTime(0);
                updateGeometry(0);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Reset time"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Visual Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-mono transition border ${
                isRotating
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              360° Spin
            </button>

            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-mono transition border ${
                showWireframe
                  ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              Mesh
            </button>

            <button
              onClick={() => setShowAxes(!showAxes)}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-mono transition border ${
                showAxes
                  ? 'bg-slate-700 text-slate-200 border-slate-600'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              Axes
            </button>

            {/* Color map selector */}
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={colorMap}
                onChange={e => setColorMap(e.target.value as ColorMapType)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                {Object.entries(COLOR_MAPS).map(([key, item]) => (
                  <option key={key} value={key} className="bg-slate-900 text-slate-200">
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Surface Presets Tray */}
      <div className="p-2.5 bg-slate-900/95 border-t border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-400" />
            Presets:
          </span>
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset)}
              className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition border ${
                exprInput === preset.expr
                  ? 'bg-indigo-600/40 text-indigo-200 border-indigo-500'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
