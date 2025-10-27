const API_BASE_URL = "http://localhost:8000/api"; 
const POST_SCORE_URL = `${API_BASE_URL}/games/create/`;
const GET_LEADERBOARD_URL = `${API_BASE_URL}/games/`;

// --- User Identification ---
// We generate a local anonymous ID (UUID) for the current user and persist it.
let userId = localStorage.getItem('localUserId') || crypto.randomUUID();
localStorage.setItem('localUserId', userId);

// Global variables for game state (unchanged)
const gameArea = document.getElementById('game-area');
const targetSquare = document.getElementById('target-square');
const startButton = document.getElementById('start-button');
const leaderboardButton = document.getElementById('leaderboard-button');
const scoreDisplay = document.getElementById('score-display');
const bestTimeDisplay = document.getElementById('best-time-display');
const lastTimeDisplay = document.getElementById('last-time-display');
const gameMessage = document.getElementById('game-message');
const leaderboardContent = document.getElementById('leaderboard-content');

// Custom alert elements
const customAlert = document.getElementById('custom-alert');
const alertMessage = document.getElementById('alert-message');
const alertOkButton = document.getElementById('alert-ok-button');

// Leaderboard Modal elements
const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardCloseButton = document.getElementById('leaderboard-close');

// Game Limits & Stats
const MAX_ROUNDS = 10;
const maxRoundsDisplay = document.getElementById('max-rounds-display');
const averageTimeDisplay = document.getElementById('average-time-display');

let score = 0;
let lastTime = 0;
let bestTime = Infinity;
let isGameRunning = false;
let startTime = 0;
let timeoutHandle = null;
let reactionTimes = [];

// --- Database Functions (The Django API Implementations) ---

/**
 * Saves the player's score using the fetch POST method to the Django server.
 * @param {number} finalAverageTime - The final calculated average reaction time.
 */
async function saveScoreToDatabase(finalAverageTime) {
    // NOTE: Sending the local anonymous UUID as the 'player' field.
    const data = {
        player: userId, // Sending UUID for anonymous player tracking
        time_ms: Math.round(finalAverageTime), 
        rounds_to_play: MAX_ROUNDS, 
        score: finalAverageTime 
    };

    try {
        const response = await fetch(POST_SCORE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Include Django CSRF token if this HTML is served by Django:
                // 'X-CSRFToken': getCookie('csrftoken') 
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log("Score successfully posted to Django server.");
        } else {
            const errorData = await response.json().catch(() => ({ message: "Unknown server error" }));
            console.error("Error posting score:", response.status, errorData);
            throw new Error(`Server error: ${response.status} - ${errorData.message || 'Check server logs.'}`);
        }
    } catch (e) {
        console.error("Fetch error (POST request failed): ", e);
    }
}

/**
 * Loads the top scores using the fetch GET method from the Django server.
 */
async function loadLeaderboard() {
    leaderboardContent.innerHTML = '<p class="text-gray-400">Loading...</p>';
    leaderboardModal.style.display = 'flex';

    try {
        const response = await fetch(GET_LEADERBOARD_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Assuming Django returns an array of Game objects ordered by score ascending
        const scores = await response.json();
        renderLeaderboard(scores);

    } catch (e) {
        console.error("Fetch error (GET request failed): ", e);
        leaderboardContent.innerHTML = `<p class="text-red-400">Error loading leaderboard. Ensure the API is running at: ${API_BASE_URL}</p>`;
    }
}

/**
 * Renders the fetched scores into the modal, expecting 'score' and a user ID field.
 * @param {Array<Object>} scores - Array of score objects from the Django API.
 */
function renderLeaderboard(scores) {
    if (scores.length === 0) {
        leaderboardContent.innerHTML = '<p class="text-lg text-gray-400 mt-4">No scores posted yet. Be the first!</p>';
        return;
    }

    let html = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="text-yellow-400 border-b border-gray-600">
                    <th class="py-2 px-4">#</th>
                    <th class="py-2 px-4">Player ID</th>
                    <th class="py-2 px-4 text-right">Score (ms)</th>
                </tr>
            </thead>
            <tbody>
    `;

    scores.forEach((scoreRecord, index) => {
        // Player is returned as an Integer PK from Django, so we display the PK.
        // We cannot check if they are the current user because our local 'userId' is a UUID string.
        const recordId = scoreRecord.player || 'Anonymous';
        const isCurrentUser = false; // Cannot reliably check since local ID is a UUID string

        // Display the score from the 'score' field
        const displayScore = formatTime(scoreRecord.score);

        const rowClass = isCurrentUser ? 'bg-blue-600/30 font-bold' : 'hover:bg-gray-700/50';
        
        // Display the Django PK
        const displayId = `User ${recordId}`;

        html += `
            <tr class="${rowClass} border-b border-gray-700">
                <td class="py-2 px-4">${index + 1}</td>
                <td class="py-2 px-4 text-sm" title="${recordId}">${displayId}</td>
                <td class="py-2 px-4 text-right">${displayScore}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    leaderboardContent.innerHTML = html;
}

// --- Utility Functions (unchanged) ---

function showAlert(message) {
    alertMessage.textContent = message;
    customAlert.style.display = 'block';
}

function hideAlert() {
    customAlert.style.display = 'none';
}

function formatTime(time) {
    return time === Infinity ? '--' : `${time.toFixed(0)}`;
}

// Local Storage for Best Time (Private Stat)
function saveStats() {
    try {
        localStorage.setItem('bestTime', bestTime === Infinity ? '0' : bestTime.toString());
    } catch (e) {
        console.error("Could not use localStorage for saving best time.", e);
    }
}

function loadStats() {
    try {
        const storedTime = localStorage.getItem('bestTime');
        if (storedTime && !isNaN(parseFloat(storedTime)) && parseFloat(storedTime) > 0) {
            bestTime = parseFloat(storedTime);
        } else {
            bestTime = Infinity;
        }
    } catch (e) {
        console.error("Could not use localStorage for loading best time.", e);
        bestTime = Infinity;
    }
    updateStatsDisplay();
}

function updateStatsDisplay() {
    scoreDisplay.textContent = score;
    lastTimeDisplay.textContent = formatTime(lastTime);
    bestTimeDisplay.textContent = formatTime(bestTime);

    if (reactionTimes.length > 0) {
        const sum = reactionTimes.reduce((a, b) => a + b, 0);
        averageTimeDisplay.textContent = formatTime(sum / reactionTimes.length);
    } else {
        averageTimeDisplay.textContent = '--';
    }
}

function getRandomColor() {
    const colors = ['#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// --- Game Logic (updated for POST call) ---

function showTarget() {
    if (!isGameRunning) return;
    clearTimeout(timeoutHandle);
    const areaWidth = gameArea.clientWidth;
    const areaHeight = gameArea.clientHeight;
    const size = Math.floor(Math.random() * 50) + 30;
    const maxX = areaWidth - size;
    const maxY = areaHeight - size;
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    const delay = Math.floor(Math.random() * 2000) + 500;

    targetSquare.style.opacity = 0;
    gameArea.style.cursor = 'wait';

    timeoutHandle = setTimeout(() => {
        targetSquare.style.width = `${size}px`;
        targetSquare.style.height = `${size}px`;
        targetSquare.style.left = `${x}px`;
        targetSquare.style.top = `${y}px`;
        targetSquare.style.backgroundColor = getRandomColor();
        targetSquare.style.opacity = 1;
        gameArea.style.cursor = 'pointer';
        startTime = performance.now();
    }, delay);
}

function targetClicked(event) {
    if (targetSquare.style.opacity === '1') {
        const endTime = performance.now();
        const reactionTime = endTime - startTime;
        lastTime = reactionTime;
        score++;
        reactionTimes.push(reactionTime);

        if (reactionTime < bestTime) {
            bestTime = reactionTime;
            saveStats();
        }

        updateStatsDisplay();

        if (score >= MAX_ROUNDS) {
            endGame("Test complete! Calculating results...");
        } else {
            showTarget();
        }
    } else {
        endGame("You clicked too early! Game Over.");
    }
    event.stopPropagation();
}

function gameAreaClicked() {
    if (isGameRunning && targetSquare.style.opacity === '0') {
        endGame("You clicked too early! Game Over.");
    }
}

function startGame() {
    score = 0;
    lastTime = 0;
    reactionTimes = [];
    maxRoundsDisplay.textContent = MAX_ROUNDS;
    isGameRunning = true;
    startButton.textContent = 'Reset Game';
    startButton.classList.remove('bg-gray-500');
    gameMessage.style.display = 'none';

    updateStatsDisplay();
    showTarget();
}

function endGame(reason) {
    isGameRunning = false;
    clearTimeout(timeoutHandle);
    targetSquare.style.opacity = 0;
    startButton.textContent = 'Start Game';
    gameArea.style.cursor = 'default';

    let finalMessage = reason;
    let alertMsg = reason;

    if (score === MAX_ROUNDS) {
        const sum = reactionTimes.reduce((a, b) => a + b, 0);
        const avg = sum / MAX_ROUNDS;
        const best = Math.min(...reactionTimes);
        updateStatsDisplay();

        finalMessage = `Test Complete! Your Average Time was: <span class="text-yellow-400 font-bold">${formatTime(avg)} ms</span>. Your Best Time was: <span class="text-green-400 font-bold">${formatTime(best)} ms</span>.`;
        alertMsg = `Test Complete! Your Average Reaction Time over ${MAX_ROUNDS} rounds was ${formatTime(avg)} ms.`;
        
        // POST request trigger!
        saveScoreToDatabase(avg);
        alertMsg += "\nYour score will be submitted to the global leaderboard (via Django)!";

    } else {
        finalMessage = `${reason}<br>Round Count: <span class="text-yellow-400 font-bold">${score} of ${MAX_ROUNDS}</span>`;
        alertMsg = `Game Over! ${reason} Final Round: ${score}`;
    }

    gameMessage.innerHTML = finalMessage;
    gameMessage.style.display = 'flex';
    showAlert(alertMsg);
}

// --- Event Listeners and Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadStats();

    // Setup custom alert OK button
    alertOkButton.addEventListener('click', hideAlert);
    leaderboardCloseButton.addEventListener('click', () => leaderboardModal.style.display = 'none');

    // Start/Reset Button
    startButton.addEventListener('click', () => {
        if (isGameRunning) {
            endGame("Game manually reset.");
        } else {
            startGame();
        }
    });

    // Game Interactions
    targetSquare.addEventListener('click', targetClicked);
    gameArea.addEventListener('click', gameAreaClicked);
    
    // Leaderboard Button
    leaderboardButton.addEventListener('click', loadLeaderboard);
});