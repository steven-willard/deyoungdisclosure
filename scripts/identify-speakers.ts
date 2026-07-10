/**
 * Use Claude to identify ALL speaker labels in an AssemblyAI transcript.
 * Strategies: roll call, direct address, self-intro, motions, pledge lead,
 * conversational attribution, process of elimination.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AssemblyUtterance } from './assemblyai-transcribe.js';

export type SpeakerMap = Record<string, string | null>;

const MODEL = 'claude-haiku-4-5-20251001';

/**
 * Sample utterances across the full transcript.
 * Takes more points than before to maximize chances of catching
 * roll calls, name-drops, and direct address no matter where they occur.
 */
function buildSample(utterances: AssemblyUtterance[]): AssemblyUtterance[] {
  const total = utterances.length;
  if (total <= 600) return utterances;

  // Heavy opening (roll call usually early), then 4 slices through the rest
  const slices = [
    utterances.slice(0, 350),
    utterances.slice(Math.floor(total * 0.25), Math.floor(total * 0.25) + 80),
    utterances.slice(Math.floor(total * 0.45), Math.floor(total * 0.45) + 80),
    utterances.slice(Math.floor(total * 0.65), Math.floor(total * 0.65) + 80),
    utterances.slice(Math.floor(total * 0.85), Math.floor(total * 0.85) + 60),
  ];

  const seen = new Set<number>();
  const result: AssemblyUtterance[] = [];
  for (const slice of slices) {
    for (const u of slice) {
      const idx = utterances.indexOf(u);
      if (!seen.has(idx)) { seen.add(idx); result.push(u); }
    }
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

Your job: identify the full name of EVERY speaker you can confidently match — not just Dave DeYoung.

KNOWN PARTICIPANTS (try to identify all of these):
- Dave DeYoung (Trustee)
- Russ TeSlaa (Township Supervisor — typically chairs the meeting, calls it to order, runs the agenda)
- Jim DeGraaf (Township Clerk — reads names during roll call, manages minutes, administers oaths)
- Douglas Brinks (Trustee)
- Bob Dykstra (Trustee)
- Jenny Hamzik (Trustee)
- Non-board: department heads (police chief, fire chief, DPW director), township attorney, consultants, public commenters

IDENTIFICATION STRATEGIES — apply ALL of these:

1. ROLL CALL VOTES
   - Clerk reads each trustee's last name alphabetically; that trustee responds "yes"/"no"
   - Alpha order helps sequence: Brinks → DeYoung → Dykstra → Hamzik → TeSlaa
   - The person reading names is the Clerk (Jim DeGraaf)

2. DIRECT ADDRESS BEFORE RESPONSE
   - "Dave, can you explain that?" → next speaker is Dave DeYoung
   - "Trustee Dykstra, you had a comment?" → next speaker is Bob Dykstra
   - "Russ, do you want to open?" → next speaker is Russ TeSlaa

3. MEETING CHAIR ROLE
   - The person who calls the meeting to order, runs the agenda, and recognizes speakers is the Supervisor (Russ TeSlaa)
   - Phrases: "Meeting will come to order", "We'll move to the next item", "Is there a motion?"

4. CLERK ROLE
   - Reads names during roll call, records votes, announces results
   - Phrases: "DeYoung?", "All in favor?", "Motion carries", "The record will reflect"

5. PLEDGE / PRAYER LEADER
   - Chair typically asks a specific trustee: "Dave, would you lead us in the Pledge?" → next speaker is Dave
   - Or "Russ, would you open us in prayer?" → next speaker is Russ

6. FORMAL MOTIONS
   - "I move to approve..." — sometimes followed by "Motion by Trustee DeYoung" confirming who spoke
   - Or the seconder is named: "Seconded by Trustee Brinks"

7. SELF-INTRODUCTION
   - "I'm Dave DeYoung, Trustee for Holland Charter Township..."
   - Department heads often say: "I'm [Name], your Police Chief / Fire Chief / DPW Director"

8. CONVERSATIONAL ATTRIBUTION
   - "Following up on Dave's point..." → recent prior speaker on that topic = Dave
   - "As Trustee Hamzik mentioned..." → that earlier speaker = Jenny Hamzik
   - "Thanks, Bob" after someone finishes = that speaker was Bob Dykstra

9. PROCESS OF ELIMINATION
   - Once you've identified Supervisor, Clerk, and several trustees, remaining board voices are the others
   - Non-board members (staff, public) often introduce themselves or get introduced

Return ONLY valid JSON — no markdown, no extra text:
{
  "speaker_map": {
    "A": "Full Name or null",
    "B": "Full Name or null"
  },
  "dave_speaker": "letter for Dave DeYoung or null",
  "confidence": "high|medium|low",
  "notes": "one sentence on how you identified Dave specifically, or why you could not"
}

Only assign a name when you are confident. Set null if uncertain. Do not guess.

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
    const identified = Object.values(map).filter(Boolean).length;
    console.log(`    Speaker ID (${parsed.confidence}): ${identified} speakers identified, Dave = Speaker ${dave ?? '?'} — ${parsed.notes}`);

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
