//background.js

// Extension installation handler
// chrome.runtime.onInstalled.addListener((details) => {
//     console.log('Tab Customizer installed/updated');
    
//     if (details.reason === 'install') {
//         console.log('Extension installed for the first time');
        
//         // Set up default settings
//         chrome.storage.local.set({
//             'extensionSettings': {
//                 'version': '1.0',
//                 'installedDate': new Date().toISOString(),
//                 'persistenceEnabled': false // Default to session-only
//             }
//         });
//     }
    
//     if (details.reason === 'update') {
//         console.log('Extension updated from version', details.previousVersion);
//     }
// });


chrome.runtime.onStartup.addListener(async () => {
    try {
        // Allow session storage access from content scripts even on restricted sites - from stackoverflow
        await chrome.storage.session.setAccessLevel({
            accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
        });
        console.log('Session storage access level set to TRUSTED_AND_UNTRUSTED_CONTEXTS');
    } catch (error) {
        console.error('Failed to set storage access level:', error);
    }
    
    console.log('Browser started, Tab Customizer ready');
    chrome.storage.session.clear();
});

// Also set it on installation ()
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Tab Customizer installed/updated');
    
    try {
        await chrome.storage.session.setAccessLevel({
            accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
        });
        console.log('Session storage access level set on install');
    } catch (error) {
        console.error('Failed to set storage access level on install:', error);
    }
    
    if (details.reason === 'install') {
        console.log('Extension installed for the first time');
        
        // Set up default settings
        chrome.storage.local.set({
            'extensionSettings': {
                'version': '1.0',
                'installedDate': new Date().toISOString(),
                'persistenceEnabled': false
            }
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started, Tab Customizer ready');
    
    // Clear session storage on browser startup
    chrome.storage.session.clear();
});

// listener for tab updates to maintain customizations
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // only act when page loading is complete 
    if (changeInfo.status === 'complete' && tab.url) {
        try {
            // checking session storage first (tab-specific)
            const sessionKey = `tab_${tabId}`;
            const sessionResult = await chrome.storage.session.get([sessionKey]);
            
            if (sessionResult[sessionKey]) {
                await applyCustomizationsToTab(tabId, sessionResult[sessionKey]);
                return;
            }
            
            // checking local storage (URL-based, for persistent mode)
            const localResult = await chrome.storage.local.get([tab.url]);
            if (localResult[tab.url]) {
                await applyCustomizationsToTab(tabId, localResult[tab.url]);
            }
            
        } catch (error) {
            console.error('Error in tab update handler:', error);
        }
    }
});


// async function applyCustomizationsToTab(tabId, savedData) {
//     // adding small delay to ensure page is fully loaded - DID NOT WORK
//     setTimeout(async () => {
//         try {
//             // Apply title
//             if (savedData.customTitle) {
//                 await chrome.scripting.executeScript({
//                     target: { tabId: tabId },
//                     func: (title) => { document.title = title; },
//                     args: [savedData.customTitle]
//                 });
//             }
            
//             // Apply favicon
//             if (savedData.customFavicon && savedData.customFavicon !== 'default') {
//                 await chrome.scripting.executeScript({
//                     target: { tabId: tabId },
//                     func: applyFaviconInBackground,
//                     args: [savedData.customFavicon]
//                 });
//             }
//         } catch (error) {
//             console.log('Could not apply customizations to tab:', error.message);
//             // This is expected for some pages (chrome://, extension pages, etc.)
//         }
//     }, 500);
// }
// In background.js, update the applyCustomizationsToTab function:
async function applyCustomizationsToTab(tabId, savedData) {
    // Small delay to ensure page is fully loaded
    setTimeout(async () => {
        try {
            // Apply title
            if (savedData.customTitle) {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (title) => { document.title = title; },
                    args: [savedData.customTitle]
                });
            }
            
            // Apply favicon - FIXED: Handle custom favicons
            if (savedData.customFavicon && savedData.customFavicon !== 'default') {
                if (savedData.customFavicon === 'custom' && savedData.customFaviconDataUrl) {
                    // For custom uploaded favicons
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: (faviconDataUrl) => {
                            // Remove existing favicon links
                            const existingLinks = document.querySelectorAll('link[rel*="icon"]');
                            existingLinks.forEach(link => link.remove());
                            
                            // Add new favicon
                            const link = document.createElement('link');
                            link.rel = 'icon';
                            link.href = faviconDataUrl;
                            document.head.appendChild(link);
                        },
                        args: [savedData.customFaviconDataUrl]
                    });
                } else {
                    // For emoji favicons
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: applyFaviconInBackground,
                        args: [savedData.customFavicon]
                    });
                }
            }
        } catch (error) {
            console.log('Could not apply customizations to tab:', error.message);
        }
    }, 500);
}

/**
 * Function to apply favicon (injected into pages)
 */
function applyFaviconInBackground(iconType) {
    const emojiMap = {
        'star': '⭐',
        'heart': '❤️',
        'lightning': '⚡',
        'gear': '⚙️',
        'fire': '🔥',
        'calender': '📆',
        'book': '📖',
        'search': '🔎',
        'sound': '🎧',
        'cash': '💵',        
        'paint': '🎨',
        'folder': '📂' 
    };
    
    const emoji = emojiMap[iconType] || '⭐';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
            <text x="8" y="12" text-anchor="middle" font-size="12">${emoji}</text>
        </svg>
    `;
    const faviconUrl = 'data:image/svg+xml,' + encodeURIComponent(svg);
    
    // Remove existing custom favicons first
    const existingCustom = document.querySelectorAll('link[rel*="icon"][href^="data:image/svg+xml"]');
    existingCustom.forEach(link => link.remove());
    
    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = faviconUrl;
    document.head.appendChild(link);
}

// Clean up session data when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    try {
        // Clean up session storage for closed tab
        const sessionKey = `tab_${tabId}`;
        const originalKey = `original_${tabId}`;
        
        await chrome.storage.session.remove([sessionKey, originalKey]);
        console.log('Cleaned up session data for tab:', tabId);
    } catch (error) {
        console.error('Error cleaning up tab data:', error);
    }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getTabInfo') {
        // Return information about the current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            sendResponse({ tab: tabs[0] });
        });
        return true; // Required for async response
    }
    
    if (message.action === 'getTabId') {
        // Return the sender's tab ID
        sendResponse({ tabId: sender.tab?.id });
        return true;
    }
    
    if (message.action === 'clearAllCustomizations') {
        // Clear all saved customizations (useful for debugging)
        chrome.storage.local.clear(() => {
            chrome.storage.session.clear(() => {
                sendResponse({ success: true });
            });
        });
        return true;
    }
    
    if (message.action === 'clearSessionData') {
        // Clear only session data
        chrome.storage.session.clear(() => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// Cleanup old persistent data periodically (optional)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
        cleanupOldData();
    }
});

// Set up cleanup alarm (runs once a week)
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('cleanup', { 
        delayInMinutes: 60 * 24 * 7, // 1 week
        periodInMinutes: 60 * 24 * 7  // Repeat weekly
    });
});

/**
 * Clean up old customization data (only persistent data)
 */
async function cleanupOldData() {
    try {
        const allData = await chrome.storage.local.get(null);
        const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
        
        for (const [key, value] of Object.entries(allData)) {
            // Skip non-URL entries (like presets, settings)
            if (!key.startsWith('http') && !key.startsWith('https')) {
                continue;
            }
            
            // Remove old customizations (only if they have lastUsed timestamp)
            if (value.lastUsed && value.lastUsed < cutoffDate) {
                await chrome.storage.local.remove([key]);
                console.log('Cleaned up old customization for:', key);
            }
        }
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}