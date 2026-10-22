import katex from 'katex';
import { useMemo } from 'react';
import { parseMathText } from '../../utils/parseMathText';
import './MathText.css';

function renderTex(tex: string, displayMode: boolean): string {
  // trust:false keeps KaTeX output free of user-controlled HTML/links
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
    output: 'htmlAndMathml',
  });
}

interface MathTextProps {
  children: string;
  /** Render inside a line (no block wrapper), e.g. answer choices */
  inline?: boolean;
  className?: string;
}

/** Text with $inline$ / $$block$$ KaTeX formulas and ```code``` blocks. */
export function MathText({ children, inline, className }: MathTextProps) {
  const segments = useMemo(() => parseMathText(children), [children]);
  const Wrapper = inline ? 'span' : 'div';

  return (
    <Wrapper className={['math-text', className].filter(Boolean).join(' ')}>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'text':
            return <span key={index}>{segment.value}</span>;
          case 'inline':
            return (
              <span
                key={index}
                className="math-inline"
                dangerouslySetInnerHTML={{ __html: renderTex(segment.value, false) }}
              />
            );
          case 'block':
            return (
              <span
                key={index}
                className="math-block"
                dangerouslySetInnerHTML={{ __html: renderTex(segment.value, true) }}
              />
            );
          case 'code':
            return (
              <pre key={index} className="code-block" data-lang={segment.lang || undefined}>
                <code>{segment.value}</code>
              </pre>
            );
        }
      })}
    </Wrapper>
  );
}
