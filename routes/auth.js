const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// ─── Helper: gjeneroj JWT ───
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ─── Helper: validoj email ───
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ══════════════════════════════════════
// POST /api/auth/register-client
// Regjistrim klienti i ri
// ══════════════════════════════════════
router.post('/register-client', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    // Validim
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Të gjitha fushat janë të detyrueshme.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email i pavlefshëm.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' });
    }

    // Kontroll nëse email ekziston
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ky email është tashmë i regjistruar.' });
    }

    // Hash fjalëkalimin
    const hashedPassword = await bcrypt.hash(password, 12);

    // Krijo userin
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role)
       VALUES ($1, $2, $3, $4, $5, 'client')
       RETURNING id, first_name, last_name, email, phone, role, created_at`,
      [first_name.trim(), last_name.trim(), email.toLowerCase(), phone || null, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken({ id: user.id, email: user.email, role: 'client', type: 'user' });

    res.status(201).json({
      message: 'Llogaria u krijua me sukses!',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        type: 'user'
      }
    });

  } catch (err) {
    console.error('Register client error:', err);
    res.status(500).json({ error: 'Gabim serveri. Provo sërish.' });
  }
});

// ══════════════════════════════════════
// POST /api/auth/register-business
// Regjistrim agjenci e re
// ══════════════════════════════════════
router.post('/register-business', async (req, res) => {
  try {
    const { owner_name, business_name, nuis, email, phone, password, city, fleet_size } = req.body;

    // Validim
    if (!owner_name || !business_name || !nuis || !email || !password) {
      return res.status(400).json({ error: 'Të gjitha fushat janë të detyrueshme.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email i pavlefshëm.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' });
    }
    if (nuis.length < 8) {
      return res.status(400).json({ error: 'NUIS i pavlefshëm.' });
    }

    // Kontroll nëse email ose NUIS ekziston
    const existingEmail = await pool.query(
      'SELECT id FROM businesses WHERE email = $1', [email.toLowerCase()]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Ky email është tashmë i regjistruar.' });
    }

    const existingNuis = await pool.query(
      'SELECT id FROM businesses WHERE nuis = $1', [nuis]
    );
    if (existingNuis.rows.length > 0) {
      return res.status(409).json({ error: 'Ky NUIS është tashmë i regjistruar.' });
    }

    // Hash fjalëkalimin
    const hashedPassword = await bcrypt.hash(password, 12);

    // Krijo biznesin (status: pending - pret aprovim)
    const result = await pool.query(
      `INSERT INTO businesses (owner_name, business_name, nuis, email, phone, password, city, fleet_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING id, owner_name, business_name, nuis, email, phone, city, status, created_at`,
      [owner_name.trim(), business_name.trim(), nuis.trim(), email.toLowerCase(),
       phone || null, hashedPassword, city || null, fleet_size || 0]
    );

    const biz = result.rows[0];

    // Nuk japim token ende — duhet aprovim nga admin
    res.status(201).json({
      message: 'Kërkesa u dërgua! Do të kontaktoheni brenda 24 orëve për verifikim.',
      business: {
        id: biz.id,
        business_name: biz.business_name,
        email: biz.email,
        status: biz.status
      }
    });

  } catch (err) {
    console.error('Register business error:', err);
    res.status(500).json({ error: 'Gabim serveri. Provo sërish.' });
  }
});

// ══════════════════════════════════════
// POST /api/auth/login
// Login për klientë dhe biznese
// ══════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { email, password, type } = req.body;
    // type: 'user' | 'business'

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dhe fjalëkalimi janë të detyrueshme.' });
    }

    if (type === 'business') {
      // Login biznes
      const result = await pool.query(
        `SELECT id, owner_name, business_name, email, password, status, is_verified
         FROM businesses WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Email ose fjalëkalim i gabuar.' });
      }

      const biz = result.rows[0];

      // Kontrollo statusin
      if (biz.status === 'pending') {
        return res.status(403).json({ error: 'Llogaria juaj është në pritje të aprovimit. Do të njoftoheni brenda 24 orëve.' });
      }
      if (biz.status === 'rejected') {
        return res.status(403).json({ error: 'Llogaria juaj nuk u aprovua. Kontaktoni support@rentoks.com.' });
      }
      if (biz.status === 'suspended') {
        return res.status(403).json({ error: 'Llogaria juaj është pezulluar. Kontaktoni support.' });
      }

      // Verifiko fjalëkalimin
      const valid = await bcrypt.compare(password, biz.password);
      if (!valid) {
        return res.status(401).json({ error: 'Email ose fjalëkalim i gabuar.' });
      }

      const token = generateToken({
        id: biz.id, email: biz.email, role: 'business', type: 'business'
      });

      return res.json({
        message: `Mirë se vjen, ${biz.business_name}!`,
        token,
        user: {
          id: biz.id,
          name: biz.business_name,
          owner_name: biz.owner_name,
          email: biz.email,
          role: 'business',
          type: 'business',
          status: biz.status
        }
      });

    } else {
      // Login klient (default)
      const result = await pool.query(
        `SELECT id, first_name, last_name, email, phone, password, role
         FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Email ose fjalëkalim i gabuar.' });
      }

      const user = result.rows[0];

      // Verifiko fjalëkalimin
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Email ose fjalëkalim i gabuar.' });
      }

      const token = generateToken({
        id: user.id, email: user.email, role: user.role, type: 'user'
      });

      return res.json({
        message: `Mirë se vjen, ${user.first_name}!`,
        token,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          phone: user.phone,
          role: user.role,
          type: 'user'
        }
      });
    }

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Gabim serveri. Provo sërish.' });
  }
});

// ══════════════════════════════════════
// GET /api/auth/me
// Kush jam unë (nga token)
// ══════════════════════════════════════
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { id, type } = req.user;

    if (type === 'business') {
      const result = await pool.query(
        `SELECT id, owner_name, business_name, nuis, email, phone, city, status, logo_url, created_at
         FROM businesses WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Biznesi nuk u gjet.' });
      return res.json({ ...result.rows[0], type: 'business' });
    } else {
      const result = await pool.query(
        `SELECT id, first_name, last_name, email, phone, role, avatar_url, created_at
         FROM users WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Useri nuk u gjet.' });
      return res.json({ ...result.rows[0], type: 'user' });
    }

  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

// ══════════════════════════════════════
// POST /api/auth/change-password
// ══════════════════════════════════════
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const { id, type } = req.user;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Të dyja fjalëkalimet janë të detyrueshme.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.' });
    }

    const table = type === 'business' ? 'businesses' : 'users';
    const result = await pool.query(`SELECT password FROM ${table} WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Llogaria nuk u gjet.' });

    const valid = await bcrypt.compare(old_password, result.rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Fjalëkalimi i vjetër është i gabuar.' });

    const hashed = await bcrypt.hash(new_password, 12);
    await pool.query(`UPDATE ${table} SET password = $1 WHERE id = $2`, [hashed, id]);

    res.json({ message: 'Fjalëkalimi u ndryshua me sukses!' });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

module.exports = router;
