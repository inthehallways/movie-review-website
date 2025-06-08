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

const genreSelect = document.getElementById("genreSelect")
const yearSelect = document.getElementById("yearSelect")
const nameSelect = document.getElementById("nameSelect")

let currentMovies = []
let currentMovie = null

function loadReviews() {
  const reviews = localStorage.getItem("movieReviews")
  return reviews ? JSON.parse(reviews) : []
}

function saveReviews(reviews) {
  localStorage.setItem("movieReviews", JSON.stringify(reviews))
}

function saveReview(movieData, rating, reviewText, watchDate) {
  const reviews = loadReviews()
  const existingReviewIndex = reviews.findIndex((review) => review.movieId === movieData.id)

  const newReview = {
    id: existingReviewIndex !== -1 ? reviews[existingReviewIndex].id : Date.now(),
    movieId: movieData.id,
    title: movieData.title,
    posterPath: movieData.poster_path,
    rating: rating,
    reviewText: reviewText,
    watchDate: watchDate,
    dateAdded: existingReviewIndex !== -1 ? reviews[existingReviewIndex].dateAdded : new Date().toISOString(),
    dateModified: new Date().toISOString(),
  }

  if (existingReviewIndex !== -1) {
    reviews[existingReviewIndex] = newReview
  } else {
    reviews.unshift(newReview)
  }

  saveReviews(reviews)
  return newReview
}

function getCurrentMovieReview() {
  if (!currentMovie) return null
  const reviews = loadReviews()
  return reviews.find((review) => review.movieId === currentMovie.id)
}

document.addEventListener("DOMContentLoaded", () => {
  fetchPopularMovies()

  genreSelect.addEventListener("change", applyFilters)
  yearSelect.addEventListener("change", applyFilters)
  nameSelect.addEventListener("change", applyNameSort)

  const watchedButton = modal.querySelector(".marked-as-watched")
  const likesButton = modal.querySelector(".add-to-likes")
  const watchlistButton = modal.querySelector(".add-to-watchlist")

  watchedButton.addEventListener("click", markAsWatched)
  likesButton.addEventListener("click", addToLikes)
  watchlistButton.addEventListener("click", addToWatchlist)

  const reviewTextarea = document.querySelector(".add-a-review")
  const characterCounter = document.querySelector(".character-counter")
  const MAX_CHARS = 500

  if (reviewTextarea && characterCounter) {
    reviewTextarea.addEventListener("input", function () {
      const remaining = MAX_CHARS - this.value.length
      characterCounter.textContent = `${this.value.length}/${MAX_CHARS}`
      characterCounter.style.display = "block"

      if (remaining <= 50) {
        characterCounter.classList.add("limit")
      } else {
        characterCounter.classList.remove("limit")
      }

      if (this.value.length > MAX_CHARS) {
        this.value = this.value.substring(0, MAX_CHARS)
        characterCounter.textContent = `${MAX_CHARS}/${MAX_CHARS}`
      }
    })
  }

  const dateContainer = document.querySelector(".date-container")
  const dateDisplay = document.querySelector(".dd-mm-yyyy")
  const hiddenDateInput = document.querySelector(".hidden-date-input")

  if (dateContainer && dateDisplay && hiddenDateInput) {
    dateContainer.addEventListener("click", () => {
      // Set today's date as default
      const today = new Date()
      const todayString = today.toISOString().split("T")[0]
      hiddenDateInput.value = todayString

      hiddenDateInput.focus()
      hiddenDateInput.showPicker()
    })

    hiddenDateInput.addEventListener("change", (event) => {
      const selectedDate = event.target.value
      if (selectedDate) {
        const dateObj = new Date(selectedDate)
        const day = dateObj.getDate().toString().padStart(2, "0")
        const month = (dateObj.getMonth() + 1).toString().padStart(2, "0")
        const year = dateObj.getFullYear()
        const formattedDate = `${day}/${month}/${year}`

        dateDisplay.textContent = formattedDate

        const watchedButton = modal.querySelector(".marked-as-watched")
        const watchedText = watchedButton.querySelector(".watched-text")
        watchedButton.classList.add("watched")
        watchedText.textContent = "Watched"

        showNotification(`Marked "${currentMovie.title}" as watched on ${formattedDate}!`)
      }
    })
  }
})

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault()
    const query = searchInput.value.trim()
    if (query !== "") {
      searchMovies(query)
    } else {
      fetchPopularMovies()
    }
  }
})

let searchTimeout
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimeout)
  const query = e.target.value.trim()

  searchTimeout = setTimeout(() => {
    if (query !== "") {
      searchMovies(query)
    } else {
      fetchPopularMovies()
    }
  }, 500) 
})

async function fetchPopularMovies() {
  try {
    const [page1, page2] = await Promise.all([
      fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`),
      fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=2`),
    ])

    const [data1, data2] = await Promise.all([page1.json(), page2.json()])

    currentMovies = [...data1.results, ...data2.results].slice(0, 24)
    displayMovies(currentMovies)
  } catch (err) {
    console.error("Error fetching popular movies:", err)
  }
}

async function searchMovies(query) {
  try {
    const [page1, page2] = await Promise.all([
      fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`),
      fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=2`),
    ])

    const [data1, data2] = await Promise.all([page1.json(), page2.json()])


    currentMovies = [...data1.results, ...data2.results].slice(0, 24)
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

  let url1 = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&page=1`
  let url2 = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&page=2`

  if (genreId) {
    url1 += `&with_genres=${genreId}`
    url2 += `&with_genres=${genreId}`
  }
  if (primaryReleaseGte) {
    url1 += `&primary_release_date.gte=${primaryReleaseGte}`
    url2 += `&primary_release_date.gte=${primaryReleaseGte}`
  }
  if (primaryReleaseLte) {
    url1 += `&primary_release_date.lte=${primaryReleaseLte}`
    url2 += `&primary_release_date.lte=${primaryReleaseLte}`
  }

  try {
    const [res1, res2] = await Promise.all([fetch(url1), fetch(url2)])

    const [data1, data2] = await Promise.all([res1.json(), res2.json()])

    currentMovies = [...(data1.results || []), ...(data2.results || [])].slice(0, 24)
    applyNameSort()
  } catch (err) {
    console.error("Error applying filters:", err)
  }
}

function applyNameSort() {
  const sortValue = nameSelect.value

  if (sortValue === "asc") {
    currentMovies.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortValue === "desc") {
    currentMovies.sort((a, b) => b.title.localeCompare(b.title))
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

  const movieDetails = await fetchMovieDetails(movie.id)

  const posterURL = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : "/placeholder.svg?height=329&width=308"

  const director =
    movieDetails && movieDetails.credits && movieDetails.credits.crew
      ? movieDetails.credits.crew.find((person) => person.job === "Director")
      : null

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "Unknown"

  const titleElement = modal.querySelector(".movie-title")
  const directedByElement = modal.querySelector(".directed-by")
  const descriptionElement = modal.querySelector(".movie-description")

  titleElement.textContent = `${movie.title} (${releaseYear})`
  modal.querySelector(".release-date").textContent = ""

  directedByElement.textContent = director ? `Directed by ${director.name}` : "Director Unknown"
  descriptionElement.textContent = movie.overview || "No description available."

  requestAnimationFrame(() => {
    const titleHeight = titleElement.offsetHeight
    const titleTop = 45 

    const directedByTop = titleTop + titleHeight + 2 
    directedByElement.style.top = `${directedByTop}px`

    const directedByHeight = directedByElement.offsetHeight
    const descriptionTop = directedByTop + directedByHeight + 15 
    descriptionElement.style.top = `${descriptionTop}px`
  })

  modal.querySelector(".modal-movie-poster").style.backgroundImage = `url(${posterURL})`
  modal.querySelector(".modal-movie-poster").style.backgroundSize = "cover"
  modal.querySelector(".modal-movie-poster").style.backgroundPosition = "center"

  // Load existing review if any
  loadExistingReview()

  modal.style.display = "block"

  modal.querySelector(".close").onclick = () => {
    modal.style.display = "none"
    moreOptionsModal.style.display = "none"
  }
}

// Load existing review for current movie
function loadExistingReview() {
  const existingReview = getCurrentMovieReview()
  if (existingReview) {
    const ratingInput = modal.querySelector(`input[name="movie-rating"][value="${existingReview.rating}"]`)
    const ratingLabel = document.getElementById("ratingLabel")

    if (ratingInput) {
      ratingInput.checked = true
      ratingLabel.textContent = "Rated"
    }

    // Set the review text
    const reviewTextarea = modal.querySelector(".add-a-review")
    if (reviewTextarea) {
      reviewTextarea.value = existingReview.reviewText
      reviewTextarea.placeholder = "Edit your review..."

      const characterCounter = document.querySelector(".character-counter")
      if (characterCounter) {
        characterCounter.textContent = `${existingReview.reviewText.length}/500`
        characterCounter.style.display = "block"
      }
    }

    if (existingReview.watchDate && existingReview.watchDate !== "Not watched") {
      const watchedButton = modal.querySelector(".marked-as-watched")
      const watchedText = watchedButton.querySelector(".watched-text")
      watchedButton.classList.add("watched")
      watchedText.textContent = "Watched"

      const dateDisplay = modal.querySelector(".dd-mm-yyyy")
      if (dateDisplay) {
        dateDisplay.textContent = existingReview.watchDate
      }
    }
  }
}

function markAsWatched() {
  if (currentMovie) {
    const hiddenDateInput = document.querySelector(".hidden-date-input")
    const dateDisplay = document.querySelector(".dd-mm-yyyy")

    if (hiddenDateInput && dateDisplay) {
      const today = new Date()
      const todayString = today.toISOString().split("T")[0]
      hiddenDateInput.value = todayString

      hiddenDateInput.focus()
      hiddenDateInput.showPicker()

      const day = today.getDate().toString().padStart(2, "0")
      const month = (today.getMonth() + 1).toString().padStart(2, "0")
      const year = today.getFullYear()
      const formattedDate = `${day}/${month}/${year}`

      dateDisplay.textContent = formattedDate

      const watchedButton = modal.querySelector(".marked-as-watched")
      const watchedText = watchedButton.querySelector(".watched-text")
      watchedButton.classList.add("watched")
      watchedText.textContent = "Watched"

      showNotification(`Marked "${currentMovie.title}" as watched on ${formattedDate}!`)
    }
  }
}

function addToLikes() {
  if (currentMovie) {
    const likesButton = modal.querySelector(".add-to-likes")
    const likesText = likesButton.querySelector(".likes-text")

    if (likesButton.classList.contains("liked")) {
      likesButton.classList.remove("liked")
      likesText.textContent = "Add to Likes"
      showNotification(`Removed "${currentMovie.title}" from likes!`)
    } else {
      likesButton.classList.add("liked")
      likesText.textContent = "Liked"
      showNotification(`Added "${currentMovie.title}" to likes!`)
    }
  }
}

function addToWatchlist() {
  if (currentMovie) {
    const watchlistButton = modal.querySelector(".add-to-watchlist")
    const watchlistText = watchlistButton.querySelector(".watchlist-text")

    if (watchlistButton.classList.contains("in-watchlist")) {
      watchlistButton.classList.remove("in-watchlist")
      watchlistText.textContent = "Add to Watchlist"
      showNotification(`Removed "${currentMovie.title}" from watchlist!`)
    } else {
      watchlistButton.classList.add("in-watchlist")
      watchlistText.textContent = "In Watchlist"
      showNotification(`Added "${currentMovie.title}" to watchlist!`)
    }
  }
}

function addReview() {
  if (currentMovie) {
    const reviewTextarea = modal.querySelector(".add-a-review")
    if (reviewTextarea) {
      reviewTextarea.focus()
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
    showNotification(`Edit functionality for "${currentMovie.title}" would go here!`)
    moreOptionsModal.style.display = "none"
  }
}

function deleteMovie() {
  if (currentMovie) {
    const confirmDelete = confirm(`Are you sure you want to delete "${currentMovie.title}"?`)
    if (confirmDelete) {
      showNotification(`"${currentMovie.title}" has been deleted!`)
      moreOptionsModal.style.display = "none"
      modal.style.display = "none"
    }
  }
}

document.addEventListener("change", (e) => {
  if (e.target.name === "movie-rating") {
    const rating = e.target.value
    const ratingLabel = document.getElementById("ratingLabel")

    if (rating) {
      ratingLabel.textContent = "Rated"
      console.log(`Rating selected: ${rating} stars`)
    }
  }
})

document.addEventListener("click", (e) => {
  if (e.target.matches(".star-rating label")) {
    const input = document.getElementById(e.target.getAttribute("for"))
    const ratingLabel = document.getElementById("ratingLabel")

    if (input && input.checked) {
      setTimeout(() => {
        input.checked = false
        ratingLabel.textContent = "Rating"
        console.log("Rating removed")
      }, 100)
    }
  }

  if (!e.target.closest(".menu-icon-review-area") && !e.target.closest(".more-options-modal")) {
    moreOptionsModal.style.display = "none"
  }
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
  const watchedButton = modal.querySelector(".marked-as-watched")
  const watchedText = watchedButton.querySelector(".watched-text")
  watchedButton.classList.remove("watched")
  watchedText.textContent = "Mark as Watched"

  const likesButton = modal.querySelector(".add-to-likes")
  const likesText = likesButton.querySelector(".likes-text")
  likesButton.classList.remove("liked")
  likesText.textContent = "Add to Likes"

  const watchlistButton = modal.querySelector(".add-to-watchlist")
  const watchlistText = watchlistButton.querySelector(".watchlist-text")
  watchlistButton.classList.remove("in-watchlist")
  watchlistText.textContent = "Add to Watchlist"

  // Reset rating
  const ratingInputs = modal.querySelectorAll('input[name="movie-rating"]')
  ratingInputs.forEach((input) => (input.checked = false))

  const ratingLabel = document.getElementById("ratingLabel")
  if (ratingLabel) {
    ratingLabel.textContent = "Rating"
  }

  const dateDisplay = modal.querySelector(".dd-mm-yyyy")
  if (dateDisplay) {
    dateDisplay.textContent = "DD/MM/YYYY"
  }

  moreOptionsModal.style.display = "none"

  const reviewTextarea = modal.querySelector(".add-a-review")
  const characterCounter = document.querySelector(".character-counter")
  if (reviewTextarea) {
    reviewTextarea.value = ""
    reviewTextarea.placeholder = "Add a Review..."
  }
  if (characterCounter) {
    characterCounter.textContent = "0/500"
    characterCounter.classList.remove("limit")
    characterCounter.style.display = "none"
  }
}

// Submit review function
function submitReview() {
  if (currentMovie) {
    const reviewTextarea = modal.querySelector(".add-a-review")
    const review = reviewTextarea.value.trim()

    const selectedRating = modal.querySelector('input[name="movie-rating"]:checked')
    if (!selectedRating) {
      showNotification("Please select a rating before submitting your review.")
      return
    }

    const rating = Number.parseInt(selectedRating.value)

    const watchedButton = modal.querySelector(".marked-as-watched")
    if (!watchedButton.classList.contains("watched")) {
      showNotification("Please mark the movie as watched before submitting a review.")
      return
    }

    // Validate review text
    if (!review) {
      showNotification("Please write a review before submitting.")
      reviewTextarea.focus()
      return
    }

    if (review.length < 10) {
      showNotification("Please write a more detailed review (at least 10 characters).")
      reviewTextarea.focus()
      return
    }

    // Get watch date from display or use current date
    const dateDisplay = modal.querySelector(".dd-mm-yyyy")
    let watchDate = dateDisplay ? dateDisplay.textContent : null

    if (!watchDate || watchDate === "DD/MM/YYYY") {
      const currentDate = new Date()
      const day = currentDate.getDate().toString().padStart(2, "0")
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0")
      const year = currentDate.getFullYear()
      watchDate = `${day}/${month}/${year}`
    }

    // Save the review
    const savedReview = saveReview(currentMovie, rating, review, watchDate)

    if (savedReview) {
      const existingReview = getCurrentMovieReview()
      const message =
        existingReview && existingReview.id !== savedReview.id
          ? `Review updated for "${currentMovie.title}"!`
          : `Review saved for "${currentMovie.title}"!`

      showNotification(message, "success")
      reviewTextarea.placeholder = "Review saved! Edit or add another..."
    }
  }
}

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message


  Object.assign(notification.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    padding: "12px 20px",
    background: type === "success" ? "#4CAF50" : "#f49b98",
    color: "#fff",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: "10000",
    maxWidth: "300px",
    animation: "fadeIn 0.3s ease",
  })


  document.body.appendChild(notification)


  setTimeout(() => {
    notification.style.animation = "fadeOut 0.3s ease"
    setTimeout(() => {
      document.body.removeChild(notification)
    }, 300)
  }, 3000)
}

// Add this to your existing modal display code
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "block") {
    modal.style.display = "none"
    moreOptionsModal.style.display = "none"
  }
})
