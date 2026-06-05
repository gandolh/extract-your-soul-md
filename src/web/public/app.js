// Soul Questionnaire web form — vanilla JS, no build step.
// Renders fields from GET /api/questions and POSTs to /api/answers.

const els = {
  questions: document.getElementById('questions'),
  form: document.getElementById('form'),
  status: document.getElementById('status'),
  progress: document.getElementById('progress'),
  save: document.getElementById('save'),
  nextStep: document.getElementById('nextStep'),
};

let QUESTIONS = [];
let lang = 'en'; // 'en' | 'ro'

function setStatus(msg, kind) {
  els.status.textContent = msg || '';
  els.status.className = 'status' + (kind ? ' ' + kind : '');
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}

function primaryOf(q) {
  return lang === 'en' ? q.promptEn : q.promptRo;
}
function secondaryOf(q) {
  return lang === 'en' ? q.promptRo : q.promptEn;
}
function hintOf(q) {
  return lang === 'en' ? q.hintEn : q.hintRo;
}

function render() {
  els.questions.innerHTML = '';
  QUESTIONS.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'q';
    const fieldId = 'a-' + q.id;
    const hint = hintOf(q);
    card.innerHTML = `
      <div class="q-index">${escapeHtml(q.id)} · ${i + 1} of ${QUESTIONS.length}</div>
      <label class="q-prompt" for="${fieldId}">
        ${escapeHtml(primaryOf(q))}${
          q.optional ? ' <span class="q-optional">(optional)</span>' : ''
        }
      </label>
      <p class="q-secondary">${escapeHtml(secondaryOf(q))}</p>
      ${hint ? `<p class="q-hint">${escapeHtml(hint)}</p>` : ''}
      <textarea id="${fieldId}" data-qid="${escapeHtml(q.id)}"
        placeholder="Write your answer…">${escapeHtml(q.savedBody || '')}</textarea>
    `;
    els.questions.appendChild(card);
  });
  // Re-bind progress updates to the freshly-rendered textareas.
  els.questions.querySelectorAll('textarea').forEach((t) => {
    t.addEventListener('input', updateProgress);
  });
  updateProgress();
}

function collect() {
  return QUESTIONS.map((q) => {
    const ta = els.questions.querySelector(`textarea[data-qid="${q.id}"]`);
    return { id: q.id, body: ta ? ta.value : '' };
  });
}

function updateProgress() {
  const answered = collect().filter((a) => a.body.trim().length > 0).length;
  els.progress.textContent = `${answered} / ${QUESTIONS.length} answered`;
}

function setLang(next) {
  lang = next;
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
  // Preserve in-progress typing across a language switch.
  const current = new Map(collect().map((a) => [a.id, a.body]));
  QUESTIONS = QUESTIONS.map((q) => ({ ...q, savedBody: current.get(q.id) ?? q.savedBody }));
  render();
}

async function load() {
  try {
    const res = await fetch('/api/questions');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    QUESTIONS = data.questions || [];
    setLang(data.englishPrimary === false ? 'ro' : 'en');
  } catch (e) {
    els.questions.innerHTML = `<p class="loading">Could not load questions: ${escapeHtml(
      e.message,
    )}</p>`;
  }
}

els.form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  els.save.disabled = true;
  setStatus('Saving…');
  try {
    const res = await fetch('/api/answers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: collect() }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'HTTP ' + res.status);
    setStatus(`Saved ${data.answered} / ${data.total} answers to ${data.filePath}`, 'ok');
    els.nextStep.hidden = false;
  } catch (e) {
    setStatus('Save failed: ' + e.message, 'err');
  } finally {
    els.save.disabled = false;
  }
});

document.querySelectorAll('.lang-btn').forEach((b) => {
  b.addEventListener('click', () => setLang(b.dataset.lang));
});

load();
