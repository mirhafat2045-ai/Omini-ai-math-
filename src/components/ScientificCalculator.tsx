import React, { useState } from 'react';
import { evaluateExpression, expressionToLatex } from '../utils/mathEngine';
import { LatexRenderer } from './LatexRenderer';
import {
  Delete,
  RotateCcw,
  Sparkles,
  History,
  Copy,
  Check,
  Equal,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface ScientificCalculatorProps {
  onAskAi: (prompt: string, context?: any) => void;
  onSendTo3D?: (expr: string) => void;
}

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

export const ScientificCalculator: React.FC<ScientificCalculatorProps> = ({ onAskAi, onSendTo3D }) => {
  const [expression, setExpression] = useState<string>('sin(pi / 3) + sqrt(16) * 2^3');
  const [result, setResult] = useState<string>('');
  const [rawResult, setRawResult] = useState<any>(null);
  const [angleMode, setAngleMode] = useState<'rad' | 'deg'>('rad');
  const [memory, setMemory] = useState<number>(0);
  const [ans, setAns] = useState<string>('0');
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: '1',
      expression: 'cos(0) + exp(2)',
      result: '8.389056',
      timestamp: '22:45',
    },
    {
      id: '2',
      expression: 'det([2, 1; 1, 3])',
      result: '5',
      timestamp: '22:48',
    },
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePad, setActivePad] = useState<'main' | 'trig' | 'advanced' | 'constants'>('main');

  // Handle calculation
  const handleCalculate = () => {
    if (!expression.trim()) return;
    const evalRes = evaluateExpression(expression, angleMode, { ans: parseFloat(ans) || 0 });

    if (evalRes.error) {
      setResult('Error: ' + evalRes.error);
    } else {
      setResult(evalRes.display);
      setRawResult(evalRes.result);
      setAns(evalRes.display);

      // Add to history
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setHistory(prev => [
        {
          id: Math.random().toString(),
          expression,
          result: evalRes.display,
          timestamp: timeStr,
        },
        ...prev.slice(0, 19),
      ]);
    }
  };

  const handleKeyPress = (char: string) => {
    setExpression(prev => prev + char);
  };

  const handleClear = () => {
    setExpression('');
    setResult('');
  };

  const handleDelete = () => {
    setExpression(prev => prev.slice(0, -1));
  };

  const handleMemoryAdd = () => {
    const val = parseFloat(result || expression);
    if (!isNaN(val)) setMemory(prev => prev + val);
  };

  const handleMemorySub = () => {
    const val = parseFloat(result || expression);
    if (!isNaN(val)) setMemory(prev => prev - val);
  };

  const handleMemoryRecall = () => {
    setExpression(prev => prev + memory.toString());
  };

  const handleMemoryClear = () => {
    setMemory(0);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAskAiSolve = () => {
    const prompt = `Solve this scientific problem with step-by-step mathematical reasoning:
Expression: $${expression}$
Current Evaluated Answer: ${result || 'N/A'}
Angle Mode: ${angleMode.toUpperCase()}

Please provide:
1. Exact theoretical derivation and simplification steps.
2. Value substitutions and trigonometric / algebraic identities used.
3. Final exact result in both symbolic form (radicals/pi/e) and numerical approximation.
4. Physical or mathematical significance.`;

    onAskAi(prompt, {
      type: 'scientific_calculation',
      expression,
      result,
      angleMode,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Header */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-200">Scientific Engine</span>
        </div>

        {/* Rad / Deg Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setAngleMode('rad')}
            className={`px-2.5 py-0.5 rounded transition ${
              angleMode === 'rad' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RAD
          </button>
          <button
            onClick={() => setAngleMode('deg')}
            className={`px-2.5 py-0.5 rounded transition ${
              angleMode === 'deg' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DEG
          </button>
        </div>
      </div>

      {/* Screen / Display Area */}
      <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 flex flex-col justify-end min-h-[160px] relative">
        {/* KaTeX Live Mathematical Preview */}
        <div className="text-xs font-serif text-slate-400 mb-1 overflow-x-auto whitespace-nowrap min-h-[22px]">
          {expression ? (
            <LatexRenderer latex={expressionToLatex(expression)} displayMode={false} />
          ) : (
            <span className="text-slate-600 font-mono text-[11px]">Enter mathematical formula...</span>
          )}
        </div>

        {/* Raw Text Input with Instant Editing */}
        <input
          type="text"
          value={expression}
          onChange={e => setExpression(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleCalculate();
          }}
          placeholder="0"
          className="w-full bg-transparent text-xl font-mono text-slate-100 placeholder-slate-600 focus:outline-none mb-2"
        />

        {/* Calculated Result Output */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-indigo-400">=</span>
            <span className="text-2xl font-mono font-bold text-emerald-400 tracking-tight">
              {result || '0'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {result && onSendTo3D && (
              <button
                onClick={() => onSendTo3D(expression)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition flex items-center gap-1"
                title="Send formula to 3D Grapher"
              >
                <span>3D Plot</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={handleAskAiSolve}
              className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-medium shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Solve with AI
            </button>
          </div>
        </div>
      </div>

      {/* Main Keypad & History Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Keypad Buttons (8 cols) */}
        <div className="md:col-span-8 p-3 flex flex-col justify-between border-r border-slate-800 overflow-y-auto">
          {/* Keypad Category Tabs */}
          <div className="flex items-center gap-1 mb-2 bg-slate-900/60 p-1 rounded-lg border border-slate-800/80 text-xs">
            <button
              onClick={() => setActivePad('main')}
              className={`flex-1 py-1 rounded text-center font-medium transition ${
                activePad === 'main' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setActivePad('trig')}
              className={`flex-1 py-1 rounded text-center font-medium transition ${
                activePad === 'trig' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trig &amp; Hyp
            </button>
            <button
              onClick={() => setActivePad('advanced')}
              className={`flex-1 py-1 rounded text-center font-medium transition ${
                activePad === 'advanced' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Powers &amp; Roots
            </button>
            <button
              onClick={() => setActivePad('constants')}
              className={`flex-1 py-1 rounded text-center font-medium transition ${
                activePad === 'constants' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Constants
            </button>
          </div>

          {/* Sub-panel buttons depending on active tab */}
          <div className="mb-2">
            {activePad === 'trig' && (
              <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                {['sin(', 'cos(', 'tan(', 'asin(', 'acos('].map(fn => (
                  <button
                    key={fn}
                    onClick={() => handleKeyPress(fn)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded border border-slate-800 hover:border-slate-700 transition"
                  >
                    {fn.replace('(', '')}
                  </button>
                ))}
                {['atan(', 'sinh(', 'cosh(', 'tanh(', 'asinh('].map(fn => (
                  <button
                    key={fn}
                    onClick={() => handleKeyPress(fn)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded border border-slate-800 hover:border-slate-700 transition"
                  >
                    {fn.replace('(', '')}
                  </button>
                ))}
              </div>
            )}

            {activePad === 'advanced' && (
              <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                {['^2', '^3', '^(', 'sqrt(', 'cbrt('].map(fn => (
                  <button
                    key={fn}
                    onClick={() => handleKeyPress(fn)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded border border-slate-800 hover:border-slate-700 transition"
                  >
                    {fn}
                  </button>
                ))}
                {['exp(', 'log10(', 'log2(', 'ln(', 'abs('].map(fn => (
                  <button
                    key={fn}
                    onClick={() => handleKeyPress(fn)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded border border-slate-800 hover:border-slate-700 transition"
                  >
                    {fn}
                  </button>
                ))}
              </div>
            )}

            {activePad === 'constants' && (
              <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                {[
                  { label: 'π', val: 'pi' },
                  { label: 'e', val: 'e' },
                  { label: 'i', val: 'i' },
                  { label: 'c (light)', val: 'c' },
                  { label: 'h (planck)', val: 'h' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => handleKeyPress(item.val)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded border border-slate-800 hover:border-slate-700 transition"
                  >
                    {item.label}
                  </button>
                ))}
                {[
                  { label: 'G (grav)', val: 'G' },
                  { label: 'kB (boltz)', val: 'kB' },
                  { label: 'NA (avog)', val: 'NA' },
                  { label: 'n!', val: '!' },
                  { label: '%', val: '%' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => handleKeyPress(item.val)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded border border-slate-800 hover:border-slate-700 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Keypad Grid */}
          <div className="grid grid-cols-5 gap-1.5 text-sm font-mono flex-1">
            {/* Memory Row */}
            <button
              onClick={handleMemoryClear}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 text-xs"
            >
              MC
            </button>
            <button
              onClick={handleMemoryRecall}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 text-xs"
            >
              MR
            </button>
            <button
              onClick={handleMemoryAdd}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 text-xs"
            >
              M+
            </button>
            <button
              onClick={handleMemorySub}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 text-xs"
            >
              M-
            </button>
            <button
              onClick={handleClear}
              className="p-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg border border-rose-900/50 text-xs font-bold"
            >
              AC
            </button>

            {/* Row 1 */}
            <button
              onClick={() => handleKeyPress('(')}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800"
            >
              (
            </button>
            <button
              onClick={() => handleKeyPress(')')}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800"
            >
              )
            </button>
            <button
              onClick={() => handleKeyPress('^')}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800"
            >
              ^
            </button>
            <button
              onClick={() => handleKeyPress('sqrt(')}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800"
            >
              √
            </button>
            <button
              onClick={handleDelete}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-rose-400 rounded-lg border border-slate-800 flex items-center justify-center"
            >
              <Delete className="w-4 h-4" />
            </button>

            {/* Row 2: 7 8 9 / % */}
            <button
              onClick={() => handleKeyPress('7')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              7
            </button>
            <button
              onClick={() => handleKeyPress('8')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              8
            </button>
            <button
              onClick={() => handleKeyPress('9')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              9
            </button>
            <button
              onClick={() => handleKeyPress(' / ')}
              className="p-3 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 rounded-lg border border-indigo-900/60"
            >
              ÷
            </button>
            <button
              onClick={() => handleKeyPress(' % ')}
              className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800"
            >
              %
            </button>

            {/* Row 3: 4 5 6 * ln */}
            <button
              onClick={() => handleKeyPress('4')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              4
            </button>
            <button
              onClick={() => handleKeyPress('5')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              5
            </button>
            <button
              onClick={() => handleKeyPress('6')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              6
            </button>
            <button
              onClick={() => handleKeyPress(' * ')}
              className="p-3 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 rounded-lg border border-indigo-900/60"
            >
              ×
            </button>
            <button
              onClick={() => handleKeyPress('ln(')}
              className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-xs"
            >
              ln
            </button>

            {/* Row 4: 1 2 3 - e */}
            <button
              onClick={() => handleKeyPress('1')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              1
            </button>
            <button
              onClick={() => handleKeyPress('2')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              2
            </button>
            <button
              onClick={() => handleKeyPress('3')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              3
            </button>
            <button
              onClick={() => handleKeyPress(' - ')}
              className="p-3 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 rounded-lg border border-indigo-900/60"
            >
              −
            </button>
            <button
              onClick={() => handleKeyPress('e')}
              className="p-3 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg border border-slate-800"
            >
              e
            </button>

            {/* Row 5: 0 . ANS + = */}
            <button
              onClick={() => handleKeyPress('0')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60 font-semibold"
            >
              0
            </button>
            <button
              onClick={() => handleKeyPress('.')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-700/60"
            >
              .
            </button>
            <button
              onClick={() => handleKeyPress('ans')}
              className="p-3 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-lg border border-slate-800 text-xs font-bold"
            >
              ANS
            </button>
            <button
              onClick={() => handleKeyPress(' + ')}
              className="p-3 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 rounded-lg border border-indigo-900/60"
            >
              +
            </button>
            <button
              onClick={handleCalculate}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/30 flex items-center justify-center transition cursor-pointer"
            >
              <Equal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History Tape Panel (4 cols) */}
        <div className="md:col-span-4 p-3 flex flex-col bg-slate-900/30 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              History Tape
            </span>
            <button
              onClick={() => setHistory([])}
              className="text-[11px] text-slate-500 hover:text-rose-400 transition"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {history.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No past calculations recorded.
              </div>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-900 rounded-xl border border-slate-800/80 transition group relative"
                >
                  <div
                    onClick={() => setExpression(item.expression)}
                    className="cursor-pointer"
                  >
                    <div className="text-xs text-slate-400 font-mono truncate mb-1">
                      {item.expression}
                    </div>
                    <div className="text-sm font-mono font-bold text-emerald-400 flex items-center justify-between">
                      <span>= {item.result}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(item.result, item.id)}
                    className="absolute top-2 right-2 p-1 rounded bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white transition"
                    title="Copy result"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
