// JavaScript for SceneIt Dashboard
// This file handles all interactive features in the Homepage except dropdown (which is in HTML)

// Logout function
 document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('username');
  localStorage.removeItem('token');
  window.location.href = '../frontend/pages/login.html';
});

class SceneItDashboard {
    constructor() {
        this.scrollInterval = null
        this.isHovering = false
        this.hoverDirection = null

        // TMDB API Configuration
        this.TMDB_API_KEY = "SECRET_NO_CLUE"
        this.TMDB_BASE_URL = "https://api.themoviedb.org/3"
        this.TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

        
        // Initialize when DOM is loaded
        if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.init())
        } else {
        this.init()
        }        
    }

    init() {
        console.log("SceneIt Dashboard initializing...")
        this.initializeUsername()
        this.initializeScrolling()
        this.loadUserStats() 

        console.log("About to load upcoming movies...")
        this.loadUpcomingMovies()

        console.log("About to load popular movies...")
        this.loadPopularMovies()

        console.log("SceneIt Dashboard initialized successfully!")
    }

    // REAL USERNAME INITIALIZATION (from localStorage)
    initializeUsername() {
        //const storedUsername = localStorage.getItem("username") || "";
        //const usernameElement = document.getElementById("username");

        // If no username is stored, redirect back to login
       // if (!storedUsername) {
        //    console.warn("No username in localStorage; redirecting to login.");
        //    window.location.href = "../pages/login.html";
        //    return;
       // }

        // Otherwise display “Welcome back, <username>!”
        //if (usernameElement) {
        //    usernameElement.textContent = storedUsername;
        //    console.log(`Welcome ${storedUsername}!`);
        //}
    }

    // MOVIE CARDS SCROLLING FUNCTIONALITY
    initializeScrolling() {
   
        const popularContainer = document.getElementById("popular-movies-scroll")
        const popularLeftScroll = document.getElementById("popularLeftScroll")
        const popularRightScroll = document.getElementById("popularRightScroll")

        if (popularContainer && popularLeftScroll && popularRightScroll) {
        // Click-based horizontal scrolling for Popular Films
        popularLeftScroll.addEventListener("click", () => {
            popularContainer.scrollLeft -= 300
        })

        popularRightScroll.addEventListener("click", () => {
            popularContainer.scrollLeft += 300
        })

        // Visual feedback on hover for Popular Films
        popularLeftScroll.addEventListener("mouseenter", () => {
            popularLeftScroll.style.opacity = "0.8"
        })

        popularLeftScroll.addEventListener("mouseleave", () => {
            popularLeftScroll.style.opacity = "1"
        })

        popularRightScroll.addEventListener("mouseenter", () => {
            popularRightScroll.style.opacity = "0.8"
        })

        popularRightScroll.addEventListener("mouseleave", () => {
            popularRightScroll.style.opacity = "1"
        })

        console.log("Popular Films scrolling initialized")
        }

        // Upcoming Releases scrolling
        const upcomingContainer = document.getElementById("upcoming-movie-cards")
        const upcomingLeftScroll = document.getElementById("upcomingLeftScroll")
        const upcomingRightScroll = document.getElementById("upcomingRightScroll")

        if (upcomingContainer && upcomingLeftScroll && upcomingRightScroll) {
        // Click-based horizontal scrolling for Upcoming Releases
        upcomingLeftScroll.addEventListener("click", () => {
            upcomingContainer.scrollLeft -= 300
        })

        upcomingRightScroll.addEventListener("click", () => {
            upcomingContainer.scrollLeft += 300
        })

        // Visual feedback on hover for Upcoming Releases
        upcomingLeftScroll.addEventListener("mouseenter", () => {
            upcomingLeftScroll.style.opacity = "0.8"
        })

        upcomingLeftScroll.addEventListener("mouseleave", () => {
            upcomingLeftScroll.style.opacity = "1"
        })

        upcomingRightScroll.addEventListener("mouseenter", () => {
            upcomingRightScroll.style.opacity = "0.8"
        })

        upcomingRightScroll.addEventListener("mouseleave", () => {
            upcomingRightScroll.style.opacity = "1"
        })

        console.log("Upcoming Releases scrolling initialized")
        }
    }

    // MOVIE CARDS FUNCTIONALITY
    createMovieCard(movie, isUpcoming = false) {
        const movieCard = document.createElement("div")
        movieCard.className = "movie-card"

        // Handle both TMDB data and placeholder data
        const posterUrl = movie.poster_path
        ? `${this.TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : movie.poster || "../frontend/assets/images/poster-placeholder.png"

        const movieTitle = movie.title || movie.name || "Unknown Title"

        movieCard.innerHTML = `
        <div class="movie-poster">
        <img src="${posterUrl}" alt="${movieTitle} Poster" onerror="this.src='../frontend/assets/images/poster-placeholder.png'">
        <div class="movie-title-overlay">${movieTitle}</div>
        </div>
    `

        // Add click event for future movie details functionality
        movieCard.addEventListener("click", () => {
        console.log(`Clicked on movie: ${movieTitle}`)
        console.log("Movie data:", movie)
        // TODO: Implement movie details modal or navigation
        })

        return movieCard
    }

    
    // INTEGRATION OF TMDB API TO MOVIE CARDS
    async fetchPopularMovies() {
        try {
        console.log("Fetching popular movies from TMDB...")

        const response = await fetch(
            `${this.TMDB_BASE_URL}/movie/popular?api_key=${this.TMDB_API_KEY}&language=en-US&page=1`,
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("TMDB Popular Movies Response:", data)

        return data.results.slice(0, 10) // Get first 10 movies for scrolling
        } catch (error) {
        console.error("Error fetching popular movies:", error)

        // Return fallback data if API fails
        return [
            { title: "Popular Movie 1 (Fallback)", poster: null },
            { title: "Popular Movie 2 (Fallback)", poster: null },
            { title: "Popular Movie 3 (Fallback)", poster: null },
            { title: "Popular Movie 4 (Fallback)", poster: null },
            { title: "Popular Movie 5 (Fallback)", poster: null },
            { title: "Popular Movie 6 (Fallback)", poster: null },
            { title: "Popular Movie 7 (Fallback)", poster: null },
            { title: "Popular Movie 8 (Fallback)", poster: null },
            { title: "Popular Movie 9 (Fallback)", poster: null },
            { title: "Popular Movie 10 (Fallback)", poster: null },
        ]
        }
    }

    async fetchUpcomingMovies() {
        try {
        console.log("Fetching upcoming movies from TMDB...")

        const response = await fetch(
            `${this.TMDB_BASE_URL}/movie/upcoming?api_key=${this.TMDB_API_KEY}&language=en-US&page=1`,
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("TMDB Upcoming Movies Response:", data)

        return data.results.slice(0, 10) // Get first 10 movies for the scroll
        } catch (error) {
        console.error("Error fetching upcoming movies:", error)

        // Return fallback data if API fails
        return [
            { title: "Upcoming Movie 1 (Fallback)", poster: null },
            { title: "Upcoming Movie 2 (Fallback)", poster: null },
            { title: "Upcoming Movie 3 (Fallback)", poster: null },
            { title: "Upcoming Movie 4 (Fallback)", poster: null },
            { title: "Upcoming Movie 5 (Fallback)", poster: null },
            { title: "Upcoming Movie 6 (Fallback)", poster: null },
            { title: "Upcoming Movie 7 (Fallback)", poster: null },
            { title: "Upcoming Movie 8 (Fallback)", poster: null },
            { title: "Upcoming Movie 9 (Fallback)", poster: null },
            { title: "Upcoming Movie 10 (Fallback)", poster: null },

        ]
        }
    }

    async loadUpcomingMovies() {
        const container = document.getElementById("upcoming-movie-cards")
        if (!container) return

        // Show loading state
        container.innerHTML = '<div class="loading-message">Loading upcoming movies...</div>'

        try {
        const movies = await this.fetchUpcomingMovies()

        // Clear loading message
        container.innerHTML = ""

        // Add movie cards
        movies.forEach((movie) => {
            const movieCard = this.createMovieCard(movie, true)
            container.appendChild(movieCard)
        })

        console.log("Upcoming movies loaded successfully")
        } catch (error) {
        console.error("Error loading upcoming movies:", error)
        container.innerHTML = '<div class="error-message">Failed to load upcoming movies</div>'
        }
    }

    async loadPopularMovies() {
        const container = document.getElementById("popular-movies-scroll")

        // Add debugging
        console.log("Looking for popular movies container...")
        console.log("Container found:", container)

        if (!container) {
        console.error("Popular movies container not found! Check if ID 'popular-movies-scroll' exists in HTML")
        return
        }

        // Show loading state
        container.innerHTML = '<div class="loading-message">Loading popular movies...</div>'

        try {
        const movies = await this.fetchPopularMovies()
        console.log("Popular movies fetched:", movies)

        // Clear loading message
        container.innerHTML = ""

        // Add movie cards
        movies.forEach((movie) => {
            const movieCard = this.createMovieCard(movie, false)
            container.appendChild(movieCard)
        })

        console.log("Popular movies loaded successfully")
        } catch (error) {
        console.error("Error loading popular movies:", error)
        container.innerHTML = '<div class="error-message">Failed to load popular movies</div>'
        }
    }

    // Handles user stats 
    async loadUserStats() {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error("Not authenticated");

    const resp = await fetch('http://localhost:3001/api/profile/stats', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const body = await resp.json();
    if (!body.success) throw new Error(body.message);

    const { reviewsThisMonth, watchedTotal, watchlistTotal } = body.stats;
    document.getElementById('reviews-count').textContent  = reviewsThisMonth;
    document.getElementById('watched-count').textContent  = watchedTotal;
    document.getElementById('watchlist-count').textContent = watchlistTotal;

  } catch (err) {
    console.error('Error loading user stats:', err);
    document.getElementById('reviews-count') .textContent = '0';
    document.getElementById('watched-count') .textContent = '0';
    document.getElementById('watchlist-count').textContent = '0';
  }
}
}

// Typewriter effect function
document.addEventListener('DOMContentLoaded', function() {
     const storedUsername = localStorage.getItem("username") || "";
    const welcomeText = 'Welcome back, ';
    const fullText = welcomeText + storedUsername + '!';
    
    const welcomePart = document.getElementById('welcomePart');
    const usernamePart = document.getElementById('username');
    const punctuationPart = document.getElementById('punctuation');
    
    let i = 0;
    const speed = 100;
    
    function typeWriter() {
        if (i < fullText.length) {
            const char = fullText.charAt(i);
            
            if (i < welcomeText.length) {
                welcomePart.textContent += char;
            } else if (i < welcomeText.length + username.length) {
                usernamePart.textContent += char;
            } else {
                punctuationPart.textContent += char;
            }
            
            i++;
            setTimeout(typeWriter, speed);
        }
    }
    
    setTimeout(typeWriter, 1000);
});

// Initialize the dashboard when the script loads
const dashboard = new SceneItDashboard()

// Export for potential future use (if you switch to modules later)
// Uncomment the following lines if you want to use this in a module system
// if (typeof module !== "undefined" && module.exports) {
//  module.exports = SceneItDashboard
//