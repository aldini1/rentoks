// ============================================
// rentoks-auth.js
// Shto këtë script në fund të rentoks.html
// <script src="/rentoks-auth.js"></script>
// ============================================

const API = '/api';

// ── Token management ──
const Auth = {
  save(token, user) {
    localStorage.setItem('rentoks_token', token);
    localStorage.setItem('rentoks_user', JSON.stringify(user));
  },
  getToken() {
    return localStorage.getItem('rentoks_token');
  },
  getUser() {
    const u = localStorage.getItem('rentoks_user');
    return u ? JSON.parse(u) : null;
  },
  logout() {
    localStorage.removeItem('rentoks_token');
    localStorage.removeItem('rentoks_user');
    updateNavUI(null);
    showToastAuth('U çkyçe me sukses.', 'neutral');
  },
  isLoggedIn() {
    return !!this.getToken();
  }
};

// ── API calls ──
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(API + endpoint, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Gabim serveri.');
  return data;
}

// ── Toast ──
function showToastAuth(msg, type = 'success') {
  const colors = {
    success: '#16a34a',
    error: '#e53e3e',
    neutral: '#0d0d0d',
    pending: '#d97706'
  };
  let toast = document.getElementById('auth-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'auth-toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);
      color:white;padding:12px 24px;border-radius:100px;font-size:14px;
      font-weight:600;z-index:9999;transition:all .3s;opacity:0;
      white-space:nowrap;font-family:'DM Sans',sans-serif;
      box-shadow:0 8px 24px rgba(0,0,0,.2);
    `;
    document.body.appendChild(toast);
  }
  toast.style.background = colors[type] || colors.neutral;
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(80px)';
  }, 4000);
}

// ── Spinner ──
function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.original = btn.textContent;
    btn.textContent = 'Duke u ngarkuar...';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  } else {
    btn.textContent = btn.dataset.original || btn.textContent;
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

// ── Form error display ──
function showFormError(formId, msg) {
  let err = document.getElementById(formId + '-error');
  if (!err) {
    err = document.createElement('div');
    err.id = formId + '-error';
    err.style.cssText = `
      background:#fff0f0;border:1px solid #fca5a5;color:#e53e3e;
      padding:10px 14px;border-radius:8px;font-size:13px;font-weight:500;
      margin-bottom:14px;
    `;
    const form = document.getElementById(formId);
    if (form) form.prepend(err);
  }
  err.textContent = '⚠ ' + msg;
  err.style.display = 'block';
}

function clearFormError(formId) {
  const err = document.getElementById(formId + '-error');
  if (err) err.style.display = 'none';
}

// ── Update nav UI after login ──
function updateNavUI(user) {
  const loginBtn = document.querySelector('.n-ghost');
  const registerBtn = document.querySelector('.n-cta');

  if (!user) {
    if (loginBtn) { loginBtn.textContent = 'Hyr'; loginBtn.onclick = () => openModalAuth('login'); }
    if (registerBtn) { registerBtn.textContent = 'Regjistro Agjencinë'; registerBtn.onclick = () => openModalAuth('reg-biz'); }
    return;
  }

  // Klient i kyçur
  if (user.type === 'user') {
    if (loginBtn) {
      loginBtn.textContent = `${user.first_name || user.name} ▾`;
      loginBtn.onclick = (e) => { e.stopPropagation(); toggleNavDropdown('client'); };
    }
    if (registerBtn) {
      registerBtn.textContent = 'Rezervimet mia';
      registerBtn.onclick = () => openModalAuth('my-bookings');
    }
  }

  // Biznes i kyçur
  if (user.type === 'business') {
    if (loginBtn) {
      loginBtn.textContent = `${user.name || user.business_name} ▾`;
      loginBtn.onclick = (e) => { e.stopPropagation(); toggleNavDropdown('business'); };
    }
    if (registerBtn) {
      registerBtn.textContent = 'Dashboard →';
      registerBtn.style.background = 'var(--lime, #c8ff00)';
      registerBtn.style.color = '#0d0d0d';
      registerBtn.onclick = () => { window.open('/rentoks-dashboard.html', '_blank'); };
    }
  }
}

// ── Nav Dropdown ──
function toggleNavDropdown(type) {
  const dd = document.getElementById('nav-dropdown');
  if (!dd) return;

  if (dd.classList.contains('open')) {
    dd.classList.remove('open');
    return;
  }

  if (type === 'business') {
    dd.innerHTML = `
      <button class="nav-dd-item" onclick="window.open('/rentoks-dashboard.html','_blank');closeNavDropdown()">🏢 Dashboard</button>
      <button class="nav-dd-item" onclick="window.open('/rentoks-dashboard.html#bookings','_blank');closeNavDropdown()">📋 Rezervimet</button>
      <hr class="nav-dd-sep"/>
      <button class="nav-dd-item" onclick="window.open('/rentoks-dashboard.html#settings','_blank');closeNavDropdown()">⚙️ Cilësimet</button>
      <hr class="nav-dd-sep"/>
      <button class="nav-dd-item danger" onclick="doNavLogout()">↪ Çkyçu</button>
    `;
  } else {
    dd.innerHTML = `
      <button class="nav-dd-item" onclick="openModalAuth('profile');closeNavDropdown()">👤 Profili im</button>
      <button class="nav-dd-item" onclick="openModalAuth('my-bookings');closeNavDropdown()">📋 Rezervimet mia</button>
      <hr class="nav-dd-sep"/>
      <button class="nav-dd-item danger" onclick="doNavLogout()">↪ Çkyçu</button>
    `;
  }

  dd.classList.add('open');
}

function closeNavDropdown() {
  const dd = document.getElementById('nav-dropdown');
  if (dd) dd.classList.remove('open');
}

function doNavLogout() {
  closeNavDropdown();
  localStorage.removeItem('rentoks_token');
  localStorage.removeItem('rentoks_user');
  showToastAuth('U çkyçe me sukses.', 'neutral');
  setTimeout(() => { window.location.href = '/'; }, 800);
}

// ── Open modal (override existing openM if exists) ──
function openModalAuth(type) {
  const ovEl = document.getElementById('ov');
  const mbEl = document.getElementById('mb');
  if (!ovEl || !mbEl) return;

  mbEl.innerHTML = '';

  if (type === 'login') {
    mbEl.innerHTML = `
      <div id="login-form">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:4px;">Mirë se vjen</div>
        <p style="font-size:14px;color:#888;margin-bottom:16px;">Hyr në llogarinë tënde Rentoks.</p>
        <div style="display:flex;background:#f2f1ed;padding:3px;border-radius:10px;gap:3px;margin-bottom:20px;" id="login-type-tabs">
          <button class="ltype-btn on" onclick="setLoginType(this,'user')" style="flex:1;padding:9px;border:none;background:white;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:all .15s;">👤 Klient</button>
          <button class="ltype-btn" onclick="setLoginType(this,'business')" style="flex:1;padding:9px;border:none;background:transparent;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#888;transition:all .15s;">🏢 Biznes</button>
        </div>
        <input type="hidden" id="login-type" value="user"/>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Email</label><input id="login-email" type="email" placeholder="email@shembull.com" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;" onkeydown="if(event.key==='Enter')doLogin()"/></div>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Fjalëkalimi</label><input id="login-password" type="password" placeholder="••••••••" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;" onkeydown="if(event.key==='Enter')doLogin()"/></div>
        <button id="login-btn" onclick="doLogin()" style="width:100%;padding:14px;background:#0d0d0d;color:white;border-radius:12px;font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;border:none;cursor:pointer;margin-top:4px;transition:background .15s;">Hyr</button>
        <hr style="border:none;border-top:1px solid #e8e7e2;margin:18px 0;"/>
        <p style="font-size:13px;color:#888;text-align:center;">Nuk ke llogari? <a href="#" onclick="openModalAuth('register-client')" style="color:#0d0d0d;font-weight:700;">Regjistrohu →</a></p>
      </div>`;

  } else if (type === 'register-client') {
    mbEl.innerHTML = `
      <div id="register-client-form">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:4px;">Krijo Llogarinë</div>
        <p style="font-size:14px;color:#888;margin-bottom:20px;">Regjistrohu si klient — falas dhe i shpejtë.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Emri</label><input id="rc-fname" type="text" placeholder="Emri" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
          <div><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Mbiemri</label><input id="rc-lname" type="text" placeholder="Mbiemri" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        </div>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Email</label><input id="rc-email" type="email" placeholder="email@shembull.com" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Telefoni</label><input id="rc-phone" type="tel" placeholder="+383 44 000 000" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Fjalëkalimi</label><input id="rc-password" type="password" placeholder="Minimum 6 karaktere" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        <button id="rc-btn" onclick="doRegisterClient()" style="width:100%;padding:14px;background:#0d0d0d;color:white;border-radius:12px;font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;border:none;cursor:pointer;margin-top:4px;">Krijo Llogarinë</button>
        <hr style="border:none;border-top:1px solid #e8e7e2;margin:18px 0;"/>
        <p style="font-size:13px;color:#888;text-align:center;">Ke llogari? <a href="#" onclick="openModalAuth('login')" style="color:#0d0d0d;font-weight:700;">Hyr →</a></p>
      </div>`;

  } else if (type === 'reg-biz') {
    mbEl.innerHTML = `
      <div id="register-biz-form">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:4px;">Regjistro Agjencinë</div>
        <p style="font-size:14px;color:#888;margin-bottom:20px;">Vetëm biznese me NUIS dhe licencë operative. Verifikojmë brenda 24 orëve.</p>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Emri i Pronarit</label><input id="rb-owner" type="text" placeholder="Emri i plotë" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Emri i Biznesit</label><input id="rb-bname" type="text" placeholder="p.sh. AutoPrishtina Rent" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">NUIS</label><input id="rb-nuis" type="text" placeholder="810xxxxxxx" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Email</label><input id="rb-email" type="email" placeholder="info@agjencia.com" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
          <div><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Telefoni</label><input id="rb-phone" type="tel" placeholder="+383 44..." style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Qyteti</label><select id="rb-city" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"><option>Prishtinë</option><option>Prizren</option><option>Pejë</option><option>Mitrovicë</option><option>Gjakovë</option><option>Ferizaj</option><option>Gjilan</option></select></div>
          <div><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Nr. Veturave</label><input id="rb-fleet" type="number" placeholder="p.sh. 10" min="1" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        </div>
        <div style="margin-bottom:14px;"><label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Fjalëkalimi</label><input id="rb-password" type="password" placeholder="Minimum 6 karaktere" style="width:100%;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;padding:11px 13px;border-radius:10px;font-size:14px;outline:none;"/></div>
        <div style="background:#f7f6f2;border:1.5px solid #e8e7e2;border-radius:10px;padding:14px;margin-bottom:14px;font-size:12px;color:#666;line-height:1.6;">
          ✓ Regjistrim falas &nbsp;|&nbsp; ✓ Komision 10% vetëm kur rezervon &nbsp;|&nbsp; ✓ Verifikim 24h
        </div>
        <button id="rb-btn" onclick="doRegisterBusiness()" style="width:100%;padding:14px;background:#0d0d0d;color:white;border-radius:12px;font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;border:none;cursor:pointer;">Dërgo Kërkesën →</button>
      </div>`;

  } else if (type === 'profile') {
    const user = Auth.getUser();
    mbEl.innerHTML = `
      <div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;margin-bottom:4px;">Llogaria ime</div>
        <p style="font-size:14px;color:#888;margin-bottom:20px;">${user?.email || ''}</p>
        <div style="background:#f7f6f2;border-radius:12px;padding:16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;"><span style="color:#888;">Emri</span><span style="font-weight:600;">${user?.name || user?.first_name + ' ' + user?.last_name || ''}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;"><span style="color:#888;">Email</span><span style="font-weight:600;">${user?.email || ''}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#888;">Telefoni</span><span style="font-weight:600;">${user?.phone || '—'}</span></div>
        </div>
        <button onclick="openModalAuth('my-bookings')" style="width:100%;padding:12px;background:#f7f6f2;border:1.5px solid #e8e7e2;color:#0d0d0d;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;">📋 Rezervimet mia</button>
        <button onclick="Auth.logout();document.getElementById('ov').classList.remove('open');" style="width:100%;padding:12px;background:#fff0f0;border:1.5px solid #fca5a5;color:#e53e3e;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">↪ Çkyçu</button>
      </div>`;

  } else if (type === 'my-bookings') {
    mbEl.innerHTML = `
      <div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;margin-bottom:4px;">Rezervimet mia</div>
        <p style="font-size:14px;color:#888;margin-bottom:20px;">Historia e rezervimeve tuaja.</p>
        <div id="my-bookings-list" style="display:flex;flex-direction:column;gap:10px;">
          <div style="text-align:center;padding:32px;color:#888;font-size:14px;">Duke u ngarkuar...</div>
        </div>
      </div>`;
    loadMyBookings();
  }

  ovEl.classList.add('open');
}

// ── Login type switch ──
function setLoginType(btn, type) {
  document.querySelectorAll('.ltype-btn').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = '#888';
    b.style.boxShadow = 'none';
  });
  btn.style.background = 'white';
  btn.style.color = '#0d0d0d';
  btn.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)';
  document.getElementById('login-type').value = type;
}

// ── Do Login ──
async function doLogin() {
  clearFormError('login-form');
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  const type = document.getElementById('login-type')?.value || 'user';
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    showFormError('login-form', 'Plotëso email dhe fjalëkalimin.');
    return;
  }

  setLoading(btn, true);
  try {
    const data = await apiCall('/auth/login', 'POST', { email, password, type });
    Auth.save(data.token, data.user);
    document.getElementById('ov').classList.remove('open');
    updateNavUI(data.user);
    showToastAuth(data.message || 'Mirë se vjen! 👋', 'success');

    // Redirect biznes te dashboard (same tab)
    if (data.user.type === 'business') {
      setTimeout(() => { window.location.href = '/rentoks-dashboard.html'; }, 1000);
    }
  } catch (err) {
    showFormError('login-form', err.message);
    setLoading(btn, false);
  }
}

// ── Do Register Client ──
async function doRegisterClient() {
  clearFormError('register-client-form');
  const body = {
    first_name: document.getElementById('rc-fname')?.value?.trim(),
    last_name: document.getElementById('rc-lname')?.value?.trim(),
    email: document.getElementById('rc-email')?.value?.trim(),
    phone: document.getElementById('rc-phone')?.value?.trim(),
    password: document.getElementById('rc-password')?.value
  };
  const btn = document.getElementById('rc-btn');

  if (!body.first_name || !body.last_name || !body.email || !body.password) {
    showFormError('register-client-form', 'Plotëso të gjitha fushat e detyrueshme.');
    return;
  }

  setLoading(btn, true);
  try {
    const data = await apiCall('/auth/register-client', 'POST', body);
    Auth.save(data.token, data.user);
    document.getElementById('ov').classList.remove('open');
    updateNavUI(data.user);
    showToastAuth('Llogaria u krijua me sukses! 🎉', 'success');
  } catch (err) {
    showFormError('register-client-form', err.message);
    setLoading(btn, false);
  }
}

// ── Do Register Business ──
async function doRegisterBusiness() {
  clearFormError('register-biz-form');
  const body = {
    owner_name: document.getElementById('rb-owner')?.value?.trim(),
    business_name: document.getElementById('rb-bname')?.value?.trim(),
    nuis: document.getElementById('rb-nuis')?.value?.trim(),
    email: document.getElementById('rb-email')?.value?.trim(),
    phone: document.getElementById('rb-phone')?.value?.trim(),
    city: document.getElementById('rb-city')?.value,
    fleet_size: document.getElementById('rb-fleet')?.value,
    password: document.getElementById('rb-password')?.value
  };
  const btn = document.getElementById('rb-btn');

  if (!body.owner_name || !body.business_name || !body.nuis || !body.email || !body.password) {
    showFormError('register-biz-form', 'Plotëso të gjitha fushat e detyrueshme.');
    return;
  }

  setLoading(btn, true);
  try {
    const data = await apiCall('/auth/register-business', 'POST', body);
    document.getElementById('ov').classList.remove('open');
    showToastAuth('Kërkesa u dërgua! Do të kontaktoheni brenda 24 orëve. ✓', 'pending');
  } catch (err) {
    showFormError('register-biz-form', err.message);
    setLoading(btn, false);
  }
}

// ── Load my bookings ──
async function loadMyBookings() {
  try {
    const bookings = await apiCall('/users/bookings');
    const list = document.getElementById('my-bookings-list');
    if (!list) return;

    if (bookings.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:32px;color:#888;font-size:14px;">Nuk ke rezervime akoma.</div>';
      return;
    }

    const statusColors = {
      pending: '#d97706', confirmed: '#2563eb', active: '#16a34a',
      completed: '#888', cancelled: '#e53e3e'
    };
    const statusLabels = {
      pending: 'Në pritje', confirmed: 'Konfirmuar', active: 'Aktive',
      completed: 'Përfunduar', cancelled: 'Anuluar'
    };

    list.innerHTML = bookings.map(b => `
      <div style="background:#f7f6f2;border:1px solid #e8e7e2;border-radius:12px;padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-weight:700;font-size:14px;color:#0d0d0d;">${b.brand} ${b.model} ${b.year}</div>
            <div style="font-size:12px;color:#888;margin-top:2px;">${b.business_name}</div>
          </div>
          <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;background:${statusColors[b.status]}20;color:${statusColors[b.status]};">
            ${statusLabels[b.status] || b.status}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid #e8e7e2;font-size:12px;color:#888;">
          <span>📅 ${b.from_date?.split('T')[0]} → ${b.to_date?.split('T')[0]}</span>
          <span style="font-weight:800;font-size:14px;color:#0d0d0d;">€${b.total}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    const list = document.getElementById('my-bookings-list');
    if (list) list.innerHTML = `<div style="text-align:center;padding:32px;color:#e53e3e;font-size:14px;">Gabim: ${err.message}</div>`;
  }
}

// ── Init on page load ──
document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  if (user) updateNavUI(user);

  // Mbyll dropdown kur klikohet jashtë tij
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-dropdown') && !e.target.closest('.n-ghost')) {
      closeNavDropdown();
    }
  });

  // Override modal buttons të ekzistueshëm
  const loginBtns = document.querySelectorAll('[onclick*="openM(\'login\')"]');
  loginBtns.forEach(btn => {
    btn.removeAttribute('onclick');
    btn.addEventListener('click', () => openModalAuth('login'));
  });

  const bizBtns = document.querySelectorAll('[onclick*="openM(\'reg-biz\')"]');
  bizBtns.forEach(btn => {
    btn.removeAttribute('onclick');
    btn.addEventListener('click', () => openModalAuth('reg-biz'));
  });
});
