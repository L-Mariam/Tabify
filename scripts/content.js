// // content.js

// // Store original data immediately when script loads
// let originalData = {
//     title: document.title,
//     favicon: getFaviconUrl()
// };

// // Initialize immediately
// (async function() {
//     'use strict';
    
//     // Store original data in session storage
//     await storeOriginalData();
    
//     // Apply any existing customizations
//     await applyStoredCustomizations();
    
//     // Set up listeners
//     setupMessageListener();
//     setupStorageListener();
//     setupNavigationObserver();
// })();

// /**
//  * Get current favicon URL
//  */
// function getFaviconUrl() {
//     const faviconLink = document.querySelector('link[rel*="icon"]');
//     return faviconLink ? faviconLink.href : '';
// }

// /**
//  * Store original data in session storage
//  */
// async function storeOriginalData() {
//     try {
//         const tabId = await getCurrentTabId();
//         const originalKey = `original_${tabId}`;
        
//         // Check if original data already exists
//         const existing = await chrome.storage.session.get([originalKey]);
        
//         if (!existing[originalKey]) {
//             // Store original data only if not already stored
//             await chrome.storage.session.set({
//                 [originalKey]: {
//                     title: originalData.title,
//                     favicon: originalData.favicon
//                 }
//             });
//         } else {
//             // Use previously stored original data
//             originalData = existing[originalKey];
//         }
//     } catch (error) {
//         console.error('Error storing original data:', error);
//     }
// }

// /**
//  * Get current tab ID (helper function)
//  */
// async function getCurrentTabId() {
//     return new Promise((resolve) => {
//         chrome.runtime.sendMessage({ action: 'getTabId' }, (response) => {
//             resolve(response?.tabId || Date.now());
//         });
//     });
// }

// /**
//  * Apply stored customizations from appropriate storage
//  */
// async function applyStoredCustomizations() {
//     try {
//         const tabId = await getCurrentTabId();
        
//         // Check session storage first (tab-specific)
//         const sessionKey = `tab_${tabId}`;
//         const sessionData = await chrome.storage.session.get([sessionKey]);
        
//         if (sessionData[sessionKey]) {
//             applyCustomizations(sessionData[sessionKey]);
//             return;
//         }
        
//         // Check local storage (URL-based)
//         const currentUrl = window.location.href;
//         const localData = await chrome.storage.local.get([currentUrl]);
        
//         if (localData[currentUrl]) {
//             applyCustomizations(localData[currentUrl]);
//         }
//     } catch (error) {
//         console.error('Error applying stored customizations:', error);
//     }
// }

// /**
//  * Apply customizations to the page
//  */
// function applyCustomizations(data) {
//     // Apply title
//     if (data.customTitle && document.title !== data.customTitle) {
//         document.title = data.customTitle;
//     }
    
//     // Apply favicon
//     if (data.customFavicon) {
//         if (data.customFavicon === 'default') {
//             restoreOriginalFavicon();
//         } else if (data.customFavicon === 'custom' && data.customFaviconDataUrl) {
//             applyCustomFavicon(data.customFaviconDataUrl, true);
//         } else if (data.customFavicon !== 'default') {
//             const emoji = getEmojiForIconType(data.customFavicon);
//             const faviconUrl = createEmojiFaviconDataUrl(emoji);
//             applyCustomFavicon(faviconUrl, false);
//         }
//     }
// }

// /**
//  * Apply custom favicon to the page
//  */
// function applyCustomFavicon(faviconUrl, isCustomUpload = false) {
//     // Remove existing custom favicons first
//     const existingCustom = document.querySelectorAll('link[rel*="icon"][href^="data:"]');
//     existingCustom.forEach(link => link.remove());
    
//     // Add new favicon
//     const link = document.createElement('link');
//     link.rel = 'icon';
    
//     if (isCustomUpload) {
//         // For uploaded images, try to determine the correct type
//         if (faviconUrl.startsWith('data:image/svg+xml')) {
//             link.type = 'image/svg+xml';
//         } else if (faviconUrl.includes('image/png')) {
//             link.type = 'image/png';
//         } else if (faviconUrl.includes('image/jpeg')) {
//             link.type = 'image/jpeg';
//         } else if (faviconUrl.includes('image/gif')) {
//             link.type = 'image/gif';
//         }
//     } else {
//         link.type = 'image/svg+xml';
//     }
    
//     link.href = faviconUrl;
//     document.head.appendChild(link);
    
//     // Force favicon update with shortcut icon
//     const shortcutLink = document.createElement('link');
//     shortcutLink.rel = 'shortcut icon';
//     shortcutLink.type = link.type;
//     shortcutLink.href = faviconUrl;
//     document.head.appendChild(shortcutLink);
// }

// /**
//  * Remove custom favicons and restore original
//  */
// function restoreOriginalFavicon() {
//     // Remove all custom favicons
//     const customLinks = document.querySelectorAll('link[rel*="icon"][href^="data:"]');
//     customLinks.forEach(link => link.remove());
    
//     // Restore original if it exists
//     if (originalData.favicon) {
//         const link = document.createElement('link');
//         link.rel = 'icon';
//         link.href = originalData.favicon;
//         document.head.appendChild(link);
//     }
// }

// /**
//  * Get emoji for icon type
//  */
// function getEmojiForIconType(iconType) {
//     const emojiMap = {
//         'star': '⭐',
//         'heart': '❤️',
//         'lightning': '⚡',
//         'gear': '⚙️',
//         'fire': '🔥',
//         'calender': '📆',
//         'book': '📖',
//         'search': '🔎',
//         'sound': '🎧',
//         'cash': '💵',        
//         'paint': '🎨',
//         'folder': '📂' 
//     };
//     return emojiMap[iconType] || '⭐';
// }

// /**
//  * Create emoji favicon data URL
//  */
// function createEmojiFaviconDataUrl(emoji) {
//     const svg = `
//         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
//             <text x="8" y="12" text-anchor="middle" font-size="12">${emoji}</text>
//         </svg>
//     `;
//     return 'data:image/svg+xml,' + encodeURIComponent(svg);
// }

// /**
//  * Set up message listener for popup communication
//  */
// function setupMessageListener() {
//     chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//         switch (message.action) {
//             case 'updateCustomization':
//                 applyCustomizations(message.data);
//                 sendResponse({ success: true });
//                 break;
                
//             case 'resetTab':
//                 document.title = message.originalTitle || originalData.title;
//                 restoreOriginalFavicon();
//                 sendResponse({ success: true });
//                 break;
                
//             case 'clearSession':
//                 document.title = originalData.title;
//                 restoreOriginalFavicon();
//                 sendResponse({ success: true });
//                 break;
                
//             case 'getOriginalData':
//                 sendResponse({ originalData });
//                 break;
//         }
        
//         return true; // Keep message channel open for async response
//     });
// }

// /**
//  * Set up storage listener for real-time updates
//  */
// function setupStorageListener() {
//     chrome.storage.onChanged.addListener(async (changes, namespace) => {
//         const tabId = await getCurrentTabId();
//         const sessionKey = `tab_${tabId}`;
//         const urlKey = window.location.href;
        
//         // Handle session storage changes
//         if (namespace === 'session' && changes[sessionKey]) {
//             const newData = changes[sessionKey].newValue;
            
//             if (newData) {
//                 applyCustomizations(newData);
//             } else {
//                 // Data was removed (reset case)
//                 document.title = originalData.title;
//                 restoreOriginalFavicon();
//             }
//         }
        
//         // Handle local storage changes (for persistent mode)
//         if (namespace === 'local' && changes[urlKey]) {
//             const newData = changes[urlKey].newValue;
            
//             if (newData) {
//                 applyCustomizations(newData);
//             } else {
//                 document.title = originalData.title;
//                 restoreOriginalFavicon();
//             }
//         }
//     });
// }

// /**
//  * Set up navigation observer for Single Page Applications
//  */
// function setupNavigationObserver() {
//     let lastUrl = location.href;
    
//     new MutationObserver(() => {
//         const url = location.href;
//         if (url !== lastUrl) {
//             lastUrl = url;
            
//             // Update original data for new page
//             if (document.title !== originalData.title) {
//                 originalData.title = document.title;
//                 originalData.favicon = getFaviconUrl();
//                 storeOriginalData();
//             }
            
//             // Re-apply customizations after navigation
//             setTimeout(applyStoredCustomizations, 100);
//         }
//     }).observe(document, { subtree: true, childList: true });
// }

// content.js - Fixed version for custom image handling

let originalData = {
    title: document.title,
    favicon: getFaviconUrl()
};

// Initialize immediately
(async function() {
    'use strict';
    
    await storeOriginalData();
    await applyStoredCustomizations();
    
    setupMessageListener();
    setupStorageListener();
    setupNavigationObserver();
})();

function getFaviconUrl() {
    const faviconLink = document.querySelector('link[rel*="icon"]');
    return faviconLink ? faviconLink.href : '';
}

async function storeOriginalData() {
    try {
        const tabId = await getCurrentTabId();
        const originalKey = `original_${tabId}`;
        
        const existing = await chrome.storage.session.get([originalKey]);
        
        if (!existing[originalKey]) {
            await chrome.storage.session.set({
                [originalKey]: {
                    title: originalData.title,
                    favicon: originalData.favicon
                }
            });
        } else {
            originalData = existing[originalKey];
        }
    } catch (error) {
        console.error('Error storing original data:', error);
    }
}

async function getCurrentTabId() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getTabId' }, (response) => {
            resolve(response?.tabId || Date.now());
        });
    });
}

/**
 * Apply stored customizations - FIXED for custom images
 */
async function applyStoredCustomizations() {
    try {
        const tabId = await getCurrentTabId();
        
        // Check session storage first
        const sessionKey = `tab_${tabId}`;
        const sessionData = await chrome.storage.session.get([sessionKey]);
        
        if (sessionData[sessionKey]) {
            console.log('Applying session customizations:', sessionData[sessionKey]);
            applyCustomizations(sessionData[sessionKey]);
            return;
        }
        
        // Check local storage
        const currentUrl = window.location.href;
        const localData = await chrome.storage.local.get([currentUrl]);
        
        if (localData[currentUrl]) {
            console.log('Applying local customizations:', localData[currentUrl]);
            applyCustomizations(localData[currentUrl]);
        }
    } catch (error) {
        console.error('Error applying stored customizations:', error);
    }
}

/**
 * Apply customizations - FIXED to handle custom images properly
 */
function applyCustomizations(data) {
    console.log('Applying customizations:', data); // Debug log
    
    // Apply title
    if (data.customTitle && document.title !== data.customTitle) {
        document.title = data.customTitle;
    }
    
    // Apply favicon - FIXED
    if (data.customFavicon) {
        if (data.customFavicon === 'default') {
            restoreOriginalFavicon();
        // } else if (data.customFavicon === 'custom') {
        //     // FIXED: Handle custom favicon properly
        //     if (data.customFaviconDataUrl) {
        //         console.log('Applying custom favicon from data URL');
        //         applyCustomFavicon(data.customFaviconDataUrl, true);
        //     } else {
        //         console.warn('Custom favicon specified but no data URL found, using star');
        //         // Fall back to star emoji if no custom data
        //         const faviconUrl = createEmojiFaviconDataUrl('⭐');
        //         applyCustomFavicon(faviconUrl, false);
        //     }
        } else if (data.customFavicon === 'custom') {
            if (data.customFaviconDataUrl) {
                console.log('Applying custom favicon from data URL');
                applyCustomFavicon(data.customFaviconDataUrl, true);
            } else {
                console.warn('Custom favicon specified but no data URL found, restoring original');
                // FIXED: Restore original instead of defaulting to star
                restoreOriginalFavicon();
            }
        }
        else {
            // Handle emoji favicon
            const emoji = getEmojiForIconType(data.customFavicon);
            const faviconUrl = createEmojiFaviconDataUrl(emoji);
            applyCustomFavicon(faviconUrl, false);
        }
    }
}

/**
 * Apply custom favicon - Enhanced for better persistence
 */
// function applyCustomFavicon(faviconUrl, isCustomUpload = false) {
//     // Remove ALL existing favicon links to ensure clean slate
//     const allFaviconLinks = document.querySelectorAll('link[rel*="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
//     allFaviconLinks.forEach(link => link.remove());
    
//     // Create primary favicon link
//     const link = document.createElement('link');
//     link.rel = 'icon';
    
//     if (isCustomUpload) {
//         // Determine MIME type for custom uploads
//         if (faviconUrl.includes('image/png')) {
//             link.type = 'image/png';
//         } else if (faviconUrl.includes('image/jpeg')) {
//             link.type = 'image/jpeg';
//         } else if (faviconUrl.includes('image/gif')) {
//             link.type = 'image/gif';
//         } else if (faviconUrl.includes('image/svg+xml')) {
//             link.type = 'image/svg+xml';
//         } else {
//             link.type = 'image/x-icon';
//         }
//     } else {
//         link.type = 'image/svg+xml';
//     }
    
//     link.href = faviconUrl;
//     document.head.appendChild(link);
    
//     // Add multiple favicon types for better browser compatibility
//     const faviconTypes = ['shortcut icon', 'apple-touch-icon'];
//     faviconTypes.forEach(relType => {
//         const extraLink = document.createElement('link');
//         extraLink.rel = relType;
//         extraLink.type = link.type;
//         extraLink.href = faviconUrl;
//         document.head.appendChild(extraLink);
//     });
    
//     // Force favicon refresh by manipulating the cache
//     setTimeout(() => {
//         const refreshLink = document.createElement('link');
//         refreshLink.rel = 'icon';
//         refreshLink.type = link.type;
//         refreshLink.href = faviconUrl + '?v=' + Date.now();
//         document.head.appendChild(refreshLink);
//     }, 100);
// }
// In content.js, enhance the applyCustomFavicon function:
function applyCustomFavicon(faviconUrl, isCustomUpload = false) {
    // Remove ALL existing favicon links to ensure clean slate
    const allFaviconLinks = document.querySelectorAll('link[rel*="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    allFaviconLinks.forEach(link => link.remove());
    
    // Create primary favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    
    if (isCustomUpload) {
        // Determine MIME type for custom uploads
        if (faviconUrl.startsWith('data:image/svg+xml')) {
            link.type = 'image/svg+xml';
        } else if (faviconUrl.includes('image/png')) {
            link.type = 'image/png';
        } else if (faviconUrl.includes('image/jpeg')) {
            link.type = 'image/jpeg';
        } else if (faviconUrl.includes('image/gif')) {
            link.type = 'image/gif';
        } else {
            link.type = 'image/x-icon';
        }
    } else {
        link.type = 'image/svg+xml';
    }
    
    link.href = faviconUrl;
    document.head.appendChild(link);
    
    // Add multiple favicon types for better browser compatibility
    const faviconTypes = ['shortcut icon', 'apple-touch-icon'];
    faviconTypes.forEach(relType => {
        const extraLink = document.createElement('link');
        extraLink.rel = relType;
        extraLink.type = link.type;
        extraLink.href = faviconUrl;
        document.head.appendChild(extraLink);
    });
    
    // Force favicon refresh by manipulating the cache
    setTimeout(() => {
        const refreshLink = document.createElement('link');
        refreshLink.rel = 'icon';
        refreshLink.type = link.type;
        refreshLink.href = faviconUrl + '?v=' + Date.now();
        document.head.appendChild(refreshLink);
    }, 100);
}

function restoreOriginalFavicon() {
    // Remove all custom favicons
    const customLinks = document.querySelectorAll('link[rel*="icon"][href^="data:"]');
    customLinks.forEach(link => link.remove());
    
    if (originalData.favicon) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = originalData.favicon;
        document.head.appendChild(link);
    }
}

function getEmojiForIconType(iconType) {
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
    return emojiMap[iconType] || '⭐';
}

function createEmojiFaviconDataUrl(emoji) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
            <text x="8" y="12" text-anchor="middle" font-size="12">${emoji}</text>
        </svg>
    `;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.action) {
            case 'updateCustomization':
                applyCustomizations(message.data);
                sendResponse({ success: true });
                break;
                
            case 'resetTab':
                document.title = message.originalTitle || originalData.title;
                restoreOriginalFavicon();
                sendResponse({ success: true });
                break;
                
            case 'clearSession':
                document.title = originalData.title;
                restoreOriginalFavicon();
                sendResponse({ success: true });
                break;
                
            case 'getOriginalData':
                sendResponse({ originalData });
                break;
        }
        
        return true;
    });
}

/**
 * Set up storage listener - FIXED for better change detection
 */
function setupStorageListener() {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        const tabId = await getCurrentTabId();
        const sessionKey = `tab_${tabId}`;
        const urlKey = window.location.href;
        
        // Handle session storage changes
        if (namespace === 'session' && changes[sessionKey]) {
            const newData = changes[sessionKey].newValue;
            
            if (newData) {
                console.log('Storage changed - applying customizations:', newData);
                applyCustomizations(newData);
            } else {
                // Data was removed (reset case)
                console.log('Storage cleared - resetting to original');
                document.title = originalData.title;
                restoreOriginalFavicon();
            }
        }
        
        // Handle local storage changes (for persistent mode)
        if (namespace === 'local' && changes[urlKey]) {
            const newData = changes[urlKey].newValue;
            
            if (newData) {
                console.log('Local storage changed - applying customizations:', newData);
                applyCustomizations(newData);
            } else {
                document.title = originalData.title;
                restoreOriginalFavicon();
            }
        }
    });
}

function setupNavigationObserver() {
    let lastUrl = location.href;
    
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            
            // Update original data for new page
            if (document.title !== originalData.title) {
                originalData.title = document.title;
                originalData.favicon = getFaviconUrl();
                storeOriginalData();
            }
            
            // Re-apply customizations after navigation
            setTimeout(applyStoredCustomizations, 100);
        }
    }).observe(document, { subtree: true, childList: true });
}