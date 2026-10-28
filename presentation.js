// Presentation-only DOM: subtitles, chapter caption/transport and the story
// transcript. Story timing stays in screenplay.js; this module never decides
// what a line says or when it is spoken.

function byId(document, id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Presentation element missing: #${id}`);
  return element;
}

export function createSubtitles(document = globalThis.document) {
  const subtitles = byId(document, 'subtitles');
  const speaker = byId(document, 'subtitle-speaker');
  const text = byId(document, 'subtitle-text');
  const announcement = byId(document, 'announcement');
  let dialogueKey = '';

  function update(d) {
    const key = `${d.chapter}:${d.index}:${d.text}:${d.reaction}`;
    if (key === dialogueKey) return false; // No live-region writes on quiet frames.
    dialogueKey = key;
    speaker.textContent = d.speaker || '';
    text.textContent = d.text;
    subtitles.classList.toggle('visible', d.phase === 'line');
    // Announce spoken text once; the decorative listener reaction is aria-hidden.
    announcement.textContent = d.phase === 'line' ? `${d.speaker}: ${d.text}` : '';
    return true;
  }

  return { update };
}

export function createPresentation({
  document = globalThis.document,
  chapters,
  handlers = {},
} = {}) {
  if (!chapters?.length) throw new Error('Presentation needs chapters');
  const h1 = document.querySelector('#caption h1');
  const counterEl = byId(document, 'counter');
  const dotsWrap = byId(document, 'dots');
  const playBtn = byId(document, 'play');
  const subtitles = createSubtitles(document);
  const dots = [];
  let captionChapter = -1;
  let chromeTimer = 0;

  function revealControls(playing) {
    document.body.classList.remove('cinema');
    clearTimeout(chromeTimer);
    if (playing) chromeTimer = setTimeout(() => document.body.classList.add('cinema'), 2600);
  }

  function updateDialogue(d) {
    return subtitles.update(d);
  }

  function updateCaption(index) {
    const chapter = chapters[index];
    if (!chapter) return;
    if (captionChapter !== index) {
      captionChapter = index;
      if (h1) h1.textContent = chapter.title;
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
        dot.setAttribute('aria-selected', String(i === index));
      });
      counterEl.textContent = (index + 1) + ' / ' + chapters.length;
    }
  }

  function setPlayLabel(playing) {
    playBtn.textContent = playing ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-label', playing ? 'Pause story' : 'Play story');
  }

  function buildTranscript() {
    const transcriptLines = byId(document, 'transcript-lines');
    if (transcriptLines.childElementCount) return;
    chapters.forEach((chapter) => {
      const li = document.createElement('li');
      const heading = document.createElement('h3');
      heading.textContent = chapter.title;
      li.appendChild(heading);
      for (const line of chapter.dialogue) {
        const p = document.createElement('p');
        const speaker = document.createElement('strong');
        speaker.textContent = line.speaker + ': ';
        p.append(speaker, document.createTextNode(line.text));
        li.appendChild(p);
      }
      transcriptLines.appendChild(li);
    });
  }

  function mount() {
    buildTranscript();
    chapters.forEach((chapter, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.title = chapter.title;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', chapter.title);
      dot.onclick = () => handlers.enterChapter?.(i);
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    const on = (id, listener) => { byId(document, id).onclick = listener; };
    on('prev', () => handlers.enterChapter?.(-1, 'relative'));
    on('next', () => handlers.enterChapter?.(1, 'relative'));
    on('replay', () => handlers.replay?.());
    on('continue', () => handlers.continue?.());
    on('play', () => handlers.togglePlay?.());
    const transcript = byId(document, 'transcript');
    byId(document, 'story-notes').onclick = () => {
      handlers.openNotes?.();
      transcript.showModal();
    };
    byId(document, 'transcript-close').onclick = () => transcript.close();

    document.addEventListener('keydown', (event) => {
      if (transcript.open || event.target.closest?.('button, a, input, select, textarea')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); handlers.enterChapter?.(1, 'relative'); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); handlers.enterChapter?.(-1, 'relative'); }
      else if (event.key === 'Enter') { event.preventDefault(); handlers.continue?.(); }
      else if (event.key === ' ') { event.preventDefault(); handlers.togglePlay?.(); }
    });
    document.addEventListener('pointermove', () => revealControls(handlers.isPlaying?.()));
    document.addEventListener('pointerdown', () => revealControls(handlers.isPlaying?.()));
    document.addEventListener('keydown', () => revealControls(handlers.isPlaying?.()));
    document.addEventListener('focusin', () => revealControls(handlers.isPlaying?.()));
    return { transcript };
  }

  const dispose = () => clearTimeout(chromeTimer);
  return { updateDialogue, updateCaption, setPlayLabel, revealControls, mount, dots, playBtn, dispose };
}
