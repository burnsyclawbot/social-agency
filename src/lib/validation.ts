import { BANNED_PHRASES, BANNED_WORDS } from '../constants/banned-words';
import { PLATFORMS } from '../constants/platforms';
import type { Platform, ValidationResult } from '../types';

export function validatePost(text: string, platform: Platform, mediaUrls: string[] = []): ValidationResult {
  const errors: string[] = [];

  // Character limit
  const charLimit = PLATFORMS[platform].charLimit;
  if (text.length > charLimit) {
    const over = text.length - charLimit;
    errors.push(
      `OVER CHARACTER LIMIT: ${PLATFORMS[platform].label} max is ${charLimit}. Current: ${text.length} (over by ${over}). Shorten the post.`
    );
  }

  // Media requirement (Instagram)
  if (platform === 'instagram' && mediaUrls.length === 0) {
    errors.push('MISSING MEDIA: Instagram requires at least one image or video URL.');
  }

  // Banned phrases (substring match)
  const textLower = text.toLowerCase();
  const foundBanned: string[] = [];

  for (const phrase of BANNED_PHRASES) {
    if (textLower.includes(phrase.toLowerCase())) {
      foundBanned.push(phrase);
    }
  }

  // Banned words (word boundary match)
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word.replace('-', '\\-')}\\b`, 'i');
    if (regex.test(text)) {
      foundBanned.push(word);
    }
  }

  if (foundBanned.length > 0) {
    errors.push(
      `BANNED WORDS FOUND: ${foundBanned.join(', ')}. Remove or replace these terms. Use 'age-defying' instead of 'anti-aging'. Avoid FDA-regulated medical claims.`
    );
  }

  // Hashtag limits
  const hashtags = text.match(/#\w+/g) || [];
  const hashtagLimit = PLATFORMS[platform].hashtagLimit;

  if (hashtagLimit === 0 && hashtags.length > 0) {
    errors.push(
      `HASHTAGS NOT ALLOWED: ${PLATFORMS[platform].label} posts should not include hashtags. Remove: ${hashtags.join(', ')}`
    );
  } else if (hashtags.length > hashtagLimit) {
    errors.push(
      `TOO MANY HASHTAGS: ${PLATFORMS[platform].label} allows max ${hashtagLimit}. Found ${hashtags.length}: ${hashtags.join(', ')}. Remove ${hashtags.length - hashtagLimit}.`
    );
  }

  return { valid: errors.length === 0, errors };
}

// Find banned words/phrases in text and return their positions for highlighting
export function findBannedWordPositions(text: string): Array<{ start: number; end: number; word: string }> {
  const positions: Array<{ start: number; end: number; word: string }> = [];
  const textLower = text.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    let idx = 0;
    while ((idx = textLower.indexOf(phrase.toLowerCase(), idx)) !== -1) {
      positions.push({ start: idx, end: idx + phrase.length, word: phrase });
      idx += phrase.length;
    }
  }

  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word.replace('-', '\\-')}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      positions.push({ start: match.index, end: match.index + match[0].length, word });
    }
  }

  return positions.sort((a, b) => a.start - b.start);
}
