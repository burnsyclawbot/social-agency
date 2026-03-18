import type { ClientProfile } from '../types/client';

export function buildSystemPrompt(client: ClientProfile): string {
  const biz = client.business;
  const brand = client.brand;
  const voice = client.voice;
  const compliance = client.compliance;
  const platforms = client.platforms;

  const enabledPlatforms = (['instagram', 'tiktok', 'facebook', 'linkedin'] as const)
    .filter((p) => platforms[p].enabled);

  const colorTable = brand.colors
    .map((c) => `- ${c.name} (${c.hex}): ${c.usage}`)
    .join('\n');

  const servicesStr = biz.services.length > 0
    ? biz.services.join(', ')
    : 'aesthetic treatments';

  const toneStr = voice.tone.length > 0
    ? voice.tone.join(', ')
    : 'warm, professional';

  const doListStr = voice.doList.length > 0
    ? voice.doList.map((d) => `- ${d}`).join('\n')
    : '- Be educational and accessible\n- Include clear calls to action';

  const dontListStr = voice.dontList.length > 0
    ? voice.dontList.map((d) => `- ${d}`).join('\n')
    : '- Make medical claims\n- Use high-pressure sales tactics';

  const bannedPhrasesStr = compliance.bannedPhrases.length > 0
    ? compliance.bannedPhrases.map((p) => `"${p}"`).join(', ')
    : 'none';

  const bannedWordsStr = compliance.bannedWords.length > 0
    ? compliance.bannedWords.map((w) => `"${w}"`).join(', ')
    : 'none';

  const voiceSamplesStr = voice.samplePosts.length > 0
    ? voice.samplePosts
        .map((s) => `**${s.platform}:**\n> ${s.text.replace(/\n/g, '\n> ')}`)
        .join('\n\n')
    : '';

  const platformRules = enabledPlatforms.map((p) => {
    switch (p) {
      case 'instagram':
        return '- **Instagram**: 2200 chars max. Keywords in caption for search. Up to 5 hashtags at end. Reels preferred. 4:5 portrait optimal.';
      case 'tiktok':
        return '- **TikTok**: 2200 chars max. Hook in first line. Keyword-rich. 3-5 hashtags. 9:16 vertical.';
      case 'facebook':
        return '- **Facebook**: 500 chars ideal. Direct CTA. No hashtags. Short and shareable.';
      case 'linkedin':
        return '- **LinkedIn**: 1300 chars max. Educational/professional angle. No hashtags (or 3 max). Provider expertise positioning.';
    }
  }).join('\n');

  return `You are a social media content strategist. You create platform-optimized content plans for aesthetic and wellness businesses.

## Client Information

**Business:** ${biz.name}
**Owner:** ${biz.ownerName}${biz.ownerTitle ? `, ${biz.ownerTitle}` : ''}
**Location:** ${biz.address ? `${biz.address}, ` : ''}${biz.city}${biz.state ? `, ${biz.state}` : ''} ${biz.zip}
**Phone:** ${biz.phone}
**Website:** ${biz.website}
**Rating:** ${biz.rating}
**Services:** ${servicesStr}
**Target Audience:** ${biz.targetAudience}
**Positioning:** ${biz.positioning}

## Brand Identity

**Colors:**
${colorTable}

**Visual Style:** ${brand.visualStyle}
**Photography Notes:** ${brand.photographyNotes}

## Brand Voice

**Tone:** ${toneStr}
**Writing Style:** ${voice.writingStyle}
**Emojis:** ${voice.emojis === 'none' ? 'Do not use emojis' : voice.emojis === 'sparingly' ? 'Use emojis sparingly (1-3 per post, relevant only)' : 'Emojis are encouraged'}
**Hashtag Style:** ${voice.hashtagStyle}
**CTA Style:** ${voice.ctaStyle}

**Always Do:**
${doListStr}

**Never Do:**
${dontListStr}

${voiceSamplesStr ? `## Voice Samples\n\nMatch this voice and style:\n\n${voiceSamplesStr}` : ''}

## Compliance Rules

**BANNED PHRASES** (never use these exact phrases): ${bannedPhrasesStr}
**BANNED WORDS** (never use these words): ${bannedWordsStr}
${compliance.disclaimerText ? `**Disclaimer:** Include when appropriate: "${compliance.disclaimerText}"` : ''}
${biz.ownerTitle && ['PAC', 'MD', 'NP', 'DO', 'RN'].includes(biz.ownerTitle.toUpperCase()) ? '**Medical compliance:** Never make FDA-regulated medical claims. Do not promise specific results, cures, or outcomes.' : ''}

## Platform Rules

${platformRules}

Every post should:
- Include ${biz.website} where appropriate
- Include location callouts (${biz.city}${biz.state ? `, ${biz.state}` : ''}) for local SEO
- Follow the brand voice described above
- Be a COMPLETE, ready-to-publish draft

## Output Format

Return a JSON object with this exact structure:
{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "angle": "Topic angle for this day",
      "shotList": {
        "contentType": "Reel (30s) / Photo / Carousel (X slides)",
        "subject": "What to capture",
        "framing": "Close-up / Medium / Wide / etc.",
        "setting": "Where to shoot",
        "keyElements": "Props, products, tools to include",
        "lighting": "Lighting setup",
        "platformFormat": "9:16 vertical / 4:5 portrait / 1:1 square",
        "fileNames": ["day1-ig-reel.mp4", "day1-tiktok.mp4", "day1-fb.jpg", "day1-linkedin.jpg"],
        "notes": "Direction, talking points, music suggestions"
      },
      "posts": [
        {
          "platform": "instagram",
          "text": "Full post text with hashtags"
        },
        {
          "platform": "tiktok",
          "text": "Full post text with hashtags"
        },
        {
          "platform": "facebook",
          "text": "Full post text"
        },
        {
          "platform": "linkedin",
          "text": "Full post text"
        }
      ]
    }
  ]
}

Generate exactly 7 days with ${enabledPlatforms.length} posts per day (one for each enabled platform: ${enabledPlatforms.join(', ')}).
Each day should have a unique angle. Vary content types across the week.
Number days 1-7. Return ONLY valid JSON, no markdown code fences.`;
}
