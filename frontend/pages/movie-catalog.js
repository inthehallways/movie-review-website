function toggleDropdown() {
  document.getElementById('dropdownMenu').classList.toggle('show');
}

const modal = document.getElementById("movieModal");
const closeBtn = modal.querySelector(".close");
const modalContent = document.querySelector(".modal-content");

const movieGrid = document.getElementById('movieGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

const genreSelect = document.getElementById('genreSelect');
const yearSelect = document.getElementById('yearSelect');
const nameSelect = document.getElementById('nameSelect');

const API_KEY = 'd2a72fb4b28ccba64124755d66b1b0f1';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let currentMovies = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchPopularMovies();

  genreSelect.addEventListener('change', applyFilters);
  yearSelect.addEventListener('change', applyFilters);
  nameSelect.addEventListener('change', applyNameSort);
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

async function fetchPopularMovies() {
  try {
    const res = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`);
    const data = await res.json();
    currentMovies = data.results;
    displayMovies(currentMovies);
  } catch (err) {
    console.error('Error fetching popular movies:', err);
  }
}

async function searchMovies(query) {
  try {
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`);
    const data = await res.json();
    currentMovies = data.results;
    displayMovies(currentMovies);
  } catch (err) {
    console.error('Error searching for movies:', err);
  }
}

async function applyFilters() {
  const genreValue = genreSelect.value;
  const yearValue = yearSelect.value;

  const genreMap = {
    Action: 28,
    Comedy: 35,
    Drama: 18,
    Horror: 27,
    "Sci-Fi": 878
  };

  const genreId = genreMap[genreValue] || '';

  let primaryReleaseGte = '';
  let primaryReleaseLte = '';

  if (yearValue) {
    switch (yearValue) {
      case '2020s':
        primaryReleaseGte = '2020-01-01';
        primaryReleaseLte = '2029-12-31';
        break;
      case '2010s':
        primaryReleaseGte = '2010-01-01';
        primaryReleaseLte = '2019-12-31';
        break;
      case '2000s':
        primaryReleaseGte = '2000-01-01';
        primaryReleaseLte = '2009-12-31';
        break;
      case '1990s':
        primaryReleaseGte = '1990-01-01';
        primaryReleaseLte = '1999-12-31';
        break;
    }
  }

  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&page=1`;

  if (genreId) url += `&with_genres=${genreId}`;
  if (primaryReleaseGte) url += `&primary_release_date.gte=${primaryReleaseGte}`;
  if (primaryReleaseLte) url += `&primary_release_date.lte=${primaryReleaseLte}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    currentMovies = data.results || [];
    applyNameSort(); // also apply name sorting if selected
  } catch (err) {
    console.error('Error applying filters:', err);
  }
}

function applyNameSort() {
  const sortValue = nameSelect.value;

  if (sortValue === 'asc') {
    currentMovies.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortValue === 'desc') {
    currentMovies.sort((a, b) => b.title.localeCompare(a.title));
  }

  displayMovies(currentMovies);
}

function displayMovies(movies) {
  movieGrid.innerHTML = '';

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

    card.addEventListener('click', () => {
      showModal(movie);
    });

    movieGrid.appendChild(card);
  });
}

function showModal(movie) {
  const posterURL = movie.poster_path
    ? `${IMG_URL}${movie.poster_path}`
    : 'https://via.placeholder.com/300x450?text=No+Image';

  modal.querySelector(".modal-content").innerHTML = `
    <span class="close">&times;</span>
    <h2>${movie.title}</h2>
    <img src="${posterURL}" alt="${movie.title}" style="width: 200px; border-radius: 8px;" />
    <p><strong>Release Date:</strong> ${movie.release_date}</p>
    <p><strong>Rating:</strong> ${movie.vote_average}</p>
    <p>${movie.overview || "No description available."}</p>
  `;

  modal.style.display = "block";

  // Reattach close event to new close button
  modal.querySelector(".close").onclick = () => {
    modal.style.display = "none";
  };
}

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});
