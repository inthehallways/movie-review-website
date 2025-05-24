function toggleDropdown() {
  document.getElementById('dropdownMenu').classList.toggle('show');
}

const modal = document.getElementById("movieModal");
const closeBtn = modal.querySelector(".close");

const movieGrid = document.getElementById('movieGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

const API_KEY = 'd2a72fb4b28ccba64124755d66b1b0f1'; // Your TMDB API Key
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// Load popular movies on page load
document.addEventListener('DOMContentLoaded', () => {
  fetchPopularMovies();
});

searchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query !== '') {
    searchMovies(query);
  } else {
    fetchPopularMovies();
  }
});

// Fetch popular movies
async function fetchPopularMovies() {
  try {
    const res = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`);
    const data = await res.json();
    displayMovies(data.results);
  } catch (err) {
    console.error('Error fetching popular movies:', err);
  }
}

// Search movies by title
async function searchMovies(query) {
  try {
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`);
    const data = await res.json();
    displayMovies(data.results);
  } catch (err) {
    console.error('Error searching for movies:', err);
  }
}

// Render movie cards with poster images properly contained
function displayMovies(movies) {
  movieGrid.innerHTML = ''; // clear existing content
  if (!movies.length) {
    movieGrid.innerHTML = '<p>No movies found.</p>';
    return;
  }

  movies.forEach(movie => {
    const posterURL = movie.poster_path
      ? `${IMG_URL}${movie.poster_path}`
      : 'https://via.placeholder.com/300x450?text=No+Image';

    const card = document.createElement('div');
    card.classList.add('movie-card');

    card.innerHTML = `
      <img src="${posterURL}" alt="${movie.title} Poster" style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;" />
    `;

    // Add click event to open modal if needed
    card.addEventListener('click', () => {
      modal.style.display = "block";
      // Optionally, add movie details to modal here
    });

    movieGrid.appendChild(card);
  });
}

// Close modal on clicking close button
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Close modal on clicking outside modal content
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

