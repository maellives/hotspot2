import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'radius',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'radius',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    const user = users[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Users CRUD endpoints
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [users] = await pool.execute(
      'SELECT id, username, email, phone, cpf, role, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { username, email, password, phone, cpf, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, phone, cpf, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, phone, cpf, role]
    );

    res.status(201).json({
      id: result.insertId,
      username,
      email,
      phone,
      cpf,
      role
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Access Points CRUD endpoints
app.get('/api/access-points', authenticateToken, async (req, res) => {
  try {
    const [accessPoints] = await pool.execute(
      'SELECT * FROM access_points'
    );
    res.json(accessPoints);
  } catch (error) {
    console.error('Get access points error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/access-points', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, mac_address, location } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO access_points (name, mac_address, location) VALUES (?, ?, ?)',
      [name, mac_address, location]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      mac_address,
      location,
      status: 'active'
    });
  } catch (error) {
    console.error('Create access point error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});