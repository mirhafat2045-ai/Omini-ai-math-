import React, { useRef, useEffect, useState } from 'react';
import { MatrixData } from '../utils/mathEngine';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TransformationVisualizerProps {
  matrix: MatrixData;
  det: number;
}

export const TransformationVisualizer: React.FC<TransformationVisualizerProps> = ({ matrix, det }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [animProgress, setAnimProgress] = useState(1); // 0 = Identity, 1 = Matrix
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let animId: number;
    if (isPlaying) {
      const step = () => {
        setAnimProgress(prev => {
          if (prev >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return Math.min(1, prev + 0.015);
        });
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 38; // pixels per unit

    ctx.clearRect(0, 0, width, height);

    // Dark sleek background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Interpolate between Identity and Matrix A
    const a00 = 1 + animProgress * ((matrix[0]?.[0] ?? 1) - 1);
    const a01 = 0 + animProgress * ((matrix[0]?.[1] ?? 0) - 0);
    const a10 = 0 + animProgress * ((matrix[1]?.[0] ?? 0) - 0);
    const a11 = 1 + animProgress * ((matrix[1]?.[1] ?? 1) - 1);

    // Transform math coords (x, y) to canvas (px, py)
    const transformPoint = (x: number, y: number) => {
      const tx = a00 * x + a01 * y;
      const ty = a10 * x + a11 * y;
      return {
        px: centerX + tx * scale,
        py: centerY - ty * scale,
      };
    };

    // Draw original background grid (faint)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridRange = 7;

    for (let i = -gridRange; i <= gridRange; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX + i * scale, 0);
      ctx.lineTo(centerX + i * scale, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, centerY + i * scale);
      ctx.lineTo(width, centerY + i * scale);
      ctx.stroke();
    }

    // Draw transformed grid lines (glowing blue/cyan)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;

    for (let i = -gridRange; i <= gridRange; i++) {
      // Line parallel to y-axis: x = i, y ranges
      ctx.beginPath();
      const p1 = transformPoint(i, -gridRange);
      const p2 = transformPoint(i, gridRange);
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();

      // Line parallel to x-axis: y = i, x ranges
      ctx.beginPath();
      const q1 = transformPoint(-gridRange, i);
      const q2 = transformPoint(gridRange, i);
      ctx.moveTo(q1.px, q1.py);
      ctx.lineTo(q2.px, q2.py);
      ctx.stroke();
    }

    // Draw Determinant Parallelogram (unit square [0,0]->[1,0]->[1,1]->[0,1])
    const p0 = transformPoint(0, 0);
    const pi = transformPoint(1, 0);
    const pCorner = transformPoint(1, 1);
    const pj = transformPoint(0, 1);

    ctx.beginPath();
    ctx.moveTo(p0.px, p0.py);
    ctx.lineTo(pi.px, pi.py);
    ctx.lineTo(pCorner.px, pCorner.py);
    ctx.lineTo(pj.px, pj.py);
    ctx.closePath();

    ctx.fillStyle = det >= 0 ? 'rgba(99, 102, 241, 0.25)' : 'rgba(239, 68, 68, 0.25)';
    ctx.fill();
    ctx.strokeStyle = det >= 0 ? 'rgba(129, 140, 248, 0.8)' : 'rgba(248, 113, 113, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw Axes (X and Y through origin)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Helper for drawing arrows
    const drawArrow = (x: number, y: number, color: string, label: string) => {
      const p = transformPoint(x, y);
      const pStart = transformPoint(0, 0);

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(pStart.px, pStart.py);
      ctx.lineTo(p.px, p.py);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(p.py - pStart.py, p.px - pStart.px);
      const headLen = 9;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(
        p.px - headLen * Math.cos(angle - Math.PI / 6),
        p.py - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        p.px - headLen * Math.cos(angle + Math.PI / 6),
        p.py - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.font = 'bold 12px monospace';
      ctx.fillText(label, p.px + 8, p.py - 6);
    };

    // Basis vector i-hat (red) and j-hat (emerald)
    drawArrow(1, 0, '#f43f5e', 'T(î)');
    drawArrow(0, 1, '#10b981', 'T(ĵ)');

    // Origin dot
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3.5, 0, 2 * Math.PI);
    ctx.fill();
  }, [matrix, animProgress, det]);

  return (
    <div className="flex flex-col items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between w-full mb-2 px-1 text-xs">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Linear Transformation Morph (2D Basis)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (animProgress >= 1) setAnimProgress(0);
              setIsPlaying(!isPlaying);
            }}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 border border-slate-700 transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Morph'}</span>
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setAnimProgress(animProgress === 1 ? 0 : 1);
            }}
            className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="Toggle Identity / Transformed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-slate-800 shadow-inner">
        <canvas ref={canvasRef} width={380} height={260} className="block cursor-crosshair" />
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-950/80 rounded backdrop-blur text-[11px] font-mono text-slate-400 border border-slate-800/80 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            T(î)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            T(ĵ)
          </span>
          <span className="text-indigo-400">
            Area Scale: |det(A)| = {Math.abs(det).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="w-full mt-2 flex items-center gap-3 text-xs text-slate-400 px-1">
        <span className="font-mono text-[10px]">Identity (I)</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={animProgress}
          onChange={e => {
            setIsPlaying(false);
            setAnimProgress(parseFloat(e.target.value));
          }}
          className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <span className="font-mono text-[10px]">Matrix A</span>
      </div>
    </div>
  );
};
