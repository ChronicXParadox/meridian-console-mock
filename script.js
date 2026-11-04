/* Meridian Console – FICTIONAL DEMO. Frontend-only; sign-in is a visual simulation, not security. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('mc_' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mc_' + k, JSON.stringify(v)); } catch {} }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Demo accounts & permissions ---------- */
const ACCOUNTS = {
  'admin.demo': { pw: 'DemoAdmin2026!', role: 'admin', name: 'Avery Admin' },
  'moderator.demo': { pw: 'DemoMod2026!', role: 'moderator', name: 'Morgan Mod' },
  'support.demo': { pw: 'DemoSupport2026!', role: 'support', name: 'Sam Support' },
  'viewer.demo': { pw: 'DemoViewer2026!', role: 'viewer', name: 'Vic Viewer' }
};
const PERMS = {
  admin: { add: 1, edit: 1, del: 1, settings: 1, logs: 1 },
  moderator: { add: 1, edit: 1, del: 0, settings: 0, logs: 1 },
  support: { add: 0, edit: 1, del: 0, settings: 0, logs: 1 },
  viewer: { add: 0, edit: 0, del: 0, settings: 0, logs: 0 }
};
const ROLES = { admin: 'Administrator', moderator: 'Moderator', support: 'Support', viewer: 'Viewer' };
let me = null;
const can = p => me && PERMS[me.role][p];

/* ---------- Seed data ---------- */
const NAMES = ['Ivy Chen', 'Noah Patel', 'Lena Fischer', 'Omar Haddad', 'Priya Nair', 'Mateo Silva', 'Hana Kimura', 'Jonas Berg', 'Zoe Alvarez', 'Ethan Brooks', 'Nia Okafor', 'Luca Romano'];
const seedUsers = () => NAMES.map((n, i) => ({
  id: i + 1, name: n, email: n.toLowerCase().replace(' ', '.') + '@example.test',
  role: ['viewer', 'support', 'moderator', 'viewer'][i % 4], status: ['active', 'active', 'pending', 'suspended'][i % 4 === 3 ? 3 : i % 3 === 2 ? 2 : 0],
  online: i % 3 === 0, joined: `2026-0${1 + (i % 9)}-${10 + i}`
}));
let users = store.get('users', null) || seedUsers();
let logs = store.get('logs', null) || [
  { t: Date.now() - 6e5, cat: 'auth', who: 'admin.demo', msg: 'Signed in' },
  { t: Date.now() - 36e5, cat: 'admin', who: 'admin.demo', msg: 'Changed role for Noah Patel to Support' },
  { t: Date.now() - 72e5, cat: 'activity', who: 'support.demo', msg: 'Viewed profile of Ivy Chen' },
  { t: Date.now() - 9e6, cat: 'auth', who: 'unknown', msg: 'Failed sign-in attempt' }
];
let settings = store.get('settings', { org: 'Northwind Demo Co.', tz: 'UTC', emailN: true, alertN: true, weekly: false, compact: false });
const save = () => { store.set('users', users); store.set('logs', logs); store.set('settings', settings); };
function log(cat, msg) { logs.unshift({ t: Date.now(), cat, who: me ? me.username : 'unknown', msg }); logs = logs.slice(0, 100); save(); }
const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(t).toLocaleDateString(); };

/* ---------- UI helpers ---------- */
function toast(msg, bad) { const d = document.createElement('div'); d.className = 'toast' + (bad ? ' bad' : ''); d.textContent = msg; $('#toasts').append(d); setTimeout(() => d.remove(), 3200); }
function modal(html, onMount) {
  const w = $('#modalWrap'); $('.modal', w).innerHTML = html; w.hidden = false;
  w.onclick = e => { if (e.target === w) closeModal(); };
  $('.modal input,.modal select', w)?.focus(); onMount && onMount($('.modal', w));
}
const closeModal = () => { $('#modalWrap').hidden = true; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
const confirmBox = (msg, fn) => modal(`<h3>Confirm</h3><p>${msg}</p><div class="act"><button class="btn" data-x>Cancel</button><button class="btn primary" data-ok>Confirm</button></div>`, m => {
  $('[data-x]', m).onclick = closeModal; $('[data-ok]', m).onclick = () => { closeModal(); fn(); };
});

/* ---------- Charts (inline SVG) ---------- */
function lineChart(data, labels, color = 'var(--acc)') {
  const W = 520, H = 190, p = 28, max = Math.max(...data) * 1.15, x = i => p + i * (W - 2 * p) / (data.length - 1), y = v => H - p - v / max * (H - 2 * p);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Line chart">${[0, .5, 1].map(f => `<line x1="${p}" x2="${W - p}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="var(--line)"/>`).join('')}
  <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
  ${data.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${color}"><title>${labels[i]}: ${v}</title></circle><text x="${x(i)}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`).join('')}</svg>`;
}
function barChart(data, labels) {
  const W = 520, H = 190, p = 28, max = Math.max(...data) * 1.15, bw = (W - 2 * p) / data.length;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Bar chart">${data.map((v, i) => { const h = v / max * (H - 2 * p); return `<rect x="${p + i * bw + 8}" y="${H - p - h}" width="${bw - 16}" height="${h}" rx="4" fill="var(--acc)" opacity=".85"><title>${labels[i]}: ${v}</title></rect><text x="${p + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`; }).join('')}</svg>`;
}
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---------- Views ---------- */
const VIEWS = {
  overview: { icon: '▦', label: 'Overview', render() {
    const act = users.filter(u => u.status === 'active').length, on = users.filter(u => u.online).length;
    return `<div class="grid g4">
      ${[['Registered users', users.length], ['Active users', act], ['Online now', on], ['Open alerts', 2]].map(([l, v]) => `<div class="card stat"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
      <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>Sign-ins this week</h3>${lineChart([120, 160, 148, 190, 210, 96, 88], DAYS)}</div>
      <div class="card"><h3>System status</h3>${[['API gateway', 'Operational'], ['Database cluster', 'Operational'], ['Email queue', 'Degraded'], ['Storage', 'Operational']].map(([s, v]) => `<div class="sw"><span><i class="dot ${v === 'Degraded' ? 'warn' : ''}"></i>${s}</span><span class="badge ${v === 'Degraded' ? 'warn' : 'ok'}">${v}</span></div>`).join('')}</div></div>
      <div class="card" style="margin-top:16px"><h3>Recent activity</h3>${logs.slice(0, 5).map(l => `<div class="sw"><span>${esc(l.msg)} <small style="color:var(--mute)">– ${esc(l.who)}</small></span><small>${ago(l.t)}</small></div>`).join('')}</div>`;
  } },
  users: { icon: '☺', label: 'Users', state: { q: '', role: '', key: 'name', dir: 1 }, render() {
    const s = this.state;
    return `${can('edit') ? '' : '<div class="ro">Read-only access: your role can view users but not change them.</div>'}
    <div class="bar"><input id="uq" placeholder="Search name or email" value="${esc(s.q)}">
      <select id="ur"><option value="">All roles</option>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${s.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <span class="spacer"></span><button class="btn primary" id="addU" ${can('add') ? '' : 'disabled title="Your role cannot add users"'}>Add user</button></div>
    <div class="card scroll" style="padding:0"><table class="t"><thead><tr>${[['name', 'Name'], ['email', 'Email'], ['role', 'Role'], ['status', 'Status'], ['joined', 'Joined']].map(([k, l]) => `<th data-k="${k}">${l}${s.key === k ? (s.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}<th></th></tr></thead><tbody id="ub"></tbody></table></div>`;
  }, mount() {
    const s = this.state, draw = () => {
      const q = s.q.toLowerCase(), rows = users.filter(u => (!s.role || u.role === s.role) && (u.name + u.email).toLowerCase().includes(q)).sort((a, b) => String(a[s.key]).localeCompare(String(b[s.key])) * s.dir);
      $('#ub').innerHTML = rows.map(u => `<tr><td>${u.online ? '<i class="dot"></i>' : ''}${esc(u.name)}</td><td>${esc(u.email)}</td><td><span class="badge ${u.role}">${ROLES[u.role]}</span></td><td><span class="badge ${u.status}">${u.status}</span></td><td>${u.joined}</td>
        <td><button class="btn sm" data-v="${u.id}">View</button> <button class="btn sm" data-e="${u.id}" ${can('edit') ? '' : 'disabled'}>Edit</button> <button class="btn sm danger" data-d="${u.id}" ${can('del') ? '' : 'disabled title="Administrator only"'}>Delete</button></td></tr>`).join('') || '<tr><td colspan="6">No users match. Try clearing the search or filter.</td></tr>';
    };
    draw();
    $('#uq').oninput = e => { s.q = e.target.value; draw(); };
    $('#ur').onchange = e => { s.role = e.target.value; draw(); };
    document.querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { s.dir = s.key === th.dataset.k ? -s.dir : 1; s.key = th.dataset.k; go('users'); });
    $('#addU').onclick = () => userForm();
    $('#ub').onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.v) profile(+b.dataset.v); if (b.dataset.e) userForm(+b.dataset.e);
      if (b.dataset.d) { const u = users.find(x => x.id === +b.dataset.d); confirmBox(`Delete demo user <b>${esc(u.name)}</b>?`, () => { users = users.filter(x => x !== u); log('admin', 'Deleted user ' + u.name); toast('Deleted ' + u.name); go('users'); }); }
    };
  } },
  roles: { icon: '⚿', label: 'Roles', render() {
    const cols = [['edit', 'Edit users'], ['add', 'Add users'], ['del', 'Delete users'], ['logs', 'View logs'], ['settings', 'Change settings']];
    return `<div class="card scroll"><h3>Role permissions</h3><table class="t"><thead><tr><th>Role</th>${cols.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead>${Object.keys(ROLES).map(r => `<tr><td><span class="badge ${r}">${ROLES[r]}</span>${r === me.role ? ' (you)' : ''}</td>${cols.map(c => `<td>${PERMS[r][c[0]] ? '✓' : '–'}</td>`).join('')}</tr>`).join('')}</table></div>
    <p style="color:var(--mute)">Sign in as different demo accounts to see these rules change the interface.</p>`;
  } },
  logs: { icon: '≣', label: 'Activity logs', perm: 'logs', state: { cat: '' }, render() {
    return `<div class="bar"><select id="lc"><option value="">All categories</option><option value="auth">Sign-ins</option><option value="admin">Admin actions</option><option value="activity">User activity</option></select></div>
    <div class="card scroll" style="padding:0"><table class="t"><thead><tr><th>Time</th><th>Category</th><th>User</th><th>Event</th></tr></thead><tbody>${logs.filter(l => !this.state.cat || l.cat === this.state.cat).map(l => `<tr><td title="${new Date(l.t).toLocaleString()}">${ago(l.t)}</td><td><span class="badge">${l.cat}</span></td><td>${esc(l.who)}</td><td>${esc(l.msg)}</td></tr>`).join('')}</tbody></table></div>`;
  }, mount() { const c = $('#lc'); c.value = this.state.cat; c.onchange = () => { this.state.cat = c.value; go('logs'); }; } },
  analytics: { icon: '◔', label: 'Analytics', render() {
    return `<div class="grid g2"><div class="card"><h3>Daily active users</h3>${lineChart([310, 340, 322, 398, 412, 260, 241], DAYS)}</div>
      <div class="card"><h3>New sign-ups</h3>${barChart([14, 22, 18, 30, 27, 9, 7], DAYS)}</div>
      <div class="card"><h3>Avg. response time (ms)</h3>${lineChart([182, 175, 190, 168, 171, 160, 158], DAYS, 'var(--warn)')}</div>
      <div class="card"><h3>Users by role</h3>${barChart(Object.keys(ROLES).map(r => users.filter(u => u.role === r).length), ['Admin', 'Mod', 'Support', 'Viewer'])}</div></div>`;
  } },
  settings: { icon: '⚙', label: 'Settings', render() {
    const ro = can('settings') ? '' : 'disabled', sw = (k, l) => `<div class="sw"><span>${l}</span><input type="checkbox" data-s="${k}" ${settings[k] ? 'checked' : ''} ${ro}></div>`;
    return `${ro ? '<div class="ro">Only administrators can change settings.</div>' : ''}<div class="grid g2">
      <div class="card"><h3>General</h3><label>Organization name<input id="sorg" value="${esc(settings.org)}" ${ro}></label><label>Time zone<select id="stz" ${ro}>${['UTC', 'US/Pacific', 'Europe/Berlin', 'Asia/Tokyo'].map(z => `<option ${settings.tz === z ? 'selected' : ''}>${z}</option>`).join('')}</select></label><button class="btn primary" id="sSave" ${ro}>Save changes</button></div>
      <div class="card"><h3>Appearance and dashboard</h3><div class="sw"><span>Dark theme</span><input type="checkbox" id="sTheme" ${document.documentElement.dataset.theme === 'dark' ? 'checked' : ''}></div>${sw('compact', 'Compact tables')}</div>
      <div class="card"><h3>Notifications</h3>${sw('emailN', 'Email notifications')}${sw('alertN', 'System alerts')}${sw('weekly', 'Weekly summary')}</div></div>`;
  }, mount() {
    $('#sTheme').onchange = e => setTheme(e.target.checked ? 'dark' : 'light');
    document.querySelectorAll('[data-s]').forEach(i => i.onchange = () => { settings[i.dataset.s] = i.checked; log('admin', `Setting ${i.dataset.s} ${i.checked ? 'on' : 'off'}`); toast('Setting saved'); });
    $('#sSave').onclick = () => { const o = $('#sorg').value.trim(); if (!o) return toast('Organization name is required', 1); settings.org = o; settings.tz = $('#stz').value; log('admin', 'Updated general settings'); toast('Settings saved'); };
  } }
};

/* ---------- Modals ---------- */
function profile(id) {
  const u = users.find(x => x.id === id); log('activity', 'Viewed profile of ' + u.name);
  modal(`<h3>${esc(u.name)}</h3><div class="sw"><span>Email</span><span>${esc(u.email)}</span></div><div class="sw"><span>Role</span><span class="badge ${u.role}">${ROLES[u.role]}</span></div><div class="sw"><span>Status</span><span class="badge ${u.status}">${u.status}</span></div><div class="sw"><span>Joined</span><span>${u.joined}</span></div><div class="act"><button class="btn" data-x>Close</button></div>`, m => $('[data-x]', m).onclick = closeModal);
}
function userForm(id) {
  const u = id ? users.find(x => x.id === id) : { name: '', email: '', role: 'viewer', status: 'active' };
  const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('');
  modal(`<h3>${id ? 'Edit user' : 'Add user'}</h3><form novalidate><label>Full name<input id="fn" value="${esc(u.name)}"></label><label>Email<input id="fe" value="${esc(u.email)}"></label>
    <label>Role<select id="fr">${opt(ROLES, u.role)}</select></label><label>Status<select id="fs">${opt({ active: 'Active', pending: 'Pending', suspended: 'Suspended' }, u.status)}</select></label><p class="err" id="fErr"></p>
    <div class="act"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">${id ? 'Save changes' : 'Add user'}</button></div></form>`, m => {
    $('[data-x]', m).onclick = closeModal;
    $('form', m).onsubmit = e => {
      e.preventDefault(); const n = $('#fn').value.trim(), em = $('#fe').value.trim(), err = $('#fErr');
      if (n.length < 2) return err.textContent = 'Enter a full name (at least 2 characters).';
      if (!/^\S+@\S+\.\S+$/.test(em)) return err.textContent = 'Enter a valid email address.';
      if (users.some(x => x.email === em && x !== u)) return err.textContent = 'That email is already used by another demo user.';
      Object.assign(u, { name: n, email: em, role: $('#fr').value, status: $('#fs').value });
      if (!id) { u.id = Math.max(0, ...users.map(x => x.id)) + 1; u.joined = new Date().toISOString().slice(0, 10); u.online = false; users.push(u); }
      log('admin', (id ? 'Edited user ' : 'Added user ') + n); toast(id ? 'Saved ' + n : 'Added ' + n); closeModal(); go('users');
    };
  });
}

/* ---------- Navigation & shell ---------- */
let current = 'overview';
function go(v) {
  const def = VIEWS[v]; if (def.perm && !can(def.perm)) { toast('Your role cannot open this section', 1); return; }
  current = v; $('#title').textContent = def.label; $('#view').innerHTML = def.render();
  def.mount && def.mount(); document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  $('#sidebar').classList.remove('open');
}
function buildNav() {
  $('#nav').innerHTML = Object.entries(VIEWS).filter(([, d]) => !d.perm || can(d.perm)).map(([k, d]) => `<a data-v="${k}" tabindex="0"><span class="ic">${d.icon}</span><span class="nl">${d.label}</span></a>`).join('');
  $('#nav').onclick = e => { const a = e.target.closest('a'); a && go(a.dataset.v); };
  $('#nav').onkeydown = e => { if (e.key === 'Enter') e.target.click(); };
}
function setTheme(t) { document.documentElement.dataset.theme = t; store.set('theme', t); }
function enter(username, remember) {
  const a = ACCOUNTS[username]; me = { username, role: a.role, name: a.name };
  (remember ? localStorage : sessionStorage).setItem('mc_session', username);
  $('#login').hidden = true; $('#app').hidden = false;
  $('#meName').textContent = a.name; $('#meRole').textContent = ROLES[a.role]; $('#meAv').textContent = a.name.split(' ').map(w => w[0]).join('');
  buildNav(); go('overview');
}
function logout() { log('auth', 'Signed out'); me = null; localStorage.removeItem('mc_session'); sessionStorage.removeItem('mc_session'); $('#app').hidden = true; $('#login').hidden = false; $('#lp').value = ''; closeModal(); }

/* ---------- Boot ---------- */
setTheme(store.get('theme', 'dark'));
$('#themeBtn').onclick = () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); if (current === 'settings') go('settings'); };
$('#logout').onclick = () => { logout(); toast('Signed out'); };
$('#collapse').onclick = () => $('#sidebar').classList.toggle('min');
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#togglePw').onclick = e => { const p = $('#lp'), s = p.type === 'password'; p.type = s ? 'text' : 'password'; e.target.textContent = s ? 'Hide' : 'Show'; };
document.querySelectorAll('.demo-creds tr').forEach(r => r.onclick = () => { $('#lu').value = r.dataset.u; $('#lp').value = r.dataset.p; $('#loginErr').textContent = ''; });
$('#loginForm').onsubmit = e => {
  e.preventDefault(); const u = $('#lu').value.trim().toLowerCase(), p = $('#lp').value, btn = $('#loginBtn'), err = $('#loginErr');
  if (!u || !p) { err.textContent = 'Enter both a username and a password.'; return; }
  err.textContent = ''; btn.classList.add('loading'); btn.disabled = true;
  setTimeout(() => {
    btn.classList.remove('loading'); btn.disabled = false;
    if (ACCOUNTS[u] && ACCOUNTS[u].pw === p) { enter(u, $('#remember').checked); log('auth', 'Signed in'); toast('Welcome back, ' + ACCOUNTS[u].name.split(' ')[0]); }
    else { me = null; logs.unshift({ t: Date.now(), cat: 'auth', who: u, msg: 'Failed sign-in attempt' }); save(); err.textContent = 'Username or password is incorrect. Use one of the demo accounts below.'; toast('Sign-in failed', 1); }
  }, 900);
};
const saved = sessionStorage.getItem('mc_session') || localStorage.getItem('mc_session');
if (saved && ACCOUNTS[saved]) enter(saved, !!localStorage.getItem('mc_session'));
