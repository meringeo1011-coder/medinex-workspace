import { useState } from 'react';

const SUMMARY_PREVIEW_LENGTH = 180;

function getFileMeta(fileName = '') {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { icon: '📕', label: 'PDF' };
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return { icon: '🖼️', label: 'Image' };
  return { icon: '📄', label: 'File' };
}

// Turns "**bold**" segments inside a line of text into <strong> spans.
// Everything else stays as plain text. Keeps the summary readable without
// pulling in a full markdown library for one small feature.
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="fw-bold text-dark">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Groups the raw AI summary text into paragraph / bullet-list / numbered-list
// blocks so it can be rendered as proper HTML instead of one flat blob of
// text with stray "*" and "**" characters in it.
function parseSummaryBlocks(summary) {
  const lines = summary.split('\n').map((l) => l.trim());
  const blocks = [];
  let paragraphLines = [];
  let listItems = [];
  let listType = null; // 'ul' | 'ol'

  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push({ type: 'p', text: paragraphLines.join(' ') });
      paragraphLines = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: listType, items: listItems });
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line) => {
    if (!line) {
      flushParagraph();
      return;
    }
    const bulletMatch = line.match(/^[*-]\s+(.*)/);
    const orderedMatch = line.match(/^\d+[.)]\s+(.*)/);

    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bulletMatch[1]);
    } else if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(orderedMatch[1]);
    } else {
      flushList();
      paragraphLines.push(line);
    }
  });
  flushParagraph();
  flushList();
  return blocks;
}

// Plain-text version of the summary (markdown markers stripped) - used only
// for the short collapsed preview, so truncating mid-string never leaves a
// dangling "**" or lone "*" bullet behind.
function toPlainText(summary) {
  return summary
    .split('\n')
    .map((l) => l.trim().replace(/^[*-]\s+/, '').replace(/^\d+[.)]\s+/, ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\*\*/g, '');
}

function SummaryBlocks({ blocks }) {
  return (
    <div style={{ lineHeight: 1.7 }}>
      {blocks.map((block, idx) => {
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="mb-2 ps-3">
              {block.items.map((item, i) => (
                <li key={i} className="mb-1">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={idx} className="mb-2 ps-3">
              {block.items.map((item, i) => (
                <li key={i} className="mb-1">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={idx} className="mb-2">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

// A single lab report entry with a clearly separated, well-formatted AI summary block.
// compact -> tighter spacing for use in sidebars (e.g. Doctor Dashboard)
function ReportCard({ report, fileUrl, compact = false, highlight = false }) {
  const [expanded, setExpanded] = useState(false);
  const { icon, label } = getFileMeta(report.file_name);
  const summary = report.summary?.trim();

  const plainText = summary ? toPlainText(summary) : '';
  const isLong = plainText.length > SUMMARY_PREVIEW_LENGTH;
  const preview = isLong ? plainText.slice(0, SUMMARY_PREVIEW_LENGTH).trim() + '…' : plainText;
  const blocks = summary ? parseSummaryBlocks(summary) : [];

  return (
    <div
      className={`bg-white rounded-4 border shadow-sm ${highlight ? 'border-primary border-opacity-50' : ''}`}
      style={{ overflow: 'hidden' }}
    >
      {/* File header */}
      <div className={`d-flex justify-content-between align-items-center ${compact ? 'p-2' : 'p-3'}`}>
        <div className="d-flex align-items-center gap-2 overflow-hidden">
          <div
            className="bg-light border rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: compact ? '34px' : '42px', height: compact ? '34px' : '42px', fontSize: compact ? '1rem' : '1.25rem' }}
          >
            {icon}
          </div>
          <div className="text-truncate">
            <h6 className={`mb-0 fw-bold text-dark text-truncate ${compact ? 'small' : ''}`}>{report.file_name}</h6>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-light text-muted border fw-medium" style={{ fontSize: '0.65rem' }}>{label}</span>
              <small className="text-muted" style={{ fontSize: compact ? '0.7rem' : '0.75rem' }}>
                {new Date(report.uploaded_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </small>
            </div>
          </div>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className={`btn btn-outline-primary rounded-pill fw-bold flex-shrink-0 ms-2 ${compact ? 'btn-sm' : 'px-4'}`}
        >
          View
        </a>
      </div>

      {/* AI Summary block */}
      {summary ? (
        <div
          className={`border-top ${compact ? 'p-2' : 'p-3'}`}
          style={{ background: 'linear-gradient(135deg, rgba(15,155,142,0.07), rgba(29,78,216,0.05))' }}
        >
          <div className="d-flex align-items-center gap-2 mb-2">
            <span style={{ fontSize: compact ? '0.85rem' : '1rem' }}>✨</span>
            <span
              className="fw-bold text-uppercase"
              style={{ fontSize: compact ? '0.65rem' : '0.7rem', letterSpacing: '0.05em', color: 'var(--teal-deep)' }}
            >
              AI Summary
            </span>
          </div>

          <div className={`text-dark ${compact ? 'small' : ''}`} style={{ opacity: 0.9 }}>
            {expanded ? (
              <SummaryBlocks blocks={blocks} />
            ) : (
              <p className="mb-0" style={{ lineHeight: 1.6 }}>{preview}</p>
            )}
          </div>

          {isLong && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 mt-1 fw-bold text-decoration-none"
              style={{ fontSize: '0.75rem' }}
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? 'Show less' : 'Read full summary'}
            </button>
          )}
        </div>
      ) : (
        <div className={`border-top text-muted small ${compact ? 'p-2' : 'p-3'}`} style={{ fontStyle: 'italic' }}>
          Summary not available for this document.
        </div>
      )}
    </div>
  );
}

export default ReportCard;