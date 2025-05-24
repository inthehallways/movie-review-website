// JavaScript for SceneIt Dashboard
// This file handles all interactive features in the Homepage except dropdown (which is in HTML)

class SceneItDashboard {
    constructor() {
        this.scrollInterval = null
        this.isHovering = false
        this.hoverDirection = null

        // TMDB API Configuration
        this.TMDB_API_KEY = "8064455f5d0fa492a57d3904df2b0045"
        this.TMDB_BASE_URL = "https://api.themoviedb.org/3"
        this.TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500" // For movie posters

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
        this.loadUpcomingMovies()
        this.loadPopularMovies()
        console.log("SceneIt Dashboard initialized successfully!")
    }

    // TEMPORARY USERNAME INITIALIZATION
    initializeUsername() {
        const urlParams = new URLSearchParams(window.location.search)
        const username = urlParams.get("username")
        const usernameElement = document.getElementById("username")

        if (username && usernameElement) {
        usernameElement.textContent = username
        console.log(`Welcome ${username}!`)
        } else if (!username) {
        console.warn("No username found")
        // Comment out redirect for testing
        // window.location.href = "login.html"
        }
    }

    // MOVIE CARDS SCROLLING FUNCTIONALITY
    initializeScrolling() {
        const container = document.getElementById("upcoming-movie-cards")
        const leftScroll = document.getElementById("leftScroll")
        const rightScroll = document.getElementById("rightScroll")

        if (!container || !leftScroll || !rightScroll) {
        console.warn("Scroll elements not found")
        return
        }

        // Hover-based scrolling
        leftScroll.addEventListener("mouseenter", () => this.startScroll("left", container))
        leftScroll.addEventListener("mouseleave", () => this.stopScroll())
        leftScroll.addEventListener("click", () => {
        container.scrollLeft -= 400
        })

        rightScroll.addEventListener("mouseenter", () => this.startScroll("right", container))
        rightScroll.addEventListener("mouseleave", () => this.stopScroll())
        rightScroll.addEventListener("click", () => {
        container.scrollLeft += 400
        })

        // Enhanced mouse tracking for more responsive scrolling
        this.initializeMouseTracking(container, leftScroll, rightScroll)

        console.log("Scrolling functionality initialized")
    }

    startScroll(direction, container) {
        this.stopScroll()

        // Immediate first scroll to reduce perceived lag
        container.scrollLeft += direction === "right" ? 30 : -30

        // Continue with regular interval scrolling
        this.scrollInterval = setInterval(() => {
        container.scrollLeft += direction === "right" ? 20 : -20
        }, 10)
    }

    stopScroll() {
        if (this.scrollInterval) {
        clearInterval(this.scrollInterval)
        this.scrollInterval = null
        }
    }

    initializeMouseTracking(container, leftScroll, rightScroll) {
        document.addEventListener("mousemove", (e) => {
        const leftRect = leftScroll.getBoundingClientRect()
        const rightRect = rightScroll.getBoundingClientRect()

        if (
            e.clientX >= leftRect.left &&
            e.clientX <= leftRect.right &&
            e.clientY >= leftRect.top &&
            e.clientY <= leftRect.bottom
        ) {
            if (!this.isHovering || this.hoverDirection !== "left") {
            this.isHovering = true
            this.hoverDirection = "left"
            this.startScroll("left", container)
            }
        } else if (
            e.clientX >= rightRect.left &&
            e.clientX <= rightRect.right &&
            e.clientY >= rightRect.top &&
            e.clientY <= rightRect.bottom
        ) {
            if (!this.isHovering || this.hoverDirection !== "right") {
            this.isHovering = true
            this.hoverDirection = "right"
            this.startScroll("right", container)
            }
        } else if (this.isHovering) {
            this.isHovering = false
            this.hoverDirection = null
            this.stopScroll()
        }
        })
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
        <img src="${posterUrl}" alt="${movieTitle} Poster" onerror="this.src='../frontend/assets/images/poster-placeholder.png'">
        <div class="movie-title">${movieTitle}</div>
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

        return data.results.slice(0, 6) // Get first 6 movies for the grid
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
        const container = document.getElementById("popular-movies-grid")
        if (!container) return

        // Show loading state
        container.innerHTML = '<div class="loading-message">Loading popular movies...</div>'

        try {
        const movies = await this.fetchPopularMovies()

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
}

// Initialize the dashboard when the script loads
const dashboard = new SceneItDashboard()

// Export for potential future use (if you switch to modules later)
// Uncomment the following lines if you want to use this in a module system
// if (typeof module !== "undefined" && module.exports) {
//  module.exports = SceneItDashboard
//}