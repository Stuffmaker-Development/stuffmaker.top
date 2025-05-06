// Replace this with your Discord user ID
const DISCORD_ID = "213586333677912064"

// Status colors mapping
const statusColors = {
  online: "#3ba55c",
  idle: "#faa61a",
  dnd: "#ed4245",
  offline: "#747f8d",
}

// Global variable to store Spotify data for progress updates
let spotifyData = null
let gameData = null
let progressInterval = null

// Function to fetch Discord data from API | need to be in https://discord.fish/undefined
async function fetchDiscordData() {
  try {
    const response = await fetch(`https://api.stuffmaker.top/v1/users/${DISCORD_ID}`)
    const data = await response.json()

    if (data.success) {
      updateDiscordProfile(data.data)
    } else {
      showError("Failed to load Discord data")
    }
  } catch (error) {
    console.error("Error fetching Discord data:", error)
    showError("Error connecting to Lanyard API")
  }
}

// Function to update the Discord profile UI
function updateDiscordProfile(data) {
  // Update profile image
  const profileImage = document.getElementById("profile-image")
  profileImage.src = data.discord_user.avatar
    ? `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${data.discord_user.avatar}.png?size=512`
    : "https://cdn.discordapp.com/embed/avatars/0.png"

  // Update username
  const username = document.getElementById("username")
  username.textContent = data.discord_user.username

  // Update status indicator and status text
  const statusIndicator = document.getElementById("status-indicator")
  const statusText = document.getElementById("status")

  // Clear previous status text content
  statusText.innerHTML = ""
  statusText.textContent = capitalizeFirstLetter(data.discord_status)

  statusIndicator.style.backgroundColor = statusColors[data.discord_status] || statusColors.offline

  // Check if user is on mobile and update the status text
  if (data.active_on_discord_mobile) {
    const mobileIcon = document.createElement("span")
    mobileIcon.className = "mobile-indicator"
    mobileIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-smartphone">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
        `
    statusText.appendChild(document.createTextNode(" "))
    statusText.appendChild(mobileIcon)
  } else if (data.active_on_discord_desktop) {
    // Optional: add desktop icon if you want to explicitly show desktop status
    const desktopIcon = document.createElement("span")
    desktopIcon.className = "desktop-indicator"
    desktopIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-monitor">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
        `
    statusText.appendChild(document.createTextNode(" "))
    statusText.appendChild(desktopIcon)
  }

  // Update custom status if available
  if (data.discord_status !== "offline" && data.activities && data.activities.length > 0) {
    const customStatus = data.activities.find((activity) => activity.type === 4)
    if (customStatus && customStatus.state) {
      statusText.appendChild(document.createTextNode(` • ${customStatus.state}`))
    }
  }

  // Update activity
  updateActivity(data.activities)
}

// Function to update activity section
function updateActivity(activities) {
  const activityContainer = document.getElementById("activity-container")
  const activityElement = document.getElementById("activity")

  // Clear any existing progress interval
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }

  // Reset data
  spotifyData = null
  gameData = null

  // Filter out custom status (type 4) as we already displayed it
  const relevantActivities = activities ? activities.filter((activity) => activity.type !== 4) : []

  if (relevantActivities.length === 0) {
    activityElement.innerHTML = "<p>Not playing or doing anything</p>"
    return
  }

  // Get the most relevant activity (usually the first one)
  const activity = relevantActivities[0]

  let activityContent = ""
  let activityImage = ""

  // Try to get the activity image
  if (activity.assets) {
    if (activity.assets.large_image) {
      // Handle different image URL formats
      if (activity.type === 2 && activity.assets.large_image.startsWith("spotify:")) {
        // Spotify image
        activityImage = activity.assets.large_image.replace("spotify:", "https://i.scdn.co/image/")
      } else if (activity.assets.large_image.startsWith("mp:")) {
        // Discord media proxy
        activityImage = `https://media.discordapp.net/${activity.assets.large_image.replace("mp:", "")}`
      } else if (activity.assets.large_image.startsWith("external:")) {
        // External image
        activityImage = `https://media.discordapp.net/external/${activity.assets.large_image.replace("external:", "")}`
      } else {
        // Standard Discord application asset
        activityImage = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`
      }
    } else if (activity.assets.small_image) {
      // Use small image if large is not available
      activityImage = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.small_image}.png`
    }
  }

  // If no image is available, use a fallback based on activity type
  if (!activityImage) {
    if (activity.type === 0) {
      // Game fallback
      activityImage =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWdhbWVwYWQiPjxsaW5lIHgxPSI2IiB5MT0iMTIiIHgyPSIxMCIgeTI9IjEyIj48L2xpbmU+PGxpbmUgeDE9IjgiIHkxPSIxMCIgeDI9IjgiIHkyPSIxNCI+PC9saW5lPjxsaW5lIHgxPSIxNSIgeTE9IjEzIiB4Mj0iMTUuMDEiIHkyPSIxMyI+PC9saW5lPjxsaW5lIHgxPSIxOCIgeTE9IjExIiB4Mj0iMTguMDEiIHkyPSIxMSI+PC9saW5lPjxwYXRoIGQ9Ik0xNyA1SDdWOUg3QTQgNCAwIDAgMCAzIDEzVjE5SDguOUE0LjEgNC4xIDAgMCAwIDEzIDE1LjFIMTFWMTlIMTNBNCAxIDAgMCAwIDE3IDE1LjFWMTlIMjFWMTNBNCAxIDAgMCAwIDE3IDlIMTdWNVoiPjwvcGF0aD48L3N2Zz4="
    } else if (activity.type === 2) {
      // Spotify fallback
      activityImage =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxREI5NTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLW11c2ljIj48cGF0aCBkPSJNOSAxOFY1bDEyLTJWMTYiPjwvcGF0aD48Y2lyY2xlIGN4PSI2IiBjeT0iMTgiIHI9IjMiPjwvY2lyY2xlPjxjaXJjbGUgY3g9IjE4IiBjeT0iMTYiIHI9IjMiPjwvY2lyY2xlPjwvc3ZnPg=="
    } else if (activity.type === 1) {
      // Streaming fallback
      activityImage =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5MTQ2RkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLXZpZGVvIj48cG9seWdvbiBwb2ludHM9IjIzIDcgMTYgMTIgMjMgMTcgMjMgNyI+PC9wb2x5Z29uPjxyZWN0IHg9IjEiIHk9IjUiIHdpZHRoPSIxNSIgaGVpZ2h0PSIxNCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PC9zdmc+"
    } else if (activity.type === 3) {
      // Watching fallback
      activityImage =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLXR2Ij48cmVjdCB4PSIyIiB5PSI3IiB3aWR0aD0iMjAiIGhlaWdodD0iMTUiIHJ4PSIyIiByeT0iMiI+PC9yZWN0Pjxwb2x5bGluZSBwb2ludHM9IjE3IDIgMTIgNyA3IDIiPjwvcG9seWxpbmU+PC9zdmc+"
    } else {
      // Generic fallback
      activityImage =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWFjdGl2aXR5Ij48cG9seWxpbmUgcG9pbnRzPSIyMiAxMiAxOCAxMiAxNSAyMSA5IDMgNiAxMiAyIDEyIj48L3BvbHlsaW5lPjwvc3ZnPg=="
    }
  }

  // Create image element with error handling
  const imageElement = `<img src="${activityImage}" alt="${activity.name || "Activity"}" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWFjdGl2aXR5Ij48cG9seWxpbmUgcG9pbnRzPSIyMiAxMiAxOCAxMiAxNSAyMSA5IDMgNiAxMiAyIDEyIj48L3BvbHlsaW5lPjwvc3ZnPg==';">`

  // Different formatting based on activity type
  switch (activity.type) {
    case 0: // Playing a game
      // Store game data for elapsed time updates
      gameData = {
        gameName: activity.name,
        details: activity.details,
        state: activity.state,
        startTime: activity.timestamps?.start,
      }

      activityContent = `
                <div class="activity-details">
                    ${imageElement}
                    <div class="activity-info">
                        <div class="activity-name">Playing ${activity.name}</div>
                        ${activity.details ? `<div class="activity-state">${activity.details}</div>` : ""}
                        ${activity.state ? `<div class="activity-state">${activity.state}</div>` : ""}
                    </div>
                </div>
            `

      // Add elapsed time display if start timestamp is available
      if (gameData.startTime) {
        activityContent += `
                    <div class="game-time-container">
                        <div class="game-time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-clock"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span id="game-elapsed-time">Loading...</span>
                        </div>
                    </div>
                `
      }
      break

    case 2: // Listening to Spotify
      // Store Spotify data for progress updates
      spotifyData = {
        songName: activity.details,
        artist: activity.state,
        album: activity.assets?.large_text,
        startTime: activity.timestamps?.start,
        endTime: activity.timestamps?.end,
        duration: activity.timestamps ? activity.timestamps.end - activity.timestamps.start : 0,
      }

      // Format the Spotify activity content
      activityContent = `
                <div class="activity-details">
                    ${imageElement}
                    <div class="activity-info">
                        <div class="activity-name">Listening to Spotify</div>
                        ${activity.details ? `<div class="activity-state">${activity.details}</div>` : ""}
                        ${activity.state ? `<div class="activity-state">${activity.state}</div>` : ""}
                    </div>
                </div>
            `

      // Add progress bar if timestamps are available
      if (spotifyData.startTime && spotifyData.endTime) {
        activityContent += `
                    <div class="spotify-progress-container">
                        <div class="spotify-progress-bar">
                            <div class="spotify-progress-fill" id="spotify-progress-fill"></div>
                        </div>
                        <div class="spotify-timestamps">
                            <span id="spotify-current-time">0:00</span>
                            <span id="spotify-total-time">${formatTime((spotifyData.endTime - spotifyData.startTime) / 1000)}</span>
                        </div>
                    </div>
                `
      }
      break

    default:
      activityContent = `
                <div class="activity-details">
                    ${imageElement}
                    <div class="activity-info">
                        <div class="activity-name">${getActivityTypeText(activity.type)} ${activity.name}</div>
                        ${activity.details ? `<div class="activity-state">${activity.details}</div>` : ""}
                        ${activity.state ? `<div class="activity-state">${activity.state}</div>` : ""}
                    </div>
                </div>
            `
  }

  activityElement.innerHTML = activityContent

  // Update progress based on activity type
  if (spotifyData && spotifyData.startTime && spotifyData.endTime) {
    // Update Spotify progress
    updateSpotifyProgress()
    progressInterval = setInterval(updateSpotifyProgress, 1000)
  } else if (gameData && gameData.startTime) {
    // Update game elapsed time
    updateGameElapsedTime()
    progressInterval = setInterval(updateGameElapsedTime, 1000)
  }
}

// Function to update Spotify progress bar
function updateSpotifyProgress() {
  if (!spotifyData || !spotifyData.startTime || !spotifyData.endTime) return

  const now = Date.now()
  const start = spotifyData.startTime
  const end = spotifyData.endTime
  const duration = end - start

  // Calculate elapsed time in seconds
  const elapsed = Math.max(0, now - start)

  // Calculate progress percentage
  const progress = Math.min(100, (elapsed / duration) * 100)

  // Update progress bar
  const progressFill = document.getElementById("spotify-progress-fill")
  if (progressFill) {
    progressFill.style.width = `${progress}%`
  }

  // Update current time
  const currentTimeElement = document.getElementById("spotify-current-time")
  if (currentTimeElement) {
    currentTimeElement.textContent = formatTime(elapsed / 1000)
  }

  // If song has ended, refresh data
  if (now >= end) {
    clearInterval(progressInterval)
    setTimeout(fetchDiscordData, 2000) // Refresh after 2 seconds
  }
}

// Function to update game elapsed time
function updateGameElapsedTime() {
  if (!gameData || !gameData.startTime) return

  const now = Date.now()
  const start = gameData.startTime

  // Calculate elapsed time in seconds
  const elapsed = Math.max(0, (now - start) / 1000)

  // Update elapsed time display
  const elapsedTimeElement = document.getElementById("game-elapsed-time")
  if (elapsedTimeElement) {
    elapsedTimeElement.textContent = formatElapsedTime(elapsed)
  }
}

// Helper function to format time in MM:SS
function formatTime(seconds) {
  seconds = Math.floor(seconds)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

// Helper function to format elapsed time in HH:MM:SS
function formatElapsedTime(seconds) {
  seconds = Math.floor(seconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }
}

// Helper function to get activity type text
function getActivityTypeText(type) {
  switch (type) {
    case 1:
      return "Streaming"
    case 3:
      return "Watching"
    default:
      return ""
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// Function to show error message
function showError(message) {
  const username = document.getElementById("username")
  const status = document.getElementById("status")
  const activity = document.getElementById("activity")

  username.textContent = "Error"
  status.textContent = message
  activity.innerHTML = "<p>Could not load Discord data</p>"
}

// Initial fetch
fetchDiscordData()

// Refresh data every 5 seconds
setInterval(fetchDiscordData, 5000)
