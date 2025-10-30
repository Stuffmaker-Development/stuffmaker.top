// Replace with your Discord User ID
        const DISCORD_USER_ID = '213586333677912064'; // My ID - replace with yours
        
        let spotifyUpdateInterval;
        let spotifyCheckInterval;
        let progressValidationInterval;
        let currentSpotifyData = null;
        let lastSongId = null;
        let lastValidatedProgress = 0;
        let progressDriftThreshold = 3000; // 3 seconds tolerance

        // Create floating particles
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            
            setInterval(() => {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.width = particle.style.height = Math.random() * 10 + 5 + 'px';
                particle.style.animationDuration = Math.random() * 3 + 3 + 's';
                particle.style.animationDelay = Math.random() * 2 + 's';
                
                particlesContainer.appendChild(particle);
                
                setTimeout(() => {
                    particle.remove();
                }, 6000);
            }, 300);
        }

        // Format time from milliseconds
        function formatTime(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }

        // Update sync indicator
        function updateSyncIndicator(status) {
            const indicator = document.getElementById('sync-indicator');
            indicator.className = `sync-indicator ${status}`;
        }

        // Validate and correct Spotify progress
        async function validateSpotifyProgress() {
            if (!currentSpotifyData) return;
            
            try {
                const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
                const data = await response.json();
                
                if (!data.success || !data.data.spotify) {
                    updateSyncIndicator('error');
                    return;
                }

                const freshSpotifyData = data.data.spotify;
                const currentSongId = `${freshSpotifyData.song}-${freshSpotifyData.artist}-${freshSpotifyData.album}`;
                
                // Check if it's still the same song
                if (currentSongId !== lastSongId) {
                    // Song changed, update display
                    updateSpotifyDisplay(freshSpotifyData);
                    return;
                }
                
                // Calculate current progress based on our local timer
                const now = Date.now();
                const localProgress = now - currentSpotifyData.timestamps.start;
                
                // Calculate actual progress from fresh data
                const actualProgress = now - freshSpotifyData.timestamps.start;
                
                // Check if there's significant drift
                const progressDifference = Math.abs(localProgress - actualProgress);
                
                if (progressDifference > progressDriftThreshold) {
                    // Significant drift detected, correct it
                    updateSyncIndicator('correcting');
                    console.log(`Progress drift detected: ${progressDifference}ms, correcting...`);
                    
                    // Update our reference data
                    currentSpotifyData.timestamps = freshSpotifyData.timestamps;
                    
                    // Smoothly correct the progress bar
                    const progressBar = document.getElementById('progress-bar');
                    progressBar.classList.add('correcting');
                    
                    const total = currentSpotifyData.timestamps.end - currentSpotifyData.timestamps.start;
                    const correctedPercentage = Math.min((actualProgress / total) * 100, 100);
                    
                    progressBar.style.width = correctedPercentage + '%';
                    document.getElementById('current-time').textContent = formatTime(actualProgress);
                    
                    // Remove correcting class after animation
                    setTimeout(() => {
                        progressBar.classList.remove('correcting');
                        updateSyncIndicator('synced');
                    }, 500);
                    
                } else {
                    // Progress is accurate
                    updateSyncIndicator('synced');
                }
                
                lastValidatedProgress = actualProgress;
                
            } catch (error) {
                console.error('Error validating Spotify progress:', error);
                updateSyncIndicator('error');
            }
        }

        // Update Spotify progress
        function updateSpotifyProgress(spotify) {
            if (!spotify) return;
            
            const now = Date.now();
            const progress = now - spotify.timestamps.start;
            const total = spotify.timestamps.end - spotify.timestamps.start;
            const percentage = Math.min((progress / total) * 100, 100);
            
            document.getElementById('progress-bar').style.width = percentage + '%';
            document.getElementById('current-time').textContent = formatTime(progress);
            document.getElementById('total-time').textContent = formatTime(total);
            
            // Check if song has ended
            if (progress >= total) {
                checkForNewSpotifySong();
            }
        }

        // Check if Spotify song has changed
        async function checkForNewSpotifySong() {
            try {
                const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error('Failed to fetch data');
                }

                const user = data.data;
                
                // Check if Spotify status has changed
                if (user.spotify) {
                    const newSongId = `${user.spotify.song}-${user.spotify.artist}-${user.spotify.album}`;
                    
                    // If song has changed or no song was playing before
                    if (newSongId !== lastSongId) {
                        updateSpotifyDisplay(user.spotify);
                    }
                } else if (currentSpotifyData && !user.spotify) {
                    // User stopped listening to Spotify
                    hideSpotifySection();
                }
                
            } catch (error) {
                console.error('Error checking for new Spotify song:', error);
                updateSyncIndicator('error');
            }
        }

        // Update Spotify display with animation
        function updateSpotifyDisplay(spotify) {
            const spotifySection = document.getElementById('spotify');
            const spotifyContent = spotifySection.querySelector('.spotify-content');
            
            // If this is the first song (no previous song)
            if (!currentSpotifyData) {
                displaySpotify(spotify);
                return;
            }
            
            // Animate transition
            spotifyContent.classList.add('fade-out');
            
            setTimeout(() => {
                // Update content
                document.getElementById('song-title').textContent = spotify.song;
                document.getElementById('song-artist').textContent = `by ${spotify.artist}`;
                
                // Set album cover
                const albumCover = document.getElementById('album-cover');
                albumCover.src = spotify.album_art_url;
                albumCover.alt = `${spotify.album} - Album Cover`;
                
                // Set tooltip text
                document.getElementById('album-tooltip').textContent = spotify.album;
                
                // Update current song data
                currentSpotifyData = spotify;
                lastSongId = `${spotify.song}-${spotify.artist}-${spotify.album}`;
                
                // Reset progress bar
                document.getElementById('progress-bar').style.width = '0%';
                document.getElementById('current-time').textContent = '0:00';
                document.getElementById('total-time').textContent = formatTime(spotify.timestamps.end - spotify.timestamps.start);
                
                // Fade back in
                spotifyContent.classList.remove('fade-out');
                spotifyContent.classList.add('song-change-animation');
                
                // Clear and restart intervals
                if (spotifyUpdateInterval) {
                    clearInterval(spotifyUpdateInterval);
                }
                if (progressValidationInterval) {
                    clearInterval(progressValidationInterval);
                }
                
                spotifyUpdateInterval = setInterval(() => {
                    updateSpotifyProgress(spotify);
                }, 1000);
                
                // Start progress validation (every 10 seconds)
                progressValidationInterval = setInterval(validateSpotifyProgress, 10000);
                
                // Show section if hidden
                spotifySection.style.display = 'block';
                updateSyncIndicator('synced');
                
                // Remove animation class after animation completes
                setTimeout(() => {
                    spotifyContent.classList.remove('song-change-animation');
                }, 500);
                
            }, 300); // Wait for fade-out to complete
        }

        // Hide Spotify section
        function hideSpotifySection() {
            const spotifySection = document.getElementById('spotify');
            const spotifyContent = spotifySection.querySelector('.spotify-content');
            
            spotifyContent.classList.add('fade-out');
            
            setTimeout(() => {
                spotifySection.style.display = 'none';
                currentSpotifyData = null;
                lastSongId = null;
                
                if (spotifyUpdateInterval) {
                    clearInterval(spotifyUpdateInterval);
                    spotifyUpdateInterval = null;
                }
                if (progressValidationInterval) {
                    clearInterval(progressValidationInterval);
                    progressValidationInterval = null;
                }
            }, 300);
        }

        // Fetch Discord data from Lanyard API
        async function fetchDiscordData() {
            try {
                const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error('Failed to fetch data');
                }

                const user = data.data;
                displayProfile(user);
                displayLastfmActivity(user);
                
            } catch (error) {
                console.error('Error fetching Discord data:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
            }
        }

        // Display profile data
        function displayProfile(user) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('profile').style.display = 'block';

            // Basic profile info
            document.getElementById('avatar').src = `https://cdn.discordapp.com/avatars/${user.discord_user.id}/${user.discord_user.avatar}.png?size=1024`;
            document.getElementById('username').textContent = user.discord_user.global_name || user.discord_user.username;
            document.getElementById('discriminator').textContent = `@${user.discord_user.username}`;

            // Status
            const statusElement = document.getElementById('status');
            statusElement.className = `status-indicator status-${user.discord_status}`;

            // Platform indicators
            displayPlatformIndicators(user);

            // Activities
            displayActivities(user.activities);

            // Spotify
            if (user.spotify) {
                const newSongId = `${user.spotify.song}-${user.spotify.artist}-${user.spotify.album}`;
                
                // Only update if song has changed or no song was playing before
                if (newSongId !== lastSongId) {
                    updateSpotifyDisplay(user.spotify);
                }
            } else if (currentSpotifyData && !user.spotify) {
                // User stopped listening to Spotify
                hideSpotifySection();
            }
        }

        // Display platform indicators
function displayPlatformIndicators(user) {
    const platformContainer = document.getElementById('platform-indicators');
    platformContainer.innerHTML = '';

    const platforms = [];

    if (user.active_on_discord_desktop) {
        platforms.push({
            type: 'desktop',
            icon: 'fas fa-desktop',
            label: 'Online on Desktop'
        });
    }

    if (user.active_on_discord_mobile) {
        platforms.push({
            type: 'mobile',
            icon: 'fas fa-mobile-alt',
            label: 'Online on Mobile'
        });
    }

    if (user.active_on_discord_web) {
        platforms.push({
            type: 'web',
            icon: 'fas fa-globe',
            label: 'Online on Web'
        });
    }

    platforms.forEach((platform, index) => {
        const platformIcon = document.createElement('div');
        platformIcon.className = `platform-icon ${platform.type}`;
        platformIcon.style.animationDelay = `${0.4 + (index * 0.1)}s`;
        
        platformIcon.innerHTML = `
            <i class="${platform.icon}"></i>
            <div class="platform-tooltip">${platform.label}</div>
        `;

        platformContainer.appendChild(platformIcon);
    });

    // Show container only if there are platforms
    if (platforms.length > 0) {
        platformContainer.style.display = 'flex';
    } else {
        platformContainer.style.display = 'none';
    }
}

        // Display activities
        function displayActivities(activities) {
            const activitiesContainer = document.getElementById('activities');
            activitiesContainer.innerHTML = '';

            const nonSpotifyActivities = activities.filter(activity => activity.type !== 2);

            nonSpotifyActivities.forEach(activity => {
                const activityCard = document.createElement('div');
                activityCard.className = 'activity-card';

                let activityIcon = '';
                let activityType = '';

                switch (activity.type) {
                    case 0: // Playing
                        activityIcon = '<i class="fas fa-gamepad"></i>';
                        activityType = 'Playing';
                        break;
                    case 1: // Streaming
                        activityIcon = '<i class="fas fa-video"></i>';
                        activityType = 'Streaming';
                        break;
                    case 3: // Watching
                        activityIcon = '<i class="fas fa-eye"></i>';
                        activityType = 'Watching';
                        break;
                    case 5: // Competing
                        activityIcon = '<i class="fas fa-trophy"></i>';
                        activityType = 'Competing in';
                        break;
                    default:
                        activityIcon = '<i class="fas fa-circle"></i>';
                        activityType = 'Activity';
                }

                activityCard.innerHTML = `
                    <div class="activity-title">
                        ${activityIcon}
                        ${activityType} ${activity.name}
                    </div>
                    <div class="activity-details">
                        ${activity.details || ''}
                        ${activity.state ? `<br>${activity.state}` : ''}
                    </div>
                `;

                activitiesContainer.appendChild(activityCard);
            });
        }

        // Display Spotify
        function displaySpotify(spotify) {
    const spotifySection = document.getElementById('spotify');
    spotifySection.style.display = 'block';

    document.getElementById('song-title').textContent = spotify.song;
    document.getElementById('song-artist').textContent = `by ${spotify.artist}`;
    
    // Set album cover
    const albumCover = document.getElementById('album-cover');
    albumCover.src = spotify.album_art_url;
    albumCover.alt = `${spotify.album} - Album Cover`;
    
    // Set tooltip text
    document.getElementById('album-tooltip').textContent = spotify.album;
    
    // Update current song data
    currentSpotifyData = spotify;
    lastSongId = `${spotify.song}-${spotify.artist}-${spotify.album}`;

    // Clear existing intervals
    if (spotifyUpdateInterval) {
        clearInterval(spotifyUpdateInterval);
    }
    if (progressValidationInterval) {
        clearInterval(progressValidationInterval);
    }

    // Update progress immediately and then every second
    updateSpotifyProgress(spotify);
    spotifyUpdateInterval = setInterval(() => {
        updateSpotifyProgress(spotify);
    }, 1000);
    
    // Start progress validation (every 10 seconds)
    progressValidationInterval = setInterval(validateSpotifyProgress, 10000);
    
    updateSyncIndicator('synced');
}

        // Modal functionality
function initializeModal() {
    const albumCover = document.getElementById('album-cover');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalImage = document.getElementById('modal-image');
    const modalClose = document.getElementById('modal-close');
    const modalSongTitle = document.getElementById('modal-song-title');
    const modalSongDetails = document.getElementById('modal-song-details');

    // Open modal when album cover is clicked
    albumCover.addEventListener('click', () => {
        modalImage.src = albumCover.src;
        modalSongTitle.textContent = document.getElementById('song-title').textContent;
        modalSongDetails.textContent = `${document.getElementById('song-artist').textContent} • ${document.getElementById('album-tooltip').textContent}`;
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });
}

// Avatar modal functionality
function initializeAvatarModal() {
    const avatar = document.getElementById('avatar');
    const avatarModalOverlay = document.getElementById('avatar-modal-overlay');
    const avatarModalImage = document.getElementById('avatar-modal-image');
    const avatarModalClose = document.getElementById('avatar-modal-close');
    const avatarModalUsername = document.getElementById('avatar-modal-username');
    const avatarModalId = document.getElementById('avatar-modal-id');
    const downloadAvatarBtn = document.getElementById('download-avatar');
    const copyAvatarUrlBtn = document.getElementById('copy-avatar-url');

    let currentAvatarUrl = '';
    let currentUsername = '';
    let currentUserId = '';

    // Open avatar modal when avatar is clicked
    avatar.addEventListener('click', () => {
        currentAvatarUrl = avatar.src.replace('?size=256', '?size=1024'); // Get higher resolution
        currentUsername = document.getElementById('username').textContent;
        currentUserId = DISCORD_USER_ID;

        avatarModalImage.src = currentAvatarUrl;
        avatarModalUsername.textContent = currentUsername;
        avatarModalId.textContent = `ID: ${currentUserId}`;
        avatarModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close avatar modal
    function closeAvatarModal() {
        avatarModalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    avatarModalClose.addEventListener('click', closeAvatarModal);
    avatarModalOverlay.addEventListener('click', (e) => {
        if (e.target === avatarModalOverlay) {
            closeAvatarModal();
        }
    });

    // Download avatar
    downloadAvatarBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(currentAvatarUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentUsername.replace(/[^a-zA-Z0-9]/g, '_')}_avatar.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Show success feedback
            downloadAvatarBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
            setTimeout(() => {
                downloadAvatarBtn.innerHTML = '<i class="fas fa-download"></i> Download Avatar';
            }, 2000);
        } catch (error) {
            console.error('Download failed:', error);
            downloadAvatarBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            setTimeout(() => {
                downloadAvatarBtn.innerHTML = '<i class="fas fa-download"></i> Download Avatar';
            }, 2000);
        }
    });

    // Copy avatar URL
    copyAvatarUrlBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(currentAvatarUrl);
            copyAvatarUrlBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyAvatarUrlBtn.innerHTML = '<i class="fas fa-copy"></i> Copy URL';
            }, 2000);
        } catch (error) {
            console.error('Copy failed:', error);
            copyAvatarUrlBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            setTimeout(() => {
                copyAvatarUrlBtn.innerHTML = '<i class="fas fa-copy"></i> Copy URL';
            }, 2000);
        }
    });

    // Close avatar modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && avatarModalOverlay.classList.contains('active')) {
            closeAvatarModal();
        }
    });
}

        // Display Last.fm-like activity from Discord data only if no Spotify activity
function displayLastfmActivity(user) {
    const lastfmSection = document.getElementById('lastfm');

    // If Spotify is active, hide Last.fm section and return
    if (user.spotify) {
        lastfmSection.style.display = 'none';
        return;
    }

    // Find the "Listening to" activity (type 2 is usually music, e.g., Spotify)
    const musicActivity = user.activities.find(act => act.type === 2);

    if (!musicActivity) {
        // Hide section if not listening
        lastfmSection.style.display = 'none';
        return;
    }

    // Extract details 
    const songName = musicActivity.details || 'Unknown Song';
    const artist = musicActivity.state || 'Unknown Artist';
    const album = musicActivity.assets?.large_text || '';
    const coverUrl = musicActivity.assets?.large_image
        ? (musicActivity.assets.large_image.startsWith('mp:external/')
            ? `https://i.scdn.co/image/${musicActivity.assets.large_image.replace('mp:external/', '').replace(/[^a-zA-Z0-9]/g, '')}`
            : musicActivity.assets.large_image)
        : '';

    // Update UI
    document.getElementById('lastfm-song-title').textContent = songName;
    document.getElementById('lastfm-song-artist').textContent = `by ${artist}`;
    document.getElementById('lastfm-album-cover').src = coverUrl;
    document.getElementById('lastfm-album-tooltip').textContent = album;

    lastfmSection.style.display = 'block';
}

// Initialize
        document.addEventListener('DOMContentLoaded', () => {
            createParticles();
            fetchDiscordData();
            initializeModal();
            initializeAvatarModal();
            
            // Refresh data every 5 seconds
            setInterval(fetchDiscordData, 5000);
            
            // Check for song changes more frequently
            spotifyCheckInterval = setInterval(checkForNewSpotifySong, 5000);
        });

        // Add smooth scroll behavior
        document.documentElement.style.scrollBehavior = 'smooth';

        // DATA LOAD
        document.addEventListener("DOMContentLoaded", function() {
    fetch('/links.json')
        .then(response => response.json())
        .then(links => {
            const grid = document.getElementById('links-grid');
            grid.innerHTML = '';
            links.forEach(link => {
                const a = document.createElement('a');
                a.href = link.url;
                a.className = 'link-item';
                if (!link.url.startsWith('mailto:')) a.target = '_blank';

                const icon = document.createElement('i');
                icon.className = link.icon + ' link-icon';

                const span = document.createElement('span');
                span.className = 'link-label';
                span.textContent = link.label;

                a.appendChild(icon);
                a.appendChild(span);
                grid.appendChild(a);
            });
        })
        .catch(err => {
            console.error('Failed to load links:', err);
        });
});

document.addEventListener('DOMContentLoaded', () => {
    const dcBtn = document.getElementById('dc-btn');
    if (dcBtn) {
        dcBtn.addEventListener('click', () => {
            const url = dcBtn.getAttribute('data-url') || dcBtn.href || 'https://discord.fish/stuffmaker/';
            window.open(url, '_blank');
        });
    }
});

window.addEventListener('DOMContentLoaded', function() {
    // Preloader logic
    const images = Array.from(document.images);
    let loaded = 0;
    if (images.length === 0) {
        document.getElementById('site-preloader').style.display = 'none';
    }
    images.forEach(img => {
        if (img.complete) {
            loaded++;
            if (loaded === images.length) {
                document.getElementById('site-preloader').style.display = 'none';
            }
        } else {
            img.addEventListener('load', () => {
                loaded++;
                if (loaded === images.length) {
                    document.getElementById('site-preloader').style.display = 'none';
                }
            });
            img.addEventListener('error', () => {
                loaded++;
                if (loaded === images.length) {
                    document.getElementById('site-preloader').style.display = 'none';
                }
            });
   }
  });
// OTHER LOGIC DONT TOUCH 

    // Discord avatar logic
    // Replace these with your actual Discord user ID and avatar hash
//    const discordUserId = 'YOUR_USER_ID';
//    const discordAvatarHash = 'YOUR_AVATAR_HASH';
//    const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUserId}/${discordAvatarHash}.png?size=1024`;
//    document.getElementById('avatar').src = avatarUrl;
 });