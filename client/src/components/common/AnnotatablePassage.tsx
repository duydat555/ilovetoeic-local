import React, { useMemo, useRef, useState } from 'react';
import { Highlighter, Underline } from 'lucide-react';
import { createClientId } from '../../utils/id';
import { PassageContent } from './PassageContent';

export type PracticeAnnotationType = 'highlight' | 'underline';

export interface PracticeAnnotation {
  id: string;
  start: number;
  end: number;
  text: string;
  type: PracticeAnnotationType;
  createdAt: string;
}

interface PendingSelection {
  start: number;
  end: number;
  text: string;
  left: number;
  top: number;
}

interface AnnotatablePassageProps {
  html: string;
  annotations: PracticeAnnotation[];
  enabled: boolean;
  onAdd: (annotation: PracticeAnnotation) => void;
  passageId?: string;
}

const getTextNodes = (root: Node) => {
  const walker = root.ownerDocument?.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker?.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
};

const annotateHtml = (rawHtml: string, annotations: PracticeAnnotation[]) => {
  if (annotations.length === 0) return rawHtml;

  const containsMarkup = /<\/?[a-z][\s\S]*>/i.test(rawHtml);
  const document = new DOMParser().parseFromString(
    containsMarkup ? rawHtml : `<div style="white-space:pre-line"></div>`,
    'text/html',
  );
  if (!containsMarkup && document.body.firstElementChild) {
    document.body.firstElementChild.textContent = rawHtml.replace(/\\r\\n|\\n|\\r/g, '\n');
  }

  [...annotations]
    .sort((a, b) => b.start - a.start)
    .forEach((annotation) => {
      const nodes = getTextNodes(document.body);
      let offset = 0;

      nodes.forEach((node) => {
        const nodeStart = offset;
        const nodeEnd = nodeStart + node.data.length;
        offset = nodeEnd;
        const overlapStart = Math.max(annotation.start, nodeStart);
        const overlapEnd = Math.min(annotation.end, nodeEnd);
        if (overlapStart >= overlapEnd || !node.parentNode) return;

        const localStart = overlapStart - nodeStart;
        const localEnd = overlapEnd - nodeStart;
        const fragment = document.createDocumentFragment();
        if (localStart > 0) fragment.appendChild(document.createTextNode(node.data.slice(0, localStart)));
        const marker = document.createElement('span');
        marker.className = annotation.type === 'highlight'
          ? 'practice-annotation-highlight'
          : 'practice-annotation-underline';
        marker.textContent = node.data.slice(localStart, localEnd);
        fragment.appendChild(marker);
        if (localEnd < node.data.length) fragment.appendChild(document.createTextNode(node.data.slice(localEnd)));
        node.parentNode.replaceChild(fragment, node);
      });
    });

  return document.body.innerHTML;
};

export const AnnotatablePassage: React.FC<AnnotatablePassageProps> = ({
  html,
  annotations,
  enabled,
  onAdd,
  passageId,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const annotatedHtml = useMemo(() => annotateHtml(html, annotations), [annotations, html]);

  const captureSelection = () => {
    if (!enabled || !rootRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setPending(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!rootRef.current.contains(range.commonAncestorContainer)) return;

    const rawText = selection.toString();
    const text = rawText.trim();
    if (!text || text.length > 600) return;
    const leadingWhitespace = rawText.length - rawText.trimStart().length;
    const before = range.cloneRange();
    before.selectNodeContents(rootRef.current);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length + leadingWhitespace;
    const selectionRect = range.getBoundingClientRect();
    const rootRect = rootRef.current.getBoundingClientRect();

    setPending({
      start,
      end: start + text.length,
      text,
      left: Math.min(
        Math.max(8, selectionRect.left - rootRect.left + selectionRect.width / 2 - 78),
        Math.max(8, rootRect.width - 164),
      ),
      top: selectionRect.bottom - rootRect.top + 8,
    });
  };

  const addAnnotation = (type: PracticeAnnotationType) => {
    if (!pending) return;
    onAdd({
      id: createClientId(),
      start: pending.start,
      end: pending.end,
      text: pending.text,
      type,
      createdAt: new Date().toISOString(),
    });
    window.getSelection()?.removeAllRanges();
    setPending(null);
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${enabled ? 'cursor-text select-text rounded-lg ring-2 ring-brand-500/20' : ''}`}
      data-passage-id={passageId}
      data-no-translate={enabled ? true : undefined}
      onMouseUp={captureSelection}
      onTouchEnd={() => window.setTimeout(captureSelection, 80)}
    >
      <PassageContent html={annotatedHtml} passageId={passageId} />
      {enabled && annotations.length === 0 && !pending && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg bg-brand px-2 py-1 text-[10px] font-bold text-brand-ink shadow-sm">
          Bôi đen để đánh dấu
        </div>
      )}
      {pending && (
        <div
          className="absolute z-20 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-line dark:bg-surface"
          style={{ left: pending.left, top: pending.top }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <button
            type="button"
            onClick={() => addAnnotation('highlight')}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 dark:text-content-muted dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            <Highlighter className="size-3.5" /> Highlight
          </button>
          <button
            type="button"
            onClick={() => addAnnotation('underline')}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 dark:text-content-muted dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            <Underline className="size-3.5" /> Gạch chân
          </button>
        </div>
      )}
    </div>
  );
};
