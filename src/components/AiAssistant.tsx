import React, { useState, useRef, useEffect } from 'react';
import { LatexRenderer } from './LatexRenderer';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Trash2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Cpu,
  Layers,
  Zap,
  ArrowRight,
  RefreshCw,
  Lightbulb
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggested3D?: {
    name: string;
    func: string;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    description?: string;
  };
}

interface AiAssistantProps {
  activeContext: {
    mode: 'calc' | 'linalg' | 'graph3d';
    expression?: string;
    matrixA?: any;
    matrixB?: any;
    vectorB?: any;
    surfaceExpr?: string;
  };
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onClearHistory: () => void;
  isLoading: boolean;
  onApply3DFunction?: (func: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  activeContext,
  messages,
  onSendMessage,
  onClearHistory,
  isLoading,
  onApply3DFunction,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    await onSendMessage(text);
  };

  // Quick contextual prompt suggestions
  const getContextualSuggestions = () => {
    if (activeContext.mode === 'graph3d') {
      return [
        'Analyze extrema and saddle points of this 3D surface',
        'Calculate partial derivatives ∂z/∂x and ∂z/∂y',
        'Suggest a dynamic quantum wave function for 3D plotting',
        'What is the Gaussian curvature of this surface?',
      ];
    } else if (activeContext.mode === 'linalg') {
      return [
        'Explain step-by-step how to diagonalize Matrix A',
        'What are the geometric transformations of these eigenvalues?',
        'Does Matrix A have an orthonormal basis?',
        'Explain how Gaussian elimination solved Ax = b',
      ];
    } else {
      return [
        'Show step-by-step mathematical derivation of my formula',
        'Explain the calculus meaning of this function',
        'Provide a Taylor series approximation for this expression',
        'Suggest an interesting multivariable problem',
      ];
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 text-slate-100 rounded-2xl overflow-hidden border border-indigo-500/30 shadow-2xl backdrop-blur-xl">
      {/* Top Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30">
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wide text-white flex items-center gap-1.5">
              OmniMath AI Copilot
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-normal">
                Online
              </span>
            </h3>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span>Context:</span>
              <span className="text-indigo-400 font-semibold uppercase">
                {activeContext.mode === 'graph3d'
                  ? '3D Surface Grapher'
                  : activeContext.mode === 'linalg'
                  ? 'Linear Algebra Engine'
                  : 'Scientific Calculator'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onClearHistory}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5 text-indigo-300">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[88%] rounded-2xl p-3.5 text-xs shadow-md ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-950/80 border border-slate-800/90 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-70 font-mono">
                <span>{msg.role === 'user' ? 'You' : 'OmniMath AI'}</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Content with KaTeX and Markdown */}
              <div className="leading-relaxed">
                <LatexRenderer markdown={msg.content} />
              </div>

              {/* Interactive 3D Function Presets Generated by AI */}
              {msg.suggested3D && onApply3DFunction && (
                <div className="mt-3 p-2.5 bg-indigo-950/40 border border-indigo-500/40 rounded-xl flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Suggested Surface: {msg.suggested3D.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-300">
                      z = {msg.suggested3D.func}
                    </div>
                  </div>
                  <button
                    onClick={() => onApply3DFunction(msg.suggested3D!.func)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow transition"
                  >
                    <span>Plot in 3D</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-300">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5 text-indigo-300">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span className="font-mono text-[11px]">Computing mathematical derivation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <span className="text-slate-500 font-mono shrink-0 flex items-center gap-1 mr-1">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            Ask:
          </span>
          {getContextualSuggestions().map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(sug)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-900/50 hover:text-indigo-200 text-slate-300 border border-slate-700/80 shrink-0 transition text-left"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Ask math, calculus, linear algebra or 3D questions..."
          disabled={isLoading}
          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition font-sans"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl shadow-md shadow-indigo-600/30 transition cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
