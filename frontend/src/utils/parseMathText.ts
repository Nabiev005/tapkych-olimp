// Splits problem text into plain text, $inline$ / $$block$$ formulas and ```code``` blocks.

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'inline'; value: string }
  | { type: 'block'; value: string }
  | { type: 'code'; lang: string; value: string };

const CODE_FENCE = /```(\w*)\n([\s\S]*?)```/g;
// $$...$$ (block) or $...$ (inline); \$ is a literal dollar sign
const MATH = /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^$])+?)\$/g;

function splitMath(text: string, out: Segment[]): void {
  let last = 0;
  for (const match of text.matchAll(MATH)) {
    if (match.index > last) out.push({ type: 'text', value: text.slice(last, match.index) });
    if (match[1] !== undefined) out.push({ type: 'block', value: match[1] });
    else out.push({ type: 'inline', value: match[2] ?? '' });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
}

/** Splits mixed content into text, inline/block formulas and fenced code. */
export function parseMathText(source: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of source.matchAll(CODE_FENCE)) {
    if (match.index > last) splitMath(source.slice(last, match.index), segments);
    segments.push({
      type: 'code',
      lang: match[1] ?? '',
      value: (match[2] ?? '').replace(/\n$/, ''),
    });
    last = match.index + match[0].length;
  }
  if (last < source.length) splitMath(source.slice(last), segments);
  return segments.map((s) =>
    s.type === 'text' ? { ...s, value: s.value.replace(/\\\$/g, '$') } : s,
  );
}
