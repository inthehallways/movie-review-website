const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sql, getPool } = require('./db');

const app = express();
const port = 3000;

app.use(cors()); 
app.use(bodyParser.json());

// Register endpoint (clean route)
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const pool = await getPool();

    // Check for existing username or email
    const duplicateCheck = await pool.request()
      .input('username', sql.VarChar(50), username)
      .input('email', sql.VarChar(100), email)
      .query(`SELECT username, email FROM dbo.users WHERE username = @username OR email = @email`);

    if (duplicateCheck.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Username or email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    await pool.request()
      .input('username', sql.VarChar(50), username)
      .input('email', sql.VarChar(100), email)
      .input('password_hash', sql.VarChar(255), password_hash)
      .query(`INSERT INTO dbo.users (username, email, password_hash) VALUES (@username, @email, @password_hash)`);

    return res.json({ success: true, message: 'Registration successful' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('username', sql.VarChar(50), username)
      .query(`SELECT * FROM dbo.users WHERE username = @username`);

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    await pool.request()
      .input('user_id', sql.Int, user.user_id)
      .query(`UPDATE dbo.users SET last_login = GETDATE() WHERE user_id = @user_id`);

    return res.json({ success: true, message: 'Login successful', username: user.username });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
