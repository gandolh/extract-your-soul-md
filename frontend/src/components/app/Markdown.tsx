// Minimal, dependency-free Markdown renderer — enough for soul.md, which is
// headings, bullet lists, paragraphs, inline bold/italic/code. Not a general
// CommonMark engine; the input is our own pipeline output.

import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Order matters: code first so ** inside backticks isn't touched.
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  let key = 0;
  let m = re.exec(text);
  for (; m !== null; m = re.exec(text)) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) nodes.push(<code key={key++}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('**')) nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      out.push(
        <ul key={key++}>
          {list.map((li, i) => (
            // Static, never-reordered render of trusted soul.md — index key is safe.
            // biome-ignore lint/suspicious/noArrayIndexKey: static non-reordered list
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const flushPara = () => {
    if (para.length) {
      out.push(<p key={key++}>{inline(para.join(' '))}</p>);
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const level = h[1].length;
      const content = inline(h[2]);
      if (level <= 1) out.push(<h1 key={key++}>{content}</h1>);
      else if (level === 2) out.push(<h2 key={key++}>{content}</h2>);
      else out.push(<h3 key={key++}>{content}</h3>);
    } else if (li) {
      flushPara();
      list.push(li[1]);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <>{out}</>;
}
