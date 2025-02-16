document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('invertButton');
    
    button.addEventListener('click', async () => {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            // Inject content script if needed
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Send toggle message
            chrome.tabs.sendMessage(
                tab.id,
                { action: 'toggle' },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response && response.success) {
                        button.textContent = response.isInverted ? 
                            'Restore Colors' : 'Invert Colors';
                    }
                }
            );
        } catch (error) {
            console.error('Error:', error);
        }
    });
});