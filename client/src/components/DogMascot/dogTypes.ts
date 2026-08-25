export type DogAction =
  | 'idle'
  | 'hover'
  | 'jump'
  | 'double-jump'
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'sleep'
  | 'wake'
  | 'love'
  | 'lick'
  | 'dance'
  | 'derp'
  | 'dizzy'
  | 'cool'
  | 'wink'
  | 'shock';

export interface DogMascotProps {
  /** Size in pixels (width and height) */
  size?: number;
  /** Whether mouse tracking and click responses are active */
  interactive?: boolean;
  /** Callback fired when an animation action is triggered */
  onInteraction?: (action: DogAction) => void;
  /** Extra CSS class name */
  className?: string;
}

export interface DogMascotHandle {
  /** Play a specific action animation manually */
  play: (action: DogAction) => void;
  /** Get the current action */
  getCurrentAction: () => DogAction;
}
