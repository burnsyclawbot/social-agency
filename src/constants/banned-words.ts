// FDA-regulated medical claims — phrases checked via substring match
export const BANNED_PHRASES = [
  'guaranteed results',
  'permanent results',
  'risk free',
  'risk-free',
  'no side effects',
  '100% safe',
  'miracle cure',
  'instant results',
  'pain free guaranteed',
  'no downtime guaranteed',
] as const;

// Single words checked with word boundaries
export const BANNED_WORDS = [
  'cure',
  'cures',
  'permanent',
  'miracle',
  'anti-aging',
  'antiaging',
] as const;
