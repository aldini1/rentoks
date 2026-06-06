const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/users/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { id, type } = req.user;
    if (type !== 'user') return res.status(403).json({ error: 'Vetëm për klientë.' });

    const result = await pool.query(
      'SELECT id, first_name, last_name, email, phone, avatar_url, created_at FROM users WHERE id = $1',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { id, type } = req.user;
    if (type !== 'user') return res.status(403).json({ error: 'Vetëm për klientë.' });

    const { first_name, last_name, phone } = req.body;
    const result = await pool.query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, updated_at=NOW()
       WHERE id=$4 RETURNING id, first_name, last_name, email, phone`,
      [first_name, last_name, phone, id]
    );
    res.json({ message: 'Profili u përditësua!', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

// GET /api/users/bookings
router.get('/bookings', authMiddleware, async (req, res) => {
  try {
    const { id, type } = req.user;
    if (type !== 'user') return res.status(403).json({ error: 'Vetëm për klientë.' });

    const result = await pool.query(
      `SELECT b.*, v.brand, v.model, v.year, v.city as vehicle_city,
              biz.business_name
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN businesses biz ON b.business_id = biz.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

module.exports = router;
