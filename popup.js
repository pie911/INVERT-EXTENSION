document.addEventListener('DOMContentLoaded', async () => {
    const toggle = document.getElementById('invertToggle');

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        if (!tab?.id) throw new Error('No active tab');

        // query current state and set switch
        chrome.tabs.sendMessage(tab.id, { action: 'getState' }, (resp) => {
            if (!chrome.runtime.lastError && resp?.isInverted) {
                toggle.checked = true;
            }
        });

        // handle user toggle
        toggle.addEventListener('change', () => {
            chrome.tabs.sendMessage(tab.id, { action: 'toggle' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    return;
                }
                // keep switch in sync if response differs
                if (response && typeof response.isInverted === 'boolean') {
                    toggle.checked = response.isInverted;
                }
            });
        });
    } catch (err) {
        console.error('Popup error:', err);
    }
});