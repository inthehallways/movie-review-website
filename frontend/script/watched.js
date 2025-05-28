// JavaScript for SceneIt Watched Page
// This file handles the watched movies functionality including loading, rendering, and managing movies in the watched list.

import { API_CONFIG, getUserWatchedMovies, updateMovieRating, removeMovieFromWatchedList, toggleMovieLiked } from "./api.js"

let currentWatchedMovies = []
const currentSort = {
    genre: "All Genres",
    rating: "All Ratings",
    date: "All Dates",
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", async () => {
    await loadWatchedMovies()
    setupEventListeners()
})

async function loadWatchedMovies() {
    try {
        const userId = getCurrentUserId()
        currentWatchedMovies = await getUserWatchedMovies(userId)
        renderMovies()
    } catch (error) {
        console.error("Error loading watched movies:", error)
    }
}

function setupEventListeners() {
  // Tab functionality
    document.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", function () {
            const tab = this.dataset.tab

            if (tab === "watchlist") {
                window.location.href = "../pages/watchlist.html"
            } else if (tab === "watched") {
                return
            } else if (tab === "reviews") {
                console.log("Reviews page not implemented yet")
            }
        })
    })

    // Main event delegation 
    document.addEventListener("click", async (e) => {
        // Handle menu button clicks
        if (e.target.closest(".menu-button")) {
            e.preventDefault()
            e.stopPropagation()
            const button = e.target.closest(".menu-button")
            const menu = button.nextElementSibling
            const allMenus = document.querySelectorAll(".movie-menu")

            // Close all other menus
            allMenus.forEach((m) => {
                if (m !== menu) {
                m.classList.remove("show")
                }
            })

            // Toggle current menu
            menu.classList.toggle("show")
        }
    
        // Handle remove button clicks
        if (e.target.classList.contains("remove-button")) {
            e.preventDefault()
            e.stopPropagation()
            const movieCard = e.target.closest(".movie-card")
            const movieId = movieCard.getAttribute("data-movie-id")
            removeMovieFromWatched(movieId)
        }

        // Handle heart button clicks
            if (e.target.closest(".heart-button")) {
            e.preventDefault()
            e.stopPropagation()
            const movieCard = e.target.closest(".movie-card")
            const movieId = movieCard.getAttribute("data-movie-id")
            await toggleHeartHandler(movieId)
        }
    })

    // Close menus when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".menu-container")) {
            document.querySelectorAll(".movie-menu").forEach((menu) => {
                menu.classList.remove("show")
            })
        }
    })

    // Set up global functions
    window.selectSort = (type, value) => {
        currentSort[type] = value
        document.getElementById(type + "Selected").textContent = value
        document.getElementById(type + "Dropdown").classList.remove("show")
        renderMovies()
    }

    // Use event delegation for star clicks and reset button clicks
    document.addEventListener("click", (e) => {
        // Handle star clicks
        if (e.target.classList.contains("star")) {
            const rating = Number.parseInt(e.target.getAttribute("data-rating"))
            setRating(e.target, rating)
        }

        // Handle reset button clicks
        if (e.target.closest(".reset-rating")) {
            e.preventDefault()
            e.stopPropagation()
            resetRating(e.target.closest(".reset-rating"))
        }
    })

    // Make functions available globally (for any remaining onclick attributes)
    window.setRating = setRating
    window.resetRating = resetRating
}

async function setRating(clickedStar, rating) {
  const movieCard = clickedStar.closest(".movie-card")
  const movieId = movieCard.getAttribute("data-movie-id")
  const stars = movieCard.querySelectorAll(".star")

  try {
    const userId = getCurrentUserId()
    await updateMovieRating(userId, movieId, rating)

    // Update UI
    stars.forEach((star, index) => {
      if (index < rating) {
        star.textContent = "★"
        star.classList.add("filled")
        star.style.color = "#ffd700"
      } else {
        star.textContent = "☆"
        star.classList.remove("filled")
        star.style.color = "#ddd"
      }
    })

    movieCard.setAttribute("data-rating", rating)

    // Update local data
    const movie = currentWatchedMovies.find((m) => m.id == movieId)
    if (movie) movie.user_rating = rating

    // Re-setup hover effects for this card after rating change
    setTimeout(() => setupStarHoverEffectsForCard(movieCard), 50)
  } catch (error) {
    console.error("Error updating rating:", error)
  }
}

async function resetRating(resetButton) {
  const movieCard = resetButton.closest(".movie-card")
  const movieId = movieCard.getAttribute("data-movie-id")
  const stars = movieCard.querySelectorAll(".star")

  try {
    const userId = getCurrentUserId()
    await updateMovieRating(userId, movieId, null)

    // Reset UI
    stars.forEach((star) => {
      star.textContent = "☆"
      star.classList.remove("filled")
      star.style.color = "#ddd"
    })

    movieCard.removeAttribute("data-rating")
    resetButton.style.display = "none"

    // Update local data
    const movie = currentWatchedMovies.find((m) => m.id == movieId)
    if (movie) movie.user_rating = null

    // Re-setup hover effects for this card after reset
    setTimeout(() => setupStarHoverEffectsForCard(movieCard), 50)
  } catch (error) {
    console.error("Error resetting rating:", error)
  }
}

// Handles when user removes movie from Watched
async function removeMovieFromWatched(movieId) {
    try {
        const userId = getCurrentUserId()

        // Call API to remove movie
        await removeMovieFromWatchedList(userId, movieId)

        // Close any open menus before removing the movie
        document.querySelectorAll(".movie-menu").forEach((menu) => {
        menu.classList.remove("show")
        })

        // Remove from local array
        currentWatchedMovies = currentWatchedMovies.filter((m) => m.id != movieId)

        // Re-render the movies grid
        renderMovies()

        console.log(`✅ Movie ${movieId} removed from watched list`)
    } catch (error) {
        console.error("Error removing movie from watched list:", error)
        alert("Failed to remove movie. Please try again.")
    }
}

// Handles Heart or Like function in Watched
async function toggleHeartHandler(movieId) {
    const movieCard = document.querySelector(`[data-movie-id="${movieId}"]`)
    const heartButton = movieCard.querySelector(".heart-button")
    const heartPath = heartButton.querySelector("path")   
  
    try {
        const userId = getCurrentUserId()
        const movie = currentWatchedMovies.find((m) => m.id == movieId)
        
        if (!movie) return
        
        // Toggle the liked state
        const newLikedState = !movie.is_liked
        
        // Call API
        await toggleMovieLiked(userId, movieId, newLikedState)
        
        // Update local data
        movie.is_liked = newLikedState
        
        // Update UI
        if (newLikedState) {
        // Liked - fill the heart and change color
        heartPath.setAttribute("fill", "currentColor")
        heartButton.style.color = "#e74c3c"
        heartButton.setAttribute("title", "Remove from Liked")
        } else {
        // Not liked - outline only
        heartPath.setAttribute("fill", "none")
        heartButton.style.color = "#666"
        heartButton.setAttribute("title", "Add as Liked")
        }
        
        console.log(`💖 ${movie.title} ${newLikedState ? 'liked' : 'unliked'}`)
        
    } catch (error) {
        console.error("Error toggling heart:", error)
    }
}

function renderMovies() {
    const grid = document.getElementById("moviesGrid")

    // Clear existing placeholder cards
    grid.innerHTML = ""

    if (currentWatchedMovies.length === 0) {
        grid.innerHTML = '<div class="no-movies">No watched movies yet.</div>'
        return
    }

    // Apply filters and sorting
    let filteredMovies = [...currentWatchedMovies]

    // Genre filter
    if (currentSort.genre !== "All Genres") {
        filteredMovies = filteredMovies.filter((movie) => movie.genres && movie.genres.includes(currentSort.genre))
    }

    // Rating filter
    if (currentSort.rating !== "All Ratings") {
        const exactRating = Number.parseInt(currentSort.rating.charAt(0))
        filteredMovies = filteredMovies.filter((movie) => movie.user_rating && movie.user_rating === exactRating)
    }

    // Create movie cards
    filteredMovies.forEach((movie) => {
        const movieCard = createWatchedMovieCard(movie)
        grid.appendChild(movieCard)
    })

    // Setup hover effects for all newly created cards
    setTimeout(setupAllStarHoverEffects, 100)
}

function createWatchedMovieCard(movie) {
    const card = document.createElement("div")
    card.className = "movie-card"
    card.setAttribute("data-movie-id", movie.id)
    if (movie.user_rating) {
        card.setAttribute("data-rating", movie.user_rating)
    }

    const posterUrl = movie.poster_path
        ? `${API_CONFIG.TMDB_IMAGE_BASE}${movie.poster_path}`
        : "../assets/images/poster-placeholder.png"

    // Create star rating 
    const stars = Array.from({ length: 5 }, (_, i) => {
        const starNumber = i + 1
        const isFilled = movie.user_rating && starNumber <= movie.user_rating
        return `<span class="star ${isFilled ? "filled" : ""}" data-rating="${starNumber}">${isFilled ? "★" : "☆"}</span>`
    }).join("")

    card.innerHTML = `
        <div class="movie-poster">
        <div class="movie-controls">
            <button class="heart-button" title="${movie.is_liked ? 'Remove from Liked' : 'Add as Liked'}" 
                    style="color: ${movie.is_liked ? '#e74c3c' : '#666'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    fill="${movie.is_liked ? 'currentColor' : 'none'}"/>
            </svg>
            </button>
            <div class="menu-container">
            <button class="menu-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="19" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="5" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="movie-menu">
                <button class="remove-button">REMOVE</button>
            </div>
            </div>
        </div>
        ${
            movie.poster_path
            ? `<img src="${posterUrl}" alt="${movie.title}" class="poster-image" 
                style="width: 100%; height: 100%; object-fit: cover;" 
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="poster-placeholder" style="display: none;">🎬</div>`
            : `<div class="poster-placeholder">🎬</div>`
        }
        <div class="movie-title-overlay">${movie.title}</div>
        </div>
        <div class="movie-rating">
        <button class="reset-rating" title="Reset rating" style="display: none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        ${stars}
        </div>
    `
    return card
}

// Star hover effects setup for individual cards
function setupStarHoverEffectsForCard(movieCard) {
    const stars = movieCard.querySelectorAll(".star")
    const resetButton = movieCard.querySelector(".reset-rating")
    const ratingContainer = movieCard.querySelector(".movie-rating")

    if (!ratingContainer) return

    // Remove existing event listeners to prevent duplicates
    const newRatingContainer = ratingContainer.cloneNode(true)
    ratingContainer.parentNode.replaceChild(newRatingContainer, ratingContainer)

    // Get fresh references after cloning
    const freshStars = movieCard.querySelectorAll(".star")
    const freshResetButton = movieCard.querySelector(".reset-rating")
    const freshRatingContainer = movieCard.querySelector(".movie-rating")

    // Handle mouse enter on rating container
    freshRatingContainer.addEventListener("mouseenter", () => {
        // Only show reset button if movie has a rating
        if (movieCard.hasAttribute("data-rating")) {
        freshResetButton.style.display = "flex"
        }
    })

    // Handle mouse leave on rating container
    freshRatingContainer.addEventListener("mouseleave", () => {
        // Always hide reset button when not hovering
        freshResetButton.style.display = "none"
    })

    // Star hover effects
    freshStars.forEach((star) => {
        star.addEventListener("mouseenter", function () {
        const rating = Number.parseInt(this.getAttribute("data-rating"))
        const stars = movieCard.querySelectorAll(".star")
        const resetButton = movieCard.querySelector(".reset-rating")

        // Show reset button only if movie already has a rating
        if (movieCard.hasAttribute("data-rating")) {
            resetButton.style.display = "flex"
        }

        // Show hover preview
        stars.forEach((s, index) => {
            if (index < rating) {
            s.style.color = "#ffed4e"
            } else {
            s.style.color = "#ddd"
            }
        })
        })

        star.addEventListener("mouseleave", () => {
        const stars = movieCard.querySelectorAll(".star")

        // Reset to actual rating colors
        stars.forEach((s) => {
            if (s.classList.contains("filled")) {
            s.style.color = "#ffd700"
            } else {
            s.style.color = "#ddd"
            }
        })
        })
    })
}

// Setup hover effects for all movie cards
function setupAllStarHoverEffects() {
    const allMovieCards = document.querySelectorAll(".movie-card")
    allMovieCards.forEach((movieCard) => {
        setupStarHoverEffectsForCard(movieCard)
    })
}   

// Utility functions
function getCurrentUserId() {
    return localStorage.getItem("userId") || "1" // Temporary
}