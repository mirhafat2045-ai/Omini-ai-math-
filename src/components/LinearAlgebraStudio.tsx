import React, { useState, useMemo } from 'react';
import {
  MatrixData,
  VectorData,
  matrixToLatex,
  vectorToLatex,
  determinantMatrix,
  traceMatrix,
  invertMatrix,
  transposeMatrix,
  addMatrices,
  subtractMatrices,
  multiplyMatrices,
  calculateEigen,
  solveLinearSystem,
  LinearSystemSolution,
  EigenResult
} from '../utils/mathEngine';
import { LatexRenderer } from './LatexRenderer';
import { TransformationVisualizer } from './TransformationVisualizer';
import {
  Sparkles,
  Calculator,
  RotateCcw,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Grid3X3,
  HelpCircle
} from 'lucide-react';

interface LinearAlgebraStudioProps {
  onAskAi: (prompt: string, context?: any) => void;
}

type TabType = 'solver' | 'operations' | 'spectral' | 'visualizer';

export const LinearAlgebraStudio: React.FC<LinearAlgebraStudioProps> = ({ onAskAi }) => {
  const [dim, setDim] = useState<number>(2); // 2, 3, or 4
  const [activeTab, setActiveTab] = useState<TabType>('solver');

  // Matrix A
  const [matrixA, setMatrixA] = useState<MatrixData>([
    [2, 1],
    [1, 3],
  ]);

  // Matrix B
  const [matrixB, setMatrixB] = useState<MatrixData>([
    [1, 0],
    [0, 1],
  ]);

  // Vector b
  const [vectorB, setVectorB] = useState<VectorData>([5, 8]);

  // Resize matrices when dimension changes
  const handleDimChange = (newDim: number) => {
    setDim(newDim);
    const newA: MatrixData = Array.from({ length: newDim }, (_, i) =>
      Array.from({ length: newDim }, (_, j) => (i === j ? 2 : 1))
    );
    const newB: MatrixData = Array.from({ length: newDim }, (_, i) =>
      Array.from({ length: newDim }, (_, j) => (i === j ? 1 : 0))
    );
    const newVec: VectorData = Array.from({ length: newDim }, (_, i) => (i + 1) * 3);
    setMatrixA(newA);
    setMatrixB(newB);
    setVectorB(newVec);
  };

  // Matrix A updates
  const handleCellChangeA = (row: number, col: number, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = matrixA.map((r, i) =>
      r.map((c, j) => (i === row && j === col ? num : c))
    );
    setMatrixA(updated);
  };

  // Matrix B updates
  const handleCellChangeB = (row: number, col: number, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = matrixB.map((r, i) =>
      r.map((c, j) => (i === row && j === col ? num : c))
    );
    setMatrixB(updated);
  };

  // Vector B updates
  const handleVectorChange = (idx: number, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = vectorB.map((v, i) => (i === idx ? num : v));
    setVectorB(updated);
  };

  // Presets
  const applyPreset = (type: string) => {
    if (type === 'identity') {
      setMatrixA(Array.from({ length: dim }, (_, i) => Array.from({ length: dim }, (_, j) => (i === j ? 1 : 0))));
    } else if (type === 'rotation') {
      if (dim === 2) {
        const theta = Math.PI / 4; // 45 deg
        setMatrixA([
          [Math.cos(theta), -Math.sin(theta)],
          [Math.sin(theta), Math.cos(theta)],
        ]);
      } else if (dim === 3) {
        const theta = Math.PI / 6; // 30 deg around Z
        setMatrixA([
          [Math.cos(theta), -Math.sin(theta), 0],
          [Math.sin(theta), Math.cos(theta), 0],
          [0, 0, 1],
        ]);
      }
    } else if (type === 'shear') {
      if (dim === 2) {
        setMatrixA([
          [1, 1.5],
          [0, 1],
        ]);
      }
    } else if (type === 'symmetric') {
      const sym = Array.from({ length: dim }, () => Array(dim).fill(0));
      for (let i = 0; i < dim; i++) {
        for (let j = i; j < dim; j++) {
          const val = Math.floor(Math.random() * 5) + 1;
          sym[i][j] = val;
          sym[j][i] = val;
        }
      }
      setMatrixA(sym);
    } else if (type === 'pauli-x') {
      setDim(2);
      setMatrixA([[0, 1], [1, 0]]);
    }
  };

  // Computations on Matrix A
  const detA = useMemo(() => {
    try {
      return determinantMatrix(matrixA);
    } catch {
      return NaN;
    }
  }, [matrixA]);

  const traceA = useMemo(() => {
    try {
      return traceMatrix(matrixA);
    } catch {
      return NaN;
    }
  }, [matrixA]);

  const invA = useMemo(() => {
    try {
      return invertMatrix(matrixA);
    } catch (e: any) {
      return null;
    }
  }, [matrixA]);

  const transA = useMemo(() => {
    try {
      return transposeMatrix(matrixA);
    } catch {
      return null;
    }
  }, [matrixA]);

  // Linear system solution Ax = b
  const systemSolution = useMemo<LinearSystemSolution | null>(() => {
    try {
      return solveLinearSystem(matrixA, vectorB);
    } catch (e: any) {
      return null;
    }
  }, [matrixA, vectorB]);

  // Spectral / Eigenvalues
  const eigenResult = useMemo<EigenResult | null>(() => {
    try {
      return calculateEigen(matrixA);
    } catch {
      return null;
    }
  }, [matrixA]);

  // Matrix-Matrix operations
  const matSum = useMemo(() => addMatrices(matrixA, matrixB), [matrixA, matrixB]);
  const matDiff = useMemo(() => subtractMatrices(matrixA, matrixB), [matrixA, matrixB]);
  const matProd = useMemo(() => {
    try {
      return multiplyMatrices(matrixA, matrixB);
    } catch {
      return null;
    }
  }, [matrixA, matrixB]);

  const handleAskAiAboutSystem = () => {
    const prompt = `Please explain how to solve the linear system $A \\mathbf{x} = \\mathbf{b}$ step-by-step:
Matrix $A = ${matrixToLatex(matrixA)}$
Vector $\\mathbf{b} = ${vectorToLatex(vectorB)}$
Discuss the rank, invertibility, determinant $\\det(A) = ${detA.toFixed(4)}$, and provide both algebraic and geometric interpretations of the solution!`;

    onAskAi(prompt, {
      type: 'linear_system',
      matrixA,
      vectorB,
      detA,
      solution: systemSolution?.solution,
    });
  };

  const handleAskAiAboutSpectral = () => {
    const prompt = `Please provide a thorough spectral analysis of Matrix $A = ${matrixToLatex(matrixA)}$:
1. Explain how to compute the characteristic polynomial $\\det(A - \\lambda I) = 0$.
2. Derive the eigenvalues and eigenvectors step-by-step.
3. State whether $A$ is diagonalizable, symmetric, or orthogonal.
4. Explain the geometric stretching and principal directions in vector space.`;

    onAskAi(prompt, {
      type: 'spectral_analysis',
      matrixA,
      eigenResult,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Header Bar */}
      <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            <Grid3X3 className="w-4 h-4 text-indigo-400" />
            <span>Linear Algebra Studio</span>
          </div>

          {/* Dimension Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[2, 3, 4].map(d => (
              <button
                key={d}
                onClick={() => handleDimChange(d)}
                className={`px-2.5 py-0.5 rounded text-xs font-mono transition ${
                  dim === d
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}×{d}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[11px] font-mono text-slate-400 uppercase mr-1">Presets:</span>
          <button
            onClick={() => applyPreset('identity')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Identity (I)
          </button>
          <button
            onClick={() => applyPreset('rotation')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Rotation (θ)
          </button>
          {dim === 2 && (
            <button
              onClick={() => applyPreset('shear')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            >
              Shear
            </button>
          )}
          <button
            onClick={() => applyPreset('symmetric')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Symmetric
          </button>
          {dim === 2 && (
            <button
              onClick={() => applyPreset('pauli-x')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            >
              Pauli-X
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Inputs + Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Matrix Inputs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Matrix A Input */}
          <div className="lg:col-span-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Matrix A ({dim}×{dim})
              </span>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>det(A) = {isNaN(detA) ? '?' : detA.toFixed(3)}</span>
                <span>•</span>
                <span>tr(A) = {isNaN(traceA) ? '?' : traceA.toFixed(3)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div
                className="grid gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {matrixA.map((row, i) =>
                  row.map((val, j) => (
                    <input
                      key={`a-${i}-${j}`}
                      type="number"
                      step="any"
                      value={val}
                      onChange={e => handleCellChangeA(i, j, e.target.value)}
                      className="w-16 h-11 text-center bg-slate-900 border border-slate-700/80 rounded-lg text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition"
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Conditional: Vector b for Ax = b, OR Matrix B for Operations */}
          {activeTab === 'solver' ? (
            <div className="lg:col-span-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Vector b ({dim}×1)
                </span>
                <span className="text-xs font-mono text-slate-400">Target for A x = b</span>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex flex-col gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
                  {vectorB.map((val, i) => (
                    <input
                      key={`b-${i}`}
                      type="number"
                      step="any"
                      value={val}
                      onChange={e => handleVectorChange(i, e.target.value)}
                      className="w-20 h-11 text-center bg-slate-900 border border-slate-700/80 rounded-lg text-sm font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition"
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Matrix B ({dim}×{dim})
                </span>
                <span className="text-xs font-mono text-slate-400">For operations A ± B, A × B</span>
              </div>

              <div className="flex items-center justify-center">
                <div
                  className="grid gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80"
                  style={{
                    gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  }}
                >
                  {matrixB.map((row, i) =>
                    row.map((val, j) => (
                      <input
                        key={`b-${i}-${j}`}
                        type="number"
                        step="any"
                        value={val}
                        onChange={e => handleCellChangeB(i, j, e.target.value)}
                        className="w-16 h-11 text-center bg-slate-900 border border-slate-700/80 rounded-lg text-sm font-mono text-amber-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('solver')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'solver'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Solve A x = b
          </button>
          <button
            onClick={() => setActiveTab('spectral')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'spectral'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Eigenvalues &amp; Inversion
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'operations'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Matrix Arithmetic
          </button>
          {dim === 2 && (
            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'visualizer'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              2D Basis Morph
            </button>
          )}
        </div>

        {/* Tab 1: Solve Ax = b with Gaussian Elimination */}
        {activeTab === 'solver' && (
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Gaussian Elimination &amp; System State
                </span>
              </div>
              <button
                onClick={handleAskAiAboutSystem}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-medium shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Explain Derivation with AI
              </button>
            </div>

            {systemSolution?.hasUniqueSolution && systemSolution.solution && (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold mb-1">
                    Unique Solution Vector x
                  </div>
                  <div className="text-base font-serif text-slate-100 flex items-center gap-3">
                    <LatexRenderer
                      latex={`\\mathbf{x} = ${vectorToLatex(systemSolution.solution)}`}
                      displayMode={false}
                    />
                    <span className="text-xs font-mono text-emerald-300/80">
                      ({systemSolution.solution.map((s, i) => `x_${i + 1} = ${s.toFixed(3)}`).join(', ')})
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  det(A) = {detA.toFixed(4)} ≠ 0 (Invertible)
                </div>
              </div>
            )}

            {systemSolution?.isInconsistent && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>The system is <strong>inconsistent</strong> (No solution exists). Rows produce $0 = c$.</span>
              </div>
            )}

            {systemSolution?.isDependent && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>The system has <strong>infinitely many solutions</strong> (Row rank &lt; dimension).</span>
              </div>
            )}

            {/* Step-by-Step Table */}
            <div className="space-y-2 mt-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                Row Operations &amp; Augmented Matrices:
              </span>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {systemSolution?.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between flex-wrap gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] font-bold">
                        Step {step.step}
                      </span>
                      <div className="text-slate-300 mt-1">
                        <LatexRenderer markdown={step.description} />
                      </div>
                    </div>
                    <div className="font-serif text-slate-200">
                      <LatexRenderer
                        latex={`[A \\mid b]_{${step.step}} = \\begin{pmatrix} ${step.matrix
                          .map((r, ri) => `${r.map(v => v.toFixed(2)).join(' & ')} & \\mathbf{${step.vector[ri]?.toFixed(2) ?? 0}}`)
                          .join(' \\\\ ')} \\end{pmatrix}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Spectral Analysis & Inverses */}
        {activeTab === 'spectral' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inversion and Transpose */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                  Matrix Inverse A⁻¹
                </span>
                {invA ? (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center">
                    <LatexRenderer latex={`A^{-1} = ${matrixToLatex(invA)}`} displayMode />
                  </div>
                ) : (
                  <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-300 text-xs">
                    Matrix is non-invertible (det(A) = 0).
                  </div>
                )}

                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mt-2">
                  Transpose Aᵀ
                </span>
                {transA && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center">
                    <LatexRenderer latex={`A^T = ${matrixToLatex(transA)}`} displayMode />
                  </div>
                )}
              </div>

              {/* Spectral: Eigenvalues & Characteristic Polynomial */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
                    Eigenvalues &amp; Spectrum
                  </span>
                  <button
                    onClick={handleAskAiAboutSpectral}
                    className="p-1 px-2.5 bg-purple-600/80 hover:bg-purple-500 text-white rounded text-xs flex items-center gap-1 transition"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    AI Spectral Analysis
                  </button>
                </div>

                {eigenResult?.characteristicPolynomial && (
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-serif text-slate-200">
                    <span className="text-slate-400 font-mono text-[11px] block mb-1">
                      Characteristic Equation:
                    </span>
                    <LatexRenderer latex={eigenResult.characteristicPolynomial} displayMode={false} />
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                    Calculated Roots (λ):
                  </span>
                  {eigenResult?.values.map((v, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-indigo-400 font-bold">λ_{i + 1} =</span>
                      <span className="text-slate-100">{v.display}</span>
                    </div>
                  ))}
                </div>

                {eigenResult?.vectors && (
                  <div className="space-y-2 mt-2">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                      Normalized Eigenvectors (v):
                    </span>
                    {eigenResult.vectors.map((vec, i) => (
                      <div
                        key={i}
                        className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="text-purple-400 font-mono">v_{i + 1} for λ={vec.eigenvalue}:</span>
                        <LatexRenderer latex={vectorToLatex(vec.vector)} displayMode={false} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Matrix Operations */}
        {activeTab === 'operations' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                Addition (A + B)
              </span>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center">
                <LatexRenderer latex={`A + B = ${matrixToLatex(matSum)}`} displayMode />
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">
                Subtraction (A - B)
              </span>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center">
                <LatexRenderer latex={`A - B = ${matrixToLatex(matDiff)}`} displayMode />
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Multiplication (A × B)
              </span>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center">
                {matProd ? (
                  <LatexRenderer latex={`A \\times B = ${matrixToLatex(matProd)}`} displayMode />
                ) : (
                  <span className="text-rose-400 text-xs">Dimension Mismatch</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: 2D Linear Transformation Visualizer */}
        {activeTab === 'visualizer' && dim === 2 && (
          <div className="flex justify-center">
            <div className="max-w-md w-full">
              <TransformationVisualizer matrix={matrixA} det={detA} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
