const dogImg = document.getElementById('dogImg');
const dogBtn = document.getElementById('dogBtn');

async function getNewDog() {
    if (!dogBtn) return;
    dogBtn.disabled = true;
    try {
        const res = await fetch('https://dog.ceo/api/breeds/image/random');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        const url = data.message;

        if (dogImg) {
            dogImg.classList.remove('loaded');
            await new Promise((resolve, reject) => {
                const onLoad = () => { dogImg.removeEventListener('error', onError); resolve(); };
                const onError = () => { dogImg.removeEventListener('load', onLoad); reject(new Error('Image failed to load')); };
                dogImg.addEventListener('load', onLoad, { once: true });
                dogImg.addEventListener('error', onError, { once: true });
                dogImg.src = url;
                // set a useful alt when possible
                try {
                    const parts = url.split('/');
                    const breed = parts[parts.length - 2].replace('-', ' ');
                    dogImg.alt = `${breed} dog`;
                } catch (e) {}
            });
            dogImg.classList.add('loaded');
        } else {
            const container = document.getElementById('dogImage');
            if (container) {
                container.innerHTML = '';
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Good boi';
                img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
                container.appendChild(img);
            }
        }
    } catch (err) {
        console.error('Failed to load dog image', err);
    } finally {
        dogBtn.disabled = false;
    }
}

dogBtn && dogBtn.addEventListener('click', getNewDog);
window.addEventListener('load', getNewDog);