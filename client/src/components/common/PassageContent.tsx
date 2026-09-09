import React, { useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { dictionaryService } from '../../services/dictionary';

interface PassageContentProps {
  html: string;
  templateHtml?: string;
  className?: string;
  passageId?: string;
}

const ALLOWED_TAGS = new Set([
  'ADDRESS', 'B', 'BLOCKQUOTE', 'BR', 'CAPTION', 'CODE', 'DIV', 'EM',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I', 'LI', 'OL', 'P',
  'PRE', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TABLE',
  'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL',
]);
const ALLOWED_ATTRIBUTES = new Set([
  'align', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'class',
  'colspan', 'height', 'rowspan', 'scope', 'style', 'title', 'valign', 'width',
]);
const ALLOWED_STYLE_PROPERTIES = new Set([
  'background', 'background-color', 'border', 'border-bottom',
  'border-collapse', 'border-color', 'border-left', 'border-radius', 'border-spacing',
  'border-right', 'border-style', 'border-top', 'border-width',
  'bottom', 'box-shadow', 'box-sizing', 'clear', 'color', 'column-count',
  'column-gap', 'column-span', 'display', 'flex', 'flex-grow', 'flex-wrap',
  'float', 'font-family', 'font-size', 'font-style', 'font-variant',
  'font-weight', 'gap', 'grid-template-columns', 'height',
  'justify-content', 'align-items', 'left', 'list-style', 'list-style-type',
  'letter-spacing', 'line-height', 'margin', 'margin-bottom', 'margin-left',
  'margin-right', 'margin-top', 'max-width', 'min-width', 'padding',
  'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
  'position', 'right', 'table-layout', 'text-align', 'text-decoration',
  'text-indent', 'text-overflow', 'text-transform', 'text-underline-offset',
  'top', 'vertical-align', 'white-space', 'width', 'overflow',
]);
const DOMPURIFY_OPTIONS = {
  ALLOWED_TAGS: Array.from(ALLOWED_TAGS, tag => tag.toLowerCase()),
  ALLOWED_ATTR: Array.from(ALLOWED_ATTRIBUTES),
};
const CONTENT_UNIT_SELECTOR = [
  'address', 'blockquote', 'caption', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'li', 'p', 'pre', 'tr',
].join(',');
const FALLBACK_UNIT_SELECTOR = 'div,td,th';

const sanitizeStyle = (style: string) => style
  .split(';')
  .map(declaration => declaration.trim())
  .filter(Boolean)
  .map(declaration => {
    const separator = declaration.indexOf(':');
    if (separator < 1) return null;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!ALLOWED_STYLE_PROPERTIES.has(property)) return null;
    if (/url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:/i.test(value)) return null;
    if (property === 'position' && !/^(static|relative|absolute)$/i.test(value)) return null;
    return `${property}:${value}`;
  })
  .filter((declaration): declaration is string => Boolean(declaration))
  .join(';');

const sanitizePassageHtml = (rawHtml: string) => {
  const purifiedHtml = DOMPurify.sanitize(rawHtml, DOMPURIFY_OPTIONS);
  const document = new DOMParser().parseFromString(purifiedHtml, 'text/html');
  const elements = Array.from(document.body.querySelectorAll('*'));

  for (const element of elements) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      if (!ALLOWED_ATTRIBUTES.has(attribute.name.toLowerCase())) {
        element.removeAttribute(attribute.name);
      }
    }

    if (element.hasAttribute('style')) {
      const safeStyle = sanitizeStyle(element.getAttribute('style') || '');
      if (safeStyle) element.setAttribute('style', safeStyle);
      else element.removeAttribute('style');
    }

    if (element.hasAttribute('class')) {
      const safeClasses = (element.getAttribute('class') || '')
        .split(/\s+/)
        .filter(name => /^[a-z0-9_-]{1,40}$/i.test(name))
        .join(' ');
      if (safeClasses) element.setAttribute('class', safeClasses);
      else element.removeAttribute('class');
    }
  }

  return DOMPurify.sanitize(document.body.innerHTML, DOMPURIFY_OPTIONS);
};

const getContentUnits = (root: ParentNode) => {
  const primaryCandidates = Array.from(root.querySelectorAll(CONTENT_UNIT_SELECTOR));
  const candidates = Array.from(
    root.querySelectorAll(`${CONTENT_UNIT_SELECTOR},${FALLBACK_UNIT_SELECTOR}`),
  );
  return candidates.filter((candidate) => {
    if (candidate.tagName === 'TR') return true;
    if (candidate.closest('tr')) return false;
    if (candidate.matches(FALLBACK_UNIT_SELECTOR)) {
      return !candidate.querySelector(CONTENT_UNIT_SELECTOR)
        && Boolean(candidate.textContent?.trim());
    }
    return !primaryCandidates.some(
      (nested) => nested !== candidate
        && nested.tagName !== 'TR'
        && candidate.contains(nested),
    );
  });
};

const getTextNodes = (root: Node) => {
  const walker = root.ownerDocument?.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker?.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.data.trim()) nodes.push(node);
  }
  return nodes;
};

const extractTranslationSegments = (translation: string) => {
  const normalized = translation
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\r\n?/g, '\n')
    .trim();
  if (!normalized) return [];

  if (/<\/?[a-z][\s\S]*>/i.test(normalized)) {
    const translationDocument = new DOMParser().parseFromString(normalized, 'text/html');
    const blocks = getContentUnits(translationDocument.body);
    const blockTexts = blocks
      .flatMap((block) => {
        const clone = block.cloneNode(true) as Element;
        clone.querySelectorAll('br').forEach((breakElement) => {
          breakElement.replaceWith(translationDocument.createTextNode('\n'));
        });
        clone.querySelectorAll('td,th').forEach((cell) => {
          cell.append(translationDocument.createTextNode(' '));
        });
        return (clone.textContent || '')
          .split(/\r?\n/)
          .map((line) => line.replace(/\s+/g, ' ').trim());
      })
      .filter((segment) => Boolean(segment) && !/^[-–—_*]{3,}$/.test(segment));
    if (blockTexts.length > 0) return blockTexts;

    translationDocument.body.querySelectorAll('br').forEach((breakElement) => {
      breakElement.replaceWith(translationDocument.createTextNode('\n'));
    });
    return extractTranslationSegments(translationDocument.body.textContent || '');
  }

  const hasParagraphBreaks = /\n[ \t]*\n/.test(normalized);
  const separator = hasParagraphBreaks ? /\n[ \t]*\n+/ : /\n+/;
  return normalized
    .split(separator)
    .map((segment) => segment.replace(/[ \t\n]+/g, ' ').trim())
    .filter((segment) => Boolean(segment) && !/^[-–—_*]{3,}$/.test(segment));
};

const replaceBlockText = (block: Element, translatedParts: string[]) => {
  const textNodes = getTextNodes(block);
  const translatedText = translatedParts.join(' ').trim();

  if (textNodes.length === 0) {
    block.textContent = translatedText;
    return;
  }
  if (translatedParts.length === textNodes.length) {
    textNodes.forEach((node, index) => {
      node.data = translatedParts[index]?.trim() || '';
    });
    return;
  }
  if (textNodes.length === 1) {
    textNodes[0].data = translatedText;
    return;
  }

  const sourceLabel = textNodes[0].data.trim();
  const translatedLabelEnd = translatedText.search(/[:：]/);
  if (/[:：]$/.test(sourceLabel) && translatedLabelEnd >= 0) {
    textNodes[0].data = translatedText.slice(0, translatedLabelEnd + 1).trim();
    textNodes.slice(1).forEach((node, index) => {
      node.data = index === 0
        ? translatedText.slice(translatedLabelEnd + 1).trim()
        : '';
    });
    return;
  }

  const firstNodeIsEmphasized = Boolean(
    textNodes[0].parentElement?.closest('b,strong,em,i'),
  );
  const followingSourceText = textNodes
    .slice(1)
    .map((node) => node.data)
    .join('')
    .trimStart();
  const structuralDelimiter = followingSourceText.match(/^([—–|])/u)?.[1];
  const translatedDelimiterIndex = structuralDelimiter
    ? translatedText.indexOf(structuralDelimiter)
    : -1;
  if (firstNodeIsEmphasized && translatedDelimiterIndex > 0) {
    textNodes[0].data = translatedText.slice(0, translatedDelimiterIndex).trim();
    textNodes.slice(1).forEach((node, index) => {
      node.data = index === 0
        ? translatedText.slice(translatedDelimiterIndex).trim()
        : '';
    });
    return;
  }

  const plainTextNode = textNodes.find((node) => {
    const parent = node.parentElement;
    return !parent?.closest('b,strong,em,i');
  }) || textNodes[0];
  textNodes.forEach((node) => {
    node.data = node === plainTextNode ? translatedText : '';
  });
};

const isMetadataUnit = (unit: Element) => /^(to|from|date|subject|sent|cc|bcc)\s*:/i
  .test(unit.textContent?.replace(/\s+/g, ' ').trim() || '');

const ALIGNMENT_STOP_WORDS = new Set([
  'about', 'after', 'also', 'been', 'before', 'from', 'have', 'into',
  'more', 'that', 'their', 'there', 'these', 'they', 'this', 'with',
  'your',
]);

const getStableTokens = (text: string) => new Set(
  (text.match(/[A-Za-z0-9][A-Za-z0-9@._/-]{1,}/g) || [])
    .map((token) => token.toLowerCase())
    .filter((token) => (
      token.includes('@')
      || /\d/.test(token)
      || (token.length >= 4 && !ALIGNMENT_STOP_WORDS.has(token))
    )),
);

const getMetadataKind = (text: string) => {
  const normalized = text.toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim();
  const definitions: Array<[string, RegExp]> = [
    ['to', /^(to|gửi)\s*:/u],
    ['from', /^(from|từ)\s*:/u],
    ['date', /^(date|ngày)\s*:/u],
    ['subject', /^(subject|chủ đề)\s*:/u],
    ['contact', /^(contact|liên hệ)\s*:/u],
    ['name', /^(name|tên)\s*[:：]?/u],
    ['address', /^(address|địa chỉ)\s*[:：]?/u],
    ['email', /^(e-?mail|thư điện tử)\s*[:：]?/u],
    ['phone', /^(phone|điện thoại)\s*[:：]?/u],
  ];
  return definitions.find(([, pattern]) => pattern.test(normalized))?.[0] || '';
};

const getAlignmentScore = (
  sourceBlock: Element,
  translatedSegment: string,
  sourceIndex: number,
  segmentIndex: number,
  sourceCount: number,
  segmentCount: number,
) => {
  const sourceText = sourceBlock.textContent?.replace(/\s+/g, ' ').trim() || '';
  const sourceTokens = getStableTokens(sourceText);
  const translatedTokens = getStableTokens(translatedSegment);
  let score = 1;

  sourceTokens.forEach((token) => {
    if (!translatedTokens.has(token)) return;
    score += token.includes('@') || /\d/.test(token) ? 3 : 1.5;
  });

  const sourceMetadataKind = getMetadataKind(sourceText);
  const translatedMetadataKind = getMetadataKind(translatedSegment);
  if (sourceMetadataKind && sourceMetadataKind === translatedMetadataKind) score += 6;

  const sourcePosition = sourceCount > 1 ? sourceIndex / (sourceCount - 1) : 0;
  const segmentPosition = segmentCount > 1 ? segmentIndex / (segmentCount - 1) : 0;
  score += Math.max(0, 1 - Math.abs(sourcePosition - segmentPosition)) * 0.4;
  return score;
};

const alignFewerSegments = (
  segments: string[],
  sourceBlocks: Element[],
) => {
  const sourceCount = sourceBlocks.length;
  const segmentCount = segments.length;
  const scores = Array.from(
    { length: sourceCount + 1 },
    () => Array(segmentCount + 1).fill(Number.NEGATIVE_INFINITY),
  );
  const choices = Array.from(
    { length: sourceCount + 1 },
    () => Array<'skip' | 'match' | null>(segmentCount + 1).fill(null),
  );
  scores[0][0] = 0;

  for (let sourceIndex = 1; sourceIndex <= sourceCount; sourceIndex += 1) {
    scores[sourceIndex][0] = scores[sourceIndex - 1][0] - 0.35;
    choices[sourceIndex][0] = 'skip';

    const maxSegmentIndex = Math.min(sourceIndex, segmentCount);
    for (let segmentIndex = 1; segmentIndex <= maxSegmentIndex; segmentIndex += 1) {
      const skipScore = scores[sourceIndex - 1][segmentIndex] - 0.35;
      const matchScore = scores[sourceIndex - 1][segmentIndex - 1]
        + getAlignmentScore(
          sourceBlocks[sourceIndex - 1],
          segments[segmentIndex - 1],
          sourceIndex - 1,
          segmentIndex - 1,
          sourceCount,
          segmentCount,
        );

      if (matchScore >= skipScore) {
        scores[sourceIndex][segmentIndex] = matchScore;
        choices[sourceIndex][segmentIndex] = 'match';
      } else {
        scores[sourceIndex][segmentIndex] = skipScore;
        choices[sourceIndex][segmentIndex] = 'skip';
      }
    }
  }

  const allocations = sourceBlocks.map(() => [] as string[]);
  let sourceIndex = sourceCount;
  let segmentIndex = segmentCount;
  while (sourceIndex > 0 && segmentIndex >= 0) {
    if (choices[sourceIndex][segmentIndex] === 'match') {
      allocations[sourceIndex - 1] = [segments[segmentIndex - 1]];
      sourceIndex -= 1;
      segmentIndex -= 1;
    } else {
      sourceIndex -= 1;
    }
  }
  return allocations;
};

const allocateSegmentsToBlocks = (
  segments: string[],
  sourceBlocks: Element[],
): string[][] => {
  const allocations = sourceBlocks.map(() => [] as string[]);
  const capacities = sourceBlocks.map(
    (block) => Math.max(1, block.querySelectorAll('br').length + 1),
  );
  const totalCapacity = capacities.reduce((total, capacity) => total + capacity, 0);

  if (segments.length < sourceBlocks.length) {
    const missingUnitCount = sourceBlocks.length - segments.length;
    const canSkipMetadata = sourceBlocks
      .slice(0, missingUnitCount)
      .every(isMetadataUnit);
    const blockOffset = canSkipMetadata ? missingUnitCount : 0;
    segments.forEach((segment, index) => {
      const blockIndex = blockOffset + index;
      if (blockIndex < allocations.length) allocations[blockIndex] = [segment];
    });
    return canSkipMetadata
      ? allocations
      : alignFewerSegments(segments, sourceBlocks);
  }

  if (segments.length === sourceBlocks.length) {
    return segments.map((segment) => [segment]);
  }

  let offset = 0;
  sourceBlocks.forEach((_block, index) => {
    if (offset >= segments.length || offset >= totalCapacity) return;
    const remainingBlocks = sourceBlocks.length - index - 1;
    const availableForCurrentBlock = segments.length - offset - remainingBlocks;
    const take = Math.max(1, Math.min(capacities[index], availableForCurrentBlock));
    allocations[index] = segments.slice(offset, offset + take);
    offset += take;
  });
  return allocations;
};

const formatTranslationLikeSource = (translation: string, sourceHtml: string) => {
  if (!/<\/?[a-z][\s\S]*>/i.test(sourceHtml)) return translation;

  const rawSegments = extractTranslationSegments(translation);
  if (rawSegments.length === 0) return translation;

  const sourceDocument = new DOMParser().parseFromString(sourceHtml, 'text/html');
  const sourceBlocks = getContentUnits(sourceDocument.body);
  if (sourceBlocks.length === 0) return translation;
  const allocatedSegments = allocateSegmentsToBlocks(rawSegments, sourceBlocks);

  sourceBlocks.forEach((block, index) => {
    const translatedParts = allocatedSegments[index] || [];
    if (translatedParts.length > 0) replaceBlockText(block, translatedParts);
  });

  return sourceDocument.body.innerHTML;
};

export const PassageContent: React.FC<PassageContentProps> = ({
  html,
  templateHtml,
  className = '',
  passageId,
}) => {
  useEffect(() => {
    if (passageId) {
      void dictionaryService.prewarmPassage(passageId);
    }
  }, [passageId]);

  const formattedHtml = useMemo(
    () => templateHtml ? formatTranslationLikeSource(html, templateHtml) : html,
    [html, templateHtml],
  );
  const containsMarkup = /<\/?[a-z][\s\S]*>/i.test(formattedHtml);
  const sanitizedHtml = useMemo(
    () => containsMarkup ? sanitizePassageHtml(formattedHtml) : '',
    [containsMarkup, formattedHtml],
  );

  if (!containsMarkup) {
    const normalizedText = formattedHtml.replace(/\\r\\n|\\n|\\r/g, '\n');
    return (
      <div
        data-passage-id={passageId}
        className={`toeic-passage whitespace-pre-line ${className}`}
      >
        {normalizedText}
      </div>
    );
  }

  return (
    <div
      data-passage-id={passageId}
      className={`toeic-passage ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
