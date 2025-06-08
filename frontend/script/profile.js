// JavaScript for SceneIt Profile Page
// This file handles all interactive features in the Profile page, including the Edit Profile modal, except dropdown (which is in HTML)

// TMDB API Configuration
const TMDB_API_KEY = 'd2a72fb4b28ccba64124755d66b1b0f1'; // Backend dev should replace this with their own API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Store uploaded images and adjustments
let uploadedHeaderImage = null;
let uploadedAvatarImage = null;
let headerTransform = { scale: 1, x: 0, y: 0 };
let avatarTransform = { scale: 1, x: 0, y: 0 };
let currentMovieSlot = null;
let favoriteMovies = Array(5).fill(null);

async function loadUserProfile() {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not logged in');

    const resp = await fetch('http://localhost:3001/api/profile', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });
    const body = await resp.json();
    if (!body.success) {
      console.error('Profile GET error:', body.message);
      return;
    }
    // destructure correctly
    const { profile, favoriteMovies: rawFavs } = body;

    // ——— your existing bits ———
    document.getElementById("profileUsername").textContent = profile.username || "Username";
    document.getElementById("bioDisplay").textContent = profile.bio || "Tell us about yourself...";
    if (profile.header_pic_url) {
      uploadedHeaderImage = profile.header_pic_url;
      const h = document.getElementById("profileHeader");
      h.style.backgroundImage = `url(${profile.header_pic_url})`;
      h.style.backgroundSize = 'cover';
      h.style.backgroundPosition = 'center';
    }
    if (profile.profile_pic_url) {
      uploadedAvatarImage = profile.profile_pic_url;
      document.getElementById("profileAvatar").src = profile.profile_pic_url;
      document.getElementById("profilePicture").src = profile.profile_pic_url;
    }

    // — flood all other avatar‐slots —
    document.querySelectorAll('.avatar-display').forEach(img => {
      img.src = profile.profile_pic_url || img.src;
    });

    // — flood all other username‐slots —
    document.querySelectorAll('.username-display').forEach(el => {
      el.textContent = profile.username || el.textContent;
    });

    // — build your favorites array as before —
    const slots = Array(5).fill(null);
    if (Array.isArray(rawFavs)) {
      for (const fav of rawFavs) {
        if (fav && typeof fav.slot === 'number'
            && fav.slot >= 0 && fav.slot < 5) {
          slots[fav.slot] = fav;
        }
      }
    }
    favoriteMovies = slots;

    // render both main & edit grids
    updateMainProfileFavorites();
    initializeFavoriteFavorites(); // or initializeFavoriteMovies()

    // finally un-hide
    document.getElementById('profileHeader').style.visibility   = 'visible';
    document.querySelector('.profile-content').style.visibility = 'visible';

    initializeCursor();
    
  } catch (err) {
    console.error('Error loading profile in front-end:', err);
  }
}

async function loadUserProfileForMovieModal() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const resp = await fetch('http://localhost:3001/api/profile', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });
    const body = await resp.json();
    if (!body.success) {
      console.error('Profile GET error:', body.message);
      return;
    }

    const { profile } = body;

    // Update modal’s profile pic & username
    const avatar = document.querySelector('.avatar-display-modal');
    const username = document.querySelector('.username-display-modal');

    if (avatar) {
      avatar.src = profile.profile_pic_url || "../assets/images/blank-profile.jpg";
    }
    if (username) {
      username.textContent = profile.username || "Username";
    }

  } catch (err) {
    console.error('Error loading profile for movie modal:', err);
  }
}

async function loadUserProfileForWatchedWatchlistReviews() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const resp = await fetch('http://localhost:3001/api/profile', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });
    const body = await resp.json();
    if (!body.success) {
      console.error('Profile GET error:', body.message);
      return;
    }

    const { profile } = body;

    // Update modal’s profile pic & username
    const avatar = document.querySelector('.user-avatar');
    const username = document.querySelector('.username');

    if (avatar) {
      avatar.src = profile.profile_pic_url || "../assets/images/blank-profile.jpg";
    }
    if (username) {
      username.textContent = profile.username || "Username";
    }

  } catch (err) {
    console.error('Error loading profile for movie modal:', err);
  }
}

async function loadUserProfileFornavbar() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const resp = await fetch('http://localhost:3001/api/profile', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });
    const body = await resp.json();
    if (!body.success) {
      console.error('Profile GET error:', body.message);
      return;
    }

    const { profile } = body;

    // Update modal’s profile pic & username
    const avatar = document.querySelector('.profile-pic');
  
    if (avatar) {
      avatar.src = profile.profile_pic_url || "../assets/images/blank-profile.jpg";
    }
  
  } catch (err) {
    console.error('Error loading profile for movie modal:', err);
  }
}

function loadUserData(username) {
    // Load persistent data
    const reviews = JSON.parse(localStorage.getItem(`reviews_${username}`)) || [];
    const watchlist = JSON.parse(localStorage.getItem(`watchlist_${username}`)) || [];
    
    // Render user-specific content
    renderReviews(reviews);
    renderWatchlist(watchlist);
}

// Mock API function
async function fetchUserProfile(userId) {
    // Backend will implement: GET /api/users/{userId}/profile
    return {
        username: "Username",
        bio: "Movie enthusiast and critic",
        headerImage: null,
        avatarImage: null,
        favoriteMovies: Array(5).fill(null)
    }
}

function getCurrentUserId() {
    return localStorage.getItem("userId") || "1"
}

// Initialize favorite movies grid
function initializeFavoriteMovies() {
    const grid = document.getElementById('editFavoritesGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 5; i++) {
        const card = document.createElement('div');
        card.className = 'edit-favorite-card';
        card.onclick = () => openMovieSearchModal(i);
        
        if (favoriteMovies[i]) {
            card.innerHTML = `
                <img src="${TMDB_IMAGE_BASE_URL}${favoriteMovies[i].poster_path}" alt="${favoriteMovies[i].title}" class="favorite-movie-poster">
                <button class="remove-favorite-btn" onclick="event.stopPropagation(); removeFavoriteMovie(${i})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            `;
        } else {
            card.innerHTML = `
                <div class="add-movie-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Add Movie
                </div>
            `;
        }
        
        grid.appendChild(card);
    }
}

// Update main profile favorites display
function updateMainProfileFavorites() {
    const mainGrid = document.getElementById('favoritesGrid');
    mainGrid.innerHTML = '';
    
    // Check if there are any favorite movies
    const hasMovies = favoriteMovies.some(movie => movie !== null);
    
    if (!hasMovies) {
        // Show simple text message when no movies are added
        const messageDiv = document.createElement('div');
        messageDiv.className = 'no-favorites-message';
        messageDiv.innerHTML = '<p>Make sure to add your Top 5 films in your profile!</p>';
        mainGrid.appendChild(messageDiv);
    } else {
        // Show movie posters when movies are added
        for (let i = 0; i < 5; i++) {
            const movieDiv = document.createElement('div');
            movieDiv.className = 'favorite-movie';
            
            if (favoriteMovies[i]) {
                movieDiv.innerHTML = `
                    <img src="${TMDB_IMAGE_BASE_URL}${favoriteMovies[i].poster_path}" 
                        alt="${favoriteMovies[i].title}" 
                        class="movie-poster"
                        title="${favoriteMovies[i].title} (${favoriteMovies[i].release_date ? new Date(favoriteMovies[i].release_date).getFullYear() : 'Unknown'})">
                `;
            } else {
                // Empty slot for when some movies are added but not all 5
                movieDiv.classList.add('empty-slot');
                movieDiv.innerHTML = `
                    <div class="empty-movie-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                            <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2"/>
                            <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <p>No movie selected</p>
                    </div>
                `;
            }
            
            mainGrid.appendChild(movieDiv);
        }
    }
}

// Dropdown functionality
function toggleDropdown() {
    const menu = document.getElementById("dropdownMenu");
    menu.classList.toggle("show");
}

window.addEventListener('click', function(e) {
    const dropdown = document.getElementById("dropdownMenu");
    const profileContainer = document.querySelector(".profile-container");

    if (!profileContainer.contains(e.target)) {
        dropdown.classList.remove("show");
    }
});

// Modal functionality
function openEditModal() {
    document.getElementById("editModal").style.display = "flex";
    document.body.style.overflow = "hidden";
    
    // Reset form to current values
    document.getElementById("editUsername").value = document.getElementById("profileUsername").textContent;
    document.getElementById("editBio").value = document.getElementById("bioDisplay").textContent === "Tell us about yourself..." ? "" : document.getElementById("bioDisplay").textContent;
    
    // Restore existing images if they exist
    restoreExistingImages();
    
    // Initialize favorite movies grid
    initializeFavoriteMovies();
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
    document.body.style.overflow = "auto";
    // Don't reset images here - they should persist until explicitly changed
}

function cancelEditModal() {
    // Only reset when explicitly canceling
    uploadedHeaderImage = null;
    uploadedAvatarImage = null;
    headerTransform = { scale: 1, x: 0, y: 0 };
    avatarTransform = { scale: 1, x: 0, y: 0 };
    
    resetHeaderPreview();
    resetAvatarPreview();
    closeEditModal();
}

// Restore existing images when reopening modal
function restoreExistingImages() {
    if (uploadedHeaderImage) {
        document.getElementById("headerImageContainer").style.display = "block";
        document.getElementById("uploadHeaderBtn").style.display = "none";
        document.getElementById("removeHeaderBtn").style.display = "block";
        
        const headerImg = document.getElementById("headerImage");
        headerImg.src = uploadedHeaderImage;
    }
    
    if (uploadedAvatarImage) {
        document.getElementById("avatarImageContainer").style.display = "block";
        document.getElementById("currentAvatarPreview").style.display = "none";
        
        const avatarImg = document.getElementById("avatarImage");
        avatarImg.src = uploadedAvatarImage;
        updateAvatarTransform();
        document.getElementById("avatarZoomLevel").textContent = Math.round(avatarTransform.scale * 100) + '%';
        
        setupAvatarDragAndZoom();
    }
}

// Header image functions
function previewHeaderImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedHeaderImage = e.target.result;
            
            // Show image container and hide upload button
            document.getElementById("headerImageContainer").style.display = "block";
            document.getElementById("uploadHeaderBtn").style.display = "none";
            document.getElementById("removeHeaderBtn").style.display = "block";
            
            // Set image source
            const headerImg = document.getElementById("headerImage");
            headerImg.src = e.target.result;
            
            // Reset transform
            headerTransform = { scale: 1, x: 0, y: 0 };
            document.getElementById("headerZoomLevel").textContent = "100%";
            updateHeaderTransform();
            // Setup drag and zoom
            setupHeaderDragAndZoom();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeHeaderImage() {
    uploadedHeaderImage = null;
    resetHeaderPreview();
    document.getElementById("headerImageInput").value = "";
}

function resetHeaderPreview() {
    document.getElementById("headerImageContainer").style.display = "none";
    document.getElementById("uploadHeaderBtn").style.display = "block";
    document.getElementById("removeHeaderBtn").style.display = "none";
    headerTransform = { scale: 1, x: 0, y: 0 };
}

// Avatar image functions
function previewAvatarImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedAvatarImage = e.target.result;
            
            // Show image container and hide default preview
            document.getElementById("avatarImageContainer").style.display = "block";
            document.getElementById("currentAvatarPreview").style.display = "none";
            
            // Set image source
            const avatarImg = document.getElementById("avatarImage");
            avatarImg.src = e.target.result;
            
            // Reset transform
            avatarTransform = { scale: 1, x: 0, y: 0 };
            updateAvatarTransform();
            document.getElementById("avatarZoomLevel").textContent = "100%";
            
            // Setup drag and zoom
            setupAvatarZoom();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeAvatarImage() {
    uploadedAvatarImage = null;
    resetAvatarPreview();
    document.getElementById("avatarImageInput").value = "";
}

function resetAvatarPreview() {
    document.getElementById("avatarImageContainer").style.display = "none";
    document.getElementById("currentAvatarPreview").style.display = "block";
    document.getElementById("currentAvatarPreview").src = "../assets/images/blank-profile.jpg";
    avatarTransform = { scale: 1, x: 0, y: 0 };
}

// Avatar zoom setup
function setupAvatarZoom() {
const container = document.getElementById("avatarImageContainer");

// Remove existing listeners first
container.removeEventListener('wheel', avatarWheel);

// Add only zoom listener
container.addEventListener('wheel', avatarWheel);
}

// Separate event handlers for avatar
function avatarWheel(e) {
    handleAvatarZoom(e);
}

// Zoom functions
function adjustAvatarZoom(delta) {
    avatarTransform.scale = Math.max(0.5, Math.min(3, avatarTransform.scale + delta));
    updateAvatarTransform();
    document.getElementById("avatarZoomLevel").textContent = Math.round(avatarTransform.scale * 100) + '%';
}

function handleAvatarZoom(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    adjustAvatarZoom(delta);
}

// Transform update functions
function updateAvatarTransform() {
    const img = document.getElementById("avatarImage");
    if (img) {
        img.style.transform = `translate(${avatarTransform.x}px, ${avatarTransform.y}px) scale(${avatarTransform.scale})`;
    }
}

function updateHeaderTransform() {
  const headerImg = document.getElementById("headerImage");
  if (headerImg) {
    headerImg.style.transform = `translate(${headerTransform.x}px, ${headerTransform.y}px) scale(${headerTransform.scale})`;
  }
}

// Movie search functions
function openMovieSearchModal(slotIndex) {
    currentMovieSlot = slotIndex;
    document.getElementById("movieSearchModal").style.display = "flex";
    document.getElementById("movieSearchInput").focus();
}

function closeMovieSearchModal() {
    document.getElementById("movieSearchModal").style.display = "none";
    document.getElementById("movieSearchResults").innerHTML = `
<div class="search-placeholder">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
        <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2"/>
    </svg>
    <p>Search for movies to add to your favorites</p>
</div>
`;
document.getElementById("movieSearchInput").value = "";
currentMovieSlot = null;
}

async function searchMovies() {
    const query = document.getElementById("movieSearchInput").value.trim();
    if (!query) return;

    const resultsContainer = document.getElementById("movieSearchResults");
    resultsContainer.innerHTML = '<div class="loading">Searching...</div>';

    try {
        const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            displayMovieResults(data.results);
        } else {
            resultsContainer.innerHTML = '<div class="no-results">No movies found. Try a different search term.</div>';
        }
    } catch (error) {
        console.error('Error searching movies:', error);
        resultsContainer.innerHTML = '<div class="error">Error searching movies. Please try again.</div>';
    }
}

function displayMovieResults(movies) {
    const resultsContainer = document.getElementById("movieSearchResults");
    resultsContainer.innerHTML = '';

    movies.slice(0, 10).forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-result-card';
        movieCard.onclick = () => selectMovie(movie);

        movieCard.innerHTML = `
            <img src="${movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : '../assets/images/poster-placeholder.png'}" 
                alt="${movie.title}" class="movie-result-poster">
            <div class="movie-result-info">
                <h3>${movie.title}</h3>
                <p>${movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown'}</p>
                <p class="movie-overview">${movie.overview ? movie.overview.substring(0, 100) + '...' : 'No description available'}</p>
            </div>
        `;

        resultsContainer.appendChild(movieCard);
    });
}

function selectMovie(movie) {
    favoriteMovies[currentMovieSlot] = movie;
    initializeFavoriteMovies();
    closeMovieSearchModal();
}

function removeFavoriteMovie(index) {
    favoriteMovies[index] = null;
    initializeFavoriteMovies();
}

async function saveProfile() {
  // 1) Get values from modal inputs
  const username = document.getElementById("editUsername").value;
  const bio = document.getElementById("editBio").value;

  // 2) Update main profile display immediately
  document.getElementById("profileUsername").textContent = username;
  document.getElementById("bioDisplay").textContent = bio || "Tell us about yourself...";

  // 3) Update header image preview
  const profileHeader = document.getElementById("profileHeader");
  if (uploadedHeaderImage !== null) {
    profileHeader.style.backgroundImage = `url(${uploadedHeaderImage})`;
    const scalePercent = headerTransform.scale * 100;
    const xPercent = 50 + (headerTransform.x / 8);
    const yPercent = 50 + (headerTransform.y / 8);
    profileHeader.style.backgroundSize = `${scalePercent}%`;
    profileHeader.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
  } else {
    profileHeader.style.backgroundImage = "";
    profileHeader.style.backgroundSize = "";
    profileHeader.style.backgroundPosition = "";
  }

  // 4) Update avatar preview
  let croppedAvatarUrl = null;
  if (uploadedAvatarImage !== null) {
    croppedAvatarUrl = await createCroppedAvatar();
    document.getElementById("profileAvatar").src = croppedAvatarUrl;
    document.getElementById("profilePicture").src = croppedAvatarUrl;
    uploadedAvatarImage = croppedAvatarUrl;
  } else {
    document.getElementById("profileAvatar").src = "../assets/images/blank-profile.jpg";
    document.getElementById("profilePicture").src = "../assets/images/blank-profile.jpg";
  }

  // 5) Update main profile favorites display
  updateMainProfileFavorites();

  // 6) Close modal (but keep images in memory for next edit)
  closeEditModal();

  // 7) Prepare to upload images (if needed)
  let headerUrl = uploadedHeaderImage;
  let avatarUrl = uploadedAvatarImage;

  const token = localStorage.getItem('token');
  if (!token) {
    showSuccessMessage("Not authenticated", "error");
    return;
  }

  try {
    // Upload header image if it’s a data URL
    if (uploadedHeaderImage && uploadedHeaderImage.startsWith("data:")) {
      const headerBlob = dataURLtoBlob(uploadedHeaderImage);
      const formData = new FormData();
      formData.append('image', headerBlob, 'header.jpg');

      const headerResp = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
      const headerData = await headerResp.json();
      if (headerData.success) {
        headerUrl = headerData.url;
      } else {
        console.error('Header upload error:', headerData.message);
      }
    }

    // Upload avatar image if it’s a data URL
    if (uploadedAvatarImage && uploadedAvatarImage.startsWith("data:")) {
      const avatarBlob = dataURLtoBlob(uploadedAvatarImage);
      const formData = new FormData();
      formData.append('image', avatarBlob, 'avatar.jpg');

      const avatarResp = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
      const avatarData = await avatarResp.json();
      if (avatarData.success) {
        avatarUrl = avatarData.url;
      } else {
        console.error('Avatar upload error:', avatarData.message);
      }
    }

    // 8) Prepare data for PUT /api/profile
    const favMovieIDs = favoriteMovies.map(m => m ? m.id : null).filter(m => m !== null);

    // 9) Save profile to the database
    const response = await fetch('http://localhost:3001/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    username,              // ← add
    bio,
    header_pic_url: headerUrl || null,
    profile_pic_url: avatarUrl || null,
    favoriteMovies: favMovieIDs
  })
});

    const data = await response.json();
    if (!data.success) {
      console.error('Error saving profile:', data.message);
      showSuccessMessage(`Failed to save profile: ${data.message}`, 'error');
      return;
    }

    showSuccessMessage("Profile updated successfully!");
    await loadUserProfile();


  } catch (err) {
    console.error('Network error saving profile:', err);
    showSuccessMessage("Network error—could not save profile", "error");
  }
}

// Helper to convert data URL to Blob
function dataURLtoBlob(dataUrl) {
  const arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

// New function to create cropped avatar
function createCroppedAvatar() {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Set canvas size to desired output size (200x200 for main profile)
        canvas.width = 200;
        canvas.height = 200;
        
        img.onload = function() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate the transform values
            const scale = avatarTransform.scale;
            const translateX = avatarTransform.x;
            const translateY = avatarTransform.y;
            
            // Apply transforms to context
            ctx.save();
            
            // Move to center, apply transforms, then move back
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            ctx.translate(translateX, translateY);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            
            // Draw the image to fill the canvas
            const aspectRatio = img.width / img.height;
            let drawWidth, drawHeight, drawX, drawY;
            
            if (aspectRatio > 1) {
                // Image is wider than tall
                drawHeight = canvas.height;
                drawWidth = drawHeight * aspectRatio;
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
            } else {
                // Image is taller than wide
                drawWidth = canvas.width;
                drawHeight = drawWidth / aspectRatio;
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
            }
            
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            ctx.restore();
            
            // Convert canvas to data URL
            const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.9);
            resolve(croppedImageUrl);
        };
        
        img.crossOrigin = 'anonymous';
        img.src = uploadedAvatarImage;
    });
}

function showSuccessMessage(message) {
    // Create and show a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Stats button functionality
document.addEventListener("DOMContentLoaded", function () {
    // Initialize main profile favorites
    loadUserProfile();  // Add this line
    updateMainProfileFavorites();
    initializeFavoriteMovies();

    // Movie search on Enter key
    document.getElementById("movieSearchInput").addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            searchMovies();
        }
    });

    document.querySelector(".watched").addEventListener("click", function () {
        window.location.href = "../pages/watched.html";
    });

    document.querySelector(".reviews").addEventListener("click", function () {
        window.location.href = "../pages/reviews.html";
    });

    document.querySelector(".watchlist").addEventListener("click", function () {
        window.location.href = "../pages/watchlist.html";
    });

    document.getElementById('profileHeader').style.visibility   = 'visible';
    document.querySelector('.profile-content').style.visibility = 'visible';

    initializeCursor();
});

// Close modals when clicking outside
document.getElementById("editModal").addEventListener("click", function(e) {
    if (e.target === this) {
        cancelEditModal(); // Use cancel instead of close to reset images
    }
});

document.getElementById("movieSearchModal").addEventListener("click", function(e) {
    if (e.target === this) {
        closeMovieSearchModal();
    }
});

function initializeCursor() {
  import("https://unpkg.com/cursor-effects@latest/dist/esm.js")
    .then(module => {
      const { fairyDustCursor } = module;
      new fairyDustCursor({
        colors: ["#F49B98", "#988bd3", "#FFEEAD", "#2c2c2c", "#95CEB3"]
      });
    });
}

// Add CSS animation for success message
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

document.head.appendChild(style);