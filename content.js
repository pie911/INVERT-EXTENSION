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
    }
    return true;
});

// Load state and apply on page load
document.addEventListener('DOMContentLoaded', loadState);

// Handle dynamic content
const observer = new MutationObserver(() => {
    if (isInverted) {
        applyInversion();
    }
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});