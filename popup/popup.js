//popup.js

// DOM Elements - Getting references to HTML elements that can be interacted with
const newTitleInput = document.getElementById('newTitle');
const updateTitleBtn = document.getElementById('updateTitle');
const resetTabBtn = document.getElementById('resetTab');
const savePresetBtn = document.getElementById('savePreset');
const clearSessionBtn = document.getElementById('clearSession');
const persistToggle = document.getElementById('persistToggle');
const currentTitleSpan = document.getElementById('currentTitle');
const currentFaviconImg = document.getElementById('currentFavicon');
const originalFaviconImg = document.getElementById('originalFavicon');
const faviconDropdown = document.getElementById('faviconDropdown');
const faviconFile = document.getElementById('faviconFile');
const fileInputContainer = document.getElementById('fileInputContainer');
const presetsList = document.getElementById('presetsList');

// Global Variables - Store current tab information
let currentTab = null;
let originalTitle = '';
let originalFavicon = '';
let selectedFavicon = 'default';
let isPersistenceEnabled = false;
let customFaviconDataUrl = null;

/**
 * Get appropriate storage area based on persistence setting
 */
function getStorageArea() {
    return isPersistenceEnabled ? chrome.storage.local : chrome.storage.session;
}

/**
 * Generate a unique key for the current tab
 */
function getTabKey() {
    // Use tab ID for session storage, URL for persistent storage
    return isPersistenceEnabled ? currentTab.url : `tab_${currentTab.id}`;
}

/**
 * Initialize the popup when it opens
 * This function runs when the popup is first opened
 */
async function initializePopup() {
    try {
        // Get information about the currently active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true }); // current tab in current window. chrome returns an array with one tab
        currentTab = tabs[0];
        
        if (!currentTab) {
            console.error('No active tab found');
            return;
        }
        
        // Get REAL original title from tab (not potentially customized one)
        const tabInfo = await chrome.tabs.get(currentTab.id);
        originalTitle = tabInfo.title;
        originalFavicon = tabInfo.favIconUrl || '';
        
        // Check if stored original data
        const originalDataKey = `original_${currentTab.id}`;
        const originalData = await chrome.storage.session.get([originalDataKey]);
        
        if (originalData[originalDataKey]) {
            // Use previously stored original data
            originalTitle = originalData[originalDataKey].title;
            originalFavicon = originalData[originalDataKey].favicon;
        } else {
            // Store original data for first time
            await chrome.storage.session.set({
                [originalDataKey]: {
                    title: originalTitle,
                    favicon: originalFavicon
                }
            });
        }
        
        // Load persistence setting
        const settings = await chrome.storage.local.get(['persistenceEnabled']);
        isPersistenceEnabled = settings.persistenceEnabled || false;
        persistToggle.checked = isPersistenceEnabled;
        
        // Update UI with current tab info
        updateCurrentTabDisplay();
        
        // Load any saved customizations for this tab
        await loadSavedCustomizations();
        
        // Load saved presets (always from local storage)
        await loadPresets();
        
    } catch (error) {
        console.error('Error initializing popup:', error);
        currentTitleSpan.textContent = 'Error loading tab info';
    }
}

/**
 * Update the display to show current tab information
 * Fixed to prevent showing custom data as "original"
 */
function updateCurrentTabDisplay() {
    // Set the current title and favicon in the preview  
    currentTitleSpan.textContent = currentTab.title;
    
    if (currentTab.favIconUrl) {
        currentFaviconImg.src = currentTab.favIconUrl;
    } else {
        const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
        currentFaviconImg.src = defaultIcon;
    }
    
    // ALWAYS show the original favicon in the "Original" option
    if (originalFavicon) {
        originalFaviconImg.src = originalFavicon;
    } else {
        const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
        originalFaviconImg.src = defaultIcon;
    }
    
    // Set the input field to current title (this might be custom title)
    newTitleInput.value = currentTab.title;
}

/**
 * Load any saved customizations for the current tab
 * Fixed to properly handle original vs custom data and use appropriate storage
 */
async function loadSavedCustomizations() {
    try {
        const tabKey = getTabKey();
        const storage = getStorageArea();
        const result = await storage.get([tabKey]);
        
        if (result[tabKey]) {
            const savedData = result[tabKey];
            
            // Apply saved title if it exists
            if (savedData.customTitle) {
                newTitleInput.value = savedData.customTitle;
                currentTitleSpan.textContent = savedData.customTitle;
            }
            
            // Apply saved favicon if it exists
            if (savedData.customFavicon) {
                selectedFavicon = savedData.customFavicon;
                faviconDropdown.value = savedData.customFavicon;
                
                // Handle custom uploaded favicon
                if (savedData.customFavicon === 'custom' && savedData.customFaviconDataUrl) {
                    customFaviconDataUrl = savedData.customFaviconDataUrl;
                    currentFaviconImg.src = customFaviconDataUrl;
                } else if (savedData.customFavicon !== 'default') {
                    // Update current favicon display if it's not default
                    const emoji = getEmojiForIcon(savedData.customFavicon);
                    const faviconUrl = createEmojiFavicon(emoji);
                    currentFaviconImg.src = faviconUrl;
                }
            }
        }
    } catch (error) {
        console.error('Error loading saved customizations:', error);
    }
}

/**
 * Update the tab title
 */
async function updateTabTitle() {
    const newTitle = newTitleInput.value.trim();
    
    if (!newTitle) {
        alert('Please enter a title');
        return;
    }
    
    try {
        // Inject script to change the tab title
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: changeTabTitle,
            args: [newTitle]
        });
        
        // Save the customization
        await saveCustomization({ customTitle: newTitle });
        
        // Update the preview
        currentTitleSpan.textContent = newTitle;
        
        console.log('Tab title updated successfully');
    } catch (error) {
        console.error('Error updating tab title:', error);
        alert('Failed to update tab title. Make sure the page is loaded.');
    }
}

/**
 * Function that gets injected into the web page to change the title
 * This function runs in the context of the web page, not the extension
 */
function changeTabTitle(newTitle) {
    document.title = newTitle;
}

/**
 * Update the tab favicon
 */
async function updateTabFavicon(iconType, customDataUrl = null) {
    try {
        let faviconUrl;
        
        if (iconType === 'default') {
            faviconUrl = originalFavicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
        } else if (iconType === 'custom' && customDataUrl) {
            faviconUrl = customDataUrl;
        } else {
            // Create emoji favicon
            faviconUrl = createEmojiFavicon(getEmojiForIcon(iconType));
        }
        
        // Inject script to change the favicon
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: changeTabFavicon,
            args: [faviconUrl]
        });
        
        // Save the customization
        // const saveData = { customFavicon: iconType };
        // if (iconType === 'custom' && customDataUrl) {
        //     saveData.customFaviconDataUrl = customDataUrl;
        // }
        // await saveCustomization(saveData);
        // Save the customization
        const saveData = { customFavicon: iconType };
        if (iconType === 'custom' && customDataUrl) {
            saveData.customFaviconDataUrl = customDataUrl;
        }
        console.log('Saving favicon data:', saveData); // Debug log
        await saveCustomization(saveData);
        // Update the preview
        currentFaviconImg.src = faviconUrl;
        
        selectedFavicon = iconType;
        
        console.log('Favicon updated successfully');
    } catch (error) {
        console.error('Error updating favicon:', error);
        alert('Failed to update favicon. Make sure the page is loaded.');
    }
}

/**
 * Function that gets injected into the web page to change the favicon
 */
function changeTabFavicon(faviconUrl) {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());
    
    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
    
    // Also add shortcut icon for better compatibility
    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.href = faviconUrl;
    document.head.appendChild(shortcutLink);
}

/**
 * Get emoji character for icon type
 */
function getEmojiForIcon(iconType) {
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

/**
 * Create a data URL for an emoji favicon
 */
function createEmojiFavicon(emoji) {
    // Create an SVG with the emoji
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
            <text x="8" y="12" text-anchor="middle" font-size="12">${emoji}</text>
        </svg>
    `;
    
    // Convert to data URL
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/**
 * Convert uploaded image to data URL
 */
function convertImageToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

/** Save customization to storage
 */
async function saveCustomization(customization) {
    try {
        const tabKey = getTabKey();
        const storage = getStorageArea();
        
        const result = await storage.get([tabKey]);
        const existingData = result[tabKey] || {};
        
        // Merge with new customization
        let updatedData = { ...existingData, ...customization };
        
        // If we're saving a custom favicon, make sure we have the data URL
        if (updatedData.customFavicon === 'custom' && !updatedData.customFaviconDataUrl && customFaviconDataUrl) {
            updatedData.customFaviconDataUrl = customFaviconDataUrl;
        }
        
        // If we're changing from custom to something else, remove the data URL
        if (updatedData.customFavicon !== 'custom' && updatedData.customFaviconDataUrl) {
            delete updatedData.customFaviconDataUrl;
        }
        
        console.log('Saving customization:', updatedData);
        await storage.set({ [tabKey]: updatedData });
        
    } catch (error) {
        console.error('Error saving customization:', error);
    }
}


/**
 * Reset tab to original state
 */
async function resetTab() {
    try {
        // Reset title
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: changeTabTitle,
            args: [originalTitle]
        });
        
        // Reset favicon
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: changeTabFavicon,
            args: [originalFavicon]
        });
        
        // Clear saved customizations
        const tabKey = getTabKey();
        const storage = getStorageArea();
        await storage.remove([tabKey]);
        
        // Update UI
        newTitleInput.value = originalTitle;
        currentTitleSpan.textContent = originalTitle;
        currentFaviconImg.src = originalFavicon;
        selectedFavicon = 'default';
        faviconDropdown.value = 'default';
        customFaviconDataUrl = null;
        fileInputContainer.style.display = 'none';
        
        console.log('Tab reset successfully');
    } catch (error) {
        console.error('Error resetting tab:', error);
        alert('Failed to reset tab');
    }
}

/**
 * Clear session data
 */
/**
 * Clear ALL customizations regardless of persistence setting
 */
async function clearSessionData() {
    if (!confirm('Are you sure you want to clear all customizations? This will reset this tab to its original state.')) {
        return;
    }
    
    try {
        // Clear from session storage (tab-specific)
        const sessionKey = `tab_${currentTab.id}`;
        const originalKey = `original_${currentTab.id}`;
        await chrome.storage.session.remove([sessionKey, originalKey]);
        
        // Clear from local storage (URL-based persistent data)
        await chrome.storage.local.remove([currentTab.url]);
        
        // Reset the tab visually
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: changeTabTitle,
            args: [originalTitle]
        });
        
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: changeTabFavicon,
            args: [originalFavicon]
        });
        
        // Update UI
        newTitleInput.value = originalTitle;
        currentTitleSpan.textContent = originalTitle;
        currentFaviconImg.src = originalFavicon;
        selectedFavicon = 'default';
        faviconDropdown.value = 'default';
        customFaviconDataUrl = null;
        fileInputContainer.style.display = 'none';
        
        alert('All customizations cleared successfully!');
        console.log('All customizations cleared');
    } catch (error) {
        console.error('Error clearing customizations:', error);
        alert('Failed to clear customizations');
    }
}

/**
 * Save current customization as a preset
 */
async function savePreset() {
    const title = newTitleInput.value.trim();
    
    if (!title) {
        alert('Please enter a title first');
        return;
    }
    
    const presetName = prompt('Enter a name for this preset:');
    if (!presetName) return;
    
    try {
        // Get existing presets
        const result = await chrome.storage.local.get(['presets']);
        const presets = result.presets || [];
        
        // Create new preset
        const newPreset = {
            id: Date.now().toString(),
            name: presetName,
            title: title,
            favicon: selectedFavicon
        };
        
        // Include custom favicon data if applicable
        if (selectedFavicon === 'custom' && customFaviconDataUrl) {
            newPreset.customFaviconDataUrl = customFaviconDataUrl;
        }
        
        // Add to presets
        presets.push(newPreset);
        
        // Save back to storage
        await chrome.storage.local.set({ presets: presets });
        
        // Reload presets display
        await loadPresets();
        
        alert('Preset saved successfully!');
    } catch (error) {
        console.error('Error saving preset:', error);
        alert('Failed to save preset');
    }
}

/**
 * Load and display saved presets
 */
async function loadPresets() {
    try {
        const result = await chrome.storage.local.get(['presets']);
        const presets = result.presets || [];
        
        if (presets.length === 0) {
            presetsList.innerHTML = '<p class="no-presets">No presets saved yet</p>';
            return;
        }
        
        // Build presets HTML
        let presetsHTML = '';
        presets.forEach(preset => {
            let iconDisplay;
            if (preset.favicon === 'default') {
                iconDisplay = '🌐';
            } else if (preset.favicon === 'custom') {
                iconDisplay = '📁';
            } else {
                iconDisplay = getEmojiForIcon(preset.favicon);
            }
            
            presetsHTML += `
                <div class="preset-item" data-preset-id="${preset.id}">
                    <div class="preset-info">
                        <span class="preset-emoji">${iconDisplay}</span>
                        <div>
                            <div class="preset-name">${preset.name}</div>
                            <div class="preset-title">${preset.title}</div>
                        </div>
                    </div>
                    <div class="preset-actions">
                        <button class="preset-btn preset-apply" data-preset-id="${preset.id}">Apply</button>
                        <button class="preset-btn preset-delete" data-preset-id="${preset.id}">Delete</button>
                    </div>
                </div>
            `;
        });
        
        presetsList.innerHTML = presetsHTML;
        
        // Add event listeners to the new buttons
        presetsList.querySelectorAll('.preset-apply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetId = e.target.getAttribute('data-preset-id');
                applyPreset(presetId);
            });
        });
        
        presetsList.querySelectorAll('.preset-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetId = e.target.getAttribute('data-preset-id');
                deletePreset(presetId);
            });
        });
        
    } catch (error) {
        console.error('Error loading presets:', error);
    }
}

// In your applyPreset function, ensure you're setting the global variable:
async function applyPreset(presetId) {
    try {
        const result = await chrome.storage.local.get(['presets']);
        const presets = result.presets || [];
        const preset = presets.find(p => p.id === presetId);
        
        if (!preset) {
            alert('Preset not found');
            return;
        }
        
        // Update input and selection
        newTitleInput.value = preset.title;
        selectedFavicon = preset.favicon;
        faviconDropdown.value = preset.favicon;
        
        // Handle custom favicon - CRITICAL: Set the global variable
        if (preset.favicon === 'custom' && preset.customFaviconDataUrl) {
            customFaviconDataUrl = preset.customFaviconDataUrl;
            fileInputContainer.style.display = 'block';
            // Update the preview
            currentFaviconImg.src = customFaviconDataUrl;
        } else {
            fileInputContainer.style.display = 'none';
            // Update the preview for non-custom favicons
            if (preset.favicon !== 'default') {
                const emoji = getEmojiForIcon(preset.favicon);
                const faviconUrl = createEmojiFavicon(emoji);
                currentFaviconImg.src = faviconUrl;
            } else {
                currentFaviconImg.src = originalFavicon;
            }
        }
        8
        // Apply the changes
        await updateTabTitle();
        if (preset.favicon === 'custom' && preset.customFaviconDataUrl) {
            customFaviconDataUrl = preset.customFaviconDataUrl; // Set the global variable
            await updateTabFavicon(preset.favicon, preset.customFaviconDataUrl);
        } else {
            await updateTabFavicon(preset.favicon);
        }
        
    } catch (error) {
        console.error('Error applying preset:', error);
        alert('Failed to apply preset');
    }
}
/**
 * Delete a saved preset
 */
async function deletePreset(presetId) {
    if (!confirm('Are you sure you want to delete this preset?')) {
        return;
    }
    
    try {
        const result = await chrome.storage.local.get(['presets']);
        const presets = result.presets || [];
        const updatedPresets = presets.filter(p => p.id !== presetId);
        
        await chrome.storage.local.set({ presets: updatedPresets });
        await loadPresets();
        
    } catch (error) {
        console.error('Error deleting preset:', error);
        alert('Failed to delete preset');
    }
}

// Event Listeners - Set up event handlers when the popup loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the popup
    initializePopup();
    
    // Title update button
    updateTitleBtn.addEventListener('click', updateTabTitle);
    
    // Enter key in title input
    newTitleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            updateTabTitle();
        }
    });
    
    // Favicon dropdown change
    faviconDropdown.addEventListener('change', function() {
        const selectedValue = this.value;
        
        if (selectedValue === 'custom') {
            fileInputContainer.style.display = 'block';
        } else {
            fileInputContainer.style.display = 'none';
            updateTabFavicon(selectedValue);
        }
    });
    
    // File input change for custom favicon
    faviconFile.addEventListener('change', async function() {
        const file = this.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        // Validate file size (max 1MB)
        if (file.size > 1024 * 1024) {
            alert('Image file must be smaller than 1MB');
            return;
        }
        
        try {
            customFaviconDataUrl = await convertImageToDataUrl(file);
            await updateTabFavicon('custom', customFaviconDataUrl);
        } catch (error) {
            console.error('Error processing custom favicon:', error);
            alert('Failed to process custom favicon');
        }
    });
    
    // Persistence toggle
    persistToggle.addEventListener('change', async function() {
        isPersistenceEnabled = this.checked;
        
        try {
            await chrome.storage.local.set({ persistenceEnabled: isPersistenceEnabled });
            
            // Reload customizations with new storage preference
            await loadSavedCustomizations();
        } catch (error) {
            console.error('Error updating persistence setting:', error);
        }
    });
    
    // Reset button
    resetTabBtn.addEventListener('click', resetTab);
    
    // Save preset button
    savePresetBtn.addEventListener('click', savePreset);
    
    // Clear session button
    clearSessionBtn.addEventListener('click', clearSessionData);
});