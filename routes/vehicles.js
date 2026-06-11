const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/vehicles — lista aktive me filtrim
router.get('/', async (req, res) => {
  try {
    const { category, city, max_price, exclude_id, limit = 20, offset = 0 } = req.query;

    const conditions = ["v.status = 'active'", "b.status = 'approved'"];
    const params = [];
    let i = 1;

    if (category)   { conditions.push(`v.category = $${i++}`);            params.push(category); }
    if (city)       { conditions.push(`v.city ILIKE $${i++}`);            params.push(`%${city}%`); }
    if (max_price)  { conditions.push(`v.price_per_day <= $${i++}`);      params.push(parseFloat(max_price)); }
    if (exclude_id) { conditions.push(`v.id != $${i++}`);                 params.push(parseInt(exclude_id)); }

    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT v.*, b.business_name, b.city AS biz_city, b.logo_url
       FROM vehicles v
       JOIN businesses b ON v.business_id = b.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY v.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/vehicles:', err.message);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

// GET /api/vehicles/:id — detajet e plotë + info agjencia
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*,
              b.business_name, b.city AS biz_city, b.logo_url, b.id AS biz_id
       FROM vehicles v
       JOIN businesses b ON v.business_id = b.id
       WHERE v.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Vetura nuk u gjet.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/vehicles/:id:', err.message);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

module.exports = router;
