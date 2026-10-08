import type { CSSProperties } from 'react';

// 一致箇所の強調。どの DS にも該当部品がないので全 UI で共用し、色だけ各 DS から渡す
export function Highlight({ segments, style, markStyle }: {
  segments: { text: string; match: boolean }[];
  style?: CSSProperties;
  markStyle: CSSProperties;
}) {
  return (
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflow: 'auto', maxHeight: '20rem', ...style }}>
      {segments.map((s, i) => (s.match ? <mark key={i} style={{ borderRadius: 2, ...markStyle }}>{s.text}</mark> : s.text))}
    </pre>
  );
}
