const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sendBookingNotification } = require('../email');
const authMiddleware = require('../middleware/auth');

// POST /api/bookings - Krijo rezervim të ri
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id, business_id, from_date, to_date, payment_type, notes } = req.body;
    const user_id = req.user.id;

    // Llogarit ditët
    const days = Math.ceil((new Date(to_date) - new Date(from_date)) / 86400000);
    if (days < 1) return res.status(400).json({ error: 'Datat janë të gabuara.' });

    // Merr çmimin e veturës
    const vehicle = await pool.query('SELECT * FROM vehicles WHERE id=$1', [vehicle_id]);
    if (vehicle.rows.length === 0) return res.status(404).json({ error: 'Vetura nuk u gjet.' });

    const price_per_day = vehicle.rows[0].price_per_day;
    const total = price_per_day * days;
    const commission = total * 0.10;
    const net_amount = total - commission;

    // Krijo rezervimin
    const result = await pool.query(
      `INSERT INTO bookings 
        (user_id, vehicle_id, business_id, from_date, to_date, days, price_per_day, total, commission, net_amount, payment_type, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
       RETURNING *`,
      [user_id, vehicle_id, business_id, from_date, to_date, days, price_per_day, total, commission, net_amount, payment_type || 'cash', notes || null]
    );

    // Dërgo email tek agjencia
try {
  const biz = await pool.query('SELECT email, business_name FROM businesses WHERE id=$1', [business_id]);
  const user = await pool.query('SELECT first_name, last_name FROM users WHERE id=$1', [user_id]);
  if (biz.rows.length > 0) {
    await sendBookingNotification({
      to: biz.rows[0].email,
      businessName: biz.rows[0].business_name,
      clientName: `${user.rows[0].first_name} ${user.rows[0].last_name}`,
      carName: `${vehicle.rows[0].brand} ${vehicle.rows[0].model}`,
      fromDate: from_date,
      toDate: to_date,
      days,
      total
    });
  }
} catch (emailErr) {
  console.error('Email error:', emailErr);
}

res.status(201).json({ message: 'Kërkesa u dërgua!', booking: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

// GET /api/bookings/my - Rezervimet e klientit
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, v.brand, v.model, v.year, biz.business_name
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN businesses biz ON b.business_id = biz.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

module.exports = router;
