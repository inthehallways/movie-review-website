// JavaScript for SceneIt Watchlist Page
// This file handles the watchlist functionality including loading, rendering, and managing movies in the watchlist.

import { API_CONFIG, getUserWatchlist, removeFromWatchlist, markAsWatched, addToWatchedList } from "./api.js"

let currentWatchlist = []
const currentSort = { date: "Newest Added", genre: "All Genres" }

// Initialize when page loads
document.addEventListener("DOMContentLoaded", async () => {
  await loadWatchlist()
  setupEventListeners()
})

async function loadWatchlist() {
  try {
    const userId = getCurrentUserId()
    currentWatchlist = await getUserWatchlist(userId)
    renderMovies()
  } catch (error) {
    console.error("Error loading watchlist:", error)
  }
}

function setupEventListeners() {
  // Tab functionality
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", function () {
      document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"))
      this.classList.add("active")

      const tab = this.dataset.tab
      if (tab === "watched") {
        window.location.href = "../pages/watched.html"
      } else if (tab === "reviews") {
        console.log("Reviews page not implemented yet")
      }
    })
  })

  // Use event delegation for all movie interactions
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

    // Handle eye button clicks (mark as watched)
    if (e.target.closest(".eye-button")) {
      e.preventDefault()
      e.stopPropagation()
      const movieCard = e.target.closest(".movie-card")
      const movieId = movieCard.getAttribute("data-movie-id")
      await markAsWatchedHandler(movieId)
    }

    // Handle remove button clicks
    if (e.target.classList.contains("remove-button")) {
      e.preventDefault()
      e.stopPropagation()
      const movieCard = e.target.closest(".movie-card")
      const movieId = movieCard.getAttribute("data-movie-id")
      await removeFromWatchlistHandler(movieId)
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

  // Set up global functions for sorting
  window.selectSort = (type, value) => {
    currentSort[type] = value
    document.getElementById(type + "Selected").textContent = value
    document.getElementById(type + "Dropdown").classList.remove("show")
    renderMovies()
  }
}

// Handles when user marks a movie as watched 
async function markAsWatchedHandler(movieId) {
  const movie = currentWatchlist.find((m) => m.id == movieId)
  if (!movie) return

  try {
    const userId = getCurrentUserId()
    
    // First, add to watched list
    await addToWatchedList(userId, movie)
    
    // Then, mark as watched and remove from watchlist
    await markAsWatched(userId, movie)
    await removeFromWatchlist(userId, movieId)

    // Close any open menus
    document.querySelectorAll(".movie-menu").forEach((menu) => {
      menu.classList.remove("show")
    })

    // Update local data and re-render
    currentWatchlist = currentWatchlist.filter((m) => m.id != movieId)
    renderMovies()

    // Log to console instead of showing alert
    console.log(`"${movie.title}" marked as watched and moved to watched list!`)
  } catch (error) {
    console.error("Error marking as watched:", error)
  }
}

// Handles when user removes a movie from watchlist
async function removeFromWatchlistHandler(movieId) {
  const movie = currentWatchlist.find((m) => m.id == movieId)
  if (!movie) return

  try {
    const userId = getCurrentUserId()
    await removeFromWatchlist(userId, movieId)

    // Update local data and re-render
    currentWatchlist = currentWatchlist.filter((m) => m.id != movieId)
    renderMovies()

    showNotification(`"${movie.title}" removed from watchlist`)
  } catch (error) {
    console.error("Error removing from watchlist:", error)
  }
}

function renderMovies() {
  const grid = document.getElementById("moviesGrid")

  // Clear existing placeholder cards
  grid.innerHTML = ""

  if (currentWatchlist.length === 0) {
    grid.innerHTML = '<div class="no-movies">No movies in your watchlist yet.</div>'
    return
  }

  // Apply filters
  let filteredMovies = [...currentWatchlist]

  if (currentSort.genre !== "All Genres") {
    filteredMovies = filteredMovies.filter((movie) => movie.genres && movie.genres.includes(currentSort.genre))
  }

  // Apply sorting
  if (currentSort.date === "Newest Added") {
    filteredMovies.sort((a, b) => new Date(b.added_date) - new Date(a.added_date))
  } else if (currentSort.date === "Oldest Added") {
    filteredMovies.sort((a, b) => new Date(a.added_date) - new Date(b.added_date))
  }

  // Create movie cards
  filteredMovies.forEach((movie) => {
    const movieCard = createWatchlistMovieCard(movie)
    grid.appendChild(movieCard)
  })
}

function createWatchlistMovieCard(movie) {
  const card = document.createElement("div")
  card.className = "movie-card"
  card.setAttribute("data-movie-id", movie.id)

  const posterUrl = movie.poster_path
    ? `${API_CONFIG.TMDB_IMAGE_BASE}${movie.poster_path}`
    : "../assets/images/no-poster.jpg"

  card.innerHTML = `
    <div class="movie-poster">
      <div class="movie-controls">
        <button class="eye-button" title="Mark as watched">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
      ${movie.poster_path 
        ? `<img src="${posterUrl}" alt="${movie.title}" class="poster-image" 
           style="width: 100%; height: 100%; object-fit: cover;" 
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="poster-placeholder" style="display: none;">🎬</div>`
        : `<div class="poster-placeholder">🎬</div>`
      }
      <div class="movie-title-overlay">${movie.title}</div>
    </div>
  `
  return card
}

// Utility functions
function getCurrentUserId() {
    return localStorage.getItem("userId") || "1" // Temporary
}

function showNotification(message) {
    console.log(message)
}