// Logout function
document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('username');
  localStorage.removeItem('token');
  window.location.href = '../pages/login.html';
});

let reviewsData = [];   // ← Will hold the actual array of review objects
let currentEditingReview = null;


// TMDB API Configuration
const API_KEY = "d2a72fb4b28ccba64124755d66b1b0f1"
const IMG_URL = "https://image.tmdb.org/t/p/w500"


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
async function loadReviews() {
  const token = localStorage.getItem('token');

  if (!token) {
    alert("You are not logged in. Please log in first!");
    window.location.href = "../pages/login.html";
    return [];
  }

  try {
    const response = await fetch("http://localhost:3001/api/reviews", {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (response.status === 401 || response.status === 403) {
      // If token expired/invalid
      alert("Session expired. Please log in again.");
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = "../pages/login.html";
      return [];
    }

    const data = await response.json();

if (!data.success) {
  console.error("Error loading reviews:", data.message);
  return [];
}

// 1) Take the raw array from the database
const dbReviews = data.reviews; 
//    each object has { review_id, title, review_text, rating, watched_date, created_at, poster_path, movie_id, … }

// 2) If poster_path is null, replace it by fetching from TMDB
const filledReviews = await Promise.all(
  dbReviews.map(async (r) => {
    if (!r.poster_path) {
      try {
        // Fetch full movie details from TMDB so we can grab its poster_path
        const tmdb = await fetch(
          `${BASE_URL}/movie/${r.movie_id}?api_key=${API_KEY}`
        ).then((res) => res.json());

        if (tmdb.poster_path) {
          r.poster_path = tmdb.poster_path;
        }
      } catch (err) {
        console.warn("TMDB lookup failed for movie_id", r.movie_id, err);
      }
    }
    return r;
  })
);

// 3) Map the “filled” array into the shape renderReviews expects
return filledReviews.map((r) => ({
  id:            r.review_id,
  title:         r.title,
  rating:        r.rating,
  watchDate:     formatDate(r.watched_date),
  reviewText:    r.review_text,
  posterPath:    r.poster_path,  // now either the DB’s URL or the TMDB lookup
  dateAdded:     r.created_at
}));

  } catch (err) {
    console.error("Error fetching reviews:", err);
    return [];
  }
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
  const selectedSpan = document.getElementById(type + "Selected");
  selectedSpan.textContent = value;
  document.getElementById(type + "Dropdown").classList.remove("show");

  // This value is literally "Latest Added", "Oldest Added", etc.
  sortReviews(value);
}


// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown-container")) {
    document.querySelectorAll(".dropdown-menu-sort").forEach((dropdown) => {
      dropdown.classList.remove("show")
    })
  }
})

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
                    <button class="review-action-btn edit-btn" onclick="openEditReview('${review.id}')" title="Edit Review">
                        ✏️
                    </button>
                    <button class="review-action-btn delete-btn" onclick="openDeleteReview('${review.id}')" title="Delete Review">
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
  const sortedReviews = [...reviewsData]; // uses the array you already fetched
  switch (sortType) {
    case "Latest Added":
      sortedReviews.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      break;
    case "Oldest Added":
      sortedReviews.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
      break;
    case "Highest Rated":
      sortedReviews.sort((a, b) => b.rating - a.rating);
      break;
    case "Lowest Rated":
      sortedReviews.sort((a, b) => a.rating - b.rating);
      break;
    default:
      sortedReviews.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }
  renderReviews(sortedReviews);
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
  // 1) Look up the actual review object in reviewsData (which is a plain array)
  const review = reviewsData.find((r) => r.id === reviewId);

  if (!review) {
    alert("Review not found!");
    return;
  }

  currentEditingReview = review;

  // 2) Populate the edit modal fields
  document.getElementById("editMovieTitle").textContent = `Edit Review – ${review.title}`;
  document.getElementById("editReviewText").value = review.reviewText;

  // 3) Set the radio for the existing rating
  const ratingInput = document.querySelector(`input[name="edit-rating"][value="${review.rating}"]`);
  if (ratingInput) {
    ratingInput.checked = true;
  }

  // 4) Show the modal
  document.getElementById("editReviewModal").style.display = "block";
}


function closeReviewModal() {
  document.getElementById("editReviewModal").style.display = "none";
  currentEditingReview = null;

  // Reset form
  document.getElementById("editReviewText").value = ""
  document.querySelectorAll('input[name="edit-rating"]').forEach((input) => {
    input.checked = false
  })
}

async function saveEditedReview() {
  if (!currentEditingReview) {
    alert("No review selected for editing!");
    return;
  }

  // 1) Gather new values from the modal
  const newReviewText = document.getElementById("editReviewText").value.trim();
  const newRatingInput = document.querySelector('input[name="edit-rating"]:checked');

  if (!newReviewText || newReviewText.length < 10) {
    alert("Please write a more detailed review (at least 10 characters).");
    return;
  }
  if (!newRatingInput) {
    alert("Please select a rating before saving.");
    return;
  }

  const newRating = Number.parseInt(newRatingInput.value);

  // 2) Call the backend PUT /api/reviews/:id
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Session expired. Please log in again.");
    window.location.href = "../pages/login.html";
    return;
  }

  try {
    const response = await fetch(`http://localhost:3001/api/reviews/${currentEditingReview.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        review_text: newReviewText,
        rating: newRating
        // (If you want to allow editing watched_date, include watched_date here.)
      })
    });

    if (response.status === 401 || response.status === 403) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      window.location.href = "../pages/login.html";
      return;
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to update review.");

    // 3) Close the modal and re-fetch everything
    closeReviewModal();
    reviewsData = await loadReviews();
    renderReviews(reviewsData);
    alert("Review updated successfully!");
  } catch (err) {
    console.error("Error updating review:", err);
    alert("Error updating review. Please try again.");
  }
}


// Delete Review Function
async function openDeleteReview(reviewId) {
  const review = reviewsData.find((r) => r.id === reviewId);
  if (!review) {
    alert("Review not found!");
    return;
  }

  const confirmDelete = confirm(`Are you sure you want to delete your review for "${review.title}"?`);
  if (!confirmDelete) return;

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Session expired. Please log in again.");
    window.location.href = "../pages/login.html";
    return;
  }

  try {
    const response = await fetch(`http://localhost:3001/api/reviews/${reviewId}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (response.status === 401 || response.status === 403) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      window.location.href = "../pages/login.html";
      return;
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to delete review.");

    // 1) Re-fetch all reviews so the list updates
    reviewsData = await loadReviews();
    renderReviews(reviewsData);
    alert("Review deleted successfully!");
  } catch (err) {
    console.error("Error deleting review:", err);
    alert("Error deleting review. Please try again.");
  }
}


// Close edit modal when clicking outside
window.addEventListener("click", (e) => {
  const modal = document.getElementById("editReviewModal")
  if (e.target === modal) {
    closeReviewModal();
  }
})

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  // 1) Fetch from server, store into reviewsData
  reviewsData = await loadReviews();

  // 2) Render what we fetched
  renderReviews(reviewsData);

  // 3) Keyboard shortcuts for the edit modal
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("editReviewModal");
    if (modal.style.display === "block") {
      if (e.key === "Escape") {
        closeReviewModal();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        saveEditedReview();
      }
    }
  });
}); 


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
