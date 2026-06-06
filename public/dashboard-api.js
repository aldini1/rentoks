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

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  if (!checkDashboardAuth()) return;
  loadStats();
  loadBookings();
});