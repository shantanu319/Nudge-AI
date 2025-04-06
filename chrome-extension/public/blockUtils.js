/**
 * Blocks a website by adding it to the block list and updating Chrome's declarativeNetRequest rules.
 * @param {string} url - The URL of the website to block.
 * @returns {Promise} A promise that resolves when the blocking is complete
 */
export const blockWebsite = (url) => {
    if (!url.trim()) return Promise.resolve();

    // Extract the root domain from the URL
    let rootDomain;
    try {
        // Remove protocol and path, only keep the domain
        rootDomain = url.trim().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    } catch (error) {
        console.error('Error extracting root domain:', error);
        return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockList = result.blockedSites || [];
            if (!blockList.includes(rootDomain)) {
                const updatedList = [...blockList, rootDomain];
                chrome.storage.local.set({ blockedSites: updatedList }, () => {
                    console.log(`Blocked site added: ${rootDomain}`);

                    // Create rules for the blocked sites
                    const rules = updatedList.map((site, index) => ({
                        id: index + 1,
                        priority: 1,
                        action: { type: 'block' },
                        condition: {
                            urlFilter: `||${site}`,
                            resourceTypes: ['main_frame'],
                        },
                    }));

                    // Update the blocking rules directly
                    chrome.declarativeNetRequest.updateDynamicRules({
                        removeRuleIds: rules.map(r => r.id),
                        addRules: rules
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error updating dynamic rules:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                            return;
                        }

                        // Store the current rules
                        chrome.storage.local.set({ blockedRules: rules }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('Error saving blocked rules:', chrome.runtime.lastError);
                                reject(chrome.runtime.lastError);
                                return;
                            }
                            console.log('Rules updated and saved successfully');

                            // Notify the React frontend about the updated block list
                            chrome.runtime.sendMessage({
                                action: 'blockListUpdated',
                                blockList: updatedList,
                            }).catch(() => {
                                // Ignore errors here as the popup might not be open
                                console.log('Popup not available to receive update');
                            });
                            
                            // Check if any open tabs match the newly blocked domain and reload them
                            // This ensures the content script overlay is triggered immediately
                            chrome.tabs.query({}, (tabs) => {
                                tabs.forEach(tab => {
                                    try {
                                        // Only process http/https URLs
                                        if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                                            const tabDomain = new URL(tab.url).hostname.replace(/^www\./, '');
                                            // Check if tab domain matches or is subdomain of blocked domain
                                            if (tabDomain === rootDomain || tabDomain.endsWith('.' + rootDomain)) {
                                                console.log(`Found open tab matching blocked domain ${rootDomain}, reloading...`);
                                                chrome.tabs.reload(tab.id);
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error checking tab domain:', e);
                                    }
                                });
                            });

                            resolve();
                        });
                    });
                });
            } else {
                resolve(); // URL was already blocked
            }
        });
    });
};