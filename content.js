// guard against multiple script injections
if (!window.__invertExtensionInitialized) {
    window.__invertExtensionInitialized = true;

    let isInverted = false;
    let debounceTimer = null;
    const DEBOUNCE_DELAY = 300; // ms

    // quick check for PDF pages (internal viewer or file:// access)
    const isPdfPage = document.contentType === 'application/pdf' || 
        /\.pdf($|\?)/i.test(window.location.href);

    // Function to get domain from URL safely
    function getDomain(url) {
        try {
            // handle file:// URLs and other edge cases
            if (url.startsWith('file://')) {
                return 'local-files';
            }
            if (url.startsWith('data:') || url.startsWith('blob:')) {
                return 'data-urls';
            }
            return new URL(url).hostname || 'unknown';
        } catch (e) {
            return 'unknown';
        }
    }

    // Function to save state
    function saveState() {
        const domain = getDomain(window.location.href);
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({
                    [domain]: isInverted
                });
            }
        } catch (error) {
            console.warn('Could not save state:', error);
        }
    }

    // Function to load state
    function loadState() {
        const domain = getDomain(window.location.href);
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get(domain, (result) => {
                    if (result && result[domain] !== undefined) {
                        isInverted = result[domain];
                        applyInversion();
                    }
                });
            }
        } catch (error) {
            console.warn('Could not load state:', error);
        }
    }

    // Apply the main inversion stylesheet and handle PDF viewers
    function applyInversion() {
        try {
            // if this is a PDF page we don't bother with the big stylesheet
            if (isPdfPage) {
                simplePdfInvert();
                saveState();
                return true;
            }

            let styleElement = document.getElementById('invert-styles');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'invert-styles';
                styleElement.type = 'text/css';
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

            // Special handling for PDF viewers (Edge/Chrome) but only once
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

    // simple inversion for actual PDF frame to avoid heavy DOM ops
    function simplePdfInvert() {
        try {
            document.documentElement.style.filter = isInverted ?
                'invert(1) hue-rotate(180deg)' : '';
            document.documentElement.style.backgroundColor = isInverted ? 'black' : '';
            console.log('PDF page style applied.');
        } catch (e) {
            console.warn('pdf page style failed', e);
        }
    }

    // Initialize message listener
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === 'toggle') {
                    isInverted = !isInverted;
                    const success = applyInversion();
                    sendResponse({ success, isInverted });
                } else if (request.action === 'getState') {
                    sendResponse({ isInverted });
                }
                return true;
            });
        }
    } catch (e) {
        console.warn('Chrome runtime unavailable:', e);
    }

    // Load state and apply immediately (as early as possible)
    loadState();
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
                // only invert canvases once to avoid heavy loops
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

    // Debounced wrapper for inversion to avoid excessive calls
    function debouncedApplyInversion() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (isInverted) {
                applyInversion();
            }
        }, DEBOUNCE_DELAY);
    }

    // Handle dynamic content only for normal pages
    if (!isPdfPage && document.documentElement) {
        try {
            const observer = new MutationObserver(debouncedApplyInversion);

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });
        } catch (e) {
            console.warn('MutationObserver failed:', e);
        }
    }
}
