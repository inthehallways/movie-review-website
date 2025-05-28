// This JavaScript file handles dummy data as a guide for Backend integration.

export const API_CONFIG = {
  TMDB_API_KEY: "YOUR_TMDB_API_KEY", // Replace with your actual TMDB API key
  TMDB_BASE_URL: "https://api.themoviedb.org/3",
  TMDB_IMAGE_BASE: "https://image.tmdb.org/t/p/w500",
}

// Mock watched movies data for testing
export async function getUserWatchedMovies(userId) {
    const mockWatchedMovies = [
        {
            id: "101",
            title: "The Matrix",
            poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
            genres: ["Action", "Sci-Fi"],
            user_rating: 5,
            is_liked: true,
        },
        {
            id: "102",
            title: "Inception",
            poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
            genres: ["Action", "Sci-Fi", "Thriller"],
            user_rating: 4,
            is_liked: false, 
        },
        {
            id: "103",
            title: "The Shawshank Redemption",
            poster_path: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
            genres: ["Drama"],
            user_rating: null,
            is_liked: true, 
        },
        {
            id: "104",
            title: "Pulp Fiction",
            poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
            genres: ["Crime", "Drama"],
            user_rating: 3,
            is_liked: false,
        },
        {
            id: "105",
            title: "The Dark Knight",
            poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
            genres: ["Action", "Crime", "Drama"],
            user_rating: null,
            is_liked: false,
        },
        {
            id: "106",
            title: "Forrest Gump",
            poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
            genres: ["Drama", "Romance"],
            user_rating: 2,
            is_liked: true,
        },
    ]

  return new Promise((resolve) => {
    setTimeout(() => {
        console.log("🎬 Loading watched movies:", mockWatchedMovies)
        resolve(mockWatchedMovies)
    }, 500)
  })
}

// Handles star rating
export async function updateMovieRating(userId, movieId, rating) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`⭐ Rating updated: Movie ${movieId} rated ${rating} stars by user ${userId}`)

            // Show success message in console for testing
            if (rating === null) {
                console.log(`🗑️ Rating reset for movie ${movieId}`)
            } else {
                console.log(`✅ Movie ${movieId} now has ${rating}/5 stars`)
            }

            resolve()
        }, 200)
    })    
}

// Handles when user removes a movie from watched list
export async function removeMovieFromWatchedList(userId, movieId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`🗑️ Movie ${movieId} removed from watched list for user ${userId}`)
            resolve()
        }, 300)
    })
}

// Handles when a user marks a movie from Watched as liked
export async function toggleMovieLiked(userId, movieId, isLiked) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`💖 Movie ${movieId} ${isLiked ? 'liked' : 'unliked'} by user ${userId}`)
            resolve({ success: true, isLiked })
        }, 200)
     })
}

// Mock watchlist data for testing
export async function getUserWatchlist(userId) {
    const mockWatchlistMovies = [
        {
            id: "201",
            title: "Dune",
            poster_path: "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
            genres: ["Action", "Adventure", "Sci-Fi"],
            added_date: "2024-01-15",
        },
        {
            id: "202", 
            title: "Spider-Man: No Way Home",
            poster_path: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
            genres: ["Action", "Adventure", "Sci-Fi"],
            added_date: "2024-01-10",   
        },
        {
            id: "203",
            title: "The Batman",
            poster_path: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", 
            genres: ["Action", "Crime", "Drama"],
            added_date: "2024-01-05",
        },
        {
            id: "204",
            title: "Top Gun: Maverick",
            poster_path: "/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
            genres: ["Action", "Drama"],
            added_date: "2023-12-20",
        },
        {
            id: "205",
            title: "Everything Everywhere All at Once",
            poster_path: "/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
            genres: ["Action", "Adventure", "Comedy"],
            added_date: "2023-12-15",
        },
        {
            id: "206",
            title: "Avatar: The Way of Water",
            poster_path: "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
            genres: ["Action", "Adventure", "Sci-Fi"],
            added_date: "2023-12-01",
        }
    ]

    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("📋 Loading watchlist movies:", mockWatchlistMovies)
            resolve(mockWatchlistMovies)
        }, 500)
    })
}

// Handles when user removes a movie from watchlist
export async function removeFromWatchlist(userId, movieId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`🗑️ Movie ${movieId} removed from watchlist for user ${userId}`)
            resolve()
        }, 300)
    })
}

// Handles when user marks a movie in the watchlist as watched
export async function markAsWatched(userId, movie) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`👁️ Movie "${movie.title}" marked as watched for user ${userId}`)
            resolve()
        }, 300)
    })
}

// Create a watched movie object from the watchlist movie
export async function addToWatchedList(userId, movie) {
    const watchedMovie = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        genres: movie.genres,
        user_rating: null, // Initially no rating
        added_date: new Date().toISOString() // Current date as watched date
    }
  
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`✅ Movie "${movie.title}" added to watched list for user ${userId}`)
            console.log('Movie data:', watchedMovie)
            resolve(watchedMovie)
        }, 300)
    })
}