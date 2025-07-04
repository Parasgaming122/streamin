const apiKey = 'da63548086e399ffc910fbc08526df05';
const baseUrl = 'https://api.themoviedb.org/3';
const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
const multiEmbedBaseUrl = 'https://multiembed.mov';

// New DOM References based on HTML restructure
const appContainer = document.querySelector('.app-container');
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');

const navSearchBtn = document.getElementById('nav-search-btn');
const navHomeBtn = document.getElementById('nav-home-btn');
const navFavoritesBtn = document.getElementById('nav-favorites-btn');
const navHistoryBtn = document.getElementById('nav-history-btn');

const searchInput = document.getElementById('search-input'); // Renamed from 'search'

const homeView = document.getElementById('home-view');
const popularMoviesSection = homeView.querySelector('#popular-movies .carousel-container');
const popularTvShowsSection = homeView.querySelector('#popular-tv-shows .carousel-container');

const searchResultsView = document.getElementById('search-results-view');
const searchResultsGrid = searchResultsView.querySelector('#search-results-grid');

const favoritesView = document.getElementById('favorites-view');
const favoritesGrid = favoritesView.querySelector('#favorites-grid');

const historyView = document.getElementById('history-view');
const historyGrid = historyView.querySelector('#history-grid');

const detailsView = document.getElementById('details-view'); // Renamed from 'details'

// DOM elements for details section (within detailsView)
const detailsPoster = detailsView.querySelector('#details-poster');
const detailsTitle = document.getElementById('details-title');
const detailsOverview = document.getElementById('details-overview');
const detailsRating = document.getElementById('details-rating');
const videoPlayer = document.getElementById('video-player');
const regularPlayerButton = document.getElementById('player-regular');
const vipPlayerButton = document.getElementById('player-vip');

let currentFocus = 0; // For D-pad navigation

// --- LocalStorage Keys ---
const FAVORITES_KEY = 'cineStreamFavorites';
const HISTORY_KEY = 'cineStreamHistory';
const SEARCH_HISTORY_KEY = 'cineStreamSearchHistory';

// --- Data Management Functions (Favorites & History & Search History) ---
function getSearchHistory() {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
}

function addToSearchHistory(query) {
    let searches = getSearchHistory();
    // Remove query if it already exists to move it to the top
    searches = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
    searches.unshift(query);
    // Limit history size
    if (searches.length > 10) { // Keep last 10 searches
        searches.pop();
    }
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searches));
    console.log('Added to search history:', query);
}


// --- Data Management Functions (Favorites & History) ---
function getFavorites() {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
}

function isFavorite(itemId) {
    const favorites = getFavorites();
    return favorites.some(fav => fav.id === itemId);
}

function addToFavorites(item) {
    const favorites = getFavorites();
    if (!isFavorite(item.id)) {
        // Store a summary of the item, not the whole huge object
        favorites.push({
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            media_type: item.media_type || (item.title ? 'movie' : 'tv') // Infer media_type if not present
        });
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        console.log('Added to favorites:', item.title || item.name);
        updateFavoriteButton(item.id, true); // Update UI
    }
}

function removeFromFavorites(itemId) {
    let favorites = getFavorites();
    favorites = favorites.filter(fav => fav.id !== itemId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    console.log('Removed from favorites:', itemId);
    updateFavoriteButton(itemId, false); // Update UI
}

function getHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
}

function addToHistory(item) {
    let history = getHistory();
    // Remove item if it already exists to move it to the top (most recent)
    history = history.filter(histItem => histItem.id !== item.id);
    history.unshift({ // Add to the beginning of the array
        id: item.id,
        title: item.title || item.name,
        poster_path: item.poster_path,
        media_type: item.media_type || (item.title ? 'movie' : 'tv'),
        watchedAt: new Date().toISOString()
    });
    // Optional: Limit history size, e.g., to 100 items
    if (history.length > 100) {
        history.pop();
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    console.log('Added to history:', item.title || item.name);
}

// Update favorite button UI
function updateFavoriteButton(itemId, isFav) {
    const favButton = detailsView.querySelector('#add-to-favorites-btn');
    if (favButton) { // Check if button exists in current view
        const icon = favButton.querySelector('i');
        if (isFav) {
            favButton.innerHTML = '<i class="fas fa-check"></i> Favorited';
            favButton.classList.add('is-favorite');
        } else {
            favButton.innerHTML = '<i class="fas fa-heart"></i> Add to Favorites';
            favButton.classList.remove('is-favorite');
        }
        favButton.dataset.itemId = itemId; // Ensure itemId is associated
    }
}

// --- Global variable to store current item details for history/favorites ---
let currentItemDetailsForAction = null;

// --- API Fetching Functions ---
async function fetchTMDB(endpoint, params = '') {
    const url = `${baseUrl}/${endpoint}?api_key=${apiKey}&${params}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching from TMDB:', error);
        return null;
    }
}

async function getPopularMovies() {
    return fetchTMDB('movie/popular');
}

async function getPopularTvShows() {
    return fetchTMDB('tv/popular');
}

async function searchMedia(query) {
    return fetchTMDB('search/multi', `query=${encodeURIComponent(query)}`);
}

async function getMovieDetails(movieId) {
    return fetchTMDB(`movie/${movieId}`);
}

async function getTvShowDetails(tvId) {
    return fetchTMDB(`tv/${tvId}`);
}

async function getTvShowSeasonDetails(tvId, seasonNumber) {
    return fetchTMDB(`tv/${tvId}/season/${seasonNumber}`);
}

// --- Display Functions ---
function displayCarousel(items, container, mediaType) {
    container.innerHTML = ''; // Clear previous items
    items.forEach(item => {
        if (!item.poster_path) return; // Skip items without posters

        const card = document.createElement('div');
        card.classList.add('carousel-item');
        card.dataset.id = item.id;
        card.dataset.mediaType = mediaType;
        card.tabIndex = 0; // Make it focusable

        const img = document.createElement('img');
        img.src = `${imageBaseUrl}${item.poster_path}`;
        img.alt = item.title || item.name;

        const title = document.createElement('p');
        title.textContent = item.title || item.name;

        card.appendChild(img);
        card.appendChild(title);
        container.appendChild(card);

        card.addEventListener('click', async () => {
            let details;
            if (mediaType === 'movie') {
                details = await getMovieDetails(item.id);
            } else if (mediaType === 'tv') {
                details = await getTvShowDetails(item.id);
            }
            if (details) {
                displayDetails(details, mediaType);
            }
        });
    });
}

// Generic function to display items in a grid (used for search, favorites, history)
function displayItemsGrid(items, gridContainerElement, viewType) {
    gridContainerElement.innerHTML = ''; // Clear previous items
    if (!items || items.length === 0) {
        gridContainerElement.innerHTML = `<p class="empty-message">No ${viewType} found.</p>`;
        return;
    }

    items.forEach(item => {
        // Ensure item has necessary properties, even from localStorage
        const id = item.id;
        const title = item.title || item.name;
        const posterPath = item.poster_path;
        const mediaType = item.media_type || (item.title ? 'movie' : 'tv'); // Infer if needed

        if (!posterPath && mediaType !== 'person') return;
        if (mediaType === 'person') return;

        const card = document.createElement('div');
        card.classList.add('result-item'); // Re-use existing class for styling
        card.dataset.id = id;
        card.dataset.mediaType = mediaType;
        card.tabIndex = 0;

        const img = document.createElement('img');
        img.src = posterPath ? `${imageBaseUrl}${posterPath}` : 'placeholder.jpg';
        img.alt = title;

        const titleEl = document.createElement('p');
        titleEl.textContent = title;

        card.appendChild(img);
        card.appendChild(titleEl);
        gridContainerElement.appendChild(card);

        card.addEventListener('click', async () => {
            // Fetch full details again when clicking from fav/history for consistency
            let fullDetails;
            if (mediaType === 'movie') {
                fullDetails = await getMovieDetails(id);
            } else if (mediaType === 'tv') {
                fullDetails = await getTvShowDetails(id);
            }
            if (fullDetails) {
                displayDetails(fullDetails, mediaType);
            } else {
                // Fallback if fetching full details fails, use the stored item
                displayDetails(item, mediaType);
            }
        });
    });

    // Focus the first item in the grid
    const firstItem = gridContainerElement.querySelector('.result-item');
    if (firstItem) {
        updateFocus(null, firstItem, gridContainerElement.querySelectorAll('.result-item'));
    }
}


function displayDetails(item, mediaType) {
    // Hide all views then show details view
    [homeView, searchResultsView, favoritesView, historyView].forEach(view => view.style.display = 'none');
    detailsView.style.display = 'block';
    detailsView.scrollIntoView({ behavior: 'smooth', block: 'start' });

    currentItemDetailsForAction = item; // Store for fav/history actions

    detailsPoster.src = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'placeholder.jpg';
    detailsTitle.textContent = item.title || item.name;
    detailsOverview.textContent = item.overview;
    detailsRating.textContent = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    detailsView.dataset.id = item.id;
    detailsView.dataset.mediaType = mediaType;

    videoPlayer.src = ''; // Clear previous video

    // Handle TV Show Season/Episode display
    const tvSeasonsEpisodesDiv = detailsView.querySelector('#tv-seasons-episodes');
    if (mediaType === 'tv' && item.seasons) {
        tvSeasonsEpisodesDiv.style.display = 'block';
        populateSeasonSelector(item.seasons, item.id);
        // Fetch and display episodes for the first season (or last watched) by default
        if (item.seasons.length > 0) {
            // TMDB API often includes a season 0 for "Specials" which might not be what users want first.
            // Find the first season with season_number > 0, or default to the first one in the list.
            let defaultSeason = item.seasons.find(s => s.season_number > 0);
            if (!defaultSeason && item.seasons.length > 0) defaultSeason = item.seasons[0];

            if (defaultSeason) {
                fetchAndDisplaySeasonEpisodes(item.id, defaultSeason.season_number);
                detailsView.querySelector('#season-select').value = defaultSeason.season_number;
            } else {
                 clearEpisodeList(); // No seasons to display
            }
        } else {
            clearEpisodeList(); // No seasons to display
        }
    } else {
        tvSeasonsEpisodesDiv.style.display = 'none';
        clearEpisodeList();
    }


    // Favorite button setup
    const favButton = detailsView.querySelector('#add-to-favorites-btn');
    updateFavoriteButton(item.id, isFavorite(item.id)); // Set initial state
    favButton.onclick = () => {
        if (isFavorite(item.id)) {
            removeFromFavorites(item.id);
        } else {
            addToFavorites(item); // Pass the full item object
        }
    };

    regularPlayerButton.onclick = () => loadVideo(item.id, mediaType, item, null, null, false);
    vipPlayerButton.onclick = () => loadVideo(item.id, mediaType, item, null, null, true);

    updateFocus(null, favButton, detailsView.querySelectorAll('button, select')); // Focus favorite button or season select
}

function populateSeasonSelector(seasons, tvId) {
    const seasonSelect = detailsView.querySelector('#season-select');
    seasonSelect.innerHTML = ''; // Clear old options

    seasons.forEach(season => {
        // Skip season 0 "Specials" if it has no episodes listed or prefer not to show by default
        // For now, we list all seasons provided by the main TV details endpoint
        if (season.name && season.season_number !== undefined) { // Ensure season has a name and number
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `${season.name} (${season.episode_count} Episodes)`;
            // Optionally, add more data attributes if needed e.g. data-season-id
            seasonSelect.appendChild(option);
        }
    });

    seasonSelect.onchange = () => {
        fetchAndDisplaySeasonEpisodes(tvId, seasonSelect.value);
    };
}

async function fetchAndDisplaySeasonEpisodes(tvId, seasonNumber) {
    const seasonDetails = await getTvShowSeasonDetails(tvId, seasonNumber);
    if (seasonDetails && seasonDetails.episodes) {
        displayEpisodeList(seasonDetails.episodes, tvId, seasonNumber);
    } else {
        clearEpisodeList('Error loading episodes.');
    }
}

function displayEpisodeList(episodes, tvId, seasonNumber) {
    const episodeListUl = detailsView.querySelector('#episode-list');
    episodeListUl.innerHTML = ''; // Clear old episodes

    if (!episodes || episodes.length === 0) {
        episodeListUl.innerHTML = '<li>No episodes found for this season.</li>';
        return;
    }

    episodes.forEach(episode => {
        const li = document.createElement('li');
        li.textContent = `E${episode.episode_number}: ${episode.name || 'Untitled Episode'}`;
        li.dataset.episodeNumber = episode.episode_number;
        li.dataset.seasonNumber = seasonNumber;
        li.dataset.tvId = tvId;
        li.tabIndex = 0; // Make focusable

        li.onclick = () => {
            // Update currentItemDetailsForAction before loading video if needed, or pass all details
            // For simplicity, we'll use the main TV show details for history for now.
            loadVideo(tvId, 'tv', currentItemDetailsForAction, seasonNumber, episode.episode_number, false); // Default to regular player
            // Add logic to choose VIP player if needed
        };
        li.onfocus = () => { // Add focused class for styling
            const currentlyFocused = episodeListUl.querySelector('.focused');
            if(currentlyFocused) currentlyFocused.classList.remove('focused');
            li.classList.add('focused');
        };
         li.onblur = () => { // Remove focused class
            li.classList.remove('focused');
        };


        episodeListUl.appendChild(li);
    });
}

function clearEpisodeList(message = 'Select a season to see episodes.') {
    const episodeListUl = detailsView.querySelector('#episode-list');
    episodeListUl.innerHTML = `<li>${message}</li>`;
}


// --- Player Functions ---
function loadVideo(tmdbId, mediaType, itemDetails, season = null, episode = null, isVip = false) {
    // Add to history when video is loaded
    if(itemDetails) { // Ensure we have item details to add to history
        addToHistory(itemDetails);
    }

    let videoUrl = '';
    // const playerType = isVip ? 'directstream.php' : ''; No, this was wrong. Base URL changes.

    if (mediaType === 'movie') {
        if (isVip) {
            videoUrl = `${multiEmbedBaseUrl}/directstream.php?video_id=${tmdbId}&tmdb=1`;
        } else {
            videoUrl = `${multiEmbedBaseUrl}/?video_id=${tmdbId}&tmdb=1`;
        }
    } else if (mediaType === 'tv') {
        // For TV shows, we'd ideally ask the user for season and episode.
        // For now, let's assume S1E1 if not provided.
        // A more robust solution would involve fetching season/episode data and letting the user choose.
        const s = season || 1;
        const e = episode || 1;
        if (isVip) {
            videoUrl = `${multiEmbedBaseUrl}/directstream.php?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`;
        } else {
            videoUrl = `${multiEmbedBaseUrl}/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`;
        }
    }

    if (videoUrl) {
        videoPlayer.src = videoUrl;
        console.log(`Loading video: ${videoUrl}`);
    } else {
        console.error('Could not determine video URL.');
        videoPlayer.src = ''; // Clear src if URL couldn't be made
    }
}

// --- Event Listeners ---
searchInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            const results = await searchMedia(query);
            if (results && results.results) {
                // Hide popular sections, show search results
                document.getElementById('popular-movies').style.display = 'none';
                document.getElementById('popular-tv-shows').style.display = 'none';
                detailsSection.style.display = 'none';
                searchResultsSection.style.display = 'block';
                displaySearchResults(results.results); // To be implemented
            }
        }
    }
});

// --- Initialization ---
async function init() {
    const popularMovies = await getPopularMovies();
    if (popularMovies && popularMovies.results) {
        displayCarousel(popularMovies.results, popularMoviesSection, 'movie'); // To be implemented
    }

    const popularTvShows = await getPopularTvShows();
    if (popularTvShows && popularTvShows.results) {
        displayCarousel(popularTvShows.results, popularTvShowsSection, 'tv'); // To be implemented
    }
}

const siteTitleHeader = document.querySelector('.sidebar-logo h1'); // Changed from header h1

// --- View Management ---
function showView(viewToShow) {
    [homeView, searchResultsView, favoritesView, historyView, detailsView].forEach(view => {
        view.style.display = (view === viewToShow) ? 'block' : 'none';
    });
    // Special handling for search input visibility might be needed if it's not always visible
    if (viewToShow === searchResultsView || viewToShow === homeView) { // Example: show search input for home and search results
        searchInput.style.display = 'block';
    } else {
        // searchInput.style.display = 'none'; // Or keep it always visible in the header
    }
    videoPlayer.src = ''; // Stop video when changing main views (except if going to details)
}


// --- Event Listeners ---
searchInput.addEventListener('input', () => {
    // Reset search history index if user types something
    if (searchInput.value !== '') {
        currentSearchHistoryIndex = -1;
    }
});

searchInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        const query = searchInput.value.trim();
        currentSearchHistoryIndex = -1; // Reset history index on new search
        if (query) {
            const results = await searchMedia(query);
            addToSearchHistory(query); // Add to search history
            if (results && results.results) {
                showView(searchResultsView);
                displayItemsGrid(results.results, searchResultsGrid, 'search results');
            }
        } else {
            // If search is cleared and enter is pressed, go to home
            showView(homeView);
            // Refocus first item in home view if necessary
            const firstCarouselItem = homeView.querySelector('.carousel-item');
            if (firstCarouselItem) {
                updateFocus(null, firstCarouselItem, homeView.querySelectorAll('.carousel-item'));
            }
        }
    }
});

siteTitleHeader.addEventListener('click', () => { // Changed from siteTitle
    showView(homeView);
    const firstCarouselItem = homeView.querySelector('.carousel-item');
    if (firstCarouselItem) {
        updateFocus(null, firstCarouselItem, homeView.querySelectorAll('.carousel-item'));
    }
});

navHomeBtn.addEventListener('click', () => {
    showView(homeView);
    const firstCarouselItem = homeView.querySelector('.carousel-item');
    if (firstCarouselItem) {
        updateFocus(null, firstCarouselItem, homeView.querySelectorAll('.carousel-item'));
    }
});

navFavoritesBtn.addEventListener('click', () => {
    showView(favoritesView);
    displayItemsGrid(getFavorites(), favoritesGrid, 'favorites');
});

navHistoryBtn.addEventListener('click', () => {
    showView(historyView);
    displayItemsGrid(getHistory(), historyGrid, 'watch history');
});

navSearchBtn.addEventListener('click', () => {
    // Option 1: Just focus the search input if it's always visible
    searchInput.focus();
    // Option 2: Switch to a dedicated search input view if you have one
    // showView(searchOnlyView); // if you create a view that only has the search bar prominently
    // Option 3: Show search results view, expecting user to type
    showView(searchResultsView); // This will show "No search results found." initially if query is empty
    searchInput.focus();

});


// Call init when the script loads
init();

// --- Sidebar Collapse Toggle ---
const sidebarToggleButton = document.createElement('button'); // Let's create one dynamically for now
sidebarToggleButton.innerHTML = '<i class="fas fa-bars"></i>';
sidebarToggleButton.classList.add('sidebar-toggle-btn');
// mainContent.querySelector('header').prepend(sidebarToggleButton); // Add to header in main content
// Or, better:
sidebar.prepend(sidebarToggleButton); // Add to top of sidebar itself
sidebarToggleButton.style.cssText = `
    background: #e50914; color: white; border: none; padding: 0.5rem;
    font-size: 1.2rem; cursor: pointer; width: 100%; margin-bottom: 1rem;
    display: none; /* Initially hidden, shown via CSS or specific logic if needed */
`;
// For TV UI, collapse might be less common or handled differently.
// Let's assume a class 'collapsed' on sidebar is toggled by some means (e.g. a hidden button or specific key)
// For now, we'll manually control it or add a dedicated key later if needed.
// To test: sidebar.classList.toggle('collapsed');

// --- D-Pad/Arrow Key Navigation ---
let currentFocusableArea = 'sidebar'; // 'sidebar', 'main-header', 'main-content'
let lastFocusedElementInMain = null; // Remember last focused in main for returning from sidebar
let currentSearchHistoryIndex = -1; // Initialize for cycling through search history

document.addEventListener('keydown', (event) => {
    const key = event.key;
    const activeElement = document.activeElement;

    // Prevent default scroll for arrow keys, but allow for input fields
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
            event.preventDefault();
        }
    }

    if (key === 'Escape') {
        event.preventDefault();
        // If in details view, go back to the previous view (home, search, fav, hist)
        // This needs more sophisticated state tracking of which view was active before details.
        // For now, a simple Escape goes to Home view.
        showView(homeView);
        const firstHomeItem = homeView.querySelector('.carousel-item') || sidebar.querySelector('li');
        if (firstHomeItem) updateFocus(null, firstHomeItem, getFocusableElements(homeView));
        return;
    }

    if (activeElement === searchInput && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) {
        return; // Allow normal typing in search
    }

    let focusableElements = getFocusableElements();
    let currentIndex = focusableElements.indexOf(activeElement);
    if (currentIndex === -1 && focusableElements.length > 0) { // If no active element, or it's not in our list
        // Try to find if it's a .focused item (if browser focus somehow got lost)
        const focusedClassElement = focusableElements.find(el => el.classList.contains('focused'));
        if (focusedClassElement) {
            currentIndex = focusableElements.indexOf(focusedClassElement);
        } else {
             // Fallback: focus the first element in the current area or globally
            currentIndex = 0; // Default to first if nothing sensible is focused
            if (focusableElements.length > 0) updateFocus(null, focusableElements[0], focusableElements);
        }
    }


    if (focusableElements.length === 0) return; // No focusable elements on the page

    let nextElement = null;

    // --- Navigation Logic ---
    switch (key) {
        case 'ArrowUp':
            if (currentFocusableArea === 'sidebar') {
                nextElement = getNextFocusable(currentIndex, -1, focusableElements);
            } else if (currentFocusableArea === 'main-content' || currentFocusableArea === 'main-header') {
                if (activeElement === searchInput) {
                    // Potentially move to sidebar if search is at the top of main content
                    // currentFocusableArea = 'sidebar';
                    // nextElement = sidebar.querySelector('li:last-child'); // Example: last sidebar item
                } else {
                    // Try to move up within the current grid/list in main content
                    nextElement = navigateGrid(activeElement, 'up', focusableElements);

                    if (!nextElement) { // If navigateGrid returned null (at the top of a grid/section)
                        if (activeElement.closest('#popular-tv-shows')) {
                            // Try to move from Popular TV Shows to Popular Movies (last item or last row's first)
                            const movieItems = Array.from(popularMoviesSection.querySelectorAll('.carousel-item'));
                            if (movieItems.length > 0) nextElement = movieItems[movieItems.length - 1]; // Focus last movie item
                        } else if (activeElement.closest('.results-grid, .carousel-container, .details-info')) {
                             // If at the top of any other grid/carousel, move to search input
                            nextElement = searchInput;
                        }
                        // If still no nextElement (e.g., searchInput was already active or no other place to go up)
                        // it will remain null, and focus won't change, which is fine.
                    }
                }
            }
            break;

        case 'ArrowDown':
            if (currentFocusableArea === 'sidebar') {
                nextElement = getNextFocusable(currentIndex, 1, focusableElements);
            } else if (currentFocusableArea === 'main-header' && activeElement === searchInput) {
                 // If search input is empty and ArrowDown, try to cycle search history
                if (searchInput.value === '') {
                    const searchHistory = getSearchHistory();
                    if (searchHistory.length > 0) {
                        currentSearchHistoryIndex = (currentSearchHistoryIndex + 1) % searchHistory.length;
                        searchInput.value = searchHistory[currentSearchHistoryIndex];
                        nextElement = searchInput; // Keep focus on search input
                        break; // Don't move to main content yet
                    }
                }
                // If search input has text or no history, move to the first item in the current main view
                const mainViewElements = getFocusableElementsInCurrentView();
                if (mainViewElements.length > 0) nextElement = mainViewElements[0];
                currentFocusableArea = 'main-content';

            } else if (currentFocusableArea === 'main-content') {
                nextElement = navigateGrid(activeElement, 'down', focusableElements);
                if (!nextElement && activeElement.closest('#popular-movies')) {
                    // Try to move from Popular Movies to Popular TV Shows
                    const firstTvShowItem = popularTvShowsSection.querySelector('.carousel-item');
                    if (firstTvShowItem) nextElement = firstTvShowItem;
                }
            }
            break;

        case 'ArrowLeft':
            if (currentFocusableArea === 'main-content' || currentFocusableArea === 'main-header') {
                 // If in a carousel/grid, and at the start of a row, or if it's a button list in details
                const isFirstInRow = isElementFirstInRow(activeElement, focusableElements);
                if (isFirstInRow || activeElement.closest('.details-info') || activeElement === searchInput) {
                    // Move to sidebar
                    currentFocusableArea = 'sidebar';
                    // Try to focus a sensible item in sidebar, e.g. currently selected or first visible
                    const currentSidebarItem = sidebar.querySelector('.focused') || sidebar.querySelector('li[tabindex="0"]');
                    nextElement = currentSidebarItem;
                } else {
                    nextElement = navigateGrid(activeElement, 'left', focusableElements);
                }
            } else if (currentFocusableArea === 'sidebar'){
                // Potentially collapse sidebar or do nothing
                if(!sidebar.classList.contains('collapsed')) {
                    // sidebar.classList.add('collapsed');
                    // mainContent.style.paddingLeft = '80px'; // Adjust if not done by CSS
                }
            }
            break;

        case 'ArrowRight':
            if (currentFocusableArea === 'sidebar') {
                // Move to main content area
                currentFocusableArea = 'main-header'; // Start with header (search) or main content
                if (lastFocusedElementInMain && document.body.contains(lastFocusedElementInMain)) {
                    nextElement = lastFocusedElementInMain;
                } else {
                    nextElement = searchInput.offsetParent !== null ? searchInput : getFocusableElementsInCurrentView()[0];
                }
                if (nextElement) currentFocusableArea = nextElement === searchInput ? 'main-header' : 'main-content';

            } else if (currentFocusableArea === 'main-content' || currentFocusableArea === 'main-header') {
                nextElement = navigateGrid(activeElement, 'right', focusableElements);
                 if (!nextElement && isElementLastInRow(activeElement, focusableElements)) {
                    // At the end of a row, do nothing or wrap (if implemented in navigateGrid)
                }
            }
            break;

        case 'Enter':
            if (activeElement && typeof activeElement.click === 'function') {
                activeElement.click();
            }
            break;
    }

    if (nextElement) {
        updateFocus(activeElement, nextElement, focusableElements);
        if (currentFocusableArea === 'main-content' || currentFocusableArea === 'main-header') {
            lastFocusedElementInMain = nextElement;
        }
    }
});


function getFocusableElements(parentElement = document) {
    // Determine current visible view to narrow down focusable elements
    let viewNode = null;
    if (homeView.style.display === 'block') viewNode = homeView;
    else if (searchResultsView.style.display === 'block') viewNode = searchResultsView;
    else if (favoritesView.style.display === 'block') viewNode = favoritesView;
    else if (historyView.style.display === 'block') viewNode = historyView;
    else if (detailsView.style.display === 'block') viewNode = detailsView;

    let elements = [];
    // Sidebar items are always potentially focusable if sidebar is the current area
    const sidebarItems = Array.from(sidebar.querySelectorAll('li[tabindex="0"]'));

    if (currentFocusableArea === 'sidebar') {
        elements = sidebarItems;
    } else if (currentFocusableArea === 'main-header') {
        elements = [searchInput].filter(el => el.offsetParent !== null); // Only visible search input
    } else { // main-content
        if (viewNode) {
            elements.push(...Array.from(viewNode.querySelectorAll(
                '.carousel-item, .result-item, button, iframe, a[href]'
            )).filter(el => el.offsetParent !== null && !el.disabled));
        }
        // If searchInput is part of main-content focus area (e.g. not in 'main-header' mode)
        // if (searchInput.offsetParent !== null) elements.unshift(searchInput);
    }

    // Fallback if no specific area elements found, get all possible ones
    if (elements.length === 0 && parentElement === document) {
         elements = Array.from(document.querySelectorAll(
            '.sidebar li[tabindex="0"], #search-input, .carousel-item, .result-item, .details-view button, .details-view iframe, a[href]'
        )).filter(el => el.offsetParent !== null && !el.disabled);
    } else if (elements.length === 0 && parentElement !== document) {
        // If called with a specific parentElement (like a viewNode)
        elements = Array.from(parentElement.querySelectorAll(
            '.carousel-item, .result-item, button, iframe, a[href]'
        )).filter(el => el.offsetParent !== null && !el.disabled);
    }

    return elements;
}

function getFocusableElementsInCurrentView() {
    let viewNode = null;
    if (homeView.style.display === 'block') viewNode = homeView;
    else if (searchResultsView.style.display === 'block') viewNode = searchResultsView;
    else if (favoritesView.style.display === 'block') viewNode = favoritesView;
    else if (historyView.style.display === 'block') viewNode = historyView;
    else if (detailsView.style.display === 'block') viewNode = detailsView;

    if (viewNode) {
        return Array.from(viewNode.querySelectorAll(
            '.carousel-item, .result-item, button, iframe, a[href]'
        )).filter(el => el.offsetParent !== null && !el.disabled);
    }
    return [];
}


function getNextFocusable(currentIndex, direction, elements) {
    if (elements.length === 0) return null;
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < elements.length) {
        return elements[nextIndex];
    }
    // Optional: Implement wrapping
    // if (nextIndex < 0) return elements[elements.length - 1]; // Wrap to last
    // if (nextIndex >= elements.length) return elements[0]; // Wrap to first
    return null; // No next element in that direction / no wrapping
}

function calculateItemsPerRow(containerElement, itemElement) {
    if (!containerElement || !itemElement) return 1; // Default to 1 if elements are not valid
    const containerWidth = containerElement.offsetWidth;
    const itemWidth = itemElement.offsetWidth;
    const itemStyle = window.getComputedStyle(itemElement);
    const itemMarginLeft = parseFloat(itemStyle.marginLeft) || 0;
    const itemMarginRight = parseFloat(itemStyle.marginRight) || 0;
    const itemGap = parseFloat(window.getComputedStyle(containerElement).gap) || (parseFloat(itemStyle.marginRight)); // Use container gap or item margin

    const totalItemWidth = itemWidth + itemMarginLeft + itemMarginRight; // More accurately, itemWidth + gap used by flex/grid

    if (totalItemWidth <=0) return 1;

    // If using gap, total width for an item is itemWidth. The gap is between items.
    // So, (containerWidth + gap) / (itemWidth + gap)
    const effectiveItemWidthWithGap = itemWidth + itemGap;
    let itemsPerRow = Math.floor((containerWidth + itemGap) / effectiveItemWidthWithGap);

    // Fallback for very narrow containers or if calculation is off
    if (itemsPerRow <= 0) itemsPerRow = 1;
    // console.log(`Cont: ${containerWidth}, ItemW: ${itemWidth}, ItemGap: ${itemGap}, EffItemWGap: ${effectiveItemWidthWithGap}, ItemsPerRow: ${itemsPerRow}`);
    return itemsPerRow;
}


function navigateGrid(currentElement, direction, allFocusableInContext) {
    const parentGrid = currentElement.closest('.results-grid, .carousel-container'); // For carousels and grids
    const parentView = currentElement.closest('section[id$="-view"], section[id^="popular-"]'); // For any major view section
    const detailsInfoArea = currentElement.closest('.details-info'); // Specific to details page buttons
    const episodeListArea = currentElement.closest('#episode-list-container'); // Specific to episode list
    let itemsInGrid;

    if (detailsInfoArea && !episodeListArea) { // Action buttons (Fav, Player Regular, Player VIP)
        itemsInGrid = Array.from(detailsInfoArea.querySelectorAll('button.details-action-button, button.player-choice-btn, select#season-select'))
                            .filter(el => el.offsetParent !== null && !el.disabled);
        // Make sure season-select is also part of this loop if it's visible
        if (!detailsView.querySelector('#tv-seasons-episodes[style*="display: block"]') || !detailsView.querySelector('#season-select')) {
            itemsInGrid = itemsInGrid.filter(el => el.id !== 'season-select');
        }

    } else if (episodeListArea) { // Episode list items
        itemsInGrid = Array.from(episodeListArea.querySelectorAll('#episode-list li'))
                            .filter(el => el.offsetParent !== null && !el.disabled);
    } else if (parentGrid) { // If inside a specific grid or carousel
        itemsInGrid = Array.from(parentGrid.querySelectorAll('.result-item, .carousel-item'))
                           .filter(el => el.offsetParent !== null && !el.disabled);
    } else { // Fallback to all focusable in the current view context if not in a clear grid/details area
        itemsInGrid = getFocusableElementsInCurrentView().filter(el => el.offsetParent !== null && !el.disabled);
    }

    if (!itemsInGrid || itemsInGrid.length === 0) return null;

    let currentIndexInGrid = itemsInGrid.indexOf(currentElement);
    if (currentIndexInGrid === -1) return null; // Current element not in the identified grid items

    switch (direction) {
        case 'left':
            return currentIndexInGrid > 0 ? itemsInGrid[currentIndexInGrid - 1] : null;
        case 'right':
            return currentIndexInGrid < itemsInGrid.length - 1 ? itemsInGrid[currentIndexInGrid + 1] : null;
        case 'up':
        case 'down':
            if (detailsInfoArea) { // Simple up/down cycle for details buttons
                const currentIndex = itemsInGrid.indexOf(currentElement);
                if (currentIndex === -1) return null;
                let nextIndex;
                if (direction === 'up') {
                    // For details buttons and episode list, simple cycle with wrap
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : itemsInGrid.length - 1;
                } else { // down
                    nextIndex = currentIndex < itemsInGrid.length - 1 ? currentIndex + 1 : 0;
                }
                return itemsInGrid[nextIndex];
            } else if (currentElement.closest('#episode-list')) { // Handling for episode list items
                const currentIndex = itemsInGrid.indexOf(currentElement);
                if (currentIndex === -1) return null;
                let nextIndex;
                 if (direction === 'up') {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : null; // Stop at top
                    if (nextIndex === null && itemsInGrid.length > 0) { // Optionally move to season select
                        // return detailsView.querySelector('#season-select');
                    }
                } else { // down
                    nextIndex = currentIndex < itemsInGrid.length - 1 ? currentIndex + 1 : null; // Stop at bottom
                }
                return itemsInGrid[nextIndex] || null; // Return null if at edge
            } else if (!parentGrid || parentGrid.classList.contains('carousel-container')) {
                // For carousels or non-grid contexts (that are not details buttons or episode list), up/down might mean exiting
                return null; // Let outer logic handle (e.g. move to search or sidebar)
            }
            // Grid navigation for up/down
            const itemsPerRow = calculateItemsPerRow(parentGrid, itemsInGrid[0]);
            if (itemsPerRow <= 0) return null; // Should not happen if items exist

            const targetIndex = direction === 'up'
                ? currentIndexInGrid - itemsPerRow
                : currentIndexInGrid + itemsPerRow;

            if (targetIndex >= 0 && targetIndex < itemsInGrid.length) {
                return itemsInGrid[targetIndex];
            } else if (direction === 'up' && targetIndex < 0) {
                // Reached top of grid, could return first item of current column or null to exit up
                // return itemsInGrid[currentIndexInGrid % itemsPerRow]; // First item in current column
                return null; // Signal to exit grid upwards
            } else if (direction === 'down' && targetIndex >= itemsInGrid.length) {
                // Reached bottom of grid
                // return itemsInGrid[itemsInGrid.length - 1 - ( (itemsInGrid.length-1-currentIndexInGrid) % itemsPerRow )]; // Last item in col
                return null; // Signal to exit grid downwards
            }
            return null;
    }
    return null;
}

function isElementFirstInRow(element, contextElements) {
    const parentGrid = element.closest('.results-grid');
    if (!parentGrid) return false; // Not in a grid we can calculate rows for

    const itemsInGrid = Array.from(parentGrid.querySelectorAll('.result-item'))
                           .filter(el => el.offsetParent !== null);
    if (itemsInGrid.length === 0) return false;

    const itemsPerRow = calculateItemsPerRow(parentGrid, itemsInGrid[0]);
    if (itemsPerRow <= 0) return false;

    const elementIndex = itemsInGrid.indexOf(element);
    return elementIndex % itemsPerRow === 0;
}

function isElementLastInRow(element, contextElements) {
    const parentGrid = element.closest('.results-grid');
    if (!parentGrid) return false;

    const itemsInGrid = Array.from(parentGrid.querySelectorAll('.result-item'))
                           .filter(el => el.offsetParent !== null);
    if (itemsInGrid.length === 0) return false;

    const itemsPerRow = calculateItemsPerRow(parentGrid, itemsInGrid[0]);
    if (itemsPerRow <= 0) return false;

    const elementIndex = itemsInGrid.indexOf(element);
    return (elementIndex + 1) % itemsPerRow === 0 || elementIndex === itemsInGrid.length - 1;
}


function updateFocus(oldFocusElement, newFocusElement, elementList) {
    if (oldFocusElement) {
        oldFocusElement.classList.remove('focused');
    }
    if (newFocusElement) {
        newFocusElement.classList.add('focused');
        newFocusElement.focus();
        newFocusElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

        // Update global currentFocus if still needed, or rely on document.activeElement
        // For simplicity now, document.activeElement is the source of truth.
    } else if (elementList && elementList.length > 0 && !document.querySelector('.focused')) {
        // If newFocusElement is null but there's a list AND nothing has .focused class, focus the first one
        // This can happen if focus is lost entirely.
        elementList[0].classList.add('focused');
        elementList[0].focus();
        elementList[0].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}


function showPopularSections() { // This function is likely deprecated by showView
    // detailsSection.style.display = 'none';
    // searchResultsSection.style.display = 'none';
    // document.getElementById('popular-movies').style.display = 'block';
    // document.getElementById('popular-tv-shows').style.display = 'block';
    searchInput.value = ''; // Clear search
}

// Modify init to show home view and focus the first carousel item on load
async function init() {
    showView(homeView); // Ensure home view is visible first

    const popularMovies = await getPopularMovies();
    if (popularMovies && popularMovies.results) {
        displayCarousel(popularMovies.results, popularMoviesSection, 'movie');
    }

    const popularTvShows = await getPopularTvShows();
    if (popularTvShows && popularTvShows.results) {
        displayCarousel(popularTvShows.results, popularTvShowsSection, 'tv');
    }

    // Set initial focus on the first item of the first carousel if available,
    // or the first sidebar item if no carousel items.
    let firstFocusableElement = homeView.querySelector('.carousel-item');
    if (!firstFocusableElement) {
        firstFocusableElement = sidebar.querySelector('li[tabindex="0"]');
    }

    if (firstFocusableElement) {
        // Determine the list of all potentially focusable items in the initial view for context
        const initialFocusableItems = Array.from(sidebar.querySelectorAll('li[tabindex="0"]'))
            .concat(Array.from(homeView.querySelectorAll('.carousel-item')));
        updateFocus(null, firstFocusableElement, initialFocusableItems);
    }
}
