const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// Middleware: vetëm biznese të aprovuara
const bizOnly = (req, res, next) => {
  if (req.user.type !== 'business') {
    return res.status(403).json({ error: 'Vetëm për biznese.' });
  }
  next();
};

// GET /api/businesses/profile
router.get('/profile', authMiddleware, bizOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, owner_name, business_name, nuis, email, phone,
              city, address, fleet_size, status, logo_url, created_at
       FROM businesses WHERE id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[GET /profile]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/businesses/profile
router.put('/profile', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { business_name, phone, city, address } = req.body;
    const result = await pool.query(
      `UPDATE businesses SET business_name=$1, phone=$2, city=$3, address=$4, updated_at=NOW()
       WHERE id=$5 RETURNING id, business_name, email, phone, city, address`,
      [business_name, phone, city, address, req.user.id]
    );
    res.json({ message: 'Profili u përditësua!', business: result.rows[0] });
  } catch (err) {
    console.error('[PUT /profile]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── VEHICLES ──

// GET /api/businesses/vehicles — flota e biznesit
router.get('/vehicles', authMiddleware, bizOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vehicles WHERE business_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /vehicles]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/businesses/vehicles — shto veturë
router.post('/vehicles', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { brand, model, year, fuel, transmission, seats, category,
            price_per_day, location, city, license_plate, features, description,
            photo_urls } = req.body;

    if (!brand || !model || !price_per_day) {
      return res.status(400).json({ error: 'Marka, modeli dhe çmimi janë të detyrueshme.' });
    }

    const result = await pool.query(
      `INSERT INTO vehicles
         (business_id, brand, model, year, fuel, transmission, seats, category,
          price_per_day, location, city, license_plate, features, description, photo_urls)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [req.user.id, brand, model, year, fuel, transmission, seats || 5, category,
       price_per_day, location, city, license_plate, features, description,
       photo_urls || []]
    );

    // Përditëso fleet_size
    await pool.query(
      'UPDATE businesses SET fleet_size = (SELECT COUNT(*) FROM vehicles WHERE business_id=$1) WHERE id=$1',
      [req.user.id]
    );

    res.status(201).json({ message: 'Vetura u shtua!', vehicle: result.rows[0] });
  } catch (err) {
    console.error('POST /api/businesses/vehicles:', err);
    res.status(500).json({ error: err.message || 'Gabim serveri.' });
  }
});

// PUT /api/businesses/vehicles/:id — edito veturë
router.put('/vehicles/:id', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model, year, fuel, transmission, seats,
            price_per_day, location, features, description, status, photo_urls } = req.body;

    console.log(`[PUT /vehicles/${id}] body:`, JSON.stringify(req.body));

    const check = await pool.query(
      'SELECT id FROM vehicles WHERE id=$1 AND business_id=$2', [id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Vetura nuk u gjet.' });

    const result = await pool.query(
      `UPDATE vehicles SET
         brand=$1, model=$2, year=$3, fuel=$4, transmission=$5, seats=$6,
         price_per_day=$7, location=$8, features=$9, description=$10,
         photo_urls=COALESCE($11, photo_urls),
         status=COALESCE($12, status)
       WHERE id=$13 AND business_id=$14
       RETURNING *`,
      [brand, model, year, fuel, transmission, seats,
       price_per_day, location, features, description,
       photo_urls || null, status || null, id, req.user.id]
    );

    console.log(`[PUT /vehicles/${id}] updated:`, result.rows[0]?.brand, result.rows[0]?.model);
    res.json({ message: 'Vetura u përditësua!', vehicle: result.rows[0] });
  } catch (err) {
    console.error(`[PUT /vehicles/:id] error:`, err.message);
    res.status(500).json({ error: err.message || 'Gabim serveri.' });
  }
});

// DELETE /api/businesses/vehicles/:id
router.delete('/vehicles/:id', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
      'SELECT id FROM vehicles WHERE id=$1 AND business_id=$2', [id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Vetura nuk u gjet.' });

    await pool.query('DELETE FROM vehicles WHERE id=$1', [id]);
    await pool.query(
      'UPDATE businesses SET fleet_size = (SELECT COUNT(*) FROM vehicles WHERE business_id=$1) WHERE id=$1',
      [req.user.id]
    );

    res.json({ message: 'Vetura u fshi.' });
  } catch (err) {
    console.error('[DELETE /vehicles/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── BOOKINGS ──

// GET /api/businesses/bookings — rezervimet e biznesit
router.get('/bookings', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT b.*, v.brand, v.model, v.year,
             u.first_name, u.last_name, u.email as client_email, u.phone as client_phone
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN users u ON b.user_id = u.id
      WHERE b.business_id = $1
    `;
    const params = [req.user.id];
    if (status) { query += ' AND b.status = $2'; params.push(status); }
    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /bookings]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/businesses/bookings/:id — konfirmo/anulo rezervim
router.put('/bookings/:id', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['confirmed', 'cancelled', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Status i pavlefshëm.' });
    }

    const check = await pool.query(
      'SELECT id FROM bookings WHERE id=$1 AND business_id=$2', [id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Rezervimi nuk u gjet.' });

    const result = await pool.query(
      'UPDATE bookings SET status=$1 WHERE id=$2 AND business_id=$3 RETURNING *',
      [status, id, req.user.id]
    );

    const messages = {
      confirmed: 'Rezervimi u konfirmua!',
      cancelled: 'Rezervimi u anulua.',
      completed: 'Rezervimi u shënua si i përfunduar.'
    };

    res.json({ message: messages[status], booking: result.rows[0] });
  } catch (err) {
    console.error('[PUT /bookings/:id] error:', err.message);
    res.status(500).json({ error: err.message || 'Gabim serveri.' });
  }
});

// GET /api/businesses/stats — statistikat e dashboard
router.get('/stats', authMiddleware, bizOnly, async (req, res) => {
  try {
    const id = req.user.id;

    const [revenue, bookings, vehicles, rating] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(net_amount),0) as total
         FROM bookings WHERE business_id=$1
         AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
         AND status != 'cancelled'`, [id]
      ),
      pool.query(
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=\'pending\') as pending FROM bookings WHERE business_id=$1', [id]
      ),
      pool.query(
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=\'active\') as active FROM vehicles WHERE business_id=$1', [id]
      ),
      pool.query(
        'SELECT ROUND(AVG(rating),1) as avg FROM reviews WHERE business_id=$1', [id]
      )
    ]);

    res.json({
      revenue_this_month: parseFloat(revenue.rows[0].total),
      total_bookings: parseInt(bookings.rows[0].total),
      pending_bookings: parseInt(bookings.rows[0].pending),
      total_vehicles: parseInt(vehicles.rows[0].total),
      active_vehicles: parseInt(vehicles.rows[0].active),
      avg_rating: parseFloat(rating.rows[0].avg) || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

// ── AVAILABILITY BLOCKS ──

// GET /api/businesses/blocks/:vehicle_id — merr blokimet e një veture
router.get('/blocks/:vehicle_id', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const check = await pool.query(
      'SELECT id FROM vehicles WHERE id=$1 AND business_id=$2',
      [vehicle_id, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: 'Vetura nuk u gjet.' });

    const result = await pool.query(
      `SELECT id, vehicle_id, business_id, date::text, reason, created_at
       FROM availability_blocks
       WHERE vehicle_id=$1 AND business_id=$2
       ORDER BY date`,
      [vehicle_id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

// POST /api/businesses/blocks — bloko një datë
router.post('/blocks', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { vehicle_id, date, reason } = req.body;
    if (!vehicle_id || !date)
      return res.status(400).json({ error: 'vehicle_id dhe date janë të detyrueshme.' });

    const check = await pool.query(
      'SELECT id FROM vehicles WHERE id=$1 AND business_id=$2',
      [vehicle_id, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: 'Vetura nuk u gjet.' });

    const result = await pool.query(
      `INSERT INTO availability_blocks (vehicle_id, business_id, date, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (vehicle_id, date) DO NOTHING
       RETURNING id, vehicle_id, business_id, date::text, reason, created_at`,
      [vehicle_id, req.user.id, date, reason || null]
    );
    res.status(201).json({ message: 'Data u bllokua!', block: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

// DELETE /api/businesses/blocks/:id — zhbloko
router.delete('/blocks/:id', authMiddleware, bizOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
      'SELECT id FROM availability_blocks WHERE id=$1 AND business_id=$2',
      [id, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: 'Bllokimi nuk u gjet.' });

    await pool.query('DELETE FROM availability_blocks WHERE id=$1', [id]);
    res.json({ message: 'Bllokimi u hoq.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

module.exports = router;
