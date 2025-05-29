// TMDB API Configuration
const API_KEY = "d2a72fb4b28ccba64124755d66b1b0f1"
const IMG_URL = "https://image.tmdb.org/t/p/w500"

let currentEditingReview = null

// Dropdown functionality for profile menu
function toggleDropdown() {
  const menu = document.getElementById("dropdownMenu")
  menu.classList.toggle("show")
}

// Close dropdown when clicking outside
window.addEventListener("click", (e) => {
  const dropdown = document.getElementById("dropdownMenu")
  const profileContainer = document.querySelector(".profile-container")

  if (!profileContainer.contains(e.target)) {
    dropdown.classList.remove("show")
  }
})

// Tab navigation functions
function switchToWatchlist() {
  window.location.href = "../pages/watchlist.html"
}

function switchToWatched() {
  window.location.href = "../pages/watched.html"
}

// Review System - Load reviews from localStorage
function loadReviews() {
  const reviews = localStorage.getItem("movieReviews")
  return reviews ? JSON.parse(reviews) : []
}

// Review System - Save reviews to localStorage
function saveReviews(reviews) {
  localStorage.setItem("movieReviews", JSON.stringify(reviews))
}

// Sort dropdown functionality
function toggleSortDropdown(type) {
  const dropdown = document.getElementById(type + "Dropdown")
  const allDropdowns = document.querySelectorAll(".dropdown-menu-sort")

  // Close all other dropdowns
  allDropdowns.forEach((d) => {
    if (d !== dropdown) {
      d.classList.remove("show")
    }
  })

  // Toggle current dropdown
  dropdown.classList.toggle("show")
}

function selectSort(type, value) {
  const selectedSpan = document.getElementById(type + "Selected")
  selectedSpan.textContent = value

  // Close dropdown
  document.getElementById(type + "Dropdown").classList.remove("show")

  // Apply sorting logic
  console.log(`Sorting by ${type}:`, value)
  sortReviews(value)
}

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown-container")) {
    document.querySelectorAll(".dropdown-menu-sort").forEach((dropdown) => {
      dropdown.classList.remove("show")
    })
  }
})

// Sample reviews data (in a real app, this would come from a database)
const reviewsData = [
  {
    id: 1,
    title: "The Dark Knight",
    rating: 5,
    watchDate: "15/01/2025",
    reviewText:
      "An absolutely masterful piece of cinema. Christopher Nolan's direction combined with Heath Ledger's iconic performance as the Joker creates an unforgettable experience. The film perfectly balances action, drama, and psychological thriller elements.",
    dateAdded: new Date("2025-01-15"),
  },
  {
    id: 2,
    title: "Inception",
    rating: 4,
    watchDate: "12/01/2025",
    reviewText:
      "A mind-bending journey through dreams within dreams. Nolan's complex narrative structure keeps you engaged throughout, though it can be confusing at times. The visual effects and cinematography are stunning.",
    dateAdded: new Date("2025-01-12"),
  },
  {
    id: 3,
    title: "Parasite",
    rating: 5,
    watchDate: "08/01/2025",
    reviewText:
      "Bong Joon-ho delivers a brilliant social commentary wrapped in a thrilling narrative. The film's exploration of class divide is both subtle and powerful. Every scene is meticulously crafted.",
    dateAdded: new Date("2025-01-08"),
  },
  {
    id: 4,
    title: "Interstellar",
    rating: 4,
    watchDate: "05/01/2025",
    reviewText:
      "An emotional and visually spectacular space epic. While the science can be overwhelming, the human story at its core is deeply moving. Hans Zimmer's score is absolutely phenomenal.",
    dateAdded: new Date("2025-01-05"),
  },
]

// Function to render reviews
function renderReviews(reviews) {
  const reviewsList = document.getElementById("reviewsList")
  const noReviewsMessage = document.getElementById("noReviewsMessage")

  if (!reviews || reviews.length === 0) {
    reviewsList.innerHTML = ""
    noReviewsMessage.style.display = "block"
    return
  }

  noReviewsMessage.style.display = "none"

  reviewsList.innerHTML = reviews
    .map((review) => {
      const posterUrl = review.posterPath ? `${IMG_URL}${review.posterPath}` : null

      return `
            <div class="review-card" data-review-id="${review.id}">
                <div class="movie-poster-small">
                    ${
                      posterUrl
                        ? `<img src="${posterUrl}" alt="${review.title} Poster" />`
                        : '<div class="poster-placeholder-small"></div>'
                    }
                </div>
                <div class="review-content">
                    <div class="review-header">
                        <h3 class="movie-title">${review.title}</h3>
                        <div class="review-meta">
                            <div class="star-rating">
                                ${generateStarRating(review.rating)}
                            </div>
                            <span class="watch-date">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Watched ${review.watchDate}
                            </span>
                        </div>
                    </div>
                    <p class="review-text">${review.reviewText}</p>
                </div>
                <div class="review-actions">
                    <button class="review-action-btn edit-btn" onclick="openEditReview(${review.id})" title="Edit Review">
                        ✏️
                    </button>
                    <button class="review-action-btn delete-btn" onclick="openDeleteReview(${review.id})" title="Delete Review">
                        🗑️
                    </button>
                </div>
            </div>
        `
    })
    .join("")
}

// Function to generate star rating HTML
function generateStarRating(rating) {
  let stars = ""
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars += '<span class="star filled">★</span>'
    } else {
      stars += '<span class="star">★</span>'
    }
  }
  return stars
}

// Function to sort reviews
function sortReviews(sortType) {
  const reviews = loadReviews()
  const sortedReviews = [...reviews]

  switch (sortType) {
    case "Latest Added":
      sortedReviews.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
      break
    case "Oldest Added":
      sortedReviews.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded))
      break
    case "Highest Rated":
      sortedReviews.sort((a, b) => b.rating - a.rating)
      break
    case "Lowest Rated":
      sortedReviews.sort((a, b) => a.rating - b.rating)
      break
    default:
      // Default to latest added
      sortedReviews.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
  }

  renderReviews(sortedReviews)
}

// Function to add a new review (for future use)
function addReview(movieTitle, rating, watchDate, reviewText) {
  const newReview = {
    id: reviewsData.length + 1,
    title: movieTitle,
    rating: rating,
    watchDate: watchDate,
    reviewText: reviewText,
    dateAdded: new Date(),
  }

  reviewsData.unshift(newReview) // Add to beginning of array
  renderReviews(reviewsData)
}

// Function to edit a review (for future use)
function editReview(reviewId, updatedData) {
  const reviewIndex = reviewsData.findIndex((review) => review.id === reviewId)
  if (reviewIndex !== -1) {
    reviewsData[reviewIndex] = { ...reviewsData[reviewIndex], ...updatedData }
    renderReviews(reviewsData)
  }
}

// Edit Review Functions
function openEditReview(reviewId) {
  const reviews = loadReviews()
  const review = reviews.find((r) => r.id === reviewId)

  if (!review) {
    alert("Review not found!")
    return
  }

  currentEditingReview = review

  // Populate edit modal
  document.getElementById("editMovieTitle").textContent = `Edit Review - ${review.title}`
  document.getElementById("editReviewText").value = review.reviewText

  // Set rating
  const ratingInput = document.querySelector(`input[name="edit-rating"][value="${review.rating}"]`)
  if (ratingInput) {
    ratingInput.checked = true
  }

  // Show modal
  document.getElementById("editReviewModal").style.display = "block"
}

function closeEditModal() {
  document.getElementById("editReviewModal").style.display = "none"
  currentEditingReview = null

  // Reset form
  document.getElementById("editReviewText").value = ""
  document.querySelectorAll('input[name="edit-rating"]').forEach((input) => {
    input.checked = false
  })
}

function saveEditedReview() {
  if (!currentEditingReview) {
    alert("No review selected for editing!")
    return
  }

  const newReviewText = document.getElementById("editReviewText").value.trim()
  const newRating = document.querySelector('input[name="edit-rating"]:checked')

  // Validation
  if (!newReviewText) {
    alert("Please write a review before saving.")
    return
  }

  if (newReviewText.length < 10) {
    alert("Please write a more detailed review (at least 10 characters).")
    return
  }

  if (!newRating) {
    alert("Please select a rating before saving.")
    return
  }

  // Update review
  const reviews = loadReviews()
  const reviewIndex = reviews.findIndex((r) => r.id === currentEditingReview.id)

  if (reviewIndex !== -1) {
    reviews[reviewIndex] = {
      ...reviews[reviewIndex],
      rating: Number.parseInt(newRating.value),
      reviewText: newReviewText,
      dateModified: new Date().toISOString(),
    }

    saveReviews(reviews)
    renderReviews(reviews)
    closeEditModal()

    alert(`Review for "${currentEditingReview.title}" has been updated!`)
  } else {
    alert("Error updating review. Please try again.")
  }
}

// Delete Review Function
function openDeleteReview(reviewId) {
  const reviews = loadReviews()
  const review = reviews.find((r) => r.id === reviewId)

  if (!review) {
    alert("Review not found!")
    return
  }

  const confirmDelete = confirm(`Are you sure you want to delete your review for "${review.title}"?`)

  if (confirmDelete) {
    const updatedReviews = reviews.filter((r) => r.id !== reviewId)
    saveReviews(updatedReviews)
    renderReviews(updatedReviews)

    alert(`Review for "${review.title}" has been deleted!`)
  }
}

// Close edit modal when clicking outside
window.addEventListener("click", (e) => {
  const modal = document.getElementById("editReviewModal")
  if (e.target === modal) {
    closeEditModal()
  }
})

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  // Check if there are existing reviews, if not, add sample data
  let reviews = loadReviews()

  if (reviews.length === 0) {
    // Add sample reviews for demonstration
    const sampleReviews = [
      {
        id: Date.now() + 1,
        movieId: 155,
        title: "The Dark Knight",
        posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        rating: 5,
        reviewText:
          "An absolutely masterful piece of cinema. Christopher Nolan's direction combined with Heath Ledger's iconic performance as the Joker creates an unforgettable experience. The film perfectly balances action, drama, and psychological thriller elements.",
        watchDate: "15/01/2025",
        dateAdded: new Date("2025-01-15").toISOString(),
        dateModified: new Date("2025-01-15").toISOString(),
      },
      {
        id: Date.now() + 2,
        movieId: 27205,
        title: "Inception",
        posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
        rating: 4,
        reviewText:
          "A mind-bending journey through dreams within dreams. Nolan's complex narrative structure keeps you engaged throughout, though it can be confusing at times. The visual effects and cinematography are stunning.",
        watchDate: "12/01/2025",
        dateAdded: new Date("2025-01-12").toISOString(),
        dateModified: new Date("2025-01-12").toISOString(),
      },
      {
        id: Date.now() + 3,
        movieId: 496243,
        title: "Parasite",
        posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        rating: 5,
        reviewText:
          "Bong Joon-ho delivers a brilliant social commentary wrapped in a thrilling narrative. The film's exploration of class divide is both subtle and powerful. Every scene is meticulously crafted.",
        watchDate: "08/01/2025",
        dateAdded: new Date("2025-01-08").toISOString(),
        dateModified: new Date("2025-01-08").toISOString(),
      },
    ]

    // Save sample reviews to localStorage
    saveReviews(sampleReviews)
    reviews = sampleReviews
  }

  // Load and render reviews
  renderReviews(reviews)

  // Add keyboard shortcuts for edit modal
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("editReviewModal")
    if (modal.style.display === "block") {
      if (e.key === "Escape") {
        closeEditModal()
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        saveEditedReview()
      }
    }
  })
})

// Utility function to format date
function formatDate(dateString) {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Function to get review statistics (for future use)
function getReviewStats() {
  const reviews = loadReviews()

  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      mostRecentReview: null,
      favoriteGenre: null,
    }
  }

  const totalReviews = reviews.length
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
  const mostRecentReview = reviews.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))[0]

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    mostRecentReview,
    favoriteGenre: null, // Could be implemented with genre data
  }
}
