// --- Configuration ---

// TinyURL API endpoint for URL shortening
const API_ENDPOINT = 'https://tinyurl.com/api-create.php?url=';

// Google Sheets Logging Endpoint (update with your Google Apps Script Web App URL)
const LOGGING_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxrgK6MILrryEmfPmoAoHXlDjjzudb_TSdKrORh0ZnAtmXUQcxpkISoH4zncTGYgJ6o/exec';

// Deployment ID - 

// Rate Limiting Settings: 5 requests per 30 seconds
const MAX_REQUESTS = 5;
const TIME_WINDOW = 30000; // in milliseconds
let requestTimestamps = [];

// --- DOM Element References ---
const urlInput = document.getElementById('urlInput');
const shortenBtn = document.getElementById('shortenBtn');
const shortUrlInput = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');
const toast = document.getElementById('toast');

// --- Utility Functions ---

/**
 * Display a toast notification with a given message.
 * @param {string} message - The message to show.
 */
function showToast(message) {
  toast.textContent = message;
  toast.className = 'show';
  setTimeout(() => {
    toast.className = toast.className.replace('show', '');
  }, 3000);
}

/**
 * Checks if a new request can be made (rate limiting).
 * @returns {boolean} - True if allowed; otherwise, false.
 */
function canMakeRequest() {
  const now = Date.now();
  // Remove timestamps older than TIME_WINDOW
  requestTimestamps = requestTimestamps.filter(
    timestamp => now - timestamp < TIME_WINDOW
  );
  if (requestTimestamps.length >= MAX_REQUESTS) {
    return false;
  }
  requestTimestamps.push(now);
  return true;
}

/**
 * Shorten a URL using the TinyURL API.
 * @param {string} url - The URL to shorten.
 * @returns {Promise<string>} - A promise that resolves to the short URL.
 */
async function shortenURL(url) {
  try {
    const response = await fetch(API_ENDPOINT + encodeURIComponent(url));
    if (!response.ok) {
      throw new Error('API request failed.');
    }
    const shortUrl = await response.text();
    return shortUrl;
  } catch (error) {
    console.error('Error shortening URL:', error);
    throw error;
  }
}

/**
 * Log the request data to Google Sheets via your Apps Script endpoint.
 * @param {string} originalUrl - The original URL input.
 * @param {string} shortUrl - The shortened URL response.
 */
async function logToGoogleSheets(originalUrl, shortUrl) {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0]; // Format: HH:MM:SS
  const payload = {
    urlInput: originalUrl,
    apiResponse: shortUrl,
    date: date,
    time: time
  };

  try {
    const response = await fetch(LOGGING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error('Logging failed.');
    }
  } catch (error) {
    console.error('Error logging data:', error);
  }
}

// --- Event Listeners ---

// Handle the URL shortening process
shortenBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    showToast('Please enter a valid URL.');
    return;
  }
  // Basic URL validation
  try {
    new URL(url);
  } catch (_) {
    showToast('Invalid URL format.');
    return;
  }
  
  if (!canMakeRequest()) {
    showToast('Rate limit reached. Please wait 30 seconds before retrying.');
    // Optionally disable inputs temporarily
    shortenBtn.disabled = true;
    urlInput.disabled = true;
    setTimeout(() => {
      shortenBtn.disabled = false;
      urlInput.disabled = false;
    }, TIME_WINDOW);
    return;
  }
  
  // Update button to show processing state
  shortenBtn.textContent = 'Processing...';
  try {
    const shortUrl = await shortenURL(url);
    shortUrlInput.value = shortUrl;
    showToast('URL shortened successfully!');
    // Log the transaction to Google Sheets
    logToGoogleSheets(url, shortUrl);
  } catch (error) {
    showToast('Error shortening URL. Please try again.');
  } finally {
    shortenBtn.textContent = 'Short Link';
  }
});

// Copy the short URL to clipboard
copyBtn.addEventListener('click', () => {
  const shortUrl = shortUrlInput.value;
  if (!shortUrl) {
    showToast('Nothing to copy!');
    return;
  }
  navigator.clipboard.writeText(shortUrl)
    .then(() => {
      showToast('Link copied successfully!');
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
      showToast('Failed to copy link.');
    });
});
