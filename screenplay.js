/* Screenplay data, deterministic dialogue pacing and dialogue-time lookup.
   Dialogue text remains the single source of truth; scene durations end shortly
   after the last line or explicitly authored action coda. */
const line = (speaker, emotion, text, pauseAfter = 0) => ({ speaker, emotion, text, pauseAfter });
const reactionFor = {
  '🙂': '🤭', '😏': '😳', '😄': '🥹', '🤭': '😏', '😳': '😏',
  '😤': '😤', '😔': '😶', '😶': '😔', '🥲': '🥹', '🥹': '🥲',
};

const OPENING_BEAT = 1.15;
const ENDING_HOLD = 1.5;
const FINAL_END_CARD_HOLD = 4.8;
const roundTime = (value) => Math.round(value * 100) / 100;

function paceDialogue(lines, sceneId) {
  // Keep authored reaction gaps, but begin the exchange promptly after each cut.
  const editorial = {
    'weather-report': [[3,5.6],[7,9],[11,13.5],[16,18],[21,23.8]],
    'weather-turns': [[3,6],[8,10],[13,16]],
    storm: [[2,3.6],[3.9,5.5],[7,8.8],[10,12.2],[15,17]],
    'morning-after': [[3,5],[7,9],[12,14],[18,20],[23,25],[28,30.5]],
    'seven-am': [[2,4],[5,7],[11,13],[15,17],[21,23],[25,27]],
    measure: [[2,4],[5,7],[8,10],[11,13],[16,18],[19,21],[24,26],[27,29]],
    summer: [[2,3.8],[4,5.8],[7,9],[10,12],[14,16],[17,19],[20,22],[23,25],[27,29.2]],
  }[sceneId];
  const opening = OPENING_BEAT;
  const gap = sceneId === 'summer' ? 0.22 : 0.78;
  const editorialShift = editorial ? opening - editorial[0][0] : 0;
  const weight = (entry) => Math.max(1.65, entry.text.trim().split(/\s+/).length / 3.4 + 0.3);
  let at = opening;
  const dialogue = lines.map((entry, index) => {
    const next = lines[index + 1];
    const listener = entry.speaker === 'Paresh' ? 'Anshita' : 'Paresh';
    const listenerEmotion = next && next.speaker === listener ? next.emotion : reactionFor[entry.emotion];
    const span = weight(entry);
    const scheduled = { ...entry,
      start: editorial ? editorial[index][0] + editorialShift : at,
      end: editorial ? editorial[index][1] + editorialShift : at + span,
      listener,
      reaction: listenerEmotion || '🙂' };
    at += span + gap + entry.pauseAfter;
    return scheduled;
  });
  return dialogue;
}

function closingBeatEnd(scene, dialogue) {
  const actionEnd = scene.endBeat?.at ?? (scene.endBeat
    ? dialogue[scene.endBeat.after].end + scene.endBeat.offset
    : 0);
  const cueEnds = Object.entries(scene.cues || {})
    .filter(([name]) => name.endsWith('End'))
    .map(([, seconds]) => seconds);
  return Math.max(dialogue.at(-1).end, actionEnd, ...cueEnds);
}

function sceneDuration(scene, dialogue) {
  const lastLineEnd = dialogue.at(-1).end;
  if (scene.id === 'summer') return roundTime(lastLineEnd + FINAL_END_CARD_HOLD);
  return roundTime(closingBeatEnd(scene, dialogue) + ENDING_HOLD);
}

export const SCENES = [
  { id:'dawn', title:'Scene 1 · Dawn', lines:[
    line('Paresh','🙂','Are they awake?'),
    line('Anshita','😏',"Only if we're worth opening up for."),
    line('Paresh','😄',"It's early. Give us a chance."),
    line('Anshita','🤭','Tell them yourself.',2.2),
    line('Paresh','😄','I brought an idea.'),
    line('Anshita','😏','You brought a packet.'),
    line('Paresh','🙂','Ideas come in packets now.'),
  ], sky:0x9fc7e8,sun:1.1,sunCol:0xfff2d8,rain:false,mood:'morning',tulip:'green',grow:null,seeds:false,bees:false,action:'invite',cam:[0,20,66],look:[-6,9,2] },

  { id:'sowing', title:'Scene 2 · Morning, continuous',
    endBeat:{after:7,offset:2.03}, lines:[
    line('Paresh','🙂','Two centimetres.'), line('Anshita','😏','Is that deep enough?'),
    line('Paresh','🙂','The packet says two.'), line('Anshita','😏',"The packet doesn't know us."),
    line('Paresh','🤭','A little deeper, then.',2.5),
    line('Anshita','🥲',"This corner's ours now."), line('Paresh','😏','The neighbours will contest it.'),
    line('Anshita','🙂','Let them come and water it.'),
  ], sky:0xa8d8f0,sun:1.25,sunCol:0xfff6e0,rain:false,mood:'morning',tulip:'green',grow:'sprout',seeds:true,bees:false,action:'sow',cam:[0,17,58],look:[0,7,6] },

  { id:'days', title:'Scene 3 · Days, time-lapse',
    cues:{ petuniaBloomStart:10, petuniaBloomEnd:15 }, lines:[
    line('Paresh','😄',"It's up! Anshita, it's up."), line('Anshita','🙂',"It's a green line."),
    line('Paresh','😏',"It's a very confident green line."), line('Anshita','😏','Taller than the can by Sunday?'),
    line('Paresh','🙂','Give it a week.',1.8), line('Anshita','😳','Paresh. The petunias did a thing.'),
    line('Paresh','😄','Did they ask permission?'), line('Anshita','🙂',"They didn't."),
    line('Paresh','🤭','Good. Neither did we.'),
  ], sky:0x7ec8f5,sun:1.4,sunCol:0xffffff,rain:false,mood:'noon',tulip:'green',petunia:true,grow:'small',bees:true,action:'time_lapse',cam:[8,16,62],look:[6,9,2] },

  { id:'good-things', title:'Scene 4 · Dusk',
    cues:{ tulipBloomStart:2.5, tulipBloomEnd:7, mograBloomStart:16, mograBloomEnd:21 }, lines:[
    line('Paresh','🥲','Smell that.'), line('Anshita','😶',"Don't make me say it."),
    line('Paresh','🙂',"You already did."), line('Anshita','🥹',"Fine. Best smell in the building."),
    line('Paresh','😏','Better than the coffee?'), line('Anshita','😏',"Don't push it."),
    line('Anshita','🥲',"Let's remember this."), line('Paresh','🙂','I will.'),
  ], sky:0x8fd0f6,sun:1.45,sunCol:0xffffff,rain:false,mood:'gold',tulip:'bloom',petunia:true,mogra:true,grow:'small',bees:true,action:'sit_together',cam:[-8,16,62],look:[-6,9,2] },

  { id:'weather-report', title:'Scene 5 · Morning', lines:[
    line('Anshita','😔',"You said you'd help."), line('Paresh','🙂',"I'm here."),
    line('Anshita','😶','Then look at me.'), line('Paresh','😔','Just a minute.'),
    line('Anshita','😔',"You said that before."),
  ], sky:0xa8cfeb,sun:1.2,sunCol:0xfff0d2,rain:false,mood:'afternoon',tulip:'faded',petunia:true,mogra:true,grow:'small',bees:true,action:'distance',cam:[0,19,68],look:[0,10,0] },

  { id:'weather-turns', title:'Scene 6 · Afternoon', endBeat:{at:18}, lines:[
    line('Anshita','🙂','The petunias are dancing.'),
    line('Paresh','😤',"They don't know what's coming."),
    line('Anshita','😏','Then let them dance a minute.'),
  ], sky:0x64778b,sun:0.55,sunCol:0xc4d1df,rain:false,mood:'storm',tulip:'faded',petunia:true,mogra:true,grow:'small',bees:false,action:'windup',cam:[0,20,62],look:[0,10,2] },

  { id:'storm', title:'Scene 7 · Storm', endBeat:{at:27}, lines:[
    line('Paresh','😤','Hold this!'), line('Anshita','😤',"I am!"),
    line('Paresh','😤',"It's slipping."), line('Anshita','😔',"Don't let go."),
    line('Paresh','😔','I need the tape.'),
  ], sky:0x3a4a5e,sun:0.35,sunCol:0x9fb4cc,rain:true,mood:'storm',tulip:'faded',petunia:true,mogra:true,grow:'broken',bees:false,action:'storm',cam:[0,21,60],look:[0,9,2] },

  { id:'morning-after', title:'Scene 8 · Morning after', endBeat:{at:32.5}, lines:[
    line('Anshita','😶','You left.'), line('Paresh','😔','For the tape.'),
    line('Anshita','😔','I needed you.'), line('Paresh','🥲','I know.'),
    line('Anshita','🥲','Then hold it with me.'), line('Paresh','🙂',"I'm here."),
  ], sky:0x9aaec0,sun:0.65,sunCol:0xe2e6e7,rain:false,mood:'dawn',tulip:'faded',petunia:true,mogra:true,grow:'broken',bees:false,action:'aftermath',cam:[0,18,58],look:[0,9,4] },

  { id:'seven-am', title:'Scene 9 · Seven a.m., days later', lines:[
    line('Paresh','🙂','Not too tight.'), line('Anshita','🙂',"I know. Gently."),
    line('Paresh','😔',"Still bent."), line('Anshita','🙂',"Still growing."),
    line('Paresh','🥲','Tomorrow?'), line('Anshita','🙂','Seven. Bring the tape.'),
  ], sky:0x86c2ee,sun:1.1,sunCol:0xfff4dd,rain:false,mood:'morning',tulip:null,petunia:true,mogra:true,grow:'repair',bees:false,action:'repair',cam:[0,15,52],look:[0,8,4] },

  { id:'measure', title:'Scene 10 · Morning', lines:[
    line('Paresh','😄','Back to back. Measure us.'), line('Anshita','😏',"We'll need a ladder."),
    line('Paresh','🙂',"We'll need a witness."), line('Anshita','😏',"The sun saw everything."),
    line('Paresh','🙂','Taller than the railing.'), line('Anshita','🙂','Taller than the door.',3.6),
    line('Paresh','🥹','...Taller than us.'), line('Anshita','🥹','Taller than us.'),
  ], sky:0x7ec8f5,sun:1.5,sunCol:0xffffff,rain:false,mood:'noon',tulip:null,petunia:true,mogra:true,grow:'tall',bees:true,action:'measure',cam:[0,27,86],look:[0,20,0] },

  { id:'bloom', title:'Scene 11 · Noon', lines:[
    line('Anshita','😄',"It's doing it."), line('Paresh','🥹','I know.'),
    line('Anshita','😏',"Don't cry on the sunflower."), line('Paresh','😏',"I'm not crying. It's pollen."),
    line('Anshita','🙂','Look. The bees are voting.'), line('Paresh','🙂','On what?'),
    line('Anshita','🥹',"Whether we're worth opening up for."), line('Paresh','🥹','Looks like yes.'),
  ], sky:0xf5b85e,sun:1.4,sunCol:0xffd9a0,rain:false,mood:'gold',tulip:null,petunia:true,mogra:true,grow:'bloom',bees:true,action:'joy',cam:[0,28,88],look:[0,22,0] },

  { id:'summer', title:'Scene 12 · Dusk', lines:[
    line('Paresh','😏','Zero tomatoes.'), line('Anshita','😏','Zero capsicum.'),
    line('Paresh','🤭','Next year?'), line('Anshita','🙂','Same corner. You and me.'),
    line('Paresh','🥲','One more minute?'),
    line('Anshita','🥲','One more minute.'), line('Paresh','😏','Okay. Two.'),
    line('Anshita','🥲',"I'd live this summer again."),
    line('Paresh','🥲','Especially the part with you.'),
  ], sky:0xe9a765,sun:1.2,sunCol:0xffd9a0,rain:false,mood:'gold',tulip:null,petunia:true,mogra:true,tomato:true,capsicum:true,grow:'bloom',bees:true,action:'ending',cam:[0,23,80],look:[0,13,-2] },
];

export const CHAPTERS = SCENES.map((scene) => {
  const dialogue = paceDialogue(scene.lines, scene.id);
  return { ...scene, dur: sceneDuration(scene, dialogue), visualDur: scene.visualDur ||
    ({dawn:12,sowing:14,days:12,'good-things':12,'weather-report':12,'weather-turns':14,
      storm:16,'morning-after':16,'seven-am':16,measure:14,bloom:18,summer:16}[scene.id]),
    dialogue };
});
export const STORY_DURATION = CHAPTERS.reduce((sum, chapter) => sum + chapter.dur, 0);

export function capturesFor(chapter) {
  const captures = { openingQuiet: chapter.dialogue[0].start / 2 };
  chapter.dialogue.forEach((entry, index) => {
    captures[`turn${index + 1}`] = (entry.start + entry.end) / 2;
    const next = chapter.dialogue[index + 1];
    captures[`quietAfter${index + 1}`] = next
      ? (entry.end + next.start) / 2
      : (entry.end + chapter.dur) / 2;
  });
  return captures;
}

/**
 * Resolve the line that owns `seconds`, plus the surrounding quiet beats.
 * Pure function of (chapter, time); no DOM and no accumulated state, so seeks
 * and replay sample the same spoken line.
 */
export function dialogueAt(ch, seconds, chapters = CHAPTERS) {
  const c = chapters[ch];
  const index = c.dialogue.findIndex(line => seconds >= line.start && seconds < line.end);
  const line = c.dialogue[index];
  let quietAfter = null, nextTurn = null;
  if (!line) {
    for (let i = 0; i < c.dialogue.length; i++) {
      if (c.dialogue[i].end <= seconds) quietAfter = i;
      if (nextTurn === null && c.dialogue[i].start > seconds) nextTurn = i;
    }
  }
  return { chapter: ch, index, phase: line ? 'line' : 'quiet',
    speaker: line?.speaker || null, text: line?.text || '', listener: line?.listener || null,
    reaction: line?.reaction || null, emotion: line?.emotion || null,
    start: line?.start ?? null, end: line?.end ?? null,
    quiet: !line, quietAfter, nextTurn,
    turnCount: c.dialogue.length };
}
