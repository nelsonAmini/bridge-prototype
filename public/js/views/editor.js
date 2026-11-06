import { api } from '../api.js';
import { icon, esc, orb, avatar, modal, popover, closePopovers, toast, sleep } from '../ui.js';
import { state } from '../app.js';

// Editor with the Writing assistant and Comments panel (Figma page 04)
let ui = { tab: 'assistant', selected: null, filter: 'open', pendingNew: null, typing: false, attachments: [] };
let lastDocId = null;

export async function render({ id }) {
  if (lastDocId !== id) { ui = { tab: 'assistant', selected: null, filter: 'open', pendingNew: null, typing: false, attachments: [] }; lastDocId = id; }
  const doc = await api.get('documents', id);
  if (!doc) return { html: '<div class="page">Document not found. <a href="#/create/my">Back</a></div>' };
  return { title: doc.title || 'Untitled', html: '<div id="ed"></div>', mount: (root) => new Editor(root.querySelector('#ed'), doc).start() };
}

class Editor {
  constructor(el, doc) { this.el = el; this.doc = doc; }

  async start() {
    const [people, comments, rules, scripts] = await Promise.all([api.list('people'), api.list('comments', { documentId: this.doc._id }), api.list('reviewRules'), api.list('scripts')]);
    this.people = people; this.comments = comments; this.rules = rules; this.script = scripts.find((s) => s._id === this.doc.script);
    this.draw();
  }

  person(idv) {
    if (idv === 'bridge') return { name: state.user.agentName, bridge: true };
    if (idv === 'u-pm') return { name: state.user.name, initials: state.user.initials, tone: 'dark' };
    return this.people.find((p) => p._id === idv) || { name: idv, initials: '?' };
  }

  async save(fields) { Object.assign(this.doc, fields); await api.update('documents', this.doc._id, fields); }

  // ---------------------------------------------------------------- drawing
  draw() {
    const canvas = this.el.querySelector('.canvas'), scroll = this.el.querySelector('.panel-scroll');
    const keep = { c: canvas?.scrollTop, p: scroll?.scrollTop };
    const d = this.doc;
    const words = (d.title + ' ' + (d.sections || []).map((s) => [s.body, s.tail, ...(s.bullets || [])].join(' ')).join(' ')).trim().split(/\s+/).filter(Boolean).length;
    this.el.innerHTML = `<div class="editor">
      <section class="doc-col">
        <div class="doc-head"><a class="icon-btn" href="#/create/my" aria-label="Back to documents">${icon('left')}</a>
          <div class="title"><b>${esc(d.title || 'Untitled document')}</b><span class="small muted">${d.template === 'Cabinet Paper' && d.status ? esc(d.status) + ' · ' : ''}Last saved ${esc(d.modified)}</span></div>
          <button class="btn tertiary sm" id="export">Export</button><button class="icon-btn" id="share" aria-label="Share">${icon('share')}</button><button class="icon-btn" aria-label="History">${icon('history')}</button><button class="icon-btn" aria-label="More">${icon('more')}</button></div>
        <div class="toolbar">${['bold', 'italic', 'underline', 'text'].map((i) => `<button class="icon-btn" data-fmt="${i}" aria-label="${i}">${icon(i)}</button>`).join('')}<span class="sep"></span><button class="icon-btn" aria-label="Align">${icon('align')}</button><button class="icon-btn" aria-label="List">${icon('list')}</button></div>
        <div class="canvas"><article class="sheet" id="sheet">${this.sheetHtml()}</article></div>
        <div class="doc-foot">Word count: ${words} words · ${(d.sources || []).length ? d.sources.length + ' sources cited' : 'Reading time: ' + Math.max(1, Math.round(words / 230)) + ' min'}</div>
      </section>
      <aside class="panel">
        <div class="tabs">${[['assistant', 'Assistant'], ['kg', 'Knowledge Graph'], ['comments', 'Comments']].map(([k, l]) => `<button class="tab ${ui.tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
        ${ui.tab === 'assistant' ? this.assistantHtml() : ui.tab === 'comments' ? this.commentsHtml() : this.kgHtml()}
      </aside></div>`;
    this.bind();
    const c2 = this.el.querySelector('.canvas'), s2 = this.el.querySelector('.panel-scroll');
    if (c2 && keep.c) c2.scrollTop = keep.c;
    if (s2) s2.scrollTop = ui.tab === 'assistant' ? s2.scrollHeight : keep.p || 0;
  }

  // Which element of the sheet a thread is anchored to
  anchorKey(t) { return t.sectionId + ':' + (t.part || (t.bullet != null ? 'bullet' : 'body')) + (t.bullet != null ? ':' + t.bullet : ''); }

  sheetHtml() {
    const d = this.doc;
    const open = this.comments.filter((c) => c.status === 'open');
    const marks = {};
    for (const t of open) marks[this.anchorKey(t)] = (marks[this.anchorKey(t)] || []).concat(t);
    const cls = (key) => { const ts = marks[key]; if (!ts) return ''; return 'hl' + (ts.some((t) => t._id === ui.selected) ? ' selected' : ''); };
    const pend = (key, text) => {
      let out = esc(text);
      for (const t of this.comments) {
        const sg = t.suggestion;
        if (sg && sg.state === 'pending' && this.anchorKey(t) === key && text.includes(sg.from)) out = esc(text).replace(esc(sg.from), `<span class="del">${esc(sg.from)}</span> <span class="ins">${esc(sg.to)}</span>`);
      }
      if (ui.pendingNew && ui.pendingNew.key === key) out = out.replace(esc(ui.pendingNew.quote), `<span class="hl sel">${esc(ui.pendingNew.quote)}</span>`);
      return out;
    };
    const ph = (s) => `<p class="placeholder" data-sec="${s.id}" data-part="body" contenteditable="true">${esc(s.placeholder || 'Start writing…')}</p>`;
    const showChip = d.status && /Bridge|Updat|Updated/.test(d.status);
    return `${showChip ? `<span class="status-chip">${esc(d.status)}</span>` : ''}
      <h1 contenteditable="true" data-field="title" ${!d.title ? 'class="placeholder"' : ''}>${esc(d.title || 'Title')}</h1>
      ${(d.sections || []).length === 0 && !d.title ? '<p class="placeholder">Start your first paragraph, or tell the assistant what you are writing and it will draft one with you.</p>' : ''}
      ${(d.sections || []).map((s) => {
        let h = s.heading ? `<h2>${esc(s.heading)}</h2>` : '';
        if (s.style === 'meta') return s.body ? `<p class="meta">${esc(s.body)}</p>` : '';
        const bodyKey = s.id + ':body';
        if (s.body) h += `<p class="${[cls(bodyKey), s.changed ? 'hl changed' : ''].join(' ')}" data-sec="${s.id}" data-part="body" data-thread="${(marks[bodyKey] || [])[0]?._id || ''}" contenteditable="true">${pend(bodyKey, s.body)}</p>`;
        else if (!s.table && !s.bullets) h += ph(s);
        if (s.bullets) h += `<ul>${s.bullets.map((b, i) => { const k = s.id + ':bullet:' + i; return `<li class="${cls(k)}" data-sec="${s.id}" data-part="bullet" data-bullet="${i}" data-thread="${(marks[k] || [])[0]?._id || ''}" contenteditable="true">${pend(k, b)}</li>`; }).join('')}</ul>`;
        if (s.tail) { const k = s.id + ':tail'; h += `<p class="${cls(k)}" data-sec="${s.id}" data-part="tail" data-thread="${(marks[k] || [])[0]?._id || ''}" contenteditable="true">${pend(k, s.tail)}</p>`; }
        if (s.table) h += `<div class="${cls(s.id + ':body')}" data-thread="${(marks[s.id + ':body'] || [])[0]?._id || ''}"><table>${s.table.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`;
        return h;
      }).join('')}`;
  }

  // ---------------------------------------------------------------- assistant
  assistantHtml() {
    const d = this.doc;
    const msgs = (d.messages || []).map((m) => m.role === 'user'
      ? `<div class="msg-user">${esc(m.text)}${m.attachments?.length ? `<div class="row wrap" style="margin-top:8px">${m.attachments.map((a) => `<span class="attach-chip" style="margin:0">${icon(a.type === 'link' ? 'web' : 'attach', 's16')}${esc(a.name)}</span>`).join('')}</div>` : ''}</div>`
      : `<div class="bridge-line">${orb('sm', state.user.agentLook)}<span>${esc(state.user.agentName)}</span><span class="time">${esc(m.time || '')}</span></div><div class="msg-bridge">${esc(m.text)}</div>
         ${m.sources ? `<div class="stack" style="--gap:6px"><span class="small muted">Sources used</span><div class="sources">${(d.sources || []).map((s, i) => `<div><span>[${i + 1}]</span>${esc(s)}</div>`).join('')}</div></div>` : ''}`).join('');
    const busy = ui.typing ? `<div class="bridge-line">${orb('sm thinking', state.user.agentLook)}<span>${d.stage === 'processing' ? 'Updating document…' : 'Thinking…'}</span></div>` : '';
    const sugg = !ui.typing && (d.suggestions || []).length ? `<div class="stack" style="--gap:8px">${d.suggestions.map((s) => `<button class="suggestion" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
    return `<div class="row"><b class="grow">Writing assistant</b><button class="btn tertiary sm" id="clear">Clear chat</button></div>
      <div class="panel-scroll">${msgs}${busy}${sugg}</div>
      <form class="chatbox" id="chat">${ui.attachments.length ? `<div class="row wrap">${ui.attachments.map((a, i) => `<span class="attach-chip">${icon(a.type === 'link' ? 'web' : 'attach', 's16')}${esc(a.name)}<button type="button" class="link" data-rm="${i}" aria-label="Remove">✕</button></span>`).join('')}</div>` : ''}
        <textarea id="msg" rows="2" placeholder="${d.flow === 'cabinet' && d.stage === 'initial' ? 'Describe the paper and add sources…' : 'Ask Bridge to draft, rewrite or cite…'}" aria-label="Message the assistant"></textarea>
        <div class="tools"><button type="button" class="switch" role="switch" aria-checked="false" aria-label="Web search"></button><span class="small">Web</span><span class="spacer"></span><button type="button" class="icon-btn" aria-label="Tools">${icon('tune', 's16')}</button><button type="button" class="icon-btn" id="attach" aria-label="Add attachments">${icon('add')}</button><button type="button" class="icon-btn outline" aria-label="Dictate">${icon('mic', 's16')}</button><button class="send" aria-label="Send">${icon('send', 's16')}</button></div></form>
      <p class="small muted" style="text-align:center">Bridge can make mistakes. Double-check facts and sources.</p>`;
  }

  kgHtml() {
    const ents = ['Ministry of Finance', 'National Digital Identity Framework', 'World Bank Development Loan P.L. 345/2023', 'Contingency Reserve', 'National ID Act Amendment Bill'];
    return `<div class="panel-scroll top"><p class="muted small">People, bodies and documents this paper refers to. Click one to see where it appears.</p>
      <div class="list">${ents.map((e) => `<div class="list-row">${icon('sparkle', 's16')}<span class="grow">${esc(e)}</span>${icon('right', 's16')}</div>`).join('')}</div></div>`;
  }

  // ---------------------------------------------------------------- comments
  commentsHtml() {
    const all = this.comments;
    const count = { open: all.filter((c) => c.status === 'open').length, you: all.filter((c) => c.mentionsMe && c.status === 'open').length, resolved: all.filter((c) => c.status === 'resolved').length, all: all.length };
    const order = (this.doc.sections || []).map((s) => s.id);
    const list = all.filter((c) => ui.filter === 'all' || (ui.filter === 'resolved' ? c.status === 'resolved' : ui.filter === 'you' ? c.mentionsMe && c.status === 'open' : c.status === 'open'))
      .sort((a, b) => order.indexOf(a.sectionId) - order.indexOf(b.sectionId) || (a.bullet ?? -1) - (b.bullet ?? -1));
    const summary = this.doc.reviewSummary && !this.doc.reviewSummary.dismissed ? `<div class="review-summary"><div class="row">${orb('sm', state.user.agentLook)}<b>${esc(state.user.agentName)} reviewed this paper</b></div><p>Checked against Cabinet paper rules. 3 comments: a missing “Source of funds” line, an unsourced claim and a missing deadline.</p><div class="row"><button class="btn primary sm" id="allSugg">Turn all into suggestions</button><button class="btn tertiary sm" id="dismiss">Dismiss</button></div></div>` : '';
    return `<div class="row"><b class="grow">Comments</b><button class="btn ghost sm" id="review">${orb('sm', state.user.agentLook)} Review with ${esc(state.user.agentName)}</button><button class="icon-btn" id="addc" aria-label="Add comment">${icon('addComment')}</button></div>
      <div class="row wrap">${[['open', 'Open', count.open], ['you', 'For you', count.you], ['resolved', 'Resolved', count.resolved], ['all', 'All', count.all]].map(([k, l, n]) => `<button class="chip ${ui.filter === k ? 'selected' : ''}" data-filter="${k}">${l} · ${n}</button>`).join('')}</div>
      <div class="panel-scroll top">${summary}${ui.pendingNew ? this.newCommentHtml() : ''}${list.map((t) => this.threadHtml(t)).join('') || '<p class="muted small">No comments here. Select text in the document to comment.</p>'}</div>`;
  }

  newCommentHtml() {
    return `<div class="thread-card selected"><div class="small muted">New comment · ${esc(state.user.name)}</div><div class="quote"><span>“${esc(ui.pendingNew.quote)}”</span></div>
      <div style="position:relative"><textarea class="textarea" id="newc" style="min-height:70px" placeholder="Comment, or @Bridge to ask for an edit"></textarea></div>
      <div class="row" style="justify-content:flex-end"><button class="btn tertiary sm" id="cancelNew">Cancel</button><button class="btn primary sm" id="postNew">Comment</button></div></div>`;
  }

  threadHtml(t) {
    const sel = ui.selected === t._id;
    const cmt = (c) => { const p = this.person(c.author); return `<div class="stack" style="--gap:6px"><div class="cmt-head">${p.bridge ? orb('sm', state.user.agentLook) : avatar(p)}<span>${esc(p.name)}</span><span class="time">${esc(c.time)}</span></div><div class="cmt-body">${esc(c.body)}</div></div>`; };
    const sg = t.suggestion;
    const sgHtml = sg ? sg.state === 'pending'
      ? `<div class="suggested-edit"><span class="small muted">Suggested edit</span><div><span class="del">${esc(sg.from)}</span> <span class="ins">${esc(sg.to)}</span></div><div class="row"><button class="btn primary sm" data-accept="${t._id}">Accept</button><button class="btn tertiary sm" data-reject="${t._id}">Reject</button></div></div>`
      : `<div class="suggested-edit"><span class="small" style="color:var(--success)">✓ Edit ${sg.state}</span><div>${esc(sg.state === 'accepted' ? sg.to : sg.from)}</div></div>` : '';
    return `<div class="thread-card ${sel ? 'selected' : ''} ${t.status === 'resolved' ? 'resolved' : ''}" data-thread-card="${t._id}">
      <div class="row" style="align-items:flex-start"><div class="quote grow"><span>${esc(t.quote)}</span></div>${t.status === 'open' ? `<button class="icon-btn outline" data-resolve="${t._id}" aria-label="Resolve" title="Resolve">${icon('check', 's16')}</button>` : '<span class="small" style="color:var(--success)">Resolved</span>'}</div>
      ${t.comments.map(cmt).join('')}${sgHtml}
      ${sel && t.status === 'open' ? `<div style="position:relative"><textarea class="textarea" data-reply="${t._id}" style="min-height:44px" placeholder="Reply or add others with @"></textarea><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn tertiary sm" data-cancel>Cancel</button><button class="btn primary sm" data-post="${t._id}">Reply</button></div></div>` : ''}</div>`;
  }

  // ---------------------------------------------------------------- events
  bind() {
    const el = this.el;
    el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { ui.tab = b.dataset.tab; this.draw(); }));
    el.querySelector('#export').onclick = () => popoverExport(el.querySelector('#export'));
    el.querySelector('#share').onclick = () => toast('Share: pick people in the Share dialog (see Directory)');
    el.querySelectorAll('[data-fmt]').forEach((b) => (b.onmousedown = (e) => { e.preventDefault(); document.execCommand(b.dataset.fmt === 'text' ? 'removeFormat' : b.dataset.fmt); }));

    // editing
    const title = el.querySelector('[data-field="title"]');
    title.onfocus = () => { if (!this.doc.title) { title.textContent = ''; title.classList.remove('placeholder'); } };
    title.onblur = async () => { const v = title.textContent.trim(); if (v === (this.doc.title || '')) { if (!v) this.draw(); return; } await this.save({ title: v, modified: 'Just now' }); this.onTitle(); };
    title.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } };
    el.querySelectorAll('#sheet [data-sec]').forEach((p) => {
      p.onfocus = () => { if (p.classList.contains('placeholder')) { p.textContent = ''; p.classList.remove('placeholder'); } };
      p.onblur = async () => {
        const s = this.doc.sections.find((x) => x.id === p.dataset.sec); if (!s) return;
        const text = p.innerText.trim(); const part = p.dataset.part;
        if (p.querySelector('.del,.ins')) return; // pending suggestion: edit via Accept/Reject
        if (part === 'bullet') s.bullets[+p.dataset.bullet] = text; else s[part] = text;
        await this.save({ sections: this.doc.sections, modified: 'Just now' });
      };
      p.addEventListener('click', () => { const tid = p.dataset.thread; if (tid && ui.selected !== tid) { ui.tab = 'comments'; ui.selected = tid; this.draw(); } });
    });
    el.querySelector('#sheet [data-thread]:not([data-sec])')?.addEventListener('click', (e) => { ui.tab = 'comments'; ui.selected = e.currentTarget.dataset.thread; this.draw(); });
    el.querySelector('#sheet').addEventListener('mouseup', () => setTimeout(() => this.onSelect(), 0));

    // assistant
    el.querySelector('#clear')?.addEventListener('click', async () => { await this.save({ messages: [], suggestions: [] }); this.draw(); });
    el.querySelector('#chat')?.addEventListener('submit', (e) => { e.preventDefault(); const t = el.querySelector('#msg').value.trim(); if (t || ui.attachments.length) this.send(t); });
    el.querySelector('#msg')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.querySelector('#chat').requestSubmit(); } });
    el.querySelectorAll('[data-suggest]').forEach((b) => (b.onclick = () => this.send(b.dataset.suggest)));
    el.querySelector('#attach')?.addEventListener('click', () => this.attachModal());
    el.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { ui.attachments.splice(+b.dataset.rm, 1); this.draw(); }));
    el.querySelectorAll('.chatbox .switch').forEach((s) => (s.onclick = () => s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true')));

    // comments
    el.querySelectorAll('[data-filter]').forEach((b) => (b.onclick = () => { ui.filter = b.dataset.filter; this.draw(); }));
    el.querySelector('#addc')?.addEventListener('click', () => toast('Select text in the document, then choose Comment'));
    el.querySelector('#review')?.addEventListener('click', () => this.bridgeReview());
    el.querySelector('#dismiss')?.addEventListener('click', async () => { await this.save({ reviewSummary: { ...this.doc.reviewSummary, dismissed: true } }); this.draw(); });
    el.querySelector('#allSugg')?.addEventListener('click', () => toast('3 suggested edits added to the document (prototype)'));
    el.querySelectorAll('[data-thread-card]').forEach((c) => c.addEventListener('click', (e) => { if (e.target.closest('button,textarea')) return; if (ui.selected !== c.dataset.threadCard) { ui.selected = c.dataset.threadCard; this.draw(); } }));
    el.querySelectorAll('[data-resolve]').forEach((b) => (b.onclick = async () => {
      const t = this.comments.find((x) => x._id === b.dataset.resolve); t.status = 'resolved'; ui.selected = null;
      await api.update('comments', t._id, { status: 'resolved' }); this.draw();
      toast('Comment resolved', 'Undo', async () => { t.status = 'open'; await api.update('comments', t._id, { status: 'open' }); this.draw(); });
    }));
    el.querySelector('[data-cancel]')?.addEventListener('click', () => { ui.selected = null; this.draw(); });
    el.querySelectorAll('[data-post]').forEach((b) => (b.onclick = () => this.reply(b.dataset.post, el.querySelector(`[data-reply="${b.dataset.post}"]`).value)));
    el.querySelectorAll('[data-reply], #newc').forEach((ta) => this.bindMentions(ta));
    el.querySelector('#cancelNew')?.addEventListener('click', () => { ui.pendingNew = null; this.draw(); });
    el.querySelector('#postNew')?.addEventListener('click', () => this.postNew(el.querySelector('#newc').value));
    el.querySelectorAll('[data-accept]').forEach((b) => (b.onclick = () => this.resolveSuggestion(b.dataset.accept, true)));
    el.querySelectorAll('[data-reject]').forEach((b) => (b.onclick = () => this.resolveSuggestion(b.dataset.reject, false)));
    if (ui.pendingNew) el.querySelector('#newc')?.focus();
    if (ui.selected) el.querySelector(`[data-reply="${ui.selected}"]`)?.focus({ preventScroll: true });
  }

  bindMentions(ta) {
    ta.addEventListener('input', () => {
      ta.parentElement.querySelector('.mention-menu')?.remove();
      const m = ta.value.match(/@([\w-]*)$/);
      if (!m) return;
      const q = m[1].toLowerCase();
      const opts = [...this.people.filter((p) => p.name.toLowerCase().startsWith(q)).slice(0, 3).map((p) => ({ name: p.name, sub: p.role, av: avatar(p) })),
        ...(state.user.agentName.toLowerCase().startsWith(q) ? [{ name: state.user.agentName, sub: 'Writing assistant', av: orb('sm', state.user.agentLook) }] : [])];
      if (!opts.length) return;
      const menu = document.createElement('div');
      menu.className = 'mention-menu';
      menu.style.top = ta.offsetHeight + 4 + 'px';
      menu.innerHTML = opts.map((o) => `<button class="menu-item" style="width:100%" data-name="${esc(o.name)}">${o.av}<span class="grow"><b>${esc(o.name)}</b><br><span class="small muted">${esc(o.sub)}</span></span></button>`).join('');
      menu.onclick = (e) => { const b = e.target.closest('[data-name]'); if (!b) return; ta.value = ta.value.replace(/@([\w-]*)$/, '@' + b.dataset.name + ' '); menu.remove(); ta.focus(); };
      ta.parentElement.appendChild(menu);
    });
  }

  onSelect() {
    const sel = window.getSelection();
    const text = sel.toString().trim();
    closePopovers();
    if (!text || text.length < 3) return;
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode).closest('[data-sec]');
    if (!node) return;
    const range = sel.getRangeAt(0).getBoundingClientRect();
    const anchor = { getBoundingClientRect: () => range };
    const pop = popover(anchor, `<button class="menu-item" data-c>${icon('comment', 's16')} Comment</button><button class="menu-item" data-a>${orb('sm', state.user.agentLook)} Ask ${esc(state.user.agentName)}</button>`, { cls: 'row-pop' });
    const target = { sectionId: node.dataset.sec, part: node.dataset.part, bullet: node.dataset.bullet != null ? +node.dataset.bullet : undefined, quote: text };
    target.key = this.anchorKey(target);
    pop.querySelector('[data-c]').onclick = () => { closePopovers(); ui.pendingNew = target; ui.tab = 'comments'; ui.selected = null; this.draw(); };
    pop.querySelector('[data-a]').onclick = () => { closePopovers(); ui.tab = 'assistant'; this.draw(); const m = this.el.querySelector('#msg'); m.value = `About “${text}”: `; m.focus(); };
  }

  async postNew(text) {
    if (!text.trim()) return;
    const p = ui.pendingNew;
    const t = await api.create('comments', { documentId: this.doc._id, sectionId: p.sectionId, part: p.part, bullet: p.bullet, quote: '“' + p.quote + '”', raw: p.quote, status: 'open', author: 'u-pm', comments: [{ author: 'u-pm', time: 'Just now', body: text }] });
    this.comments.push(t); ui.pendingNew = null; ui.selected = t._id; this.draw();
    if (/@bridge|@/i.test(text) && text.toLowerCase().includes('@' + state.user.agentName.toLowerCase())) this.bridgeSuggests(t);
  }

  async reply(id, text) {
    if (!text.trim()) return;
    const t = this.comments.find((c) => c._id === id);
    t.comments.push({ author: 'u-pm', time: 'Just now', body: text });
    await api.update('comments', id, { comments: t.comments }); this.draw();
    if (text.toLowerCase().includes('@' + state.user.agentName.toLowerCase())) this.bridgeSuggests(t);
  }

  async bridgeSuggests(t) {
    await sleep(1200);
    const s = this.doc.sections.find((x) => x.id === t.sectionId);
    const target = t.part === 'bullet' ? s.bullets[t.bullet] : t.part === 'tail' ? s.tail : s.body;
    let from, to;
    if (t.raw && target?.includes(t.raw) && t.raw.length < 120) { from = t.raw; to = from.replace(/\s*\[\d\]\.?$/, '') + ' [2]'; }
    else if (target?.includes('slowing digital identity uptake')) { from = 'slowing digital identity uptake'; to = 'slowing digital identity uptake by an estimated 18% (Digital ID uptake survey 2025 [2])'; }
    else { const w = (target || '').split(' '); from = w.slice(0, 8).join(' '); to = from + ' (see source [2])'; }
    if (target?.includes('the end of Q1')) { from = 'the end of Q1'; to = '31 March 2026, putting a US$50 million tranche at risk'; }
    t.comments.push({ author: 'bridge', time: 'Just now', body: 'Here’s the edit. It’s also marked in the document. Nothing changes until someone accepts it.' });
    t.suggestion = { part: t.part || 'body', from, to, state: 'pending' };
    await api.update('comments', t._id, { comments: t.comments, suggestion: t.suggestion });
    if (document.body.contains(this.el)) this.draw();
  }

  async resolveSuggestion(id, accept) {
    const t = this.comments.find((c) => c._id === id);
    const s = this.doc.sections.find((x) => x.id === t.sectionId);
    if (accept) {
      const rep = (str) => str.replace(t.suggestion.from, t.suggestion.to);
      if (t.part === 'bullet') s.bullets[t.bullet] = rep(s.bullets[t.bullet]); else if (t.part === 'tail') s.tail = rep(s.tail); else s.body = rep(s.body);
      await this.save({ sections: this.doc.sections, modified: 'Just now' });
    }
    t.suggestion.state = accept ? 'accepted' : 'rejected';
    await api.update('comments', id, { suggestion: t.suggestion });
    this.draw();
  }

  async bridgeReview() {
    if (this.doc.template !== 'Cabinet Paper' || !this.doc.sections.find((s) => s.id === 'fin')) return toast('Bridge reviews finished Cabinet papers. Draft one first.');
    ui.tab = 'comments'; ui.filter = 'open';
    for (const r of this.rules) {
      if (this.comments.some((c) => c.ruleId === r._id)) continue;
      const c = await api.create('comments', { documentId: this.doc._id, sectionId: r.sectionId, bullet: r.bullet, part: r.bullet != null ? 'bullet' : 'body', quote: r.quote, status: 'open', author: 'bridge', ruleId: r._id, comments: [{ author: 'bridge', time: 'Just now', body: r.body }] });
      this.comments.push(c);
    }
    await this.save({ reviewSummary: { count: 3, dismissed: false } });
    this.draw();
  }

  // ---------------------------------------------------------------- assistant flows
  async push(msg) { this.doc.messages = [...(this.doc.messages || []), msg]; await this.save({ messages: this.doc.messages }); }

  async onTitle() {
    const d = this.doc;
    if (this.script && (d.step || 0) === 0 && d.title && !(d.messages || []).length) {
      ui.typing = true; this.draw(); await sleep(900); ui.typing = false;
      const st = this.script.steps[0];
      await this.push({ role: 'bridge', time: 'now', text: st.bridge });
      await this.save({ step: 1, suggestions: st.suggestions });
    }
    this.draw();
  }

  async send(text) {
    const d = this.doc;
    if (/check against cabinet paper rules/i.test(text)) { await this.push({ role: 'user', text }); await this.save({ suggestions: [] }); return this.bridgeReview(); }
    const attachments = ui.attachments; ui.attachments = [];
    await this.push({ role: 'user', text, attachments });
    await this.save({ suggestions: [] });
    ui.typing = true; this.draw();

    if (d.flow === 'cabinet' && d.stage !== 'ready') return this.draftCabinet(attachments);

    await sleep(1100); ui.typing = false;
    if (this.script) {
      const st = this.script.steps[Math.min(d.step || 1, this.script.steps.length - 1)];
      if (st.apply === 'draft') {
        const cab = await api.get('documents', 'doc-cabinet');
        const secs = JSON.parse(JSON.stringify(cab.sections.filter((s) => s.id !== 'fin')));
        secs.find((s) => s.id === 'moc').body = ''; secs.find((s) => s.id === 'moc').placeholder = '[Bridge will write this section once you confirm the focus.]';
        await this.save({ sections: secs, template: 'Cabinet Paper', status: 'Draft by Bridge', sources: cab.sources.slice(0, 4) });
      }
      if (st.apply === 'rework') {
        const cab = await api.get('documents', 'doc-cabinet');
        const secs = JSON.parse(JSON.stringify(cab.sections));
        secs.find((s) => s.id === 'moc').changed = true;
        await this.save({ sections: secs, status: 'Updated: Matter for consideration', sources: cab.sources });
      }
      await this.push({ role: 'bridge', time: 'now', text: st.bridge });
      await this.save({ step: (d.step || 1) + 1, suggestions: st.suggestions });
    } else {
      await this.push({ role: 'bridge', time: 'now', text: 'Here’s a suggestion. I can rewrite the selected section, add citations from the Directory, or check the paper against Cabinet paper rules.' });
      await this.save({ suggestions: ['Check against Cabinet paper rules', 'Strengthen the recommendations'] });
    }
    if (document.body.contains(this.el)) this.draw();
  }

  // The "Updating document…" step: fills each section progressively, like a live typewriter
  async draftCabinet(attachments) {
    const cab = await api.get('documents', 'doc-cabinet');
    await this.save({ stage: 'processing', status: 'Updating document…' });
    this.draw();
    await sleep(800);
    this.doc.title = cab.title;
    const target = JSON.parse(JSON.stringify(cab.sections));
    this.doc.sections = target.map((s) => ({ ...s, body: s.table || s.bullets ? s.body : '', bullets: undefined, table: undefined, tail: undefined }));
    for (let i = 0; i < target.length; i++) {
      const full = target[i];
      if (full.body) for (let n = 0; n <= full.body.length; n += 6) { this.doc.sections[i].body = full.body.slice(0, n); this.redrawSheet(); await sleep(12); if (!document.body.contains(this.el)) return; }
      this.doc.sections[i] = full; this.redrawSheet(); await sleep(250);
    }
    ui.typing = false;
    await this.save({ title: cab.title, sections: target, sources: cab.sources, stage: 'ready', status: cab.status, modified: 'Just now', suggestions: cab.suggestions });
    await this.push({ role: 'bridge', time: 'now', text: `Your first draft is ready. I filled all five sections from your ${attachments.length ? attachments.length + ' attachments' : 'sources'} and the Directory, and cited each claim. Review the highlighted assumptions before sharing.`, sources: true });
    this.draw();
  }

  redrawSheet() { const s = this.el.querySelector('#sheet'); if (s) s.innerHTML = this.sheetHtml(); }

  attachModal() {
    let tab = 'upload';
    const files = [];
    const links = [];
    const m = modal({ title: 'Add attachments', iconName: 'attach', body: '<div id="att"></div>', foot: `<button class="btn tertiary" data-close>Cancel</button><button class="btn primary" id="addAtt">Add</button>` });
    const draw = () => {
      m.el.querySelector('#att').innerHTML = `<div class="tabs"><button class="tab ${tab === 'upload' ? 'active' : ''}" data-t="upload">Upload files</button><button class="tab ${tab === 'links' ? 'active' : ''}" data-t="links">Add links</button></div>
        ${tab === 'upload' ? `<p class="muted" style="margin-top:12px">Upload one or more files at once. You’ll see the status of each file as it uploads.</p>
          <button class="card pad stack" id="pick" style="align-items:center;border-style:dashed;width:100%;cursor:pointer;margin:12px 0">${icon('upload')}<b>Drop files here or click to choose</b><span class="small muted">PDF or Word, up to 150 MB</span></button>
          <div class="stack" style="--gap:8px">${files.map((f) => `<div class="card pad row">${icon('doc', 's16')}<span class="grow">${esc(f.name)}</span>${f.done ? `<span style="color:var(--success)">${icon('check', 's16')}</span>` : `<div class="progress" style="width:100px"><span style="width:${f.p}%"></span></div>`}</div>`).join('')}</div>`
        : `<p class="muted" style="margin-top:12px">Paste links to news or reports for Bridge to use as sources.</p>
          <div class="row" style="margin:12px 0"><input class="input" id="url" placeholder="https://"><button class="btn secondary" id="addUrl">Add</button></div>
          <div class="stack" style="--gap:8px">${links.map((l) => `<div class="card pad row">${icon('web', 's16')}<span class="grow">${esc(l)}</span></div>`).join('')}</div>`}`;
      m.el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
      m.el.querySelector('#pick')?.addEventListener('click', async () => {
        const names = ['MoF reporting changes 5 Feb 2026.pdf', 'Digital ID uptake survey 2025.pdf'].filter((n) => !files.some((f) => f.name === n));
        names.forEach((n) => files.push({ name: n, p: 0 }));
        draw();
        for (let p = 20; p <= 100; p += 20) { await sleep(200); files.forEach((f) => { f.p = p; f.done = p >= 100; }); if (document.body.contains(m.el)) draw(); }
      });
      m.el.querySelector('#addUrl')?.addEventListener('click', () => { const v = m.el.querySelector('#url').value.trim() || 'https://www.nationnews.com/digital-id-rollout'; links.push(v); draw(); });
    };
    draw();
    m.el.querySelector('#addAtt').onclick = () => {
      ui.attachments.push(...files.map((f) => ({ type: 'file', name: f.name })), ...links.map((l) => ({ type: 'link', name: l.replace(/^https?:\/\//, '') })));
      m.close(); this.draw();
    };
  }
}

function popoverExport(anchor) {
  const p = popover(anchor, ['Word (.docx)', 'PDF', 'Google Docs'].map((f) => `<button class="menu-item" data-f="${f}">${f}</button>`).join(''), { align: 'right' });
  p.onclick = (e) => { const f = e.target.closest('[data-f]')?.dataset.f; if (f) { closePopovers(); toast('Exported as ' + f + ' (prototype)'); } };
}
