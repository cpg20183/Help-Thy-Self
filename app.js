/* Help Thy Self - local-first app */
(() => {
  'use strict';

  const APP_VERSION = '1.0.0';
  const STORAGE_KEY = 'hts_dashboard_v1';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const todayISO = () => new Date().toISOString().slice(0,10);
  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  };

  const defaultState = () => ({
    version: APP_VERSION,
    createdAt: new Date().toISOString(),
    quotes: {
      favorites: []
    },
    affirmations: {
      pool: [
        "I can take the next right step, even if I cannot see the whole path.",
        "My discipline is a form of self-respect.",
        "Progress counts, especially when it is small and consistent.",
        "I choose actions today that future-me will thank me for.",
        "I am capable of learning what I need to learn.",
        "I do not need perfect conditions to begin.",
        "I can do hard things, one focused block at a time."
      ],
      favorites: []
    },
    goals: [
      { id: cryptoId(), title: "Define 3 priorities for this week", notes: "", done: false, createdAt: new Date().toISOString() }
    ],
    habits: [
      { id: cryptoId(), title: "Move for 10 minutes", notes: "", checkedOn: {} },
      { id: cryptoId(), title: "Write 3 sentences in journal", notes: "", checkedOn: {} }
    ],
    journal: {
      draft: { title: "", body: "" },
      entries: []
    },
    focus: {
      presetMinutes: 25,
      notificationsEnabled: false,
      offlineEnabled: true
    }
  });

  function cryptoId(){
    // reasonably unique for local use
    return (crypto?.randomUUID?.() ?? ('id-' + Math.random().toString(16).slice(2) + '-' + Date.now().toString(16)));
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    }catch(e){
      console.warn('Failed to load state:', e);
      return defaultState();
    }
  }

  function migrate(s){
    // Basic forward-compatible merges
    const d = defaultState();
    const merged = {
      ...d,
      ...s,
      quotes: { ...d.quotes, ...(s.quotes||{}) },
      affirmations: { ...d.affirmations, ...(s.affirmations||{}) },
      journal: { ...d.journal, ...(s.journal||{}) },
      focus: { ...d.focus, ...(s.focus||{}) },
    };
    merged.version = APP_VERSION;
    return merged;
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function safeText(s){
    return (s ?? '').toString().trim();
  }

  function toast(msg){
    // lightweight, non-intrusive
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    Object.assign(el.style, {
      position:'fixed', left:'50%', bottom:'18px', transform:'translateX(-50%)',
      background:'rgba(0,0,0,.75)', color:'#fff', padding:'10px 12px',
      borderRadius:'12px', border:'1px solid rgba(255,255,255,.12)',
      zIndex:9999, maxWidth:'calc(100% - 24px)', textAlign:'center',
      boxShadow:'0 10px 30px rgba(0,0,0,.35)'
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  // Quotes (offline pool)
  const QUOTES = [
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Often attributed to Aristotle" },
    { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
    { text: "It always seems impossible until it is done.", author: "Nelson Mandela" },
    { text: "If you can’t yet do great things, do small things in a great way.", author: "Napoleon Hill" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Often attributed to Abraham Lincoln" },
    { text: "Slow is smooth. Smooth is fast.", author: "Proverb" }
  ];

  function pickRandom(arr){
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function setQuote(q){
    $('#quoteText').textContent = q.text;
    $('#quoteAuthor').textContent = q.author ? `— ${q.author}` : '';
    currentQuote = q;
  }

  function newQuote(){
    setQuote(pickRandom(QUOTES));
  }

  function renderQuoteFavs(){
    const ul = $('#quoteFavs');
    ul.innerHTML = '';
    const favs = state.quotes.favorites || [];
    if(favs.length === 0){
      ul.innerHTML = '<li class="muted small">No favorites yet.</li>';
      return;
    }
    favs.slice().reverse().forEach((q, idx) => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <div class="main">
          <div class="title">${escapeHtml(q.text)}</div>
          <div class="meta">${escapeHtml(q.author || '')}</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="remove" data-idx="${idx}">Remove</button>
        </div>
      `;
      ul.appendChild(li);
    });

    $$('button[data-action="remove"]', ul).forEach(btn => {
      btn.addEventListener('click', () => {
        const idxFromEnd = parseInt(btn.getAttribute('data-idx'), 10);
        const realIdx = (state.quotes.favorites.length - 1) - idxFromEnd;
        state.quotes.favorites.splice(realIdx, 1);
        saveState();
        renderQuoteFavs();
      });
    });
  }

  // Affirmations
  let affirmationIdx = 0;
  function showAffirmation(){
    const pool = state.affirmations.pool || [];
    if(pool.length === 0){
      $('#affirmationText').textContent = "Add an affirmation to get started.";
      return;
    }
    affirmationIdx = (affirmationIdx + 1) % pool.length;
    $('#affirmationText').textContent = pool[affirmationIdx];
  }

  function renderAffirmationFavs(){
    const ul = $('#affirmationFavs');
    ul.innerHTML = '';
    const favs = state.affirmations.favorites || [];
    if(favs.length === 0){
      ul.innerHTML = '<li class="muted small">No favorites yet.</li>';
      return;
    }
    favs.slice().reverse().forEach((t, idx) => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <div class="main">
          <div class="title">${escapeHtml(t)}</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="removeAff" data-idx="${idx}">Remove</button>
        </div>
      `;
      ul.appendChild(li);
    });
    $$('button[data-action="removeAff"]', ul).forEach(btn => {
      btn.addEventListener('click', () => {
        const idxFromEnd = parseInt(btn.getAttribute('data-idx'), 10);
        const realIdx = (state.affirmations.favorites.length - 1) - idxFromEnd;
        state.affirmations.favorites.splice(realIdx, 1);
        saveState();
        renderAffirmationFavs();
      });
    });
  }

  // Goals
  function renderGoals(){
    const ul = $('#goalsList');
    ul.innerHTML = '';
    if(state.goals.length === 0){
      ul.innerHTML = '<li class="muted small">No goals yet.</li>';
      return;
    }
    state.goals.forEach(g => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <input class="chk" type="checkbox" ${g.done ? 'checked' : ''} aria-label="Mark goal complete" />
        <div class="main">
          <div class="title">${escapeHtml(g.title)}</div>
          <div class="meta">${g.notes ? escapeHtml(g.notes) : '—'} • Created ${escapeHtml(formatDateTime(g.createdAt))}</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="edit">Edit</button>
          <button class="btn btn-danger" data-action="del">Delete</button>
        </div>
      `;
      li.querySelector('.chk').addEventListener('change', (e) => {
        g.done = e.target.checked;
        saveState();
      });
      li.querySelector('[data-action="edit"]').addEventListener('click', () => editGoal(g.id));
      li.querySelector('[data-action="del"]').addEventListener('click', () => {
        state.goals = state.goals.filter(x => x.id !== g.id);
        saveState();
        renderGoals();
      });
      ul.appendChild(li);
    });
  }

  function addGoal(){
    openModal('Add goal', ({title, notes}) => {
      const t = safeText(title);
      if(!t) return toast('Goal title is required.');
      state.goals.unshift({ id: cryptoId(), title: t, notes: safeText(notes), done:false, createdAt: new Date().toISOString() });
      saveState();
      renderGoals();
      toast('Goal added.');
    }, [
      { id:'title', label:'Goal title', type:'text', placeholder:'e.g., Finish the week’s key tasks', value:'' },
      { id:'notes', label:'Notes (optional)', type:'text', placeholder:'e.g., Define the “done” condition', value:'' }
    ]);
  }

  function editGoal(id){
    const g = state.goals.find(x => x.id === id);
    if(!g) return;
    openModal('Edit goal', ({title, notes}) => {
      const t = safeText(title);
      if(!t) return toast('Goal title is required.');
      g.title = t;
      g.notes = safeText(notes);
      saveState();
      renderGoals();
      toast('Goal updated.');
    }, [
      { id:'title', label:'Goal title', type:'text', placeholder:'', value:g.title },
      { id:'notes', label:'Notes (optional)', type:'text', placeholder:'', value:g.notes || '' }
    ]);
  }

  // Habits + streak (simple: streak counts consecutive days with all habits checked)
  function isHabitCheckedToday(h){
    const t = todayISO();
    return !!(h.checkedOn && h.checkedOn[t]);
  }

  function setHabitChecked(h, checked){
    const t = todayISO();
    h.checkedOn = h.checkedOn || {};
    h.checkedOn[t] = checked ? true : false;
  }

  function computeStreak(){
    // streak = number of consecutive days ending today where all habits are checked.
    const habits = state.habits || [];
    if(habits.length === 0) return 0;
    const allCheckedOn = (dateIso) => habits.every(h => !!(h.checkedOn && h.checkedOn[dateIso]));
    let streak = 0;
    const d = new Date();
    for(;;){
      const iso = d.toISOString().slice(0,10);
      if(allCheckedOn(iso)) streak += 1;
      else break;
      d.setDate(d.getDate() - 1);
      if(streak > 3650) break;
    }
    return streak;
  }

  function renderHabits(){
    $('#todayStr').textContent = new Date().toLocaleDateString(undefined, { weekday:'short', month:'short', day:'2-digit', year:'numeric' });
    $('#streakStr').textContent = `${computeStreak()} day(s)`;

    const ul = $('#habitsList');
    ul.innerHTML = '';
    if(state.habits.length === 0){
      ul.innerHTML = '<li class="muted small">No habits yet.</li>';
      return;
    }
    state.habits.forEach(h => {
      const li = document.createElement('li');
      li.className = 'list-item';
      const checked = isHabitCheckedToday(h);
      li.innerHTML = `
        <input class="chk" type="checkbox" ${checked ? 'checked' : ''} aria-label="Mark habit complete for today" />
        <div class="main">
          <div class="title">${escapeHtml(h.title)}</div>
          <div class="meta">${h.notes ? escapeHtml(h.notes) : '—'} • Today: ${checked ? 'Done' : 'Not done'}</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="edit">Edit</button>
          <button class="btn btn-danger" data-action="del">Delete</button>
        </div>
      `;
      li.querySelector('.chk').addEventListener('change', (e) => {
        setHabitChecked(h, e.target.checked);
        saveState();
        renderHabits();
      });
      li.querySelector('[data-action="edit"]').addEventListener('click', () => editHabit(h.id));
      li.querySelector('[data-action="del"]').addEventListener('click', () => {
        state.habits = state.habits.filter(x => x.id !== h.id);
        saveState();
        renderHabits();
      });
      ul.appendChild(li);
    });
  }

  function addHabit(){
    openModal('Add habit', ({title, notes}) => {
      const t = safeText(title);
      if(!t) return toast('Habit title is required.');
      state.habits.unshift({ id: cryptoId(), title: t, notes: safeText(notes), checkedOn: {} });
      saveState();
      renderHabits();
      toast('Habit added.');
    }, [
      { id:'title', label:'Habit', type:'text', placeholder:'e.g., Drink water', value:'' },
      { id:'notes', label:'Notes (optional)', type:'text', placeholder:'e.g., 8 cups', value:'' }
    ]);
  }

  function editHabit(id){
    const h = state.habits.find(x => x.id === id);
    if(!h) return;
    openModal('Edit habit', ({title, notes}) => {
      const t = safeText(title);
      if(!t) return toast('Habit title is required.');
      h.title = t;
      h.notes = safeText(notes);
      saveState();
      renderHabits();
      toast('Habit updated.');
    }, [
      { id:'title', label:'Habit', type:'text', placeholder:'', value:h.title },
      { id:'notes', label:'Notes (optional)', type:'text', placeholder:'', value:h.notes || '' }
    ]);
  }

  // Journal
  function renderJournal(){
    $('#journalTitle').value = state.journal.draft?.title || '';
    $('#journalBody').value = state.journal.draft?.body || '';

    const ul = $('#journalEntries');
    ul.innerHTML = '';
    const entries = state.journal.entries || [];
    if(entries.length === 0){
      ul.innerHTML = '<li class="muted small">No entries yet.</li>';
      return;
    }
    entries.slice(0, 10).forEach(e => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <div class="main">
          <div class="title">${escapeHtml(e.title || 'Untitled')}</div>
          <div class="meta">${escapeHtml(formatDateTime(e.createdAt))}</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="open">Open</button>
          <button class="btn btn-danger" data-action="del">Delete</button>
        </div>
      `;
      li.querySelector('[data-action="open"]').addEventListener('click', () => {
        state.journal.draft = { title: e.title, body: e.body };
        saveState();
        renderJournal();
        toast('Loaded entry into editor.');
      });
      li.querySelector('[data-action="del"]').addEventListener('click', () => {
        state.journal.entries = state.journal.entries.filter(x => x.id !== e.id);
        saveState();
        renderJournal();
      });
      ul.appendChild(li);
    });
  }

  function saveJournalDraft(){
    state.journal.draft = {
      title: $('#journalTitle').value,
      body: $('#journalBody').value
    };
    saveState();
  }

  function saveJournalEntry(){
    const title = safeText($('#journalTitle').value);
    const body = safeText($('#journalBody').value);
    if(!body) return toast('Journal body is required.');
    const entry = { id: cryptoId(), title, body, createdAt: new Date().toISOString() };
    state.journal.entries.unshift(entry);
    state.journal.draft = { title:'', body:'' };
    saveState();
    renderJournal();
    toast('Entry saved.');
  }

  function clearJournalDraft(){
    state.journal.draft = { title:'', body:'' };
    saveState();
    renderJournal();
  }

  // Modal helper
  function openModal(title, onSave, fields){
    const dlg = $('#modal');
    $('#modalTitle').textContent = title;
    const body = $('#modalBody');
    body.innerHTML = '';

    fields.forEach(f => {
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <label class="muted small" for="m_${f.id}">${escapeHtml(f.label)}</label>
        <input class="input" id="m_${f.id}" type="${escapeHtml(f.type)}" placeholder="${escapeHtml(f.placeholder)}" value="${escapeHtml(f.value)}" />
      `;
      body.appendChild(wrap);
    });

    const confirm = $('#modalConfirm');
    const handler = (e) => {
      // Called when dialog closes; only save if it wasn't cancelled.
      if(dlg.returnValue === 'cancel') return cleanup();
      const payload = {};
      fields.forEach(f => payload[f.id] = $(`#m_${f.id}`).value);
      onSave(payload);
      cleanup();
    };
    const cleanup = () => {
      dlg.removeEventListener('close', handler);
    };
    dlg.addEventListener('close', handler);
    dlg.showModal();
    setTimeout(() => {
      const first = body.querySelector('input');
      if(first) first.focus();
    }, 0);
  }

  // Focus Timer
  let focusTimer = null;
  let focusMode = 'focus'; // focus or break
  let remainingSec = 25 * 60;
  let paused = true;

  function setFocusPreset(min){
    state.focus.presetMinutes = min;
    saveState();
    resetFocus();
  }

  function updateFocusUI(){
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    $('#focusTime').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    $('#focusLabel').textContent = (focusMode === 'focus') ? 'Focus' : 'Break';
  }

  function startFocus(){
    if(!paused) return;
    paused = false;
    $('#btnFocusStart').disabled = true;
    $('#btnFocusPause').disabled = false;

    focusTimer = setInterval(() => {
      if(remainingSec > 0){
        remainingSec -= 1;
        updateFocusUI();
        return;
      }
      // switch mode
      if(focusMode === 'focus'){
        focusMode = 'break';
        remainingSec = breakSecondsForPreset(state.focus.presetMinutes);
        notify('Break time', 'Step away briefly. You earned it.');
      } else {
        focusMode = 'focus';
        remainingSec = state.focus.presetMinutes * 60;
        notify('Back to focus', 'One more focused block.');
      }
      updateFocusUI();
    }, 1000);
  }

  function pauseFocus(){
    if(paused) return;
    paused = true;
    $('#btnFocusStart').disabled = false;
    $('#btnFocusPause').disabled = true;
    if(focusTimer) clearInterval(focusTimer);
    focusTimer = null;
  }

  function resetFocus(){
    pauseFocus();
    focusMode = 'focus';
    remainingSec = (state.focus.presetMinutes || 25) * 60;
    updateFocusUI();
  }

  function breakSecondsForPreset(presetMin){
    if(presetMin <= 25) return 5 * 60;
    if(presetMin <= 45) return 10 * 60;
    if(presetMin <= 60) return 10 * 60;
    return 15 * 60;
  }

  async function requestNotificationPermission(){
    if(!('Notification' in window)) return false;
    if(Notification.permission === 'granted') return true;
    if(Notification.permission === 'denied') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  }

  async function notify(title, body){
    if(!state.focus.notificationsEnabled) return;
    const ok = await requestNotificationPermission();
    if(!ok) return;
    try{
      new Notification(title, { body });
    }catch(e){
      console.warn('Notification error:', e);
    }
  }

  // Import / Export
  function exportData(){
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `help-thy-self-data-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Exported JSON.');
  }

  async function importData(file){
    const text = await file.text();
    const incoming = JSON.parse(text);
    state = migrate(incoming);
    saveState();
    renderAll();
    toast('Imported JSON.');
  }

  function resetAll(){
    if(!confirm('This will delete all local data for this app on this browser. Continue?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    saveState();
    renderAll();
    toast('Reset complete.');
  }

  // Service Worker toggle
  async function setOfflineEnabled(enabled){
    state.focus.offlineEnabled = !!enabled;
    saveState();
    $('#togglePWA').checked = !!enabled;
    if(enabled){
      await registerServiceWorker();
      toast('Offline mode enabled.');
    }else{
      await unregisterServiceWorkers();
      toast('Offline mode disabled.');
    }
  }

  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator)) return;
    try{
      await navigator.serviceWorker.register('./service-worker.js');
    }catch(e){
      console.warn('SW register failed:', e);
    }
  }

  async function unregisterServiceWorkers(){
    if(!('serviceWorker' in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }

  // Utilities
  function escapeHtml(str){
    return (str ?? '').toString()
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Render / wire up
  let state = loadState();
  let currentQuote = pickRandom(QUOTES);

  function renderAll(){
    $('#appVersion').textContent = APP_VERSION;

    // Quote
    setQuote(currentQuote);
    renderQuoteFavs();

    // Affirmations
    $('#affirmationText').textContent = state.affirmations.pool?.[affirmationIdx] ?? '';
    if(!$('#affirmationText').textContent) showAffirmation();
    renderAffirmationFavs();

    // Goals & habits & journal
    renderGoals();
    renderHabits();
    renderJournal();

    // Focus
    $('#focusPreset').value = String(state.focus.presetMinutes || 25);
    remainingSec = (state.focus.presetMinutes || 25) * 60;
    updateFocusUI();

    // Settings toggles
    $('#toggleNotifications').checked = !!state.focus.notificationsEnabled;
    $('#togglePWA').checked = !!state.focus.offlineEnabled;
  }

  function wireEvents(){
    // Quotes
    $('#btnNewQuote').addEventListener('click', () => { newQuote(); });
    $('#btnSaveQuote').addEventListener('click', () => {
      const q = { text: currentQuote.text, author: currentQuote.author || '' };
      const exists = (state.quotes.favorites || []).some(x => x.text === q.text && x.author === q.author);
      if(exists) return toast('Already in favorites.');
      state.quotes.favorites.push(q);
      saveState();
      renderQuoteFavs();
      toast('Saved to favorites.');
    });

    // Goals
    $('#btnAddGoal').addEventListener('click', addGoal);

    // Habits
    $('#btnAddHabit').addEventListener('click', addHabit);

    // Affirmations
    $('#btnNextAffirmation').addEventListener('click', showAffirmation);
    $('#btnSaveAffirmation').addEventListener('click', () => {
      const t = safeText($('#affirmationText').textContent);
      if(!t) return;
      const exists = (state.affirmations.favorites || []).includes(t);
      if(exists) return toast('Already saved.');
      state.affirmations.favorites.push(t);
      saveState();
      renderAffirmationFavs();
      toast('Saved.');
    });
    $('#btnAddAffirmation').addEventListener('click', () => {
      openModal('Add affirmation', ({text}) => {
        const t = safeText(text);
        if(!t) return toast('Affirmation text is required.');
        state.affirmations.pool.push(t);
        saveState();
        toast('Affirmation added.');
      }, [
        { id:'text', label:'Affirmation', type:'text', placeholder:'e.g., I act with calm confidence.', value:'' }
      ]);
    });

    // Journal
    $('#btnSaveEntry').addEventListener('click', saveJournalEntry);
    $('#btnClearEntry').addEventListener('click', clearJournalDraft);
    $('#btnNewEntry').addEventListener('click', () => {
      state.journal.draft = { title:'', body:'' };
      saveState();
      renderJournal();
      $('#journalTitle').focus();
    });
    $('#journalTitle').addEventListener('input', saveJournalDraft);
    $('#journalBody').addEventListener('input', saveJournalDraft);

    // Favorites
    $('#btnClearFavs').addEventListener('click', () => {
      if(!confirm('Clear all favorite quotes?')) return;
      state.quotes.favorites = [];
      saveState();
      renderQuoteFavs();
    });

    // Focus timer
    $('#focusPreset').addEventListener('change', (e) => setFocusPreset(parseInt(e.target.value, 10)));
    $('#btnFocusStart').addEventListener('click', startFocus);
    $('#btnFocusPause').addEventListener('click', pauseFocus);
    $('#btnFocusReset').addEventListener('click', resetFocus);

    // Settings
    $('#toggleNotifications').addEventListener('change', async (e) => {
      const enabled = !!e.target.checked;
      if(enabled){
        const ok = await requestNotificationPermission();
        if(!ok){
          e.target.checked = false;
          state.focus.notificationsEnabled = false;
          saveState();
          return toast('Notifications denied in browser settings.');
        }
      }
      state.focus.notificationsEnabled = enabled;
      saveState();
      toast(enabled ? 'Notifications enabled.' : 'Notifications disabled.');
    });

    $('#togglePWA').addEventListener('change', async (e) => {
      await setOfflineEnabled(!!e.target.checked);
    });

    // Import/Export/Reset
    $('#btnExport').addEventListener('click', exportData);
    $('#btnImport').addEventListener('click', () => $('#fileImport').click());
    $('#fileImport').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if(!file) return;
      try{
        await importData(file);
      }catch(err){
        console.error(err);
        toast('Import failed. Ensure you selected a valid JSON export.');
      }
    });
    $('#btnReset').addEventListener('click', resetAll);

    // PWA install hint (non-intrusive)
    window.addEventListener('beforeinstallprompt', (evt) => {
      // We do not force a prompt; browser handles UI.
      evt.preventDefault();
    });
  }

  // Boot
  renderAll();
  wireEvents();

  // Service Worker registration based on toggle
  if(state.focus.offlineEnabled){
    registerServiceWorker();
  }

  // Make sure quote changes update currentQuote
  function setQuote(q){
    $('#quoteText').textContent = q.text;
    $('#quoteAuthor').textContent = q.author ? `— ${q.author}` : '';
    currentQuote = q;
  }

  // Initial quote
  setQuote(pickRandom(QUOTES));
})(); 
