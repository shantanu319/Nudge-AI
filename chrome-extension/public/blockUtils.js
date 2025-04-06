/**
 * Blocks a website by adding it to the block list and updating Chrome's declarativeNetRequest rules.
 * @param {string} url - The URL of the website to block.
 * @returns {Promise} A promise that resolves when the blocking is complete
 */
export const blockWebsite = (url) => {
    if (!url.trim()) return Promise.resolve();

    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockList = result.blockedSites || [];
            if (!blockList.includes(url.trim())) {
                const updatedList = [...blockList, url.trim()];
                chrome.storage.local.set({ blockedSites: updatedList }, () => {
                    console.log(`Blocked site added: ${url}`);

                    // Create rules for the blocked sites
                    const rules = updatedList.map((url, index) => ({
                        id: index + 1,
                        priority: 1,
                        action: { type: 'block' },
                        condition: {
                            urlFilter: `||${url.replace(/https?:\/\//, '')}`,
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