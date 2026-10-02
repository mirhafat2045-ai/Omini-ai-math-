import * as math from 'mathjs';

// Types for Linear Algebra
export type MatrixData = number[][];
export type VectorData = number[];

export interface EliminationStep {
  step: number;
  description: string;
  matrix: MatrixData;
  vector: VectorData;
}

export interface LinearSystemSolution {
  hasUniqueSolution: boolean;
  isDependent?: boolean;
  isInconsistent?: boolean;
  solution?: number[];
  steps: EliminationStep[];
  augmentedMatrix: number[][];
}

export interface EigenResult {
  values: { real: number; imag: number; display: string }[];
  vectors?: { vector: number[]; eigenvalue: string }[];
  characteristicPolynomial?: string;
}

// Convert numbers or nested arrays to LaTeX
export function matrixToLatex(matrix: MatrixData): string {
  if (!matrix || matrix.length === 0 || !matrix[0]) return '\\begin{pmatrix}\\end{pmatrix}';
  const rows = matrix.map(row =>
    row.map(val => {
      if (typeof val !== 'number' || isNaN(val)) return '0';
      // Format nicely
      if (Math.abs(val) < 1e-12) return '0';
      if (Number.isInteger(val)) return val.toString();
      // Round reasonably
      const str = val.toFixed(4);
      return parseFloat(str).toString();
    }).join(' & ')
  );
  return `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
}

export function vectorToLatex(vec: VectorData): string {
  if (!vec || vec.length === 0) return '\\begin{pmatrix}\\end{pmatrix}';
  const items = vec.map(v => {
    if (typeof v !== 'number' || isNaN(v)) return '0';
    if (Math.abs(v) < 1e-12) return '0';
    if (Number.isInteger(v)) return v.toString();
    return parseFloat(v.toFixed(4)).toString();
  });
  return `\\begin{pmatrix} ${items.join(' \\\\ ')} \\end{pmatrix}`;
}

// Format scientific calculator expression to LaTeX
export function expressionToLatex(expr: string): string {
  if (!expr.trim()) return '';
  try {
    const node = math.parse(expr);
    return node.toTex({ parenthesis: 'keep' });
  } catch {
    // Basic fallback formatting
    return expr
      .replace(/\*/g, ' \\cdot ')
      .replace(/\//g, ' \\div ')
      .replace(/pi/gi, '\\pi ')
      .replace(/sqrt\((.*?)\)/g, '\\sqrt{$1}')
      .replace(/sin\((.*?)\)/g, '\\sin($1)')
      .replace(/cos\((.*?)\)/g, '\\cos($1)')
      .replace(/tan\((.*?)\)/g, '\\tan($1)');
  }
}

// Scientific Calculator evaluator
export function evaluateExpression(
  expr: string,
  angleMode: 'rad' | 'deg' = 'rad',
  scope: Record<string, any> = {}
): { result: any; display: string; error?: string } {
  try {
    if (!expr.trim()) return { result: 0, display: '0' };

    // Custom scope with angle support
    const customScope: Record<string, any> = {
      ...scope,
      pi: Math.PI,
      e: Math.E,
      i: math.complex(0, 1),
      c: 299792458, // Speed of light
      h: 6.62607015e-34, // Planck constant
      hbar: 1.054571817e-34,
      G: 6.6743e-11, // Gravitational constant
      kB: 1.380649e-23, // Boltzmann constant
      NA: 6.02214076e23, // Avogadro
    };

    let processedExpr = expr;

    // Adjust trig functions if in degree mode
    if (angleMode === 'deg') {
      // Wrap arguments of sin, cos, tan to convert deg to rad
      // mathjs allows custom sin/cos or replacer
      customScope['sin'] = (x: number) => Math.sin((x * Math.PI) / 180);
      customScope['cos'] = (x: number) => Math.cos((x * Math.PI) / 180);
      customScope['tan'] = (x: number) => Math.tan((x * Math.PI) / 180);
      customScope['asin'] = (x: number) => (Math.asin(x) * 180) / Math.PI;
      customScope['acos'] = (x: number) => (Math.acos(x) * 180) / Math.PI;
      customScope['atan'] = (x: number) => (Math.atan(x) * 180) / Math.PI;
    }

    const res = math.evaluate(processedExpr, customScope);

    // Format output
    let display = '';
    if (typeof res === 'number') {
      if (Math.abs(res) < 1e-12 && Math.abs(res) > 0) {
        display = '0';
      } else if (Number.isInteger(res)) {
        display = res.toString();
      } else if (Math.abs(res) >= 1e10 || Math.abs(res) <= 1e-5) {
        display = res.toExponential(6);
      } else {
        display = parseFloat(res.toFixed(8)).toString();
      }
    } else if (res && typeof res === 'object' && 'im' in res) {
      // Complex number
      const real = Math.abs(res.re) < 1e-10 ? 0 : res.re;
      const imag = Math.abs(res.im) < 1e-10 ? 0 : res.im;
      if (imag === 0) display = real.toFixed(6);
      else if (real === 0) display = `${imag.toFixed(6)}i`;
      else display = `${real.toFixed(6)} ${imag >= 0 ? '+' : '-'} ${Math.abs(imag).toFixed(6)}i`;
    } else if (Array.isArray(res)) {
      display = JSON.stringify(res);
    } else {
      display = String(res);
    }

    return { result: res, display };
  } catch (err: any) {
    return { result: null, display: 'Error', error: err.message || 'Syntax Error' };
  }
}

// Matrix Operations
export function addMatrices(A: MatrixData, B: MatrixData): MatrixData {
  return A.map((row, i) => row.map((val, j) => val + (B[i]?.[j] ?? 0)));
}

export function subtractMatrices(A: MatrixData, B: MatrixData): MatrixData {
  return A.map((row, i) => row.map((val, j) => val - (B[i]?.[j] ?? 0)));
}

export function multiplyMatrices(A: MatrixData, B: MatrixData): MatrixData {
  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;

  if (colsA !== rowsB) {
    throw new Error(`Incompatible matrix dimensions for multiplication: ${rowsA}x${colsA} and ${rowsB}x${colsB}`);
  }

  const result: MatrixData = Array.from({ length: rowsA }, () => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }

  return result;
}

export function transposeMatrix(A: MatrixData): MatrixData {
  const rows = A.length;
  const cols = A[0].length;
  const result: MatrixData = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }
  return result;
}

export function traceMatrix(A: MatrixData): number {
  const n = Math.min(A.length, A[0].length);
  let tr = 0;
  for (let i = 0; i < n; i++) {
    tr += A[i][i];
  }
  return tr;
}

export function determinantMatrix(A: MatrixData): number {
  const n = A.length;
  if (n !== A[0].length) {
    throw new Error('Determinant requires a square matrix.');
  }

  if (n === 1) return A[0][0];
  if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (n === 3) {
    return (
      A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
      A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
      A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
    );
  }

  // Gaussian elimination with row swapping for numerical stability
  const mat = A.map(row => [...row]);
  let det = 1;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(mat[j][i]) > Math.abs(mat[pivot][i])) {
        pivot = j;
      }
    }
    if (Math.abs(mat[pivot][i]) < 1e-12) return 0;

    if (pivot !== i) {
      [mat[i], mat[pivot]] = [mat[pivot], mat[i]];
      det = -det;
    }
    det *= mat[i][i];

    for (let j = i + 1; j < n; j++) {
      const factor = mat[j][i] / mat[i][i];
      for (let k = i + 1; k < n; k++) {
        mat[j][k] -= factor * mat[i][k];
      }
    }
  }
  return det;
}

export function invertMatrix(A: MatrixData): MatrixData {
  const n = A.length;
  if (n !== A[0].length) {
    throw new Error('Matrix must be square to invert.');
  }

  const det = determinantMatrix(A);
  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is singular (det ≈ 0) and cannot be inverted.');
  }

  // Augmented matrix [A | I]
  const augmented: number[][] = A.map((row, i) => {
    const ident = Array(n).fill(0);
    ident[i] = 1;
    return [...row, ...ident];
  });

  // Gauss-Jordan elimination
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(augmented[j][i]) > Math.abs(augmented[pivot][i])) {
        pivot = j;
      }
    }

    if (Math.abs(augmented[pivot][i]) < 1e-12) {
      throw new Error('Matrix is singular.');
    }

    if (pivot !== i) {
      [augmented[i], augmented[pivot]] = [augmented[pivot], augmented[i]];
    }

    const div = augmented[i][i];
    for (let k = 0; k < 2 * n; k++) {
      augmented[i][k] /= div;
    }

    for (let j = 0; j < n; j++) {
      if (j !== i) {
        const factor = augmented[j][i];
        for (let k = 0; k < 2 * n; k++) {
          augmented[j][k] -= factor * augmented[i][k];
        }
      }
    }
  }

  // Extract right half
  return augmented.map(row => row.slice(n));
}

// Compute Eigenvalues & Eigenvectors
export function calculateEigen(A: MatrixData): EigenResult {
  const n = A.length;
  if (n !== A[0].length) {
    throw new Error('Eigenvalues require a square matrix.');
  }

  if (n === 2) {
    // Characteristic eq: λ^2 - Tr(A)λ + det(A) = 0
    const tr = traceMatrix(A);
    const det = determinantMatrix(A);
    const disc = tr * tr - 4 * det;

    const charPoly = `\\lambda^2 - (${tr.toFixed(2)})\\lambda + (${det.toFixed(2)}) = 0`;

    if (disc >= 0) {
      const lambda1 = (tr + Math.sqrt(disc)) / 2;
      const lambda2 = (tr - Math.sqrt(disc)) / 2;

      // Eigenvectors for (A - λI)v = 0
      const getVec = (lam: number) => {
        const a11 = A[0][0] - lam;
        const a12 = A[0][1];
        if (Math.abs(a12) > 1e-9) {
          const v = [-a12, a11];
          const norm = Math.hypot(v[0], v[1]) || 1;
          return [v[0] / norm, v[1] / norm];
        } else if (Math.abs(A[1][0]) > 1e-9) {
          const v = [A[1][1] - lam, -A[1][0]];
          const norm = Math.hypot(v[0], v[1]) || 1;
          return [v[0] / norm, v[1] / norm];
        }
        return [1, 0];
      };

      return {
        values: [
          { real: lambda1, imag: 0, display: lambda1.toFixed(4) },
          { real: lambda2, imag: 0, display: lambda2.toFixed(4) },
        ],
        vectors: [
          { eigenvalue: lambda1.toFixed(4), vector: getVec(lambda1) },
          { eigenvalue: lambda2.toFixed(4), vector: getVec(lambda2) },
        ],
        characteristicPolynomial: charPoly,
      };
    } else {
      const realPart = tr / 2;
      const imagPart = Math.sqrt(-disc) / 2;
      return {
        values: [
          { real: realPart, imag: imagPart, display: `${realPart.toFixed(4)} + ${imagPart.toFixed(4)}i` },
          { real: realPart, imag: -imagPart, display: `${realPart.toFixed(4)} - ${imagPart.toFixed(4)}i` },
        ],
        characteristicPolynomial: charPoly,
      };
    }
  }

  // Fallback to mathjs for 3x3 and higher
  try {
    const mathMatrix = math.matrix(A);
    const e = math.eigs(mathMatrix);
    const vals = Array.isArray(e.values) ? e.values : (e.values as any).toArray();

    const formattedVals = vals.map((v: any) => {
      if (typeof v === 'number') {
        return { real: v, imag: 0, display: v.toFixed(4) };
      } else if (v && typeof v === 'object' && 're' in v) {
        return {
          real: v.re,
          imag: v.im,
          display: `${v.re.toFixed(4)} ${v.im >= 0 ? '+' : '-'} ${Math.abs(v.im).toFixed(4)}i`,
        };
      }
      return { real: Number(v) || 0, imag: 0, display: String(v) };
    });

    return {
      values: formattedVals,
    };
  } catch (err: any) {
    throw new Error('Unable to compute eigenvalues: ' + err.message);
  }
}

// Solve Ax = b with Step-by-Step Gaussian Elimination
export function solveLinearSystem(A: MatrixData, b: VectorData): LinearSystemSolution {
  const n = A.length;
  if (n !== A[0].length || n !== b.length) {
    throw new Error('System must have matching square matrix dimensions and vector length.');
  }

  const steps: EliminationStep[] = [];
  const mat: number[][] = A.map((row, i) => [...row, b[i]]);

  steps.push({
    step: 0,
    description: 'Initial augmented matrix $[A \\mid b]$',
    matrix: mat.map(r => r.slice(0, n)),
    vector: mat.map(r => r[n]),
  });

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(mat[j][i]) > Math.abs(mat[pivot][i])) {
        pivot = j;
      }
    }

    if (pivot !== i) {
      [mat[i], mat[pivot]] = [mat[pivot], mat[i]];
      steps.push({
        step: steps.length,
        description: `Swap Row ${i + 1} and Row ${pivot + 1} for numerical stability: $R_${i + 1} \\leftrightarrow R_${pivot + 1}$`,
        matrix: mat.map(r => r.slice(0, n)),
        vector: mat.map(r => r[n]),
      });
    }

    const pivotVal = mat[i][i];
    if (Math.abs(pivotVal) < 1e-12) {
      continue;
    }

    // Eliminate below
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(mat[j][i]) > 1e-12) {
        const factor = mat[j][i] / pivotVal;
        for (let k = i; k <= n; k++) {
          mat[j][k] -= factor * mat[i][k];
        }
        steps.push({
          step: steps.length,
          description: `Eliminate $x_${i + 1}$ from Row ${j + 1}: $R_${j + 1} \\leftarrow R_${j + 1} - (${factor.toFixed(3)}) R_${i + 1}$`,
          matrix: mat.map(r => r.slice(0, n)),
          vector: mat.map(r => r[n]),
        });
      }
    }
  }

  // Check consistency and back-substitution
  const sol: number[] = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = mat[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= mat[i][j] * sol[j];
    }

    if (Math.abs(mat[i][i]) < 1e-12) {
      if (Math.abs(sum) > 1e-12) {
        return {
          hasUniqueSolution: false,
          isInconsistent: true,
          steps,
          augmentedMatrix: mat,
        };
      } else {
        return {
          hasUniqueSolution: false,
          isDependent: true,
          steps,
          augmentedMatrix: mat,
        };
      }
    }

    sol[i] = sum / mat[i][i];
  }

  steps.push({
    step: steps.length,
    description: `Back-substitution complete. Unique solution vector found!`,
    matrix: mat.map(r => r.slice(0, n)),
    vector: sol,
  });

  return {
    hasUniqueSolution: true,
    solution: sol,
    steps,
    augmentedMatrix: mat,
  };
}

// Compile a 3D function f(x, y, t) for ultra-fast grid evaluation
export function compile3DFunction(expression: string): (x: number, y: number, t?: number) => number {
  try {
    const compiled = math.compile(expression);
    return (x: number, y: number, t: number = 0) => {
      try {
        const val = compiled.evaluate({
          x,
          y,
          t,
          pi: Math.PI,
          e: Math.E,
          r: Math.hypot(x, y),
          theta: Math.atan2(y, x),
        });
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          return val;
        }
        return 0;
      } catch {
        return 0;
      }
    };
  } catch {
    // Return simple fallback wave
    return (x: number, y: number, t: number = 0) => Math.sin(Math.hypot(x, y) - t);
  }
}
