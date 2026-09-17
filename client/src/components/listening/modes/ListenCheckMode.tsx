import React from 'react';
import type { ListeningSentence } from '../../../types';
import { FooterShortcuts, InputAreaCard } from './ListenCheckScreen';

export interface ListenCheckModeProps {
  sentence: ListeningSentence;
  onComplete: (score: number, hintCount: number) => void;
  isCompletedAlready?: boolean;
}

export const ListenCheckMode: React.FC<ListenCheckModeProps> = ({
  sentence,
  onComplete,
  isCompletedAlready = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Input Area Card with word placeholders, variable width, counter, transcript toggle, 10/10 badge, and Hoan thanh button */}
      <InputAreaCard
        sentenceText={sentence.text}
        onComplete={onComplete}
        isCompletedAlready={isCompletedAlready}
      />

      {/* Footer shortcut indicators: Click từng từ để hiện · Tab hiện tất cả · Ctrl + H */}
      <FooterShortcuts />
    </div>
  );
};

export default ListenCheckMode;
