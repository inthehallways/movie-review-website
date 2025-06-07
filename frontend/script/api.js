// /script/api.js

// If elsewhere you need to prefix TMDB images, expose this
export const API_CONFIG = {
  TMDB_IMAGE_BASE: "https://image.tmdb.org/t/p/w500"
};

// 1) Fetch every watched movie for this user
export async function getUserWatchedMovies(userId) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing authentication token");

  const resp = await fetch("http://localhost:3001/api/watched", {
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  });
  const body = await resp.json();
  if (!body.success) {
    throw new Error(body.message || "Failed to load watched movies");
  }

 return body.watched.map(row => ({
    id:           row.movie_id,                            // unchanged
    title:        row.title,
    poster_path:  row.poster_path,
    genres:       row.genres ? row.genres.split(", ") : [],
    user_rating:  row.user_rating !== null ? parseInt(row.user_rating, 10) : null,
    is_liked:  !!row.is_liked,
    watch_date:   row.watch_date
  }));
}

// 2) Update a watched movie’s rating
export async function updateMovieRating(userId, movieId, rating) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing authentication token");

  const resp = await fetch(`http://localhost:3001/api/watched/${movieId}/rating`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ rating })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to update rating: ${text}`);
  }
  return await resp.json();
}

// 3) Remove a movie from “watched”
export async function removeMovieFromWatchedList(userId, movieId) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing authentication token");

  const resp = await fetch(`http://localhost:3001/api/watched/${movieId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to remove from watched: ${text}`);
  }
  return await resp.json();
}

// 4) Toggle a watched movie’s “liked” flag
export async function toggleMovieLiked(userId, movieId, liked) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing authentication token");

  const resp = await fetch(`http://localhost:3001/api/watched/${movieId}/liked`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ liked })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to toggle liked: ${text}`);
  }
  return await resp.json();
}

// 1) Fetch every watchlist‐movie for this user
export async function getUserWatchlist(userId) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing authentication token");

  const resp = await fetch("http://localhost:3001/api/watchlist", {
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  });
  const body = await resp.json();
  if (!body.success) {
    throw new Error(body.message || "Failed to load watchlist");
  }

  // Map each row into exactly the shape watchlist.js expects:
  return body.watchlist.map(row => ({
    id:           row.movie_id,                        // used as data-movie-id
    title:        row.title,                           // movie title
    poster_path:  row.poster_path,                     // full TMDB URL
    genres:       row.genres ? row.genres.split(", ") : [], 
    added_date:   row.added_date                        // JS Date string
  }));
}

// 2) Remove from watchlist
export async function removeFromWatchlist(userId, movieId) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing authentication token");

  const resp = await fetch(`http://localhost:3001/api/watchlist/${movieId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to remove from watchlist: ${text}`);
  }
  return await resp.json();
}

// 3) Mark a movie as watched (moves it to /api/watched)
export async function markAsWatched(userId, movie) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing authentication token");
  // note: we post { movie_id, watch_date? } but watchlist.js doesn’t need to send rating here
  const resp = await fetch("http://localhost:3001/api/watched", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      movie_id: movie.id,
      watch_date: new Date().toISOString()
    })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to mark as watched: ${text}`);
  }
  return await resp.json();
}

// 4) Add to watched list in memory (optional—your watchlist.js calls this before markAsWatched)
export async function addToWatchedList(userId, movie) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing authentication token");
  // We’ll cheat here and just return a dummy object,
  // since “watchlist.js” uses it only for console logging.
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        id:          movie.id,
        title:       movie.title,
        poster_path: movie.poster_path,
        genres:      movie.genres,
        user_rating: null,
        is_liked:    false,
        watch_date:  new Date().toISOString()
      });
    }, 200);
  });
}