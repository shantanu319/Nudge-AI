/**
 * Blocks a website by adding it to the block list and updating Chrome's declarativeNetRequest rules.
 * @param {string} url - The URL of the website to block.
 */
export const blockWebsite = (url) => {
    if (!url.trim()) return;

    chrome.storage.local.get(['blockedSites'], (result) => {
        const blockList = result.blockedSites || [];
        if (!blockList.includes(url.trim())) {
            const updatedList = [...blockList, url.trim()];
            chrome.storage.local.set({ blockedSites: updatedList }, () => {
                console.log(`Blocked site added: ${url}`);

                // Notify the React frontend about the updated block list
                chrome.runtime.sendMessage({
                    action: 'blockListUpdated',
                    blockList: updatedList,
                });

                // Update block rules
                const rules = updatedList.map((url, index) => ({
                    id: index + 1,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: `||${url.replace(/https?:\/\//, '')}`,
                        resourceTypes: ['main_frame'],
                    },
                }));

                chrome.runtime.sendMessage({
                    action: 'updateBlockedSites',
                    rules,
                });
            });
        }
    });
};