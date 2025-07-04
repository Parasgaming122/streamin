const apiKey = 'da63548086e399ffc910fbc08526df05';
const baseUrl = 'https://api.themoviedb.org/3';
const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
const multiEmbedBaseUrl = 'https://multiembed.mov';

const popularMoviesSection = document.getElementById('popular-movies').querySelector('.carousel-container');
const popularTvShowsSection = document.getElementById('popular-tv-shows').querySelector('.carousel-container');
const searchResultsSection = document.getElementById('search-results');
const searchResultsGrid = searchResultsSection.querySelector('.results-grid');
const detailsSection = document.getElementById('details');
const searchInput = document.getElementById('search');

// DOM elements for details section
const detailsPoster = document.getElementById('details-poster');
const detailsTitle = document.getElementById('details-title');
const detailsOverview = document.getElementById('details-overview');
const detailsRating = document.getElementById('details-rating');
const videoPlayer = document.getElementById('video-player');
const regularPlayerButton = document.getElementById('player-regular');
const vipPlayerButton = document.getElementById('player-vip');

let currentFocus = 0; // For D-pad navigation

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

function displaySearchResults(results) {
    searchResultsGrid.innerHTML = ''; // Clear previous results
    results.forEach(item => {
        if (!item.poster_path && item.media_type !== 'person') return; // Skip items without posters or people
        if (item.media_type === 'person') return; // Skip people for now

        const card = document.createElement('div');
        card.classList.add('result-item');
        card.dataset.id = item.id;
        card.dataset.mediaType = item.media_type; // 'movie' or 'tv'
        card.tabIndex = 0; // Make it focusable

        const img = document.createElement('img');
        img.src = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'placeholder.jpg'; // Add a placeholder image if no poster
        img.alt = item.title || item.name;

        const title = document.createElement('p');
        title.textContent = item.title || item.name;

        card.appendChild(img);
        card.appendChild(title);
        searchResultsGrid.appendChild(card);

        card.addEventListener('click', async () => {
            let details;
            if (item.media_type === 'movie') {
                details = await getMovieDetails(item.id);
            } else if (item.media_type === 'tv') {
                details = await getTvShowDetails(item.id);
            }
            if (details) {
                displayDetails(details, item.media_type);
            }
        });
    });
    // Reset focus to the first search result if any
    currentFocus = 0;
    const focusableElements = document.querySelectorAll('.result-item');
    if (focusableElements.length > 0) {
        focusableElements[0].classList.add('focused');
        focusableElements[0].focus();
    }
}

function displayDetails(item, mediaType) {
    // Hide other sections
    document.getElementById('popular-movies').style.display = 'none';
    document.getElementById('popular-tv-shows').style.display = 'none';
    searchResultsSection.style.display = 'none';

    // Show details section
    detailsSection.style.display = 'block';

    detailsPoster.src = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'placeholder.jpg';
    detailsTitle.textContent = item.title || item.name;
    detailsOverview.textContent = item.overview;
    detailsRating.textContent = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    // Store current item's ID and type for player buttons
    detailsSection.dataset.id = item.id;
    detailsSection.dataset.mediaType = mediaType;
    detailsSection.dataset.tmdbId = item.id; // Specifically for TMDB id based players

    // Reset video player src
    videoPlayer.src = '';
    detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Scroll to top of details

    // Set up player buttons (actual video loading will be handled by their event listeners in step 4)
    regularPlayerButton.onclick = () => loadVideo(item.id, mediaType, null, null, false);
    vipPlayerButton.onclick = () => loadVideo(item.id, mediaType, null, null, true);

    // Focus on the regular player button by default when details are shown
    regularPlayerButton.focus();
    // You might want to add 'focused' class management here as well for visual consistency
}

// --- Player Functions ---
function loadVideo(tmdbId, mediaType, season = null, episode = null, isVip = false) {
    let videoUrl = '';
    const playerType = isVip ? 'directstream.php' : ''; // directstream.php for VIP, empty for regular (multiembed.mov root)

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

const siteTitle = document.querySelector('header h1');

// --- Event Listeners ---
searchInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            const results = await searchMedia(query);
            if (results && results.results) {
                document.getElementById('popular-movies').style.display = 'none';
                document.getElementById('popular-tv-shows').style.display = 'none';
                detailsSection.style.display = 'none';
                searchResultsSection.style.display = 'block';
                searchResultsGrid.innerHTML = ''; // Clear previous before displaying new
                displaySearchResults(results.results);
                // Focus first result after search
                const firstResult = searchResultsGrid.querySelector('.result-item');
                if (firstResult) {
                    updateFocus(null, firstResult, searchResultsGrid.querySelectorAll('.result-item'));
                }
            }
        } else {
            // If search is cleared and enter is pressed, go to popular sections
            showPopularSections();
            const firstFocusable = document.querySelector('.carousel-item');
            if (firstFocusable) {
                updateFocus(null, firstFocusable, document.querySelectorAll('.carousel-item'));
            }
        }
    }
});

siteTitle.addEventListener('click', () => {
    showPopularSections();
    videoPlayer.src = ''; // Stop video
    const firstFocusable = document.querySelector('.carousel-item');
    if (firstFocusable) {
        updateFocus(null, firstFocusable, document.querySelectorAll('.carousel-item'));
    }
});


// Call init when the script loads
init();

// D-pad/Arrow key navigation
document.addEventListener('keydown', (event) => {
    const key = event.key;
    let activeElements;
    let currentSection;

    // Determine active elements based on what's visible
    if (detailsSection.style.display === 'block') {
        activeElements = Array.from(detailsSection.querySelectorAll('button, iframe')).filter(el => el.offsetParent !== null);
        currentSection = 'details';
    } else if (searchResultsSection.style.display === 'block') {
        activeElements = Array.from(searchResultsGrid.querySelectorAll('.result-item')).filter(el => el.offsetParent !== null);
        currentSection = 'search';
    } else {
        // Default to carousels if nothing else is active
        // This needs to be more sophisticated to handle multiple carousels
        // For now, let's try to get all visible carousel items
        const visibleCarousels = Array.from(document.querySelectorAll('.carousel-container'))
                                     .filter(c => c.offsetParent !== null && c.style.display !== 'none');
        activeElements = [];
        visibleCarousels.forEach(vc => {
            activeElements.push(...Array.from(vc.querySelectorAll('.carousel-item')));
        });
        currentSection = 'carousel';
    }

    if (searchInput === document.activeElement && (key === "ArrowDown" || key === "Enter")) {
         // If search input is focused and user presses down or enter, move to first result/item
        if (activeElements.length > 0) {
            searchInput.blur(); // Unfocus search input
            currentFocus = 0;
            updateFocus(null, activeElements[currentFocus], activeElements);
            event.preventDefault();
            return;
        }
    } else if (searchInput === document.activeElement) {
        return; // Allow normal typing in search bar
    }


    if (!activeElements || activeElements.length === 0) return;

    const currentIndex = activeElements.findIndex(el => el.classList.contains('focused') || el === document.activeElement);
    let nextIndex = currentIndex === -1 ? 0 : currentIndex;

    // Prevent page scroll for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        event.preventDefault();
    }

    switch (key) {
        case 'ArrowUp':
            if (currentSection === 'details') { // In details, up could go to search or last carousel
                // Simple: try to focus search or do nothing
                searchInput.focus();
            } else if (currentSection === 'search' || currentSection === 'carousel') {
                // Naive "up" - go to search bar or try to find an element "above"
                // This is complex for a grid/horizontal layout.
                // A simpler approach for now: ArrowUp from a grid/carousel goes to search.
                 searchInput.focus();
            }
            break;
        case 'ArrowDown':
            if (currentSection === 'details') { // In details, down could go to player or related content
                 // cycle through buttons if on them
                if(activeElements[currentIndex] && activeElements[currentIndex].tagName === 'BUTTON'){
                    nextIndex = (currentIndex + 1) % activeElements.filter(el => el.tagName === 'BUTTON').length;
                    const buttons = activeElements.filter(el => el.tagName === 'BUTTON');
                    updateFocus(activeElements[currentIndex], buttons[nextIndex], buttons);
                } else {
                     // if not on a button, focus the first button
                    const firstButton = activeElements.find(el => el.tagName ==='BUTTON');
                    if(firstButton) updateFocus(null, firstButton, activeElements);
                }

            } else if (currentSection === 'search' || currentSection === 'carousel') {
                // Move down into the grid/carousel items if coming from search or another section
                // This logic will be handled by ensuring currentFocus is set correctly when entering section
                // If already in grid, find item below (complex for mixed height items)
                // Simple: if on search input, first item. If on item, try next row (hard) or do nothing.
                // For now, ArrowDown from search focuses first item.
                if (document.activeElement === searchInput && activeElements.length > 0) {
                    updateFocus(null, activeElements[0], activeElements);
                } else {
                    // Placeholder for more complex grid navigation (e.g. moving to item in next row)
                    // For horizontal carousels, down might mean exiting the carousel to a section below.
                }
            }
            break;
        case 'ArrowLeft':
            if (currentSection === 'details' && activeElements[currentIndex] && activeElements[currentIndex].tagName === 'BUTTON') {
                const buttons = activeElements.filter(el => el.tagName === 'BUTTON');
                const currentButtonIndex = buttons.indexOf(activeElements[currentIndex]);
                if (currentButtonIndex > 0) {
                    updateFocus(activeElements[currentIndex], buttons[currentButtonIndex - 1], buttons);
                }
            } else if (currentSection === 'search' || currentSection === 'carousel') {
                nextIndex = Math.max(0, currentIndex - 1);
                 if (currentIndex !== nextIndex || currentIndex === -1) { // also handle if no item was focused
                    updateFocus(activeElements[currentIndex], activeElements[nextIndex], activeElements);
                }
            }
            break;
        case 'ArrowRight':
             if (currentSection === 'details' && activeElements[currentIndex] && activeElements[currentIndex].tagName === 'BUTTON') {
                const buttons = activeElements.filter(el => el.tagName === 'BUTTON');
                const currentButtonIndex = buttons.indexOf(activeElements[currentIndex]);
                if (currentButtonIndex < buttons.length - 1) {
                    updateFocus(activeElements[currentIndex], buttons[currentButtonIndex + 1], buttons);
                }
            } else if (currentSection === 'search' || currentSection === 'carousel') {
                nextIndex = Math.min(activeElements.length - 1, currentIndex + 1);
                 if (currentIndex !== nextIndex) {
                    updateFocus(activeElements[currentIndex], activeElements[nextIndex], activeElements);
                }
            }
            break;
        case 'Enter':
             if (document.activeElement && document.activeElement !== searchInput) {
                document.activeElement.click();
            } else if (activeElements[currentFocus] && activeElements[currentFocus] !== searchInput) {
                 activeElements[currentFocus].click();
            }
            break;
        case 'Escape': // Go back to popular movies/TV shows view
            showPopularSections();
            videoPlayer.src = ''; // Stop video
            if (popularMoviesSection.querySelector('.carousel-item')) {
                 updateFocus(null, popularMoviesSection.querySelector('.carousel-item'), document.querySelectorAll('.carousel-item, .result-item'));
            }
            break;
    }
});

function updateFocus(oldFocusElement, newFocusElement, elementList) {
    if (oldFocusElement) {
        oldFocusElement.classList.remove('focused');
    }
    if (newFocusElement) {
        newFocusElement.classList.add('focused');
        newFocusElement.focus(); // Use browser's focus
        newFocusElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

        // Update global currentFocus based on the new element's position in a broader list if necessary
        // This part can be tricky if elementList is not the global list of all focusable items.
        // For simplicity, we assume elementList here is the relevant list for the current context.
        const globalFocusable = document.querySelectorAll('.carousel-item, .result-item, .player-options button');
        currentFocus = Array.from(globalFocusable).indexOf(newFocusElement);

    } else if (elementList && elementList.length > 0) {
        // If newFocusElement is null but there's a list, focus the first one (e.g. after search)
        elementList[0].classList.add('focused');
        elementList[0].focus();
        elementList[0].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        currentFocus = Array.from(document.querySelectorAll('.carousel-item, .result-item, .player-options button')).indexOf(elementList[0]);
    }
}

function showPopularSections() {
    detailsSection.style.display = 'none';
    searchResultsSection.style.display = 'none';
    document.getElementById('popular-movies').style.display = 'block';
    document.getElementById('popular-tv-shows').style.display = 'block';
    searchInput.value = ''; // Clear search
}

// Modify init to focus the first carousel item on load
async function init() {
    const popularMovies = await getPopularMovies();
    if (popularMovies && popularMovies.results) {
        displayCarousel(popularMovies.results, popularMoviesSection, 'movie');
    }

    const popularTvShows = await getPopularTvShows();
    if (popularTvShows && popularTvShows.results) {
        displayCarousel(popularTvShows.results, popularTvShowsSection, 'tv');
    }
    // Set initial focus on the first item of the first carousel if available
    const firstFocusable = document.querySelector('.carousel-item');
    if (firstFocusable) {
        updateFocus(null, firstFocusable, document.querySelectorAll('.carousel-item'));
    }
}
