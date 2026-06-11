const API = '/api';

// ── Token ──
function getToken() { return localStorage.getItem('rentoks_token'); }
function getUser() { const u = localStorage.getItem('rentoks_user'); return u ? JSON.parse(u) : null; }

async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(API + endpoint, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gabim');
  return data;
}

// ── Toast ──
function dashToast(msg, type = 'success') {
  const colors = { success: '#16a34a', error: '#e53e3e', neutral: '#0d0d0d' };
  let t = document.getElementById('dash-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'dash-toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);color:white;padding:12px 24px;border-radius:100px;font-size:14px;font-weight:600;z-index:9999;transition:all .3s;opacity:0;white-space:nowrap;font-family:"DM Sans",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);';
    document.body.appendChild(t);
  }
  t.style.background = colors[type] || colors.neutral;
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(80px)'; }, 4000);
}

// ── Load Stats ──
async function loadStats() {
  try {
    const stats = await apiCall('/businesses/stats');
    document.querySelector('.sc-val') && (document.querySelectorAll('.sc-val')[0].textContent = '€' + stats.revenue_this_month.toFixed(0));
    document.querySelectorAll('.sc-val')[1] && (document.querySelectorAll('.sc-val')[1].textContent = stats.total_bookings);
    document.querySelectorAll('.sc-val')[2] && (document.querySelectorAll('.sc-val')[2].textContent = stats.active_vehicles + '%');
    document.querySelectorAll('.sc-val')[3] && (document.querySelectorAll('.sc-val')[3].textContent = stats.avg_rating || '—');
  } catch(err) { console.error('Stats error:', err); }
}

// ── Load Bookings ──
async function loadBookings() {
  try {
    const bookings = await apiCall('/businesses/bookings');
    const tbody = document.querySelector('#page-overview table tbody');
    if (!tbody || bookings.length === 0) return;

    const statusMap = {
      pending: '<span class="status pending">Në pritje</span>',
      confirmed: '<span class="status confirmed">Konfirmuar</span>',
      active: '<span class="status active">Aktive</span>',
      completed: '<span class="status completed">Përfunduar</span>',
      cancelled: '<span class="status cancelled">Anuluar</span>'
    };

    tbody.innerHTML = bookings.slice(0,5).map(b => `
      <tr>
        <td><div class="td-car">${b.brand} ${b.model} ${b.year}</div></td>
        <td><div class="td-client"><div class="td-av" style="background:var(--paper2);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;">👤</div><div class="td-name">${b.first_name} ${b.last_name}</div></div></td>
        <td>${b.from_date?.split('T')[0]} → ${b.to_date?.split('T')[0]}</td>
        <td>${statusMap[b.status] || b.status}</td>
        <td><div class="td-price">€${b.total}</div></td>
        <td><div class="td-actions">
          ${b.status === 'pending' ? `<button class="btn-sm confirm" onclick="confirmBooking(${b.id})">Konfirmo</button><button class="btn-sm cancel" onclick="cancelBooking(${b.id})">Anulo</button>` : `<button class="btn-sm view">Shiko</button>`}
        </div></td>
      </tr>
    `).join('');
  } catch(err) { console.error('Bookings error:', err); }
}

// ── Confirm Booking ──
async function confirmBooking(id) {
  try {
    await apiCall(`/businesses/bookings/${id}`, 'PUT', { status: 'confirmed' });
    dashToast('Rezervimi u konfirmua! ✓', 'success');
    loadBookings();
    loadStats();
  } catch(err) { dashToast(err.message, 'error'); }
}

// ── Cancel Booking ──
async function cancelBooking(id) {
  try {
    await apiCall(`/businesses/bookings/${id}`, 'PUT', { status: 'cancelled' });
    dashToast('Rezervimi u anulua.', 'neutral');
    loadBookings();
    loadStats();
  } catch(err) { dashToast(err.message, 'error'); }
}

// ── Check Auth ──
function checkDashboardAuth() {
  const user = getUser();
  const token = getToken();
  if (!token || !user || user.type !== 'business') {
    window.location.href = '/';
    return false;
  }
  // Update sidebar name
  const bizName = document.querySelector('.sb-biz-name');
  const ownerName = document.querySelector('.sb-pname');
  if (bizName) bizName.textContent = user.name || user.business_name;
  if (ownerName) ownerName.textContent = user.owner_name || user.name;
  return true;
}

// ── Load Clients ──
async function loadClients() {
  const tbody = document.getElementById('clients-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray);">Duke ngarkuar...</td></tr>';

  try {
    const bookings = await apiCall('/businesses/bookings');

    // Aggregate unique clients from bookings
    const clientMap = {};
    bookings.forEach(b => {
      const uid = b.user_id;
      if (!clientMap[uid]) {
        clientMap[uid] = {
          user_id: uid,
          first_name: b.first_name,
          last_name: b.last_name,
          email: b.email || '—',
          phone: b.phone || '—',
          count: 0,
          total: 0,
          last_date: null
        };
      }
      clientMap[uid].count++;
      clientMap[uid].total += parseFloat(b.total) || 0;
      const bd = new Date(b.from_date);
      if (!clientMap[uid].last_date || bd > clientMap[uid].last_date) {
        clientMap[uid].last_date = bd;
      }
    });

    const clients = Object.values(clientMap);

    // Update subtitle
    const phSub = document.querySelector('#page-clients .ph-sub');
    if (phSub) phSub.textContent = `${clients.length} klientë unikë`;

    if (clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray);">Nuk ka klientë akoma.</td></tr>';
      return;
    }

    // Sort by last booking date desc
    clients.sort((a, b) => (b.last_date || 0) - (a.last_date || 0));

    tbody.innerHTML = clients.map(c => `
      <tr>
        <td>
          <div class="td-client">
            <div class="td-av" style="background:var(--paper2);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;">👤</div>
            <div class="td-name">${c.first_name} ${c.last_name}</div>
          </div>
        </td>
        <td>${c.email}</td>
        <td>${c.phone}</td>
        <td>${c.count}</td>
        <td><strong>€${c.total.toFixed(0)}</strong></td>
        <td>${c.last_date ? c.last_date.toISOString().split('T')[0] : '—'}</td>
      </tr>
    `).join('');
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--red);">Gabim: ${err.message}</td></tr>`;
  }
}

// ── Logout ──
function dashLogout() {
  localStorage.removeItem('rentoks_token');
  localStorage.removeItem('rentoks_user');
  window.location.href = '/';
}

// ── Fleet helpers ──
let _fleetVehicles = [];

function showFleetSkeleton() {
  const grid = document.getElementById('fleet-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({length: 6}, () => `
    <div class="fc-skel">
      <div class="fc-skel-img"></div>
      <div class="fc-skel-body">
        <div class="fc-skel-line" style="width:65%"></div>
        <div class="fc-skel-line" style="width:40%;margin-top:6px"></div>
        <div class="fc-skel-line" style="width:80%;margin-top:14px"></div>
      </div>
    </div>`).join('');
}

function renderFleetCards(vehicles) {
  const grid = document.getElementById('fleet-grid');
  if (!grid) return;

  if (!vehicles.length) {
    grid.innerHTML = `
      <div class="fc-empty">
        <svg width="52" height="40" viewBox="0 0 52 40" fill="none"><rect x="2" y="10" width="48" height="24" rx="6" stroke="#ccc" stroke-width="2.5"/><path d="M6 10l4-8h32l4 8" stroke="#ccc" stroke-width="2.5" stroke-linejoin="round"/><circle cx="14" cy="34" r="4" stroke="#ccc" stroke-width="2"/><circle cx="38" cy="34" r="4" stroke="#ccc" stroke-width="2"/></svg>
        <div class="fc-empty-title">Nuk ka vetura</div>
        <div class="fc-empty-sub">Shto veturën e parë →</div>
        <button class="btn-solid" onclick="showAddCar()" style="margin-top:20px;padding:10px 24px;border-radius:10px;font-size:13px;">+ Shto Veturë</button>
      </div>`;
    return;
  }

  const statusLabel = { active: 'Aktive', inactive: 'Joaktive', maintenance: 'Mirëmbajtje' };

  grid.innerHTML = vehicles.map(v => {
    const status = v.status || 'active';
    const photos = Array.isArray(v.photo_urls) ? v.photo_urls.filter(Boolean) : [];
    const photoHtml = photos.length
      ? `<img class="fc-photo" src="${photos[0]}" alt="${v.brand} ${v.model}" loading="lazy">`
      : `<div class="fc-photo-placeholder"><svg width="52" height="38" viewBox="0 0 52 38" fill="none"><rect x="2" y="8" width="48" height="24" rx="5" stroke="#ccc" stroke-width="2"/><path d="M6 8l4-6h32l4 6" stroke="#ccc" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="32" r="3.5" stroke="#ccc" stroke-width="1.5"/><circle cx="38" cy="32" r="3.5" stroke="#ccc" stroke-width="1.5"/></svg></div>`;
    const dots = Array.from({length: 7}, (_, i) =>
      `<div class="fc-avail-dot ${i === 0 ? 'today' : 'free'}" title="${i === 0 ? 'Sot' : 'I lirë'}"></div>`).join('');
    const loc = (v.location || '').replace(/'/g, '&#39;');
    const feat = (v.features || '').replace(/'/g, '&#39;');

    return `
      <div class="fc" data-id="${v.id}" data-status="${status}">
        ${photoHtml}
        <div class="fc-body">
          <div class="fc-name">${v.brand} ${v.model} ${v.year}</div>
          <div class="fc-meta">${v.transmission || '—'} · ${v.fuel || '—'} · ${v.seats || '—'} vende</div>
          <div class="fc-row">
            <div class="fc-price">€${v.price_per_day}<small>/ditë</small></div>
            <span class="fc-status ${status}"><div class="fc-dot"></div>${statusLabel[status] || status}</span>
          </div>
          <div class="fc-avail-label">7 ditë të ardhshme</div>
          <div class="fc-avail">${dots}</div>
          <div class="fc-actions">
            <button class="fc-btn edit" onclick="enterEditVehicleForm(_fleetVehicles.find(x=>x.id===${v.id}))">Edito</button>
            <button class="fc-btn del" onclick="deleteVehicle(${v.id})">Fshij</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function filterFleet(status, btn) {
  document.querySelectorAll('.ff').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderFleetCards(status === 'all' ? _fleetVehicles : _fleetVehicles.filter(v => v.status === status));
}

function searchFleet(query) {
  const q = (query || '').toLowerCase().trim();
  renderFleetCards(!q ? _fleetVehicles : _fleetVehicles.filter(v =>
    `${v.brand} ${v.model} ${v.year}`.toLowerCase().includes(q)));
}

// ── Load Vehicles (Fleet page) ──
async function loadVehicles() {
  showFleetSkeleton();
  try {
    const vehicles = await apiCall('/businesses/vehicles');
    _fleetVehicles = vehicles;
    const phSub = document.querySelector('#page-fleet .ph-sub');
    if (phSub) phSub.textContent = `${vehicles.length} vetura të regjistruara`;
    document.querySelectorAll('.ff').forEach((b, i) => b.classList.toggle('on', i === 0));
    renderFleetCards(vehicles);
  } catch(err) {
    console.error('Vehicles error:', err);
    dashToast('Gabim në ngarkimin e flotës', 'error');
    const grid = document.getElementById('fleet-grid');
    if (grid) grid.innerHTML = '<div class="fc-empty"><div class="fc-empty-title">Gabim gjatë ngarkimit</div></div>';
  }
}

// ── Add Vehicle ──
async function addVehicle() {
  const btn = document.getElementById('save-car-btn');
  if (btn) { btn.disabled = true; }

  try {
    // Upload photos first (selectedFiles is declared in the inline script)
    const photoUrls = [];
    const files = typeof selectedFiles !== 'undefined' ? selectedFiles : [];
    for (let i = 0; i < files.length; i++) {
      if (btn) btn.textContent = `Duke ngarkuar foton ${i + 1}/${files.length}...`;
      const fd = new FormData();
      fd.append('photo', files[i]);
      const r = await fetch('/api/upload/vehicle-photo', { method: 'POST', body: fd });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Ngarkimi dështoi'); }
      photoUrls.push((await r.json()).url);
    }

    if (btn) btn.textContent = 'Duke ruajtur...';

    const body = {
      brand:         document.getElementById('v-brand')?.value,
      model:         document.getElementById('v-model')?.value?.trim(),
      year:          parseInt(document.getElementById('v-year')?.value),
      fuel:          document.getElementById('v-fuel')?.value,
      transmission:  document.getElementById('v-transmission')?.value,
      price_per_day: parseFloat(document.getElementById('v-price')?.value),
      seats:         parseInt(document.getElementById('v-seats')?.value),
      location:      document.getElementById('v-location')?.value?.trim(),
      features:      document.getElementById('v-features')?.value?.trim(),
      description:   document.getElementById('v-description')?.value?.trim(),
      city:          getUser()?.city || 'Prishtinë',
      category:      'sedan',
      photo_urls:    photoUrls,
    };

    if (!body.brand || !body.model || !body.year || !body.price_per_day) {
      dashToast('Plotëso: Marka, Modeli, Viti dhe Çmimi!', 'error');
      return;
    }

    await apiCall('/businesses/vehicles', 'POST', body);
    dashToast('Vetura u shtua me sukses! ✓', 'success');
    document.getElementById('add-car-form').classList.remove('open');

    ['v-model','v-year','v-price','v-location','v-features','v-description'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    if (typeof selectedFiles !== 'undefined') { selectedFiles.length = 0; }
    if (typeof renderPhotoPreviews === 'function') renderPhotoPreviews();

    loadVehicles();
    loadStats();
  } catch(err) {
    dashToast(err.message, 'error');
  } finally {
    if (btn) { btn.textContent = 'Ruaj Veturën'; btn.disabled = false; }
  }
}

// ── Edit Vehicle — inline form ──
function setSelectByText(id, text) {
  const el = document.getElementById(id);
  if (!el || text == null) return;
  const val = String(text);
  for (const opt of el.options) {
    if (opt.value === val || opt.text === val) { opt.selected = true; return; }
  }
}

function resetFormToAddMode() {
  document.getElementById('v-edit-id').value = '';
  ['v-model','v-year','v-price','v-location','v-features','v-description'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const titleEl = document.getElementById('fp-title');
  const subEl = document.getElementById('fp-sub');
  const saveBtn = document.getElementById('save-car-btn');
  if (titleEl) titleEl.textContent = 'Shto Veturë të Re';
  if (subEl) subEl.textContent = 'Plotëso të dhënat e veturës. Do të shfaqet në platformë pas aprovimit.';
  if (saveBtn) saveBtn.textContent = 'Ruaj Veturën';
  const addBtn = document.getElementById('btn-cancel-add');
  const editBtn = document.getElementById('btn-cancel-edit');
  if (addBtn) addBtn.style.display = '';
  if (editBtn) editBtn.style.display = 'none';
}

function enterEditVehicleForm(v) {
  if (!v) return;
  document.getElementById('v-edit-id').value = v.id;
  setSelectByText('v-brand', v.brand);
  document.getElementById('v-model').value = v.model || '';
  document.getElementById('v-year').value = v.year || '';
  setSelectByText('v-fuel', v.fuel);
  setSelectByText('v-transmission', v.transmission);
  setSelectByText('v-seats', String(v.seats || ''));
  document.getElementById('v-price').value = v.price_per_day || '';
  document.getElementById('v-location').value = v.location || '';
  document.getElementById('v-features').value = v.features || '';
  document.getElementById('v-description').value = v.description || '';

  const titleEl = document.getElementById('fp-title');
  const subEl = document.getElementById('fp-sub');
  const saveBtn = document.getElementById('save-car-btn');
  if (titleEl) titleEl.textContent = 'Edito Veturën';
  if (subEl) subEl.textContent = `${v.brand} ${v.model} ${v.year} — ndrysho të dhënat.`;
  if (saveBtn) saveBtn.textContent = 'Ruaj Ndryshimet';
  const addBtn = document.getElementById('btn-cancel-add');
  const editBtn = document.getElementById('btn-cancel-edit');
  if (addBtn) addBtn.style.display = 'none';
  if (editBtn) editBtn.style.display = '';

  goPage('fleet', document.querySelector('[onclick*="fleet"]'));
  const form = document.getElementById('add-car-form');
  form.classList.add('open');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditVehicle() {
  resetFormToAddMode();
  document.getElementById('add-car-form').classList.remove('open');
}

function submitVehicleForm() {
  const editId = parseInt(document.getElementById('v-edit-id')?.value || '0');
  if (editId) {
    updateVehicleForm(editId);
  } else {
    addVehicle();
  }
}

async function updateVehicleForm(id) {
  const btn = document.getElementById('save-car-btn');
  if (btn) btn.disabled = true;
  try {
    const body = {
      brand:         document.getElementById('v-brand')?.value,
      model:         document.getElementById('v-model')?.value?.trim(),
      year:          parseInt(document.getElementById('v-year')?.value),
      fuel:          document.getElementById('v-fuel')?.value,
      transmission:  document.getElementById('v-transmission')?.value,
      price_per_day: parseFloat(document.getElementById('v-price')?.value),
      seats:         parseInt(document.getElementById('v-seats')?.value),
      location:      document.getElementById('v-location')?.value?.trim(),
      features:      document.getElementById('v-features')?.value?.trim(),
      description:   document.getElementById('v-description')?.value?.trim(),
    };
    if (!body.brand || !body.model || !body.price_per_day) {
      dashToast('Plotëso: Marka, Modeli dhe Çmimi!', 'error');
      return;
    }
    await apiCall(`/businesses/vehicles/${id}`, 'PUT', body);
    dashToast('Vetura u ruajt! ✓', 'success');
    cancelEditVehicle();
    loadVehicles();
    loadStats();
  } catch(err) {
    dashToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ruaj Ndryshimet'; }
  }
}

// ── Delete Vehicle ──
async function deleteVehicle(id) {
  if (!confirm('A jeni të sigurt? Ky veprim nuk mund të kthehet.')) return;
  try {
    await apiCall(`/businesses/vehicles/${id}`, 'DELETE');
    dashToast('Vetura u fshi.', 'neutral');
    loadVehicles();
    loadStats();
  } catch(err) { dashToast(err.message, 'error'); }
}

// ── Load All Bookings (full bookings page) ──
async function loadAllBookings() {
  try {
    const bookings = await apiCall('/businesses/bookings');

    // Update page subtitle
    const pending = bookings.filter(b => b.status === 'pending').length;
    const phSub = document.querySelector('#page-bookings .ph-sub');
    if (phSub) phSub.textContent = `${bookings.length} gjithsej · ${pending} kërkojnë vëmendje`;

    const tbody = document.querySelector('#page-bookings table tbody');
    if (!tbody) return;

    const statusMap = {
      pending: '<span class="status pending">Në pritje</span>',
      confirmed: '<span class="status confirmed">Konfirmuar</span>',
      active: '<span class="status active">Aktive</span>',
      completed: '<span class="status completed">Përfunduar</span>',
      cancelled: '<span class="status cancelled">Anuluar</span>'
    };

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gray);">Nuk ka rezervime akoma.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map((b, i) => `
      <tr>
        <td style="color:var(--gray);font-weight:700;">#${String(b.id).padStart(3,'0')}</td>
        <td><div class="td-car">${b.brand} ${b.model}</div></td>
        <td><div class="td-client">
          <div class="td-av" style="background:var(--paper2);display:flex;align-items:center;justify-content:center;font-size:11px;">👤</div>
          <div class="td-name">${b.first_name} ${b.last_name}</div>
        </div></td>
        <td>${b.from_date?.split('T')[0]}</td>
        <td>${b.to_date?.split('T')[0]}</td>
        <td>${b.days}</td>
        <td>${statusMap[b.status] || b.status}</td>
        <td><div class="td-price">€${b.total}</div></td>
        <td><div class="td-actions">
          ${b.status === 'pending'
            ? `<button class="btn-sm confirm" onclick="confirmBooking(${b.id});loadAllBookings()">Konfirmo</button><button class="btn-sm cancel" onclick="cancelBooking(${b.id});loadAllBookings()">Anulo</button>`
            : `<button class="btn-sm view">Detaje</button>`}
        </div></td>
      </tr>
    `).join('');
  } catch(err) { console.error('All bookings error:', err); }
}

// ── Load Earnings ──
async function loadEarnings() {
  try {
    const stats = await apiCall('/businesses/stats');
    const revenue = parseFloat(stats.revenue_this_month) || 0;
    const commission = revenue * 0.10;
    const net = revenue - commission;

    const earnRevEl = document.getElementById('earn-revenue');
    const earnComEl = document.getElementById('earn-commission');
    const earnNetEl = document.getElementById('earn-net');
    const earnBookEl = document.getElementById('earn-bookings-info');

    if (earnRevEl) earnRevEl.textContent = '€' + revenue.toFixed(0);
    if (earnComEl) earnComEl.textContent = '€' + commission.toFixed(0);
    if (earnNetEl) earnNetEl.textContent = '€' + net.toFixed(0);
    if (earnBookEl) earnBookEl.textContent = `${stats.total_bookings || 0} rezervime`;
  } catch(err) { console.error('Earnings error:', err); }
}

// ── Toggle Block (kliko datë të lirë = bloko, kliko bllokuar = hiq) ──
async function toggleBlock(vehicleId, dateStr, blockId) {
  try {
    if (blockId) {
      await apiCall(`/businesses/blocks/${blockId}`, 'DELETE');
      dashToast('Bllokimi u hoq. ✓', 'neutral');
    } else {
      await apiCall('/businesses/blocks', 'POST', {
        vehicle_id: vehicleId,
        date: dateStr,
        reason: 'Bllokuar manualisht'
      });
      dashToast('Data u bllokua. 🔒', 'success');
    }
    loadCalendarReal();
  } catch(err) {
    dashToast(err.message, 'error');
  }
}

// ── Load Calendar Real (3 ngjyra: E gjelbër / E kuqe / Portokalli) ──
async function loadCalendarReal() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="padding:32px;text-align:center;color:var(--gray);">Duke ngarkuar...</div>';

  try {
    const [vehicles, bookings] = await Promise.all([
      apiCall('/businesses/vehicles'),
      apiCall('/businesses/bookings')
    ]);

    if (vehicles.length === 0) {
      grid.innerHTML = '<div style="padding:32px;text-align:center;color:var(--gray);">Nuk ke vetura të regjistruara.</div>';
      return;
    }

    // Ngarko blokimet paralel (fail gracefully nëse tabela nuk ekziston akoma)
    const blockResults = await Promise.allSettled(
      vehicles.map(v => apiCall(`/businesses/blocks/${v.id}`))
    );

    // Map "vehicleId_dateStr" → true  (rezervime nga platforma)
    const bookedDates = {};
    bookings.forEach(b => {
      if (b.status === 'cancelled' || b.status === 'completed') return;
      const from = new Date(b.from_date); from.setHours(0,0,0,0);
      const to   = new Date(b.to_date);   to.setHours(0,0,0,0);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        bookedDates[`${b.vehicle_id}_${d.toISOString().split('T')[0]}`] = true;
      }
    });

    // Map "vehicleId_dateStr" → blockId  (blokime manuale)
    const blockedDates = {};
    blockResults.forEach(res => {
      if (res.status === 'fulfilled') {
        res.value.forEach(bl => {
          const ds = (bl.date || '').split('T')[0];
          if (ds) blockedDates[`${bl.vehicle_id}_${ds}`] = bl.id;
        });
      }
    });

    const days = 14;
    const today = new Date(); today.setHours(0,0,0,0);
    const dayNames = ['Di','Hë','Ma','Më','En','Pr','Sh'];

    let html = `<table style="border-collapse:collapse;min-width:620px;width:100%;">
      <thead><tr>
        <th style="padding:10px 16px;font-size:11px;font-weight:700;text-align:left;color:var(--gray);
                   text-transform:uppercase;letter-spacing:.8px;background:var(--paper);
                   border-bottom:1px solid var(--border);min-width:150px;">Vetura</th>`;

    for (let i = 0; i < days; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const isToday = i === 0;
      html += `<th style="padding:8px 4px;font-size:10px;font-weight:700;text-align:center;
                          color:${isToday?'var(--ink)':'var(--gray)'};background:var(--paper);
                          border-bottom:1px solid var(--border);min-width:38px;">
                 ${d.getDate()}<br><span style="font-weight:400;">${dayNames[d.getDay()]}</span>
               </th>`;
    }
    html += '</tr></thead><tbody>';

    vehicles.forEach(v => {
      html += `<tr>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:var(--ink);
                   border-bottom:1px solid var(--border);white-space:nowrap;">
          ${v.brand} ${v.model} ${v.year}
        </td>`;

      for (let i = 0; i < days; i++) {
        const d = new Date(today); d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const isToday = i === 0;
        const key = `${v.id}_${dateStr}`;

        const isPlatformBooked = !!bookedDates[key];
        const blockId = blockedDates[key] || null;
        const isManualBlock = !!blockId;

        let bg, borderColor, cursor, onclick, titleTxt, ring = '';

        if (isPlatformBooked) {
          // 🔴 E kuqe — rezervim aktiv nga platforma
          bg = 'var(--red-light)'; borderColor = '#fca5a5';
          cursor = 'default';
          onclick = `dashToast('Rezervim aktiv i platformës — ${v.brand} ${v.model}','neutral')`;
          titleTxt = 'Rezervim i platformës';
        } else if (isManualBlock) {
          // 🟠 Portokalli — bllokuar manualisht, kliko për të hequr
          bg = '#fed7aa'; borderColor = '#fb923c';
          cursor = 'pointer';
          onclick = `toggleBlock(${v.id},'${dateStr}',${blockId})`;
          titleTxt = 'Bllokuar manualisht — kliko prër të hequr';
        } else {
          // 🟢 E gjelbër (lime sot) — i lirë, kliko për të bllokuar
          bg = isToday ? 'var(--lime)' : 'var(--green-light)';
          borderColor = isToday ? 'var(--lime2)' : '#86efac';
          cursor = 'pointer';
          onclick = `toggleBlock(${v.id},'${dateStr}',null)`;
          titleTxt = isToday ? 'Sot — kliko prër të bllokuar' : 'I lirë — kliko prër të bllokuar';
        }

        // Unazë lime për ditën e sotme edhe kur është e zënë
        if (isToday && (isPlatformBooked || isManualBlock)) {
          ring = 'outline:2px solid var(--lime);outline-offset:-2px;';
        }

        html += `<td style="padding:4px;border-bottom:1px solid var(--border);text-align:center;">
          <div style="width:28px;height:28px;border-radius:6px;background:${bg};
                      border:1.5px solid ${borderColor};margin:0 auto;
                      cursor:${cursor};transition:opacity .15s;${ring}"
               onmouseover="if(this.style.cursor!='default')this.style.opacity='.7'"
               onmouseout="this.style.opacity='1'"
               onclick="${onclick}" title="${titleTxt}"></div>
        </td>`;
      }
      html += '</tr>';
    });

    html += '</tbody></table>';
    grid.innerHTML = html;

  } catch(err) {
    grid.innerHTML = `<div style="padding:32px;text-align:center;color:var(--red);">Gabim: ${err.message}</div>`;
    console.error('Calendar error:', err);
  }
}

// Alias — goPage('calendar') thërret loadCalendar()
function loadCalendar() { loadCalendarReal(); }

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  if (!checkDashboardAuth()) return;
  loadStats();
  loadBookings(); // overview table (top 5)

  // Deep-link hash: /rentoks-dashboard.html#bookings → goPage('bookings')
  const validPages = ['overview','bookings','fleet','earnings','calendar','clients','reviews','settings'];
  const hash = window.location.hash.replace('#', '');
  if (hash && validPages.includes(hash)) {
    const btn = document.querySelector(`.sb-item[onclick*="'${hash}'"]`);
    if (typeof goPage === 'function') goPage(hash, btn);
  }
});