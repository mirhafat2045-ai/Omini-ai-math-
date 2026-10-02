import React, { useState, useCallback, useEffect } from 'react';
import { ScientificCalculator } from './components/ScientificCalculator';
import { LinearAlgebraStudio } from './components/LinearAlgebraStudio';
import { Grapher3D } from './components/Grapher3D';
import { AiAssistant, ChatMessage } from './components/AiAssistant';
import { initAuth, User } from './services/firebaseAuth';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { GoogleDriveHub } from './components/GoogleDriveHub';
import { saveImageToDrive } from './services/googleDriveService';
import {
  Calculator,
  Grid3X3,
  Box,
  Sparkles,
  Bot,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Atom,
  Binary,
  HardDrive,
  CloudUpload,
  CheckCircle2
} from 'lucide-react';

type StudioMode = 'calc' | 'linalg' | 'graph3d';

export default function App() {
  const [activeMode, setActiveMode] = useState<StudioMode>('graph3d');
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [isAiExpanded, setIsAiExpanded] = useState(false);

  // Google Drive & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isDriveHubOpen, setIsDriveHubOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronized workspace state
  const [currentCalcExpr, setCurrentCalcExpr] = useState('sin(pi / 3) + sqrt(16) * 2^3');
  const [current3DExpr, setCurrent3DExpr] = useState('sin(sqrt(x^2 + y^2)) / (sqrt(x^2 + y^2) + 0.1)');
  const [matrixContext, setMatrixContext] = useState<any>(null);

  // Initialize Firebase Auth listener on app mount
  useEffect(() => {
    const unsubscribe = initAuth(
      currentUser => setUser(currentUser),
      () => setUser(null)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // AI Assistant Chat State
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### Welcome to **OmniMath AI Studio**
I am your computational mathematics copilot. I am directly attached to your workspace and can:
- **Solve & Explain Complex Linear Algebra**: Compute eigenvalues, invert matrices, and perform Gaussian elimination step-by-step.
- **Graph & Analyze 3D Surfaces**: Calculate gradients $\\nabla f(x, y)$, Hessian determinants, critical points, and simulate wave dynamics in real-time.
- **Scientific Computations**: Derive exact symbolic answers and calculus proofs for any formula.

Try asking: *"Analyze the saddle points of this 3D surface"* or click **"AI Surface Analysis"** above!`,
      timestamp: 'Just now',
    },
  ]);

  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;

  // Send message to Gemini server endpoint
  const handleSendMessage = useCallback(async (promptText: string, customContext?: any) => {
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messagesRef.current, userMsg];
    setMessages(updatedHistory);
    setAiLoading(true);
    setIsAiPanelOpen(true);

    try {
      const activeContext = {
        mode: activeMode,
        surfaceExpr: current3DExpr,
        calcExpr: currentCalcExpr,
        ...(customContext || matrixContext || {}),
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
          context: activeContext,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to connect to AI server.');
      }

      const data = await res.json();
      const replyText = data.reply;

      // Check if response contains a 3d preset suggestion block
      let suggested3D: any = undefined;
      const presetMatch = replyText.match(/```json:3d_preset\s*([\s\S]*?)```/);
      if (presetMatch) {
        try {
          suggested3D = JSON.parse(presetMatch[1]);
        } catch (e) {
          console.warn('Could not parse suggested 3D preset', e);
        }
      }

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested3D,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: `**Error:** ${err.message || 'Could not complete AI request.'} Please ensure the backend is running with a valid Gemini API key.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }, [activeMode, current3DExpr, currentCalcExpr, matrixContext, messages]);

  // Deep 3D Surface Analysis Trigger
  const handleAnalyze3DSurface = async (expr: string, xRange: [number, number], yRange: [number, number]) => {
    setIsAiPanelOpen(true);
    setAiLoading(true);

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: `Analyze the multivariable geometry and calculus of $z = f(x, y) = ${expr}$ in real-time.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/ai/analyze-surface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ func: expr, xRange, yRange }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze surface.');
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: data.analysis,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: `**Surface Analysis Error:** ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Bridge: When AI suggests a 3D function, apply it immediately
  const handleApply3DFunction = (func: string) => {
    setCurrent3DExpr(func);
    setActiveMode('graph3d');
  };

  // Google Drive Handlers
  const handleSaveScreenshotToDrive = async (dataUrl: string) => {
    if (!user) {
      setIsDriveHubOpen(true);
      return;
    }
    try {
      setToastMessage('Saving 3D snapshot to Google Drive...');
      await saveImageToDrive(`3D_Surface_${Date.now()}`, dataUrl);
      setToastMessage('Saved snapshot to Google Drive successfully!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage(`Drive Error: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleLoadProject = (projectData: any) => {
    if (projectData.surfaceExpr) {
      setCurrent3DExpr(projectData.surfaceExpr);
    }
    if (projectData.calcExpr) {
      setCurrentCalcExpr(projectData.calcExpr);
    }
    if (projectData.mode) {
      setActiveMode(projectData.mode as StudioMode);
    }
    setToastMessage(`Loaded project from Google Drive successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-indigo-600/90 text-white text-xs font-semibold rounded-2xl shadow-2xl backdrop-blur border border-indigo-400/40 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Application Navigation Bar */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Atom className="w-5 h-5 animate-spin" style={{ animationDuration: '12s' }} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                OmniMath AI
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-medium">
                  Studio 3D
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Studio Mode Switcher */}
        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveMode('graph3d')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeMode === 'graph3d'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Grapher</span>
          </button>

          <button
            onClick={() => setActiveMode('linalg')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeMode === 'linalg'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Linear Algebra</span>
          </button>

          <button
            onClick={() => setActiveMode('calc')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeMode === 'calc'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Scientific Calc</span>
          </button>
        </nav>

        {/* Right Header: Google Drive & Attached AI Controls */}
        <div className="flex items-center gap-2">
          {/* Google Drive Hub Button */}
          <button
            onClick={() => setIsDriveHubOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition cursor-pointer"
            title="Open Google Drive Cloud Projects"
          >
            <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Drive Projects</span>
          </button>

          {/* Google Sign-in / User Profile */}
          <GoogleAuthButton
            user={user}
            onOpenDriveHub={() => setIsDriveHubOpen(true)}
          />

          {/* Attached AI Toggle Button */}
          <button
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition border cursor-pointer ${
              isAiPanelOpen
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-lg shadow-purple-600/25'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Attached AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5 animate-pulse" />
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="flex-1 p-3 lg:p-4 overflow-hidden flex gap-4 relative">
        {/* Left Side: Active Computational Workspace */}
        <div
          className={`flex-1 transition-all duration-300 h-[calc(100vh-5rem)] ${
            isAiExpanded ? 'hidden' : 'block'
          }`}
        >
          {activeMode === 'graph3d' && (
            <Grapher3D
              currentExpression={current3DExpr}
              onExpressionChange={setCurrent3DExpr}
              onAnalyzeWithAi={handleAnalyze3DSurface}
              onSaveScreenshotToDrive={handleSaveScreenshotToDrive}
            />
          )}

          {activeMode === 'linalg' && (
            <LinearAlgebraStudio
              onAskAi={(prompt, ctx) => {
                setMatrixContext(ctx);
                handleSendMessage(prompt, ctx);
              }}
            />
          )}

          {activeMode === 'calc' && (
            <ScientificCalculator
              onAskAi={(prompt, ctx) => handleSendMessage(prompt, ctx)}
              onSendTo3D={expr => {
                setCurrent3DExpr(expr);
                setActiveMode('graph3d');
              }}
            />
          )}
        </div>

        {/* Right Side: Attached AI Assistant Panel */}
        {isAiPanelOpen && (
          <div
            className={`transition-all duration-300 h-[calc(100vh-5rem)] shrink-0 ${
              isAiExpanded ? 'w-full' : 'w-full lg:w-[420px] xl:w-[460px]'
            }`}
          >
            <AiAssistant
              activeContext={{
                mode: activeMode,
                surfaceExpr: current3DExpr,
                expression: currentCalcExpr,
                ...matrixContext,
              }}
              messages={messages}
              onSendMessage={handleSendMessage}
              onClearHistory={() => setMessages([])}
              isLoading={aiLoading}
              onApply3DFunction={handleApply3DFunction}
              isExpanded={isAiExpanded}
              onToggleExpand={() => setIsAiExpanded(!isAiExpanded)}
            />
          </div>
        )}
      </main>

      {/* Google Drive Project Hub Modal */}
      <GoogleDriveHub
        isOpen={isDriveHubOpen}
        onClose={() => setIsDriveHubOpen(false)}
        currentWorkspace={{
          mode: activeMode,
          surfaceExpr: current3DExpr,
          calcExpr: currentCalcExpr,
          matrixA: matrixContext?.matrixA,
          matrixB: matrixContext?.matrixB,
          vectorB: matrixContext?.vectorB,
        }}
        onLoadProject={handleLoadProject}
      />
    </div>
  );
}
