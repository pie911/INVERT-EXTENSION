// guard against multiple script injections
if (!window.__invertExtensionInitialized) {
    window.__invertExtensionInitialized = true;

    let isInverted = false;
    let debounceTimer = null;
    let stateCache = {}; // local cache to avoid repeated storage calls
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

    // Robust state saving with context validation and fallback caching
    function saveState() {
        const domain = getDomain(window.location.href);
        
        // Update local cache immediately (fastest fallback)
        stateCache[domain] = isInverted;
        
        try {
            // Check if chrome API is available and context is valid
            if (typeof chrome === 'undefined' || !chrome.storage) {
                console.warn('Chrome storage API unavailable, using local cache only');
                return;
            }
            
            // Use callback to detect context invalidation gracefully
            chrome.storage.local.set(
                { [domain]: isInverted },
                () => {
                    // Check for any runtime errors
                    if (chrome.runtime && chrome.runtime.lastError) {
                        console.warn('Save state error:', chrome.runtime.lastError.message);
                        // Continue using cache even if storage fails
                    }
                }
            );
        } catch (error) {
            // Handle context invalidation and other errors gracefully
            if (error.message && (error.message.includes('context invalidated') || error.message.includes('Extension context'))) {
                console.warn('Extension context invalidated, using cache:', domain);
            } else {
                console.warn('Could not save state:', error);
            }
        }
    }

    // Function to load state with fallback to cache
    function loadState() {
        const domain = getDomain(window.location.href);
        
        try {
            if (typeof chrome === 'undefined' || !chrome.storage) {
                // Use cache if chrome API unavailable
                if (stateCache[domain] !== undefined) {
                    isInverted = stateCache[domain];
                    applyInversion();
                }
                return;
            }
            
            chrome.storage.local.get(domain, (result) => {
                // Check for runtime errors
                if (chrome.runtime && chrome.runtime.lastError) {
                    console.warn('Load state error:', chrome.runtime.lastError.message);
                    // Try cache as fallback
                    if (stateCache[domain] !== undefined) {
                        isInverted = stateCache[domain];
                        applyInversion();
                    }
                    return;
                }
                
                if (result && result[domain] !== undefined) {
                    isInverted = result[domain];
                    stateCache[domain] = isInverted; // sync cache
                    applyInversion();
                }
            });
        } catch (error) {
            console.warn('Load state error:', error);
            // Fallback: use cache or default to false
            if (stateCache[domain] !== undefined) {
                isInverted = stateCache[domain];
                applyInversion();
            }
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
                
                /* Double-invert images and photos so they appear normal */
                img,
                picture,
                svg,
                [role="img"],
                iframe:not([src*="youtube"]):not([src*="youtu.be"]):not([src*="vimeo"]):not([src*="dailymotion"]):not([src*="twitch"]) {
                    filter: invert(100%) hue-rotate(180deg) !important;
                    -webkit-filter: invert(100%) hue-rotate(180deg) !important;
                }
                
                /* Preserve audio, video, and media embeds naturally */
                audio,
                video,
                video::backdrop,
                iframe[src*="youtube"],
                iframe[src*="youtu.be"],
                iframe[src*="vimeo"],
                iframe[src*="dailymotion"],
                iframe[src*="twitch"],
                embed[src*="youtube"],
                embed[src*="vimeo"] {
                    filter: none !important;
                    -webkit-filter: none !important;
                }
                
                /* Canvas for PDFs only (they handle their own inversion) */
                canvas {
                    filter: none !important;
                    -webkit-filter: none !important;
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
