// Connection management
const connections = new Map();

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed successfully');
});

// Handle connection
chrome.runtime.onConnect.addListener((port) => {
    const tabId = port.sender.tab?.id;
    if (tabId) {
        connections.set(tabId, port);
        port.onDisconnect.addListener(() => {
            connections.delete(tabId);
        });
    }
});

// Handle errors
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ERROR') {
        console.error('Extension error:', message.error);
    }
    return true;
});