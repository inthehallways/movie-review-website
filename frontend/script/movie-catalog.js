function toggleDropdown() {
  document.getElementById("dropdownMenu").classList.toggle("show")
}

let currentWatchlist = [];   // array of movie IDs that are in the DB for this user
let currentWatched   = [];   // array of movie IDs that are in the DB for this user

// ── DELETE “watched” when clicking “Unwatch” ───────────────────────────────────
async function handleUnwatch(movie) {
  const token = localStorage.getItem('token');
  if (!token) return alert('Please log in first.');

  try {
    const resp = await fetch(`http://localhost:3001/api/watched/${movie.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const body = await resp.json();
    if (!body.success) {
      console.error('Server said:', body.message);
      return alert('Could not unmark as watched.');
    }

    // 1) Remove from in‐memory array and re-render the grid:
    currentWatched = currentWatched.filter(id => id !== movie.id);
    displayMovies(currentMovies);

      // remove the stored date
      delete currentWatchedData[movie.id]
     // re-paint the modal so date vanishes
      resetModalState(movie.id)

  } catch (err) {
    console.error('Error in handleUnwatch:', err);
    alert('Network/server error.');
  }
}

// ── DELETE “watchlist” when clicking “Remove from Watchlist” ──────────────────
async function handleRemoveFromWatchlist(movie) {
  const token = localStorage.getItem('token');
  if (!token) return alert('Please log in first.');

  try {
    const resp = await fetch(`http://localhost:3001/api/watchlist/${movie.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const body = await resp.json();
    if (!body.success) {
      console.error('Server said:', body.message);
      return alert('Could not remove from watchlist.');
    }

    // 1) Remove from in‐memory array and re-render the grid:
    currentWatchlist = currentWatchlist.filter(id => id !== movie.id);
    displayMovies(currentMovies);

    // 2) **Reset the modal button UI** back to “Add to Watchlist”:
    const watchlistButton = modal.querySelector(".add-to-watchlist");
    watchlistButton.classList.remove("in-watchlist");       // un‐fill the bookmark icon
    watchlistButton.removeAttribute("disabled");            // re-enable it
    watchlistButton.style.opacity = "1";                    // restore full opacity
    watchlistButton.querySelector(".watchlist-text").textContent = "Add to Watchlist";

  } catch (err) {
    console.error('Error in handleRemoveFromWatchlist:', err);
    alert('Network/server error.');
  }
}

// TMDB API Configuration
const API_KEY = "SECRET_NO_CLUE"
const BASE_URL = "https://api.themoviedb.org/3"
const IMG_URL = "https://image.tmdb.org/t/p/w500"

const modal = document.getElementById("movieModal")
const closeBtn = modal.querySelector(".close")
const modalContent = document.querySelector(".modal-content")
const moreOptionsModal = document.getElementById("moreOptionsModal")

const movieGrid = document.getElementById("movieGrid"); 
const searchInput = document.getElementById("searchInput")

const genreSelect = document.getElementById("genreSelect")
const yearSelect = document.getElementById("yearSelect")
const nameSelect = document.getElementById("nameSelect")

let currentMovies = []
let currentMovie = null

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('username');
  localStorage.removeItem('token');
  window.location.href = '../pages/login.html';
});


async function saveReview(movieData, rating, reviewText, watchDate) {
  // First save to localStorage (for immediate UI update)
  const reviews = loadReviews();
  const existingReviewIndex = reviews.findIndex((review) => review.movieId === movieData.id);

  const newReview = {
    id: existingReviewIndex !== -1 ? reviews[existingReviewIndex].id : Date.now(),
    movieId: movieData.id,
    title: movieData.title,
    posterPath: movieData.poster_path,
    rating: rating,
    reviewText: reviewText,
    watchDate: watchDate || "Not watched",
    dateAdded: existingReviewIndex !== -1 ? reviews[existingReviewIndex].dateAdded : new Date().toISOString(),
    dateModified: new Date().toISOString(),
  };

  if (existingReviewIndex !== -1) {
    reviews[existingReviewIndex] = newReview;
  } else {
    reviews.unshift(newReview);
  }

  saveReviews(reviews);

  // Then save to database (async)
  try {
    const username = localStorage.getItem('username');

    const dbReviewData = {
      username: username,
      movie_id: movieData.id,
      title: movieData.title,
      review_text: reviewText,
      rating: rating,
      watched_date: watchDate || null
    };

    await saveReviewToDatabase(dbReviewData);
  } catch (error) {
    console.error('Failed to save review to database:', error);
    // You might want to implement a retry mechanism or offline storage here
  }

  return newReview;
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadUserWatchlist(),
    loadUserWatched()
  ]);
  fetchPopularMovies();

  genreSelect.addEventListener("change", applyFilters)
  yearSelect.addEventListener("change", applyFilters)
  nameSelect.addEventListener("change", applyNameSort)

  const watchedButton     = modal.querySelector(".marked-as-watched");
watchedButton.addEventListener("click", () => {
  if (currentWatched.includes(currentMovie.id)) {
    handleUnwatch(currentMovie);
  } else {
    handleMarkAsWatched(currentMovie);
  }
});

const watchlistButton   = modal.querySelector(".add-to-watchlist");
watchlistButton.addEventListener("click", () => {
  if (currentWatchlist.includes(currentMovie.id)) {
    handleRemoveFromWatchlist(currentMovie);
  } else {
    handleAddToWatchlist(currentMovie);
  }
});

  const likesButton       = modal.querySelector(".add-to-likes");
  likesButton.addEventListener("click", addToLikes)

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
  const dateDisplay = document.querySelector(".yyyy-mm-dd")
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

// (b) loadUserWatchlist() definition
async function loadUserWatchlist() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const resp = await fetch('http://localhost:3001/api/watchlist', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const body = await resp.json();
    if (body.success) {
      currentWatchlist = body.watchlist.map(r => r.movie_id);
    }
  } catch (err) {
    console.error('Could not load watchlist:', err);
  }
}

// (c) loadUserWatched() definition
// Instead of just IDs, store the entire object for each watched movie:
let currentWatchedData = {}; // will be { [movieId]: { rating: 3, liked: true, watch_date: "..." } }

async function loadUserWatched() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const resp = await fetch('http://localhost:3001/api/watched', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const body = await resp.json();
    if (!body.success) {
      console.error('Error loading watched:', body.message);
      return;
    }

    // body.watched = [ { movie_id, watch_date, rating, liked, … }, … ]
    currentWatchedData = {}; 
    body.watched.forEach(row => {
      // normalize watch_date into a pure YYYY-MM-DD string
    const raw = row.watch_date;
    const iso = raw instanceof Date
                ? raw.toISOString().split('T')[0]
                : String(raw).split('T')[0];

    currentWatchedData[row.movie_id] = {
      rating:    row.rating  === null ? null : parseInt(row.rating, 10),
      liked:     !!row.is_liked,
      watchDate: iso
    };

    });

    // Also keep an array of just the IDs for quick “includes()” checks:
    currentWatched = Object.keys(currentWatchedData).map(id => parseInt(id, 10));

  } catch (err) {
    console.error('Could not load watched:', err);
  }
}


function createCatalogMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.movieId = movie.id; // TMDB ID

  // Check if this user has already watched or added this movie
  const isWatched = currentWatched.includes(movie.id);
  const isInList  = currentWatchlist.includes(movie.id);

  const posterUrl = movie.poster_path
    ? `<img src="${IMG_URL}${movie.poster_path}" alt="${movie.title} Poster"
            style="width: 100%; height:100%; border-radius:12px; object-fit:cover;" />`
    : '<div class="poster-placeholder"></div>';

  // **Render two toggle buttons**—“Unwatch” if already watched, otherwise “Mark as Watched”,
  // and “Remove from Watchlist” if already in watchlist, otherwise “Add to Watchlist.”
  card.innerHTML = `
    <div class="movie-poster">
      ${posterUrl}
      <div class="movie-title-overlay">${movie.title}</div>
    </div>
    <div class="movie-actions">
      <!-- Toggle Watched button: “Mark as Watched” or “Unwatch” -->
      <button
        class="${isWatched ? 'btn-unwatch' : 'btn-watch'}"
        title="${isWatched ? 'Remove from Watched' : 'Mark as Watched'}">
        ${isWatched ? 'Unwatch' : 'Mark as Watched'}
      </button>

      <!-- Toggle Watchlist button: “Add to Watchlist” or “Remove from Watchlist” -->
      <button
        class="${isInList ? 'btn-remove-watchlist' : 'btn-add-watchlist'}"
        title="${isInList ? 'Remove from Watchlist' : 'Add to Watchlist'}">
        ${isInList ? 'Remove from Watchlist' : 'Add to Watchlist'}
      </button>
    </div>
  `;

  // Grab whichever “watched” button got rendered:
  const watchBtn     = card.querySelector(isWatched ? '.btn-unwatch' : '.btn-watch');
  // And whichever “watchlist” button got rendered:
  const watchlistBtn = card.querySelector(isInList  ? '.btn-remove-watchlist' : '.btn-add-watchlist');

  // Attach the correct handler for “Unwatch” or “Mark as Watched”:
  if (isWatched) {
    watchBtn.addEventListener('click', () => handleUnwatch(movie));
  } else {
    watchBtn.addEventListener('click', () => handleMarkAsWatched(movie));
  }

  // Attach the correct handler for “Remove from Watchlist” or “Add to Watchlist”:
  if (isInList) {
    watchlistBtn.addEventListener('click', () => handleRemoveFromWatchlist(movie));
  } else {
    watchlistBtn.addEventListener('click', () => handleAddToWatchlist(movie));
  }

  // Clicking the poster still opens the modal as before:
  card.querySelector('.movie-poster').addEventListener('click', () => {
    showModal(movie);
  });

  return card;
}

// — When user clicks either a card’s “Mark as Watched” button or the modal’s icon:
async function handleMarkAsWatched(movie) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please log in first.');
    return;
  }

  try {
    const today = new Date();
    const resp = await fetch('http://localhost:3001/api/watched', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        movie_id:   movie.id,
        rating:     null,
        watch_date: today
      })
    });

    const body = await resp.json();
    if (!body.success) {
      console.error('Server said:', body.message);
      alert('Could not mark as watched.');
      return;
    }

    // ─── Push to watched list ───
    currentWatched.push(movie.id);
    displayMovies(currentMovies);

    // ─── Store additional data ───
    const isoDate = today.toISOString().split("T")[0]; // safe already
    currentWatchedData[movie.id] = {
      rating:    null,
      liked:     false,
      watchDate: isoDate
    };

    // ─── Format date for UI (DD/MM/YY) ───
    const day   = today.getDate().toString().padStart(2, "0");
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const year  = today.getFullYear().toString().slice(-2);
    const formattedDate = `${day}/${month}/${year}`;

    // now that our in-memory data is set, re-paint the modal:
    resetModalState(movie.id)

    // ─── Update modal button ───
    const watchedButton = modal.querySelector(".marked-as-watched");
    if (watchedButton) {
      watchedButton.innerHTML = `
        <div class="watched-icon-container">
          <span class="material-symbols-outlined">visibility</span>
        </div>
        <div class="watched-text">Watched</div>
      `;
      watchedButton.setAttribute("disabled", "true");
      watchedButton.style.opacity = "0.6";
    }

    // ─── Optionally show notification ───
    if (typeof showNotification === 'function') {
      showNotification(`Marked "${movie.title}" as watched on ${formattedDate}!`);
    }

    // ─── Optional: update hidden input ───
    const hiddenDateInput = document.querySelector(".hidden-date-input");
    if (hiddenDateInput) {
      hiddenDateInput.value = isoDate;
    }

  } catch (err) {
    console.error('Error in handleMarkAsWatched:', err);
    alert('Network/server error.');
  }
}




// — When user clicks either a card’s “Add to Watchlist” button or the modal’s icon:
async function handleAddToWatchlist(movie) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please log in first.');
    return;
  }

  try {
    const resp = await fetch('http://localhost:3001/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ movie_id: movie.id })
    });
    const body = await resp.json();
    if (!body.success) {
      console.error('Server said:', body.message);
      alert('Could not add to watchlist.');
      return;
    }

    // 1) Update local array + re-render all grid cards:
    currentWatchlist.push(movie.id);
    currentWatchedData[movie.id] = {
  rating:   null,
  liked:    false,
  watchDate: new Date().toISOString().split("T")[0]
};
    displayMovies(currentMovies);

    // 2) Disable & re-label the modal button:
    const watchlistButton = modal.querySelector(".add-to-watchlist");
    watchlistButton.innerHTML = `
      <div class="watchlist-icon-container">
        <span class="material-symbols-outlined">bookmark</span>
      </div>
      <div class="watchlist-text">In Watchlist</div>
    `;
    watchlistButton.setAttribute("disabled", "true");
    watchlistButton.style.opacity = "0.6";

  } catch (err) {
    console.error('Error in handleAddToWatchlist:', err);
    alert('Network/server error.');
  }
}



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
    ]);

    const [data1, data2] = await Promise.all([page1.json(), page2.json()]);
    currentMovies = [...data1.results, ...data2.results].slice(0, 24);
    displayMovies(currentMovies);
  } catch (err) {
    console.error("Error fetching popular movies:", err);
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
  movieGrid.innerHTML = '';

  if (!movies.length) {
    movieGrid.innerHTML = '<p>No movies found.</p>';
    return;
  }

  // Loop through each TMDB result and append a card built by createCatalogMovieCard()
  movies.forEach(movie => {
    const card = createCatalogMovieCard(movie);
    movieGrid.appendChild(card);
  });
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
  resetModalState(movie.id);
  await loadExistingReview();
  resetModalState(movie.id);

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

  modal.style.display = "block"

  modal.querySelector(".close").onclick = () => {
    modal.style.display = "none"
    moreOptionsModal.style.display = "none"
  }

  await loadUserProfileForMovieModal();
}

// Load existing review for current movie
async function loadExistingReview() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn("Not logged in – cannot load reviews.");
    return;
  }

  try {
    const response = await fetch(`http://localhost:3001/api/reviews`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) throw new Error("Failed to fetch reviews");
    
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Error loading reviews");

    const review = data.reviews.find(r => r.movie_id === currentMovie.id);
    if (review) {
      // Populate the modal UI (stars, textarea, watch date, etc.)
      const ratingInput = modal.querySelector(`input[name="movie-rating"][value="${review.rating}"]`);
      const ratingLabel = document.getElementById("ratingLabel");
      if (ratingInput) {
        ratingInput.checked = true;
        ratingLabel.textContent = "Rated";
      }

      const reviewTextarea = modal.querySelector(".add-a-review");
      if (reviewTextarea) {
        reviewTextarea.value = review.review_text;
        reviewTextarea.placeholder = "Edit your review...";
        const characterCounter = document.querySelector(".character-counter");
        if (characterCounter) {
          characterCounter.textContent = `${review.review_text.length}/500`;
          characterCounter.style.display = "block";
        }
      }

      if (review.watched_date) {
        const watchedButton = modal.querySelector(".marked-as-watched");
        const watchedText = watchedButton.querySelector(".watched-text");
        watchedButton.classList.add("watched");
        watchedText.textContent = "Watched";
        const dateDisplay = modal.querySelector(".date-container .yyyy-mm-dd");
        if (dateDisplay) {
          const dateObj = new Date(review.watched_date);
          const formattedDate = `${dateObj.getDate().toString().padStart(2, "0")}/${
            (dateObj.getMonth() + 1).toString().padStart(2, "0")
          }/${dateObj.getFullYear()}`;
          dateDisplay.textContent = formattedDate;
        }
      }
    }
  } catch (err) {
    console.error("Error loading existing review:", err);
  }
}

const watchedDates = {};
// COMMENTED OUT -J
// function markAsWatched() {
//   if (currentMovie) {
//     const today = new Date();
//     const day = today.getDate().toString().padStart(2, "0");
//     const month = (today.getMonth() + 1).toString().padStart(2, "0");
//     const year = today.getFullYear().toString().slice(-2); // Using 2-digit year to save space
//     const formattedDate = `${day}/${month}/${year}`; // Now shows as DD/MM/YY
// 
//     const dateContainer = document.querySelector(".date-container");
//     
//     // Update the container with styled content
//     dateContainer.innerHTML = `
//       <div style="
//         font-size: 10px;
//         color: #555;
//         text-align: center;
//         line-height: 17px; /* Matches container height - borders */
//         width: 100%;
//         overflow: hidden;
//         text-overflow: ellipsis;
//         white-space: nowrap;
//       ">
//         ${formattedDate}
//       </div>
//     `;
// 
//     // Update button state
//     const watchedButton = document.querySelector(".marked-as-watched");
//     const watchedText = watchedButton.querySelector(".watched-text");
//     watchedButton.classList.add("watched");
//     watchedText.textContent = "Watched";
// 
//     showNotification(`Marked "${currentMovie.title}" as watched on ${formattedDate}!`);
// 
//     // Hidden input processing if needed
//     const hiddenDateInput = document.querySelector(".hidden-date-input");
//     if (hiddenDateInput) {
//       hiddenDateInput.value = today.toISOString().split("T")[0];
//     }
//   }
// }

function updateDateContainer(movieId) {
  const dateContainer = document.querySelector(".date-container");
  
  if (watchedDates[movieId]) {
    dateContainer.innerHTML = `
      <div style="
        font-size: 10px;
        color: #555;
        text-align: center;
        line-height: 17px;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">
        ${watchedDates[movieId]}
      </div>
    `;
  } else {
    // Clear the container if this movie hasn't been watched
    dateContainer.innerHTML = '';
  }
}

async function addToLikes() {
  if (!currentMovie) return;
  const movieId = currentMovie.id;

  // 1) refuse if the movie isn’t marked as watched yet
  if (!currentWatched.includes(movieId)) {
    alert("You must mark this movie as Watched before you can Like it.");
    return;
  }

  const likesButton = modal.querySelector(".add-to-likes");
  const likesText   = likesButton.querySelector(".likes-text");
  const currentlyLiked = currentWatchedData[movieId]?.liked === true;
  const newLikedState = !currentlyLiked;

  try {
    // 2) call server → PUT /api/watched/:movieId/liked
    const token = localStorage.getItem("token");
    const resp  = await fetch(`http://localhost:3001/api/watched/${movieId}/liked`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ liked: newLikedState })
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Server error toggling liked:", text);
      alert("Could not update like status. Please try again.");
      return;
    }
    const body = await resp.json();
    if (!body.success) {
      console.error("Server replied:", body.message);
      alert("Could not update like status. " + body.message);
      return;
    }

    // 3) On success, update our in‐memory data & UI
    currentWatchedData[movieId].liked = newLikedState;
    if (newLikedState) {
      likesButton.classList.add("liked");
      likesText.textContent = "Liked";
      showNotification(`Liked “${currentMovie.title}”!`);
    } else {
      likesButton.classList.remove("liked");
      likesText.textContent = "Add to Likes";
      showNotification(`Removed “${currentMovie.title}” from Likes.`);
    }
  } catch (err) {
    console.error("Error in addToLikes:", err);
    alert("Network or server error. Please try again.");
  }
}


// COMMENTED OUT -J
// function addToWatchlist() {
//   if (currentMovie) {
//     const watchlistButton = modal.querySelector(".add-to-watchlist")
//     const watchlistText = watchlistButton.querySelector(".watchlist-text")
// 
//     if (watchlistButton.classList.contains("in-watchlist")) {
//       watchlistButton.classList.remove("in-watchlist")
//       watchlistText.textContent = "Add to Watchlist"
//       showNotification(`Removed "${currentMovie.title}" from watchlist!`)
//     } else {
//       watchlistButton.classList.add("in-watchlist")
//       watchlistText.textContent = "In Watchlist"
//       showNotification(`Added "${currentMovie.title}" to watchlist!`)
//     }
//   }
// }

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

document.addEventListener("change", async (e) => {
  if (e.target.name === "movie-rating") {
    const selectedRating = parseInt(e.target.value, 10);
    const movieId = currentMovie?.id;
    const ratingLabel = document.getElementById("ratingLabel");

    // 1) If not watched yet → disallow
    if (!currentWatched.includes(movieId)) {
      alert("You must mark this movie as Watched before setting a rating.");
      // un‐check it again
      e.target.checked = false;
      return;
    }

    // 2) Send to server: PUT /api/watched/:movieId/rating
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`http://localhost:3001/api/watched/${movieId}/rating`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ rating: selectedRating })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("Error updating rating:", txt);
        alert("Failed to save rating. Please try again.");
        // uncheck so user can try again
        e.target.checked = false;
        ratingLabel.textContent = "Rating";
        return;
      }
      const body = await resp.json();
      if (!body.success) {
        console.error("Server said:", body.message);
        alert("Failed to save rating. " + body.message);
        e.target.checked = false;
        ratingLabel.textContent = "Rating";
        return;
      }

      // 3) On success:
      ratingLabel.textContent = "Rated";
      showNotification(`You rated “${currentMovie.title}” ${selectedRating} stars!`);

      // 4) Save locally so the next time the modal opens, we can pre‐fill it:
      currentWatchedData[movieId].rating = selectedRating;
    } catch (err) {
      console.error("Network error on rating:", err);
      alert("Network error. Please try again.");
      e.target.checked = false;
      ratingLabel.textContent = "Rating";
    }
  }
});


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
function resetModalState(movieId) {
  const watchedButton   = modal.querySelector(".marked-as-watched");
  const watchedText     = watchedButton.querySelector(".watched-text");
  const likesButton     = modal.querySelector(".add-to-likes");
  const likesText       = likesButton.querySelector(".likes-text");
  const watchlistButton = modal.querySelector(".add-to-watchlist");
  const watchlistText   = watchlistButton.querySelector(".watchlist-text");
  const ratingInputs    = modal.querySelectorAll('input[name="movie-rating"]');
  const dateContainer   = modal.querySelector(".date-container");
  const dateDisplay   = modal.querySelector('.date-container .yyyy-mm-dd')

if (currentWatchedData[movieId]?.watchDate) {
    // currentWatchedData[movieId].watchDate is "YYYY-MM-DD"
    const [year, month, day] = currentWatchedData[movieId].watchDate.split('-')
    const shortYear = year.slice(-2)
    const formatted = `${day}/${month}/${shortYear}`    // e.g. "09/05/24"

    dateDisplay.textContent = formatted
  } else {
    dateDisplay.textContent = ''
  }

  // 1) Was this movie ever marked “watched”?
  const isWatched = currentWatched.includes(movieId);
  if (isWatched) {
    watchedButton.classList.add("watched");
    watchedText.textContent = "Watched";
    watchedButton.setAttribute("disabled", "true");
    watchedButton.style.opacity = "0.6";
  } else {
    watchedButton.classList.remove("watched");
    watchedText.textContent = "Mark as Watched";
    watchedButton.removeAttribute("disabled");
    watchedButton.style.opacity = "1";
  }

  // 2) Was it in the watchlist?
  const isInList = currentWatchlist.includes(movieId);
  if (isInList) {
    watchlistButton.classList.add("in-watchlist");
    watchlistText.textContent = "In Watchlist";
    watchlistButton.setAttribute("disabled", "true");
    watchlistButton.style.opacity = "0.6";
  } else {
    watchlistButton.classList.remove("in-watchlist");
    watchlistText.textContent = "Add to Watchlist";
    watchlistButton.removeAttribute("disabled");
    watchlistButton.style.opacity = "1";
  }

  // 3) Set Likes BUTTON state from currentWatchedData[movieId].liked
  if (isWatched && currentWatchedData[movieId]?.liked) {
    likesButton.classList.add("liked");
    likesText.textContent = "Liked";
  } else {
    likesButton.classList.remove("liked");
    likesText.textContent = "Add to Likes";
  }

  // 4) Set star‐rating INPUTS from currentWatchedData[movieId].rating
  ratingInputs.forEach(input => {
    input.checked = false; // default
  });
  if (isWatched && currentWatchedData[movieId]?.rating) {
    const savedRating = currentWatchedData[movieId].rating; // 1..5
    const toCheck = modal.querySelector(`input[name="movie-rating"][value="${savedRating}"]`);
    if (toCheck) {
      toCheck.checked = true;
      // also update the label if you have one, e.g.:
      const ratingLabel = document.getElementById("ratingLabel");
      if (ratingLabel) ratingLabel.textContent = "Rated";
    }
  } else {
    // nothing to do—keep them all unchecked + “Rating” label
    const ratingLabel = document.getElementById("ratingLabel");
    if (ratingLabel) ratingLabel.textContent = "Rating";
  }

  // 6) Hide any “moreOptionsModal” and clear review text as before
  moreOptionsModal.style.display = "none";
  const reviewTextarea = modal.querySelector(".add-a-review");
  const characterCounter = document.querySelector(".character-counter");
  if (reviewTextarea) {
    reviewTextarea.value = "";
    reviewTextarea.placeholder = "Add a Review...";
  }
  if (characterCounter) {
    characterCounter.textContent = "0/500";
    characterCounter.classList.remove("limit");
    characterCounter.style.display = "none";
  }
}



// Submit review function
async function submitReview() {
  if (!currentMovie) return;

  const reviewTextarea = modal.querySelector(".add-a-review");
  const review = reviewTextarea.value.trim();

const selectedRating = modal.querySelector('input[name="movie-rating"]:checked');
const rating = selectedRating ? Number.parseInt(selectedRating.value) : null;



  // Get watch date
  const dateDisplay = modal.querySelector(".date-container .yyyy-mm-dd");
  // Get watch date - improved logic
  let watchDate = null;

  // First check if movie is already marked as watched
  if (currentWatched.includes(currentMovie.id) && currentWatchedData[currentMovie.id]?.watchDate) {
    // Use the stored ISO date directly (already in YYYY-MM-DD format)
    watchDate = currentWatchedData[currentMovie.id].watchDate;
  } else {
    // Check if user just set a date in the modal
    const dateDisplay = modal.querySelector(".date-container .yyyy-mm-dd");
    if (dateDisplay && dateDisplay.textContent && dateDisplay.textContent !== "YYYY/MM/DD") {
      watchDate = formatDateForDB(dateDisplay.textContent);
    }
  }

// Check for token in localStorage; if missing, force login
const token = localStorage.getItem('token');
if (!token) {
  showNotification("You must be logged in to submit a review.", "error");
  return;
}

// Prepare data for database (no more username field)
const reviewData = {
  movie_id: currentMovie.id,
  title: currentMovie.title,
  review_text: review,
  rating: rating,
  watched_date: watchDate ? formatDateForDB(watchDate) : null
};


  try {
    // Save to database
    const response = await saveReviewToDatabase(reviewData);
    
    // Also save to localStorage for immediate UI update
    const savedReview = saveReview(currentMovie, rating, review, watchDate);
    
    showNotification(
      response.message || `Review ${savedReview.id ? 'updated' : 'saved'} for "${currentMovie.title}"!`,
      "success"
    );
    
  } catch (error) {
    showNotification(`Failed to save review: ${error.message}`, "error");
  }
}

// Helper function to format date for database
function formatDateForDB(dateString) {
if (!dateString || dateString === "YYYY/MM/DD") return null;
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  let [day, month, year] = parts;
  
  // Convert 2-digit year to 4-digit year
  if (year.length === 2) {
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    year = currentCentury + parseInt(year);
  }
  
  // Ensure proper padding
  day = day.padStart(2, '0');
  month = month.padStart(2, '0');
  
  return `${year}-${month}-${day}`; // YYYY-MM-DD format for SQL
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

async function saveReviewToDatabase(reviewData) {
  try {
    const apiUrl = 'http://localhost:3001/api/reviews';
    
    console.log('Sending review data to:', apiUrl);
    console.log('Payload:', reviewData);

    // 1) Read JWT from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Missing authentication token');
    }

    // 2) Include Authorization header
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(reviewData)
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Full error details:', {
      error: error.message,
      reviewData,
      stack: error.stack
    });
    throw error;
  }
}