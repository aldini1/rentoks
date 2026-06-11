const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/vehicles/debug — count rows and check join (must be before /:id)
router.get('/debug', async (req, res) => {
  try {
    const [vCount, bCount, bStatuses, vStatuses, joinResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM vehicles'),
      pool.query('SELECT COUNT(*) FROM businesses'),
      pool.query("SELECT status, COUNT(*) FROM businesses GROUP BY status"),
      pool.query("SELECT status, COUNT(*) FROM vehicles GROUP BY status"),
      pool.query(`SELECT v.id, v.brand, v.model, v.status AS v_status,
                         b.id AS b_id, b.business_name, b.status AS b_status
                  FROM vehicles v
                  LEFT JOIN businesses b ON v.business_id = b.id
                  LIMIT 5`),
    ]);

    const payload = {
      vehicles_total:    parseInt(vCount.rows[0].count),
      businesses_total:  parseInt(bCount.rows[0].count),
      business_statuses: bStatuses.rows,
      vehicle_statuses:  vStatuses.rows,
      sample_join:       joinResult.rows,
    };

    console.log('[debug] vehicles:', payload.vehicles_total,
                '| businesses:', payload.businesses_total,
                '| b.statuses:', JSON.stringify(payload.business_statuses),
                '| v.statuses:', JSON.stringify(payload.vehicle_statuses));

    res.json(payload);
  } catch (err) {
    console.error('[debug] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vehicles — lista aktive me filtrim
router.get('/', async (req, res) => {
  try {
    const { city, category, exclude_id, limit = 12 } = req.query;
    let query = `
      SELECT v.*, b.business_name, b.city AS business_city
      FROM vehicles v
      JOIN businesses b ON v.business_id = b.id
      WHERE v.status = 'active'
    `;
    const params = [];
    if (city)       { params.push(city);             query += ` AND v.city = $${params.length}`; }
    if (category)   { params.push(category);          query += ` AND v.category = $${params.length}`; }
    if (exclude_id) { params.push(parseInt(exclude_id)); query += ` AND v.id != $${params.length}`; }
    params.push(parseInt(limit));
    query += ` ORDER BY v.created_at DESC LIMIT $${params.length}`;

    console.log('[GET /api/vehicles] query:', query, '| params:', params);
    const result = await pool.query(query, params);
    console.log('[GET /api/vehicles] rows:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/vehicles] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vehicles/:id — detajet e plotë + info agjencia
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID e pavlefshme.' });
  try {
    const result = await pool.query(
      `SELECT v.*,
              b.business_name, b.city AS biz_city, b.logo_url, b.id AS biz_id
       FROM vehicles v
       JOIN businesses b ON v.business_id = b.id
       WHERE v.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Vetura nuk u gjet.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/vehicles/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
