import React, { useMemo } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  latex?: string;
  markdown?: string;
  displayMode?: boolean;
  className?: string;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({
  latex,
  markdown,
  displayMode = false,
  className = '',
}) => {
  // If pure latex is passed
  if (latex !== undefined) {
    const html = useMemo(() => {
      try {
        return katex.renderToString(latex, {
          displayMode,
          throwOnError: false,
          output: 'htmlAndMathml',
        });
      } catch (err) {
        return `<span class="text-rose-400 font-mono text-xs">${latex}</span>`;
      }
    }, [latex, displayMode]);

    return (
      <span
        className={`inline-block ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // If mixed markdown/text with $math$ and $$math$$ is passed
  const renderedContent = useMemo(() => {
    if (!markdown) return null;

    // Split markdown by code blocks first
    const codeBlockRegex = /```([a-zA-Z0-9_:-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Helper to render mixed text and math
    const renderTextWithMath = (text: string, keyPrefix: string) => {
      // Look for $$display$$ or $inline$
      const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
      const textParts: React.ReactNode[] = [];
      let tLastIdx = 0;
      let mMatch: RegExpExecArray | null;

      while ((mMatch = mathRegex.exec(text)) !== null) {
        if (mMatch.index > tLastIdx) {
          textParts.push(
            <span key={`${keyPrefix}-t-${tLastIdx}`}>
              {text.substring(tLastIdx, mMatch.index)}
            </span>
          );
        }

        const isBlock = !!mMatch[1];
        const mathFormula = isBlock ? mMatch[1] : mMatch[2];

        try {
          const renderedHtml = katex.renderToString(mathFormula.trim(), {
            displayMode: isBlock,
            throwOnError: false,
            output: 'htmlAndMathml',
          });
          textParts.push(
            <span
              key={`${keyPrefix}-m-${mMatch.index}`}
              className={isBlock ? 'block my-2 overflow-x-auto text-center' : 'inline-block px-0.5'}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          );
        } catch {
          textParts.push(
            <code key={`${keyPrefix}-err-${mMatch.index}`} className="text-amber-400">
              {mathFormula}
            </code>
          );
        }

        tLastIdx = mathRegex.lastIndex;
      }

      if (tLastIdx < text.length) {
        textParts.push(
          <span key={`${keyPrefix}-t-end`}>
            {text.substring(tLastIdx)}
          </span>
        );
      }

      return textParts;
    };

    let blockIdx = 0;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      if (match.index > lastIndex) {
        const textSegment = markdown.substring(lastIndex, match.index);
        parts.push(
          <div key={`txt-${blockIdx}`} className="whitespace-pre-wrap leading-relaxed">
            {renderTextWithMath(textSegment, `seg-${blockIdx}`)}
          </div>
        );
      }

      const lang = match[1];
      const code = match[2];

      parts.push(
        <div key={`code-${blockIdx}`} className="my-3 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900/90 text-xs font-mono">
          {lang && (
            <div className="px-3 py-1 bg-slate-800/80 text-slate-400 border-b border-slate-700/60 flex items-center justify-between">
              <span>{lang}</span>
            </div>
          )}
          <pre className="p-3 overflow-x-auto text-indigo-200">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = codeBlockRegex.lastIndex;
      blockIdx++;
    }

    if (lastIndex < markdown.length) {
      const remainingText = markdown.substring(lastIndex);
      parts.push(
        <div key={`txt-end`} className="whitespace-pre-wrap leading-relaxed">
          {renderTextWithMath(remainingText, 'seg-end')}
        </div>
      );
    }

    return parts;
  }, [markdown]);

  return <div className={`latex-content ${className}`}>{renderedContent}</div>;
};
