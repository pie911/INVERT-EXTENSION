let isInverted = false;

// Function to apply inversion
function applyInversion() {
    try {
        // Simple inversion using styles
        document.documentElement.style.filter = isInverted ? 'invert(100%)' : 'none';
        
        // Find and preserve images
        const mediaElements = document.querySelectorAll('img, video, canvas');
        mediaElements.forEach(element => {
            element.style.filter = isInverted ? 'invert(100%)' : 'none';
        });
        
        return true;
    } catch (error) {
        console.error('Inversion error:', error);
        return false;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
        isInverted = !isInverted;
        const success = applyInversion();
        sendResponse({ success, isInverted });
    }
    return true; // Keep the message channel open
});