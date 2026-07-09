/**
 * Use Claude to identify speaker labels in an AssemblyAI transcript.
 * Key signal: roll call votes, where the clerk announces each trustee's last name
 * and they respond yes/no — creates a reliable name→speaker mapping.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AssemblyUtterance } from './assemblyai-transcribe.js';

export type SpeakerMap = Record<string, string | null>;

const MODEL = 'claude-haiku-4-5-20251001';

export async function identifySpeakers(
  utterances: AssemblyUtterance[],
  meetingDate: string | null,
  apiKey: string
): Promise<SpeakerMap> {
  const client = new Anthropic({ apiKey });

  // Roll calls happen early — first 300 utterances covers ~30-45 min
  const sample = utterances.slice(0, 300);
  const formatted = sample.map(u => `Speaker ${u.speaker}: ${u.text}`).join('\n');

  const prompt = `This is the opening portion of a Holland Charter Township Board of Trustees meeting transcript (date: ${meetingDate ?? 'unknown'}). Speakers are labeled A, B, C, etc. by an AI transcription service.

Your job: identify the full name of each speaker using roll call votes.

HOW ROLL CALLS WORK in these meetings:
- The Township Clerk reads each trustee's last name alphabetically
- That trustee responds "yes", "aye", "no", or "nay"
- Example pattern: Clerk says "Brinks" → a different speaker says "Yes" → Clerk says "DeYoung" → Dave DeYoung says "Yes"
- This lets you match each speaker label to a real name

Known participants in Holland Charter Township Board meetings:
- Dave DeYoung (Trustee — this is the most important one to identify)
- Russ TeSlaa (Township Supervisor, often chairs the meeting)
- Township Clerk (reads names during roll call and takes minutes)
- Other trustees: Douglas Brinks, Bob Dykstra, and others

Return ONLY valid JSON:
{
  "speaker_map": {
    "A": "Full Name or null",
    "B": "Full Name or null"
  },
  "dave_speaker": "the single letter for Dave DeYoung, or null if not found",
  "confidence": "high|medium|low",
  "notes": "one sentence on how you identified Dave specifically"
}

If you cannot confidently identify someone, use null — do not guess.

TRANSCRIPT:
${formatted}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const text = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    const parsed = JSON.parse(text);

    const dave = parsed.dave_speaker;
    const map: SpeakerMap = parsed.speaker_map ?? {};
    console.log(`    Speaker ID (${parsed.confidence}): Dave = Speaker ${dave ?? '?'} — ${parsed.notes}`);

    return map;
  } catch (e: any) {
    console.warn(`    Speaker identification failed: ${e.message}`);
    return {};
  }
}

/** Return Dave DeYoung's speaker label from a map, or null. */
export function getDaveSpeaker(speakerMap: SpeakerMap): string | null {
  for (const [label, name] of Object.entries(speakerMap)) {
    if (name?.toLowerCase().includes('deyoung') || name?.toLowerCase().includes('de young')) {
      return label;
    }
  }
  return null;
}
