// Presentation-only DOM: speech bubble, chapter caption/transport and transcript.
// Story timing stays in screenplay.js; this module never decides what a line
// says or when it is spoken.

function byId(document, id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Presentation element missing: #${id}`);
  return element;
}

export function createSpeechBubble(document = globalThis.document) {
  const bubble = byId(document, 'speech-bubble');
  const speaker = byId(document, 'bubble-speaker');
  const text = byId(document, 'bubble-text');
  const announcement = byId(document, 'announcement');
  let previousChapter = -1, previousIndex = -2, previousText = '', previousReaction = null;

  function update(d) {
    if (d.chapter === previousChapter && d.index === previousIndex
        && d.text === previousText && d.reaction === previousReaction) return false;
    previousChapter = d.chapter;
    previousIndex = d.index;
    previousText = d.text;
    previousReaction = d.reaction;
    speaker.textContent = d.speaker || '';
    text.textContent = d.text;
    bubble.dataset.speaker = d.speaker || '';
    bubble.classList.toggle('visible', d.phase === 'line');
    announcement.textContent = d.phase === 'line' ? `${d.speaker}: ${d.text}` : '';
    return true;
  }

  function position(layout) {
    if (!layout) {
      bubble.classList.remove('visible');
      bubble.style.left = '';
      bubble.style.top = '';
      bubble.style.removeProperty('--bubble-tail-offset');
      bubble.dataset.placement = '';
      return;
    }
    bubble.style.left = `${layout.left}px`;
    bubble.style.top = `${layout.top}px`;
    bubble.style.setProperty('--bubble-tail-offset', `${layout.tailOffset}px`);
    bubble.dataset.placement = layout.placement;
    bubble.classList.add('visible');
  }

  function measure(result = {}) {
    const { width, height } = bubble.getBoundingClientRect();
    result.width = width;
    result.height = height;
    return result;
  }

  return { update, position, measure };
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
  const speechBubble = createSpeechBubble(document);
  const dots = [];
  let captionChapter = -1;
  let chromeTimer = 0;

  function revealControls(playing) {
    document.body.classList.remove('cinema');
    clearTimeout(chromeTimer);
    if (playing) chromeTimer = setTimeout(() => document.body.classList.add('cinema'), 2600);
  }

  function updateDialogue(d) {
    return speechBubble.update(d);
  }

  function positionDialogue(layout) { speechBubble.position(layout); }

  function measureDialogue(result) { return speechBubble.measure(result); }

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
  return { updateDialogue, positionDialogue, measureDialogue, updateCaption,
    setPlayLabel, revealControls, mount, dots, playBtn, dispose };
}
