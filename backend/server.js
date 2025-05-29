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

// Submit a review
app.post('/api/reviews', async (req, res) => {
  try {
    const { movie_id, title, user_id, review_text, rating } = req.body;
    
    // First check if the movie is in watched_movies
    const watchedCheck = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .input('user_id', sql.Int, user_id)
      .query('SELECT watched_id FROM watched_movies WHERE movie_id = @movie_id AND user_id = @user_id');
    
    let watched_id;
    if (watchedCheck.recordset.length === 0) {
      // If not watched, add to watched_movies first
      const watchedResult = await pool.request()
        .input('movie_id', sql.Int, movie_id)
        .input('user_id', sql.Int, user_id)
        .query('INSERT INTO watched_movies (movie_id, user_id) OUTPUT INSERTED.watched_id VALUES (@movie_id, @user_id)');
      
      watched_id = watchedResult.recordset[0].watched_id;
    } else {
      watched_id = watchedCheck.recordset[0].watched_id;
    }
    
    // Insert review
    await pool.request()
      .input('watched_id', sql.Int, watched_id)
      .input('review_text', sql.Text, review_text)
      .input('movie_id', sql.Int, movie_id)
      .input('title', sql.VarChar(100), title)
      .input('user_id', sql.Int, user_id)
      .input('rating', sql.Int, rating)
      .query('INSERT INTO reviews (watched_id, review_text, movie_id, title, user_id, rating) VALUES (@watched_id, @review_text, @movie_id, @title, @user_id, @rating)');
    
    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Mark as watched
app.post('/api/watched', async (req, res) => {
  try {
    const { movie_id, user_id, watch_date } = req.body;
    
    const result = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .input('user_id', sql.Int, user_id)
      .input('watch_date', sql.Date, watch_date)
      .query(`
        IF EXISTS (SELECT 1 FROM watched_movies WHERE movie_id = @movie_id AND user_id = @user_id)
          UPDATE watched_movies SET watch_date = @watch_date WHERE movie_id = @movie_id AND user_id = @user_id
        ELSE
          INSERT INTO watched_movies (movie_id, user_id, watch_date) VALUES (@movie_id, @user_id, @watch_date)
      `);
    
    res.status(200).json({ message: 'Watched status updated' });
  } catch (err) {
    console.error('Error updating watched status:', err);
    res.status(500).json({ error: 'Failed to update watched status' });
  }
});

// Add to likes
app.post('/api/likes', async (req, res) => {
  try {
    const { movie_id, user_id } = req.body;
    
    // Check if already liked
    const checkResult = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .input('user_id', sql.Int, user_id)
      .query('SELECT 1 FROM liked_movies WHERE movie_id = @movie_id AND user_id = @user_id');
    
    if (checkResult.recordset.length > 0) {
      // Remove like
      await pool.request()
        .input('movie_id', sql.Int, movie_id)
        .input('user_id', sql.Int, user_id)
        .query('DELETE FROM liked_movies WHERE movie_id = @movie_id AND user_id = @user_id');
      
      res.status(200).json({ action: 'removed', message: 'Removed from likes' });
    } else {
      // Add like
      await pool.request()
        .input('movie_id', sql.Int, movie_id)
        .input('user_id', sql.Int, user_id)
        .query('INSERT INTO liked_movies (movie_id, user_id) VALUES (@movie_id, @user_id)');
      
      res.status(200).json({ action: 'added', message: 'Added to likes' });
    }
  } catch (err) {
    console.error('Error updating likes:', err);
    res.status(500).json({ error: 'Failed to update likes' });
  }
});

// Add to watchlist
app.post('/api/watchlist', async (req, res) => {
  try {
    const { movie_id, user_id } = req.body;
    
    // Check if already in watchlist
    const checkResult = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .input('user_id', sql.Int, user_id)
      .query('SELECT 1 FROM watchlist WHERE movie_id = @movie_id AND user_id = @user_id');
    
    if (checkResult.recordset.length > 0) {
      // Remove from watchlist
      await pool.request()
        .input('movie_id', sql.Int, movie_id)
        .input('user_id', sql.Int, user_id)
        .query('DELETE FROM watchlist WHERE movie_id = @movie_id AND user_id = @user_id');
      
      res.status(200).json({ action: 'removed', message: 'Removed from watchlist' });
    } else {
      // Add to watchlist
      await pool.request()
        .input('movie_id', sql.Int, movie_id)
        .input('user_id', sql.Int, user_id)
        .query('INSERT INTO watchlist (movie_id, user_id) VALUES (@movie_id, @user_id)');
      
      res.status(200).json({ action: 'added', message: 'Added to watchlist' });
    }
  } catch (err) {
    console.error('Error updating watchlist:', err);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
