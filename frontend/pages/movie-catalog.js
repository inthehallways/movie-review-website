function toggleDropdown() {
  document.getElementById("dropdownMenu").classList.toggle("show")
}

// TMDB API Configuration
const API_KEY = "d2a72fb4b28ccba64124755d66b1b0f1"
const BASE_URL = "https://api.themoviedb.org/3"
const IMG_URL = "https://image.tmdb.org/t/p/w500"

const modal = document.getElementById("movieModal")
const closeBtn = modal.querySelector(".close")
const modalContent = document.querySelector(".modal-content")
const moreOptionsModal = document.getElementById("moreOptionsModal")

const movieGrid = document.getElementById("movieGrid")
const searchInput = document.getElementById("searchInput")
const searchBtn = document.getElementById("searchBtn")

const genreSelect = document.getElementById("genreSelect")
const yearSelect = document.getElementById("yearSelect")
const nameSelect = document.getElementById("nameSelect")

let currentMovies = []
let currentMovie = null

document.addEventListener("DOMContentLoaded", () => {
  fetchPopularMovies()

  genreSelect.addEventListener("change", applyFilters)
  yearSelect.addEventListener("change", applyNameSort)
})

searchBtn.addEventListener("click", (e) => {
  e.preventDefault()
  const query = searchInput.value.trim()
  if (query !== "") {
    searchMovies(query)
  } else {
    fetchPopularMovies()
  }
})

async function fetchPopularMovies() {
  try {
    const res = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`)
    const data = await res.json()
    currentMovies = data.results
    displayMovies(currentMovies)
  } catch (err) {
    console.error("Error fetching popular movies:", err)
  }
}

async function searchMovies(query) {
  try {
    const res = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`,
    )
    const data = await res.json()
    currentMovies = data.results
    displayMovies(currentMovies)
  } catch (err) {
    console.error("Error searching for movies:", err)
  }
}

async function applyFilters() {
  const genreValue = genreSelect.value
  const yearValue = yearSelect.value

  const genreMap = {
    Action: 28,
    Comedy: 35,
    Drama: 18,
    Horror: 27,
    "Sci-Fi": 878,
  }

  const genreId = genreMap[genreValue] || ""

  let primaryReleaseGte = ""
  let primaryReleaseLte = ""

  if (yearValue) {
    switch (yearValue) {
      case "2020s":
        primaryReleaseGte = "2020-01-01"
        primaryReleaseLte = "2029-12-31"
        break
      case "2010s":
        primaryReleaseGte = "2010-01-01"
        primaryReleaseLte = "2019-12-31"
        break
      case "2000s":
        primaryReleaseGte = "2000-01-01"
        primaryReleaseLte = "2009-12-31"
        break
      case "1990s":
        primaryReleaseGte = "1990-01-01"
        primaryReleaseLte = "1999-12-31"
        break
    }
  }

  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&page=1`

  if (genreId) url += `&with_genres=${genreId}`
  if (primaryReleaseGte) url += `&primary_release_date.gte=${primaryReleaseGte}`
  if (primaryReleaseLte) url += `&primary_release_date.lte=${primaryReleaseLte}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    currentMovies = data.results || []
    applyNameSort() // also apply name sorting if selected
  } catch (err) {
    console.error("Error applying filters:", err)
  }
}

function applyNameSort() {
  const sortValue = nameSelect.value

  if (sortValue === "asc") {
    currentMovies.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortValue === "desc") {
    currentMovies.sort((a, b) => b.title.localeCompare(a.title))
  }

  displayMovies(currentMovies)
}

function displayMovies(movies) {
  movieGrid.innerHTML = ""

  if (!movies.length) {
    movieGrid.innerHTML = "<p>No movies found.</p>"
    return
  }

  movies.forEach((movie) => {
    const posterURL = movie.poster_path
      ? `${IMG_URL}${movie.poster_path}`
      : "https://via.placeholder.com/300x450?text=No+Image"

    const card = document.createElement("div")
    card.classList.add("movie-card")

    card.innerHTML = `
      <img src="${posterURL}" alt="${movie.title} Poster" style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;" />
    `

    card.addEventListener("click", () => {
      showModal(movie)
    })

    movieGrid.appendChild(card)
  })
}

async function fetchMovieDetails(movieId) {
  try {
    const res = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error("Error fetching movie details:", err)
    return null
  }
}

async function showModal(movie) {
  currentMovie = movie
  resetModalState()

  // Fetch detailed movie information including director
  const movieDetails = await fetchMovieDetails(movie.id)

  const posterURL = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : "/placeholder.svg?height=329&width=308"

  // Find director from credits
  const director =
    movieDetails && movieDetails.credits && movieDetails.credits.crew
      ? movieDetails.credits.crew.find((person) => person.job === "Director")
      : null

  // Extract year from release date
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "Unknown"

  // Update the modal content with actual movie data - combine title and year
  modal.querySelector(".movie-title").textContent = `${movie.title} (${releaseYear})`
  modal.querySelector(".relesease-date").textContent = ""

  // Update "watched on" text to show it's not watched yet
  modal.querySelector(".dd-mm-yyyy").textContent = "Not watched"

  modal.querySelector(".directed-by").textContent = director ? `Directed by ${director.name}` : "Director Unknown"
  modal.querySelector(".movie-description").textContent = movie.overview || "No description available."

  // Update the main poster - FIXED: Use correct class name
  modal.querySelector(".modal-movie-poster").style.backgroundImage = `url(${posterURL})`
  modal.querySelector(".modal-movie-poster").style.backgroundSize = "cover"
  modal.querySelector(".modal-movie-poster").style.backgroundPosition = "center"

  modal.style.display = "block"

  // Reattach close event to new close button
  modal.querySelector(".close").onclick = () => {
    modal.style.display = "none"
    moreOptionsModal.style.display = "none"
  }
}

// New modal functionality for the redesigned buttons
function markAsWatched() {
    if (!currentMovie) return;
    
    // Check if already watched
    const watchedButton = modal.querySelector(".marked-as-watched");
    if (watchedButton.classList.contains("watched")) {
        // If already watched, reset to unwatched
        watchedButton.classList.remove("watched");
        watchedButton.querySelector(".watched-text").textContent = "Mark as Watched";
        modal.querySelector(".dd-mm-yyyy").textContent = "Not watched";
        return;
    }
    
    // Create and configure date input
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.style.position = 'fixed';
    dateInput.style.left = '50%';
    dateInput.style.top = '50%';
    dateInput.style.transform = 'translate(-50%, -50%)';
    dateInput.style.zIndex = '10000';
    dateInput.style.opacity = '0';
    
    // Set max date to today
    const today = new Date();
    dateInput.max = today.toISOString().split('T')[0];
    
    // Add event listeners
    dateInput.addEventListener('change', function() {
        if (!this.value) return;
        
        const selectedDate = new Date(this.value);
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = selectedDate.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        // Update UI
        modal.querySelector(".dd-mm-yyyy").textContent = formattedDate;
        watchedButton.classList.add("watched");
        watchedButton.querySelector(".watched-text").textContent = "Watched";
        
        // Remove the input
        document.body.removeChild(dateInput);
    });
    
    dateInput.addEventListener('blur', function() {
        setTimeout(() => {
            if (document.body.contains(dateInput)) {
                document.body.removeChild(dateInput);
            }
        }, 100);
    });
    
    // Add to DOM and trigger
    document.body.appendChild(dateInput);
    dateInput.focus();
    dateInput.showPicker();
}

function addToLikes() {
  if (currentMovie) {
    const likesButton = modal.querySelector(".add-to-likes")
    const likesText = likesButton.querySelector(".likes-text")

    if (likesButton.classList.contains("liked")) {
      // Remove from likes
      likesButton.classList.remove("liked")
      likesText.textContent = "Add to Likes"
      alert(`Removed "${currentMovie.title}" from likes!`)
    } else {
      // Add to likes
      likesButton.classList.add("liked")
      likesText.textContent = "Liked"
      alert(`Added "${currentMovie.title}" to likes!`)
    }
  }
}

function addToWatchlist() {
  if (currentMovie) {
    const watchlistButton = modal.querySelector(".add-to-watchlist")
    const watchlistText = watchlistButton.querySelector(".watchlist-text")

    if (watchlistButton.classList.contains("in-watchlist")) {
      // Remove from watchlist
      watchlistButton.classList.remove("in-watchlist")
      watchlistText.textContent = "Add to Watchlist"
      alert(`Removed "${currentMovie.title}" from watchlist!`)
    } else {
      // Add to watchlist
      watchlistButton.classList.add("in-watchlist")
      watchlistText.textContent = "In Watchlist"
      alert(`Added "${currentMovie.title}" to watchlist!`)
    }
  }
}

function addReview() {
  if (currentMovie) {
    const review = prompt(`Add a review for "${currentMovie.title}":`)
    if (review) {
      alert(`Review added: "${review}"`)
      // Here you would typically save the review
    }
  }
}

function showMoreOptions() {
  if (currentMovie) {
    const isVisible = moreOptionsModal.style.display === "block"
    moreOptionsModal.style.display = isVisible ? "none" : "block"
  }
}

function editMovie() {
  if (currentMovie) {
    alert(`Edit functionality for "${currentMovie.title}" would go here!`)
    moreOptionsModal.style.display = "none"
  }
}

function deleteMovie() {
  if (currentMovie) {
    const confirmDelete = confirm(`Are you sure you want to delete "${currentMovie.title}"?`)
    if (confirmDelete) {
      alert(`"${currentMovie.title}" has been deleted!`)
      moreOptionsModal.style.display = "none"
      modal.style.display = "none"
    }
  }
}

// Star rating functionality for new rating system
document.addEventListener("change", (e) => {
  if (e.target.name === "bottom-rating") {
    const rating = e.target.value
    alert(`Bottom rated ${rating} stars!`)
  }

  if (e.target.name === "top-rating") {
    const rating = e.target.value
    alert(`Top rated ${rating} stars!`)
  }
})

// Close more options modal when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-icon-below-rating") && !e.target.closest(".more-options-modal")) {
    moreOptionsModal.style.display = "none"
  }
})

// Date picker functionality - keep the old click functionality for the rectangle
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const rectangle390 = modal.querySelector(".rectangle-390")
    if (rectangle390) {
      rectangle390.addEventListener("click", () => {
        markAsWatched()
      })
    }
  }, 100)
})

closeBtn.addEventListener("click", () => {
  modal.style.display = "none"
  moreOptionsModal.style.display = "none"
})

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none"
    moreOptionsModal.style.display = "none"
  }
})

function resetModalState() {
  // Reset watched state
  const watchedButton = modal.querySelector(".marked-as-watched")
  const watchedText = watchedButton.querySelector(".watched-text")
  watchedButton.classList.remove("watched")
  watchedText.textContent = "Mark as Watched"

  // Reset likes state
  const likesButton = modal.querySelector(".add-to-likes")
  const likesText = likesButton.querySelector(".likes-text")
  likesButton.classList.remove("liked")
  likesText.textContent = "Add to Likes"

  // Reset watchlist state
  const watchlistButton = modal.querySelector(".add-to-watchlist")
  const watchlistText = watchlistButton.querySelector(".watchlist-text")
  watchlistButton.classList.remove("in-watchlist")
  watchlistText.textContent = "Add to Watchlist"

  // Reset date
  modal.querySelector(".dd-mm-yyyy").textContent = "Not watched"

  // Reset star ratings
  const bottomRatingInputs = modal.querySelectorAll('input[name="bottom-rating"]')
  const topRatingInputs = modal.querySelectorAll('input[name="top-rating"]')

  bottomRatingInputs.forEach((input) => (input.checked = false))
  topRatingInputs.forEach((input) => (input.checked = false))

  // Hide more options modal
  moreOptionsModal.style.display = "none"
}