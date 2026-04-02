function parseTweetUrl(input) {
  const trimmed = input.trim();
  // Search anywhere in the pasted text for a tweet URL
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^\/\s]+)\/status\/(\d+)/
  );
  if (match) return { user: match[1], id: match[2] };
  // Also handle t.co short links or mobile share text that lacks a full URL
  // Try to find any status ID pattern
  const idMatch = trimmed.match(/status\/(\d+)/);
  if (idMatch) return { user: "i", id: idMatch[1] };
  return null;
}

async function fetchTweetText(user, id) {
  const apiUrl = `https://api.fxtwitter.com/${user}/status/${id}`;
  const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`);
  if (!resp.ok) {
    throw new Error(`API returned ${resp.status}`);
  }
  const data = await resp.json();
  const tweet = data.tweet;
  if (!tweet || !tweet.author) {
    throw new Error("No tweet data in response");
  }
  return {
    text: tweet.text,
    authorName: tweet.author.name,
    authorHandle: tweet.author.screen_name,
  };
}

const urlInput = document.getElementById("url-input");
const fetchBtn = document.getElementById("fetch-btn");
const errorMsg = document.getElementById("error-msg");
const resultSection = document.getElementById("result-section");
const authorName = document.getElementById("author-name");
const authorHandle = document.getElementById("author-handle");
const tweetText = document.getElementById("tweet-text");
const copyBtn = document.getElementById("copy-btn");
const clearBtn = document.getElementById("clear-btn");
const copyConfirm = document.getElementById("copy-confirm");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
}

function showResult(data) {
  authorName.textContent = data.authorName;
  authorHandle.textContent = `@${data.authorHandle}`;
  tweetText.textContent = data.text;
  resultSection.hidden = false;
}

function resetToInput() {
  resultSection.hidden = true;
  copyConfirm.hidden = true;
  urlInput.value = "";
  urlInput.focus();
  hideError();
}

async function handleFetch() {
  hideError();
  const parsed = parseTweetUrl(urlInput.value);
  if (!parsed) {
    showError("That doesn't look like a tweet link");
    return;
  }

  fetchBtn.disabled = true;
  urlInput.disabled = true;
  fetchBtn.textContent = "Loading...";

  try {
    const data = await fetchTweetText(parsed.user, parsed.id);
    showResult(data);
  } catch (err) {
    if (!navigator.onLine) {
      showError("No internet connection");
    } else {
      showError("Error: " + err.message);
    }
  } finally {
    fetchBtn.disabled = false;
    urlInput.disabled = false;
    fetchBtn.textContent = "Get Text";
  }
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(tweetText.textContent);
    copyConfirm.hidden = false;
    setTimeout(() => { copyConfirm.hidden = true; }, 2000);
  } catch (e) {
    // Fallback for older browsers
    const range = document.createRange();
    range.selectNodeContents(tweetText);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    copyConfirm.hidden = false;
    setTimeout(() => { copyConfirm.hidden = true; }, 2000);
  }
}

fetchBtn.addEventListener("click", handleFetch);
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleFetch();
});
copyBtn.addEventListener("click", handleCopy);
clearBtn.addEventListener("click", resetToInput);

// Auto-focus input on load
urlInput.focus();
