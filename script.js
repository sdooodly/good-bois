const dogImg = document.getElementById('dogImg');
const dogBtn = document.getElementById('dogBtn');
const favBtn = document.getElementById('favBtn');
const shareBtn = document.getElementById('shareBtn');
const downloadBtn = document.getElementById('downloadBtn');
const caption = document.getElementById('caption');
const errorBox = document.getElementById('error');
const errorMsg = document.getElementById('errorMsg');
const retryBtn = document.getElementById('retryBtn');
const historyList = document.getElementById('historyList');
const favList = document.getElementById('favList');
const dogContainer = document.getElementById('dogImage');

const HISTORY_KEY = 'goodbois_history_v1';
const FAV_KEY = 'goodbois_favs_v1';
const MAX_HISTORY = 12;

let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
let favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');

function saveState() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function parseBreed(url) {
    try {
        const parts = new URL(url).pathname.split('/').filter(Boolean);
        const breedPart = parts[parts.length - 2] || parts[parts.length - 1] || '';
        return breedPart.replace('-', ' ');
    } catch (e) { return '' }
}

function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = parseBreed(url) || 'history';
        img.loading = 'lazy';
        img.addEventListener('click', () => loadImage(url));
        historyList.appendChild(img);
    });
}

function renderFavs() {
    favList.innerHTML = '';
    favs.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = parseBreed(url) || 'favorite';
        img.loading = 'lazy';
        img.addEventListener('click', () => loadImage(url));
        favList.appendChild(img);
    });
    updateFavButton();
}

function updateFavButton(currentUrl) {
    const url = currentUrl || dogImg.dataset.current;
    if (!favBtn) return;
    const isFav = url && favs.includes(url);
    favBtn.textContent = isFav ? '💖' : '❤';
}

function addToHistory(url) {
    if (!url) return;
    history = history.filter(u => u !== url);
    history.unshift(url);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveState();
    renderHistory();
}

function toggleFavorite(url) {
    if (!url) return;
    if (favs.includes(url)) favs = favs.filter(u => u !== url);
    else favs.unshift(url);
    saveState();
    renderFavs();
}

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(resource, { signal: controller.signal, cache: 'default' });
        clearTimeout(id);
        return res;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}

async function createPlaceholderFromBlob(blob) {
    try {
        let bitmap;
        try {
            bitmap = await createImageBitmap(blob, { resizeWidth: 40, resizeHeight: 40, resizeQuality: 'low' });
        } catch (e) {
            bitmap = await createImageBitmap(blob);
        }
        const canvas = document.createElement('canvas');
        const w = 40;
        const h = Math.max(20, Math.round(bitmap.height * (w / bitmap.width)));
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.6);
    } catch (err) {
        // last-resort fallback
        return '';
    }
}

async function loadImage(url) {
    if (!dogContainer || !dogImg) return;
    dogContainer.classList.add('loading');
    dogContainer.classList.remove('placeholder-hidden');
    errorBox.hidden = true;
    dogBtn.disabled = true;
    favBtn && (favBtn.disabled = true);
    shareBtn && (shareBtn.disabled = true);

    try {
        // fetch image as blob so we can create a small placeholder
        const imgResp = await fetchWithTimeout(url, { timeout: 10000 });
        if (!imgResp.ok) throw new Error('Image fetch failed');
        const blob = await imgResp.blob();

        const placeholder = await createPlaceholderFromBlob(blob);
        if (placeholder) {
            dogContainer.style.setProperty('--placeholder', `url(${placeholder})`);
        }

        const objectUrl = URL.createObjectURL(blob);
        dogImg.classList.remove('loaded');
        dogImg.dataset.current = url;
        dogImg.loading = 'lazy';
        await new Promise((resolve, reject) => {
            const onLoad = () => { dogImg.removeEventListener('error', onErr); resolve(); };
            const onErr = () => { dogImg.removeEventListener('load', onLoad); reject(new Error('Image load error')); };
            dogImg.addEventListener('load', onLoad, { once: true });
            dogImg.addEventListener('error', onErr, { once: true });
            dogImg.src = objectUrl;
        });

        dogImg.classList.add('loaded');
        dogContainer.classList.add('placeholder-hidden');
        const breed = parseBreed(url);
        caption.textContent = breed ? `Breed: ${breed}` : '';
        downloadBtn.href = objectUrl;
        downloadBtn.setAttribute('download', `${breed || 'dog'}.jpg`);
        updateFavButton(url);
        addToHistory(url);
    } catch (err) {
        console.error(err);
        errorMsg.textContent = 'Failed to load image. Please try again.';
        errorBox.hidden = false;
    } finally {
        dogContainer.classList.remove('loading');
        dogBtn.disabled = false;
        favBtn && (favBtn.disabled = false);
        shareBtn && (shareBtn.disabled = false);
    }
}

async function getNewDog() {
    try {
        dogBtn.disabled = true;
        const res = await fetchWithTimeout('https://dog.ceo/api/breeds/image/random', { timeout: 7000 });
        if (!res.ok) throw new Error('API fetch failed');
        const data = await res.json();
        const url = data.message;
        await loadImage(url);
    } catch (err) {
        console.error(err);
        errorMsg.textContent = 'Could not fetch a new dog. Check your connection.';
        errorBox.hidden = false;
    } finally {
        dogBtn.disabled = false;
    }
}

// Event handlers
dogBtn && dogBtn.addEventListener('click', getNewDog);
retryBtn && retryBtn.addEventListener('click', () => {
    errorBox.hidden = true;
    const current = dogImg.dataset.current;
    if (current) loadImage(current); else getNewDog();
});

favBtn && favBtn.addEventListener('click', () => {
    const url = dogImg.dataset.current;
    toggleFavorite(url);
});

shareBtn && shareBtn.addEventListener('click', async () => {
    const url = dogImg.dataset.current;
    if (!url) return;
    if (navigator.share) {
        try { await navigator.share({ title: 'Good boi', text: 'Check this doggo!', url }); }
        catch (e) { /* ignore */ }
    } else {
        // fallback: copy to clipboard
        try { await navigator.clipboard.writeText(url); alert('Image URL copied to clipboard'); } catch (e) { alert('Share not supported'); }
    }
});

// Download handled by anchor

// init
renderHistory();
renderFavs();
window.addEventListener('load', getNewDog);