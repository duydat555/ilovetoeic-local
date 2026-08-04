export interface DiceBearStyle {
  id: string;
  name: string;
}

export const DICEBEAR_STYLES: DiceBearStyle[] = [
  { id: 'avataaars', name: 'Hoạt hình' },
  { id: 'bottts', name: 'Robot' },
  { id: 'lorelei', name: 'Nghệ thuật' },
  { id: 'personas', name: 'Chân dung' },
  { id: 'fun-emoji', name: 'Emoji' },
  { id: 'thumbs', name: 'Tối giản' },
  { id: 'identicon', name: 'Định danh' },
];

export const getDiceBearAvatar = (seed?: string, style = 'avataaars'): string => {
  const cleanSeed = encodeURIComponent((seed || 'student').trim());
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${cleanSeed}`;
};

export const getRandomSeed = (): string => {
  const words = ['toeic', 'champion', 'ace', 'star', 'master', 'pro', 'genius', 'hero', 'seeker', 'learner'];
  const num = Math.floor(Math.random() * 10000);
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}-${num}`;
};
