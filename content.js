let isInverted = false;

// Function to get domain from URL
function getDomain(url) {
    return new URL(url).hostname;
}

// Function to save state
function saveState() {
    const domain = getDomain(window.location.href);
    try {
        chrome.storage.local.set({
            [domain]: isInverted
        });
    } catch (error) {
        console.warn('Could not save state:', error);
    }
}

// Function to load state
function loadState() {
    const domain = getDomain(window.location.href);
    try {
        chrome.storage.local.get(domain, (result) => {
            if (result[domain]) {
                isInverted = result[domain];
                applyInversion();
            }
        });
    } catch (error) {
        console.warn('Could not load state:', error);
    }
}

// Apply the main inversion stylesheet and handle PDF viewers
function applyInversion() {
    try {
        let styleElement = document.getElementById('invert-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'invert-styles';
            document.head.appendChild(styleElement);
        }

        styleElement.textContent = isInverted ? `
            :root {
                background-color: white !important;
                filter: invert(100%) hue-rotate(180deg) !important;
                -webkit-filter: invert(100%) hue-rotate(180deg) !important;
            }
            
            img,
            picture,
            video,
            canvas,
            svg,
            [role="img"],
            [class*="image"],
            [class*="photo"],
            [class*="picture"],
            [style*="background-image"],
            i[class*="icon"],
            span[class*="icon"],
            [class*="logo"] {
                filter: invert(100%) hue-rotate(180deg) !important;
                -webkit-filter: invert(100%) hue-rotate(180deg) !important;
            }
        ` : '';

        // Special handling for PDF viewers (Edge/Chrome)
        if (isInverted) {
            invertPDF();
        }

        saveState();
        return true;
    } catch (error) {
        console.error('Inversion error:', error);
        return false;
    }
}

// Initialize message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
        isInverted = !isInverted;
        const success = applyInversion();
        sendResponse({ success, isInverted });
    } else if (request.action === 'getState') {
        // return the current inversion flag
        sendResponse({ isInverted });
    }
    return true;
});

// Load state and apply on page load
document.addEventListener('DOMContentLoaded', loadState);

// Invert any PDF viewer if present; works for both Edge and Chrome
function invertPDF() {
    try {
        const viewer = document.querySelector('embed[type="application/pdf"], object[type="application/pdf"]');
        if (viewer) {
            viewer.style.filter = "invert(1) hue-rotate(180deg)";
            viewer.style.backgroundColor = "black";
            console.log("PDF inversion applied to viewer element.");
        } else {
            const canvases = document.querySelectorAll('canvas');
            canvases.forEach(c => {
                c.style.filter = "invert(1) hue-rotate(180deg)";
                c.style.backgroundColor = "black";
            });
            console.log("PDF inversion applied to canvas elements.");
        }
    } catch (err) {
        console.warn('PDF inversion failed:', err);
    }
}

// Handle dynamic content
const observer = new MutationObserver(() => {
    if (isInverted) {
        applyInversion();
        invertPDF();
    }
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});