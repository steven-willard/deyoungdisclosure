/**
 * Use Claude to identify speaker labels in an AssemblyAI transcript.
 * Uses multiple strategies beyond roll call: direct address, self-intro,
 * motions, pledge lead, process of elimination, etc.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AssemblyUtterance } from './assemblyai-transcribe.js';

export type SpeakerMap = Record<string, string | null>;

const MODEL = 'claude-haiku-4-5-20251001';

/**
 * Build a representative sample across the whole transcript, not just the opening.
 * Roll calls are usually early, but name-drops, motions, and direct address
 * happen throughout. Sample opening heavily + mid + late slices.
 */
function buildSample(utterances: AssemblyUtterance[]): AssemblyUtterance[] {
  const total = utterances.length;
  if (total <= 500) return utterances;

  const opening = utterances.slice(0, 300);
  const midStart = Math.floor(total * 0.4);
  const mid = utterances.slice(midStart, midStart + 100);
  const lateStart = Math.floor(total * 0.75);
  const late = utterances.slice(lateStart, lateStart + 100);

  // Deduplicate (opening might overlap with mid/late on short meetings)
  const seen = new Set<number>();
  const result: AssemblyUtterance[] = [];
  for (const u of [...opening, ...mid, ...late]) {
    const idx = utterances.indexOf(u);
    if (!seen.has(idx)) { seen.add(idx); result.push(u); }
  }
  return result;
}

export async function identifySpeakers(
  utterances: AssemblyUtterance[],
  meetingDate: string | null,
  apiKey: string
): Promise<SpeakerMap> {
  const client = new Anthropic({ apiKey });

  const sample = buildSample(utterances);
  const formatted = sample.map(u => `Speaker ${u.speaker}: ${u.text}`).join('\n');

  const prompt = `This is a Holland Charter Township Board of Trustees meeting transcript (date: ${meetingDate ?? 'unknown'}). Speakers are labeled A, B, C, etc. by an AI transcription service.

Your job: identify the full name of each speaker you can confidently match.

KNOWN PARTICIPANTS:
- Dave DeYoung (Trustee — most important to identify)
- Russ TeSlaa (Township Supervisor — typically chairs the meeting, calls it to order)
- Jim DeGraaf (Township Clerk — reads roll call names, takes minutes)
- Other trustees: Douglas Brinks, Bob Dykstra, Jenny Hamzik
- Non-board speakers: department heads, attorneys, public commenters, consultants

IDENTIFICATION STRATEGIES — use ALL of these, not just roll call:

1. ROLL CALL VOTES
   - The Clerk reads each trustee's last name alphabetically; that trustee responds "yes"/"no"
   - Example: Clerk says "DeYoung?" → next speaker says "Yes" → that speaker is Dave DeYoung
   - Names read in alpha order helps confirm: Brinks → DeYoung → Dykstra → etc.

2. DIRECT ADDRESS BEFORE RESPONSE
   - "Dave, can you clarify that?" → the very next speaker is Dave DeYoung
   - "Trustee DeYoung, you had a comment?" → next speaker is Dave
   - "Russ, do you want to open that up?" → next speaker is Russ TeSlaa

3. PLEDGE OF ALLEGIANCE
   - The chair often asks a specific trustee to lead the Pledge
   - "Dave, would you lead us in the Pledge?" → next speaker is Dave

4. FORMAL MOTIONS
   - "I move to approve..." followed by the chair attributing it: "Motion by Trustee DeYoung"
   - Or the mover self-identifies: "I'll make a motion — Dave DeYoung, Trustee"

5. SELF-INTRODUCTION
   - "I'm Dave DeYoung, I'm a trustee..." or "This is Dave DeYoung..."

6. ROLE-BASED PATTERNS
   - The person who calls the meeting to order is almost always Supervisor Russ TeSlaa
   - The person who reads agenda items and names during roll call is the Clerk (Jim DeGraaf)
   - Department heads (police chief, fire chief, DPW director) introduce themselves by name/title

7. CONVERSATIONAL ATTRIBUTION
   - "Following up on Dave's point..." → the previous speaker who made that point is Dave
   - "As Trustee DeYoung mentioned..." → the earlier speaker on that topic is Dave
   - "Thanks, Dave" after someone finishes speaking → that speaker was Dave

8. PROCESS OF ELIMINATION
   - Once you identify the Supervisor, Clerk, and 2-3 trustees, the remaining board voices narrow down
   - Non-board speakers (public, staff, consultants) often identify themselves explicitly

Return ONLY valid JSON:
{
  "speaker_map": {
    "A": "Full Name or null",
    "B": "Full Name or null"
  },
  "dave_speaker": "the single letter for Dave DeYoung, or null if not found",
  "confidence": "high|medium|low",
  "notes": "one sentence on how you identified Dave specifically, or why you could not"
}

Only set a name when you are confident — use null if uncertain. Do not guess.

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
