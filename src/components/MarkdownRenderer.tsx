import React from 'react';

interface MarkdownRendererProps {
  content: string;
  compact?: boolean;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={keyIdx++} className="font-semibold text-[#2C1D14]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={keyIdx++} className="italic text-[#4A3222]">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={keyIdx++} className="font-mono text-[0.9em] bg-[#EDE4D3] px-1.5 py-0.5 rounded text-[#5C3D28]">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function isTableDivider(line: string): boolean {
  return /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?$/.test(line.trim());
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, compact = false }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown Table
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1])
    ) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]));
        i++;
      }

      blocks.push(
        <div key={blockKey++} className="my-3 overflow-x-auto border border-[#DFD4C0] rounded-lg">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#EFE6D5] border-b border-[#DFD4C0]">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 font-semibold text-[#2C1D14] whitespace-nowrap">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE0CE] bg-[#FCF9F3]">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#F5EFE4]/60">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-[#4A3222] align-top tabular-nums">
                      {renderInline(row[cIdx] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h4
          key={blockKey++}
          className={`font-serif font-semibold text-[#2C1D14] ${
            compact ? 'text-sm mt-3 mb-1' : 'text-lg mt-5 mb-2'
          }`}
        >
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h3
          key={blockKey++}
          className={`font-serif font-semibold text-[#2C1D14] ${
            compact ? 'text-base mt-3 mb-1.5' : 'text-2xl mt-6 mb-2.5'
          }`}
        >
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    // Unordered List
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul
          key={blockKey++}
          className={`list-disc pl-5 space-y-1.5 text-[#3F2A1D] ${
            compact ? 'my-1.5 text-[13.5px] leading-relaxed' : 'my-3 text-[15.5px] leading-relaxed'
          }`}
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol
          key={blockKey++}
          className={`list-decimal pl-5 space-y-1.5 text-[#3F2A1D] tabular-nums ${
            compact ? 'my-1.5 text-[13.5px] leading-relaxed' : 'my-3 text-[15.5px] leading-relaxed'
          }`}
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (collect consecutive text lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('## ') &&
      !lines[i].trim().startsWith('### ') &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p
        key={blockKey++}
        className={`text-[#3F2A1D] ${
          compact ? 'my-1.5 text-[13.5px] leading-relaxed' : 'my-3 text-[15.5px] leading-[1.75]'
        }`}
      >
        {renderInline(paraLines.join(' '))}
      </p>
    );
  }

  return <div className="space-y-1">{blocks}</div>;
};
