require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('./db');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const app = express();
const port = 3001;

// server.js (near the top, after require('dotenv').config())
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("🛑 ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}


// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());

// ────────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION MIDDLEWARE: Verify JWT on protected routes
// ────────────────────────────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  // 1) Grab the "Authorization" header
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Missing Authorization header' });
  }

  // 2) It must be in the format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Malformed Authorization header' });
  }

  const token = parts[1]; // the JWT string

  // 3) Verify that token using our JWT_SECRET
  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) {
      // If token is invalid or expired
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    // 4) Attach the decoded payload (e.g. { user_id, username, iat, exp }) to req.user
    req.user = userPayload;
    // 5) Move on to the actual route handler
    next();
  });
}
// ────────────────────────────────────────────────────────────────────────────────

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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
    // 2.b) Look up the user in the database
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.VarChar(50), username)
      .query(`SELECT user_id, username, password_hash FROM dbo.users WHERE username = @username`);

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // 2.c) Compare the provided password against the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // 2.d) Update last_login
    await pool.request()
      .input('user_id', sql.UniqueIdentifier, user.user_id)
      .query(`UPDATE dbo.users SET last_login = GETDATE() WHERE user_id = @user_id`);

    // 2.e) Create a JWT payload and sign it
    const payload = {
      user_id: user.user_id,
      username: user.username
    };
    // expiresIn: '8h' → token valid for 8 hours
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // 2.f) Return the token plus a success message
    return res.json({
      success: true,
      message: 'Login successful',
      username: user.username,
      token // <— the actual JWT, which the frontend will store
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});



// Allow preflight (OPTIONS) for PUT and DELETE on /api/reviews/:id
app.options('/api/reviews/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.sendStatus(200);
});

// PROTECTED: Create or update a review for the authenticated user
app.post('/api/reviews', authenticateToken, async (req, res) => {
  console.log('POST /api/reviews body:', req.body);
  const userId = req.user.user_id;
  const { movie_id, title, review_text, rating, watched_date } = req.body;

  if (!movie_id || !title) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      required: ['movie_id', 'title']
    });
  }

  try {
    const pool = await getPool();
    // Check if this user already reviewed this movie
    const existingReview = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .input('user_id',  sql.UniqueIdentifier, userId)
      .query(`
        SELECT review_id 
        FROM dbo.reviews 
        WHERE movie_id = @movie_id 
          AND user_id  = @user_id
      `);

    if (existingReview.recordset.length > 0) {
      // UPDATE
      const reviewId = existingReview.recordset[0].review_id;
      await pool.request()
        .input('review_id',   sql.UniqueIdentifier, reviewId)
        .input('review_text', sql.NVarChar(sql.MAX), review_text || null)
        .input('rating',      sql.Int,   rating)
        .input('watched_date',sql.DateTime, watched_date ? new Date(watched_date) : new Date())
        .query(`
          UPDATE dbo.reviews
          SET review_text  = @review_text,
              rating       = @rating,
              watched_date = @watched_date,
              updated_at   = GETDATE()
          WHERE review_id = @review_id
        `);
    } else {
      // INSERT
      await pool.request()
        .input('review_id',    sql.UniqueIdentifier, crypto.randomUUID())  // Generate new UUID
        .input('user_id',      sql.UniqueIdentifier, userId)
        .input('movie_id',     sql.Int,   movie_id)
        .input('title',        sql.NVarChar(255), title)
        .input('review_text',  sql.NVarChar(sql.MAX), review_text || null)
        .input('rating',       sql.Int,   rating)
        .input('watched_date', sql.DateTime, watched_date ? new Date(watched_date) : new Date())
        .query(`
          INSERT INTO dbo.reviews 
            (review_id, user_id, movie_id, title, review_text, rating, watched_date, created_at, updated_at)
          VALUES 
            (@review_id, @user_id, @movie_id, @title, @review_text, @rating, @watched_date, GETDATE(), GETDATE())
        `);
    }

    return res.json({ success: true, message: 'Review saved successfully' });
  } catch (err) {
    console.error('Database error on POST /api/reviews:', err);
    return res.status(500).json({
      success: false,
      message: 'Database operation failed',
      error: err.message
    });
  }
});



// (new version) LEFT JOIN ensures we still get every review row,
// ── GET /api/reviews    (fetch all reviews for the logged-in user) ──────────────
app.get('/api/reviews', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          r.review_id,
          r.title,
          r.review_text,
          r.rating,
          r.watched_date,
          r.created_at,
          m.poster_url    AS poster_path
        FROM dbo.reviews AS r
        LEFT JOIN dbo.movies AS m
          ON r.movie_id = m.movie_id
        WHERE r.user_id = @user_id
      `);
    return res.json({ success: true, reviews: result.recordset });
  } catch (err) {
    console.error('Database error on GET /api/reviews:', err);
    return res.status(500).json({ success: false, message: 'DB operation failed', error: err.message });
  }
});

// ── PUT /api/reviews/:id   (edit a single review) ───────────────────────────────
app.put('/api/reviews/:id', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const reviewId = req.params.id;  // no longer parseInt — it's a UUID
  const { review_text, rating, watched_date } = req.body;

  if (!review_text || rating === undefined || isNaN(rating)) {
    return res.status(400).json({ success: false, message: "Missing or invalid fields" });
  }
  try {
    const pool = await getPool();
    // a) Ensure that this review belongs to the logged-in user
    const check = await pool.request()
      .input('review_id', sql.UniqueIdentifier, reviewId)
      .input('user_id',   sql.UniqueIdentifier, userId)
      .query(`
        SELECT review_id
        FROM dbo.reviews
        WHERE review_id = @review_id
          AND user_id   = @user_id
      `);
    if (check.recordset.length === 0) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this review" });
    }

    // b) Perform the UPDATE
    await pool.request()
      .input('review_id',   sql.UniqueIdentifier, reviewId)
      .input('review_text', sql.NVarChar(sql.MAX), review_text)
      .input('rating',      sql.Int,   rating)
      .input('watched_date',sql.DateTime, watched_date ? new Date(watched_date) : new Date())
      .query(`
        UPDATE dbo.reviews
        SET
          review_text  = @review_text,
          rating       = @rating,
          watched_date = @watched_date,
          updated_at   = GETDATE()
        WHERE review_id = @review_id
      `);

    return res.json({ success: true, message: "Review updated successfully" });
  } catch (err) {
    console.error("Error in PUT /api/reviews/:id:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ── DELETE /api/reviews/:id   (delete a single review) ─────────────────────────
app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const reviewId = req.params.id;  // UUID
  try {
    const pool = await getPool();
    // a) Ensure that this review belongs to the logged-in user
    const check = await pool.request()
      .input('review_id', sql.UniqueIdentifier, reviewId)
      .input('user_id',   sql.UniqueIdentifier, userId)
      .query(`
        SELECT review_id
        FROM dbo.reviews
        WHERE review_id = @review_id
          AND user_id   = @user_id
      `);
    if (check.recordset.length === 0) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this review" });
    }

    // b) Delete it
    await pool.request()
      .input('review_id', sql.UniqueIdentifier, reviewId)
      .query(`
        DELETE FROM dbo.reviews
        WHERE review_id = @review_id
      `);

    return res.json({ success: true, message: "Review deleted successfully" });
  } catch (err) {
    console.error("Error in DELETE /api/reviews/:id:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});


// ─── In server.js ───

// (Keep all of your existing “reviews” and “auth” code above.)
//
// Below, insert these four new routes somewhere after your existing middleware,
// but before the “404 handler” at the bottom.


// ── GET /api/watchlist ──
// Return every watchlist row for the logged‐in user.
// ── GET /api/watchlist ──
app.get('/api/watchlist', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT
          w.movie_id                    AS movie_id,
          w.date_added                  AS added_date,      
          m.title                       AS title,
          m.poster_url                  AS poster_path,     
          m.genre                       AS genres           
        FROM dbo.watchlist AS w
        JOIN dbo.movies AS m
          ON w.movie_id = m.movie_id
        WHERE w.user_id = @user_id
      `);

    return res.json({
      success: true,
      watchlist: result.recordset
    });
  } catch (err) {
    console.error('Error in GET /api/watchlist:', err);
    return res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});


// ── POST /api/watchlist ──
app.post('/api/watchlist', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { movie_id } = req.body;

  if (!movie_id) {
    return res.status(400).json({ success: false, message: 'Missing movie_id' });
  }

  try {
    const pool = await getPool();

    // Check if already in watchlist
    const existing = await pool.request()
      .input('user_id',  sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int, movie_id)
      .query(`
        SELECT watchlist_id
        FROM dbo.watchlist
        WHERE user_id = @user_id
          AND movie_id = @movie_id
      `);

    if (existing.recordset.length > 0) {
      return res.json({ success: true, message: 'Already in watchlist' });
    }

    // Insert with a generated UUID for watchlist_id (DB default)
    await pool.request()
      .input('user_id',  sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int, movie_id)
      .query(`
        INSERT INTO dbo.watchlist (user_id, movie_id)
        VALUES (@user_id, @movie_id)
      `);

    return res.json({ success: true, message: 'Movie added to watchlist' });
  } catch (err) {
    console.error('Error in POST /api/watchlist:', err);
    return res.status(500).json({ success: false, message: 'DB insert failed', error: err.message });
  }
});


// ── DELETE /api/watchlist/:movieId ──
app.delete('/api/watchlist/:movieId', authenticateToken, async (req, res) => {
  const userId  = req.user.user_id;
  const movieId = parseInt(req.params.movieId, 10);

  try {
    const pool = await getPool();

    // Check if this user’s watchlist has this movie
    const check = await pool.request()
      .input('user_id',  sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int, movieId)
      .query(`
        SELECT watchlist_id
        FROM dbo.watchlist
        WHERE user_id = @user_id
          AND movie_id = @movie_id
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Not found in watchlist' });
    }

    // Delete the entry by user_id and movie_id
    await pool.request()
      .input('user_id',  sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int, movieId)
      .query(`
        DELETE FROM dbo.watchlist
        WHERE user_id = @user_id
          AND movie_id = @movie_id
      `);

    return res.json({ success: true, message: 'Removed from watchlist' });
  } catch (err) {
    console.error('Error in DELETE /api/watchlist/:movieId:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});


// ─── In server.js, right below the watchlist routes ───

// ── GET /api/watched ──
app.get('/api/watched', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const pool = await getPool();
    // ------------------------------------------------------------
    // NOTE: we now JOIN dbo.movies so we also return title + poster
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          w.movie_id                    AS movie_id,
          w.watch_date                  AS watch_date,
          w.rating                      AS user_rating,    -- alias as “user_rating”
          w.liked                       AS is_liked,       -- alias as “is_liked”
          m.title                       AS title,
          m.poster_url                  AS poster_path,
          m.genre                       AS genres
        FROM dbo.watched_movies AS w
        JOIN dbo.movies           AS m
          ON w.movie_id = m.movie_id
        WHERE w.user_id = @user_id
      `);
 
     return res.json({
       success: true,
       watched: result.recordset
     });
   } catch (err) {
     console.error('Error in GET /api/watched:', err);
     return res.status(500).json({ success: false, message: 'DB error', error: err.message });
   }
 });


// ── POST /api/watched ──
// Mark one movie as watched.  Expect { movie_id, rating?, watch_date? } in the body.
app.post('/api/watched', authenticateToken, async (req, res) => {
  const userId   = req.user.user_id;
  const { movie_id, watch_date } = req.body;

  if (!movie_id) {
    return res.status(400).json({ success: false, message: 'Missing movie_id' });
  }

  try {
    const pool = await getPool();

    // 1) Check if (user_id, movie_id) already exists
    const existing = await pool.request()
      .input('user_id',  sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int,             movie_id)
      .query(`
        SELECT watched_id
        FROM dbo.watched_movies
        WHERE user_id = @user_id
          AND movie_id = @movie_id
      `);

    if (existing.recordset.length > 0) {
      // Already marked as watched → return success (instead of throwing 500)
      return res.json({ success: true, message: 'Already marked as watched' });
    }

    // 2) Otherwise insert new “watched” row
    await pool.request()
      .input('user_id',    sql.UniqueIdentifier, userId)
      .input('movie_id',   sql.Int,              movie_id)
      .input('watch_date', sql.Date,             watch_date ? new Date(watch_date) : new Date())
      .query(`
        INSERT INTO dbo.watched_movies
          (user_id, movie_id, watch_date)
        VALUES
          (@user_id, @movie_id, @watch_date)
      `);

    return res.json({ success: true, message: 'Movie marked as watched' });
  } catch (err) {
    console.error('Error in POST /api/watched:', err);
    return res.status(500).json({ success: false, message: 'DB insert failed', error: err.message });
  }
});

// ─── DELETE /api/watched/:movieId ───
// (optional) Remove a movie from “watched” if the user wants to un‐mark it:
app.delete('/api/watched/:movieId', authenticateToken, async (req, res) => {
  const userId  = req.user.user_id;
  const movieId = parseInt(req.params.movieId, 10);

  try {
    const pool = await getPool();
    const check = await pool.request()
      .input('user_id',  sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int,            movieId)
      .query(`
        SELECT watched_id 
        FROM dbo.watched_movies
        WHERE user_id = @user_id 
          AND movie_id = @movie_id
      `);
    if (check.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Not in watched list' });
    }

    await pool.request()
      .input('user_id',  sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int,            movieId)
      .query(`
        DELETE FROM dbo.watched_movies
        WHERE user_id = @user_id 
          AND movie_id = @movie_id
      `);

    return res.json({ success: true, message: 'Removed from watched' });
  } catch (err) {
    console.error('Error in DELETE /api/watched/:movieId:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ── PUT /api/watched/:movieId/rating ─────────────────────────────────────────
app.put('/api/watched/:movieId/rating', authenticateToken, async (req, res) => {
  const userId  = req.user.user_id;
  const movieId = parseInt(req.params.movieId, 10);
  const { rating } = req.body;   // number 1–5 or null

  if (rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return res.status(400).json({ success: false, message: 'Invalid rating. Must be integer 1–5 or null.' });
  }

  try {
    const pool = await getPool();
    // Ensure watched row exists
    const check = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int, movieId)
      .query(`
        SELECT watched_id
        FROM dbo.watched_movies
        WHERE user_id = @user_id AND movie_id = @movie_id
      `);
    if (check.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Not found in watched list.' });
    }

    await pool.request()
      .input('user_id',   sql.UniqueIdentifier, userId)
      .input('movie_id',  sql.Int,              movieId)
      .input('rating',    sql.NVarChar(50),     rating === null ? null : rating.toString())
      .query(`
        UPDATE dbo.watched_movies
        SET rating = @rating, updated_at = GETDATE()
        WHERE user_id = @user_id AND movie_id = @movie_id
      `);

    return res.json({ success: true, message: 'Rating updated.' });
  } catch (err) {
    console.error("Error in PUT /api/watched/:movieId/rating:", err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ── PUT /api/watched/:movieId/liked ──────────────────────────────────────────
app.put('/api/watched/:movieId/liked', authenticateToken, async (req, res) => {
  const userId  = req.user.user_id;
  const movieId = parseInt(req.params.movieId, 10);
  const { liked } = req.body;   // expect boolean

  if (typeof liked !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Invalid liked value. Must be boolean.' });
  }

  try {
    const pool = await getPool();
    const check = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int, movieId)
      .query(`
        SELECT watched_id
        FROM dbo.watched_movies
        WHERE user_id = @user_id AND movie_id = @movie_id
      `);
    if (check.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Not found in watched list.' });
    }

    await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('movie_id', sql.Int, movieId)
      .input('liked', sql.Bit, liked ? 1 : 0)
      .query(`
        UPDATE dbo.watched_movies
        SET liked = @liked, updated_at = GETDATE()
        WHERE user_id = @user_id AND movie_id = @movie_id
      `);

    return res.json({ success: true, message: 'Liked state updated.' });
  } catch (err) {
    console.error("Error in PUT /api/watched/:movieId/liked:", err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

// ─────────────────────────────────────────────────────────────────
//  PROFILE ROUTES
// ─────────────────────────────────────────────────────────────────

// improved: join on movies and build a fixed‐length array
// ── GET /api/profile ──
app.get('/api/profile', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const pool = await getPool();

    // Fetch profile
    const profileResult = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT username, bio, header_pic_url, profile_pic_url
        FROM dbo.profile
        WHERE user_id = @user_id
      `);
    const profile = profileResult.recordset[0] || {};

    // Fetch favorite movies (now including favorite_id)
    const favResult = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          fm.favorite_id,
          fm.slot,
          m.movie_id     AS id,
          m.poster_url   AS poster_path,
          m.release_date,
          m.title
        FROM dbo.favorite_movies AS fm
        JOIN dbo.movies          AS m
          ON fm.movie_id = m.movie_id
        WHERE fm.user_id = @user_id
        ORDER BY fm.slot
      `);

    // Build favoriteMovies array
    const favoriteMovies = Array(5).fill(null);
    for (const row of favResult.recordset) {
      if (row.slot >= 0 && row.slot < 5) {
        favoriteMovies[row.slot] = row;
      }
    }

    return res.json({ success: true, profile, favoriteMovies });
  } catch (err) {
    console.error("Error in GET /api/profile:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});



// ── PUT /api/profile ──
app.put('/api/profile', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { username, bio, header_pic_url, profile_pic_url, favoriteMovies } = req.body;

  try {
    const pool = await getPool();

    // Upsert profile row
    await pool.request()
      .input('user_id',         sql.UniqueIdentifier, userId)
      .input('username',        sql.VarChar(100),     username)
      .input('bio',             sql.NVarChar(sql.MAX), bio || null)
      .input('header_pic_url',  sql.NVarChar(sql.MAX), header_pic_url || null)
      .input('profile_pic_url', sql.NVarChar(sql.MAX), profile_pic_url || null)
      .query(`
        MERGE INTO dbo.profile AS target
        USING (SELECT @user_id AS user_id) AS source
        ON target.user_id = source.user_id
        WHEN MATCHED THEN
          UPDATE SET
            username        = @username,
            bio             = @bio,
            header_pic_url  = @header_pic_url,
            profile_pic_url = @profile_pic_url,
            updated_at      = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (user_id, username, bio, header_pic_url, profile_pic_url)
          VALUES (@user_id, @username, @bio, @header_pic_url, @profile_pic_url);
      `);

    // Clear old favorite movies
    await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`DELETE FROM dbo.favorite_movies WHERE user_id = @user_id`);

    // Insert updated favorite movies (if any)
    if (favoriteMovies && favoriteMovies.length > 0) {
      for (let i = 0; i < favoriteMovies.length; i++) {
        const movieId = favoriteMovies[i];
        await pool.request()
          .input('user_id', sql.UniqueIdentifier, userId)
          .input('movie_id', sql.Int, movieId)
          .input('slot', sql.Int, i)
          .query(`
            INSERT INTO dbo.favorite_movies (user_id, movie_id, slot)
            VALUES (@user_id, @movie_id, @slot)
          `);
      }
    }

    return res.json({ success: true, message: "Profile updated!" });
  } catch (err) {
    console.error("Error in PUT /api/profile:", err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────
// GET /api/profile/stats
// returns { reviewsThisMonth, watchedTotal, watchlistTotal }
// ─────────────────────────────────────────────────────────────────
app.get('/api/profile/stats', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const pool = await getPool();

    // 1) Count reviews this calendar month:
    const reviewsResult = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(*) AS count
        FROM dbo.reviews
        WHERE user_id = @user_id
          AND YEAR(watched_date)  = YEAR(GETDATE())
          AND MONTH(watched_date) = MONTH(GETDATE())
      `);

    // 2) Total watched movies:
    const watchedResult = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(*) AS count
        FROM dbo.watched_movies
        WHERE user_id = @user_id
      `);

    // 3) Total watchlist entries:
    const watchlistResult = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(*) AS count
        FROM dbo.watchlist
        WHERE user_id = @user_id
      `);

    return res.json({
      success: true,
      stats: {
        reviewsThisMonth: reviewsResult.recordset[0].count,
        watchedTotal:     watchedResult.recordset[0].count,
        watchlistTotal:   watchlistResult.recordset[0].count
      }
    });
  } catch (err) {
    console.error('Error in GET /api/profile/stats:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});