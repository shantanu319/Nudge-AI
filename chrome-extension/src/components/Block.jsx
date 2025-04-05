import React from 'react';

const Block = () => {
    const blockDocs = () => {
        const now = new Date().getTime();
        const unblockTime = now + 60 * 1000; // 1 minute from now
        chrome.storage.local.set({ docsBlockUntil: unblockTime }, () => {
            console.log('Docs blocked for 1 minute');
        });

        chrome.declarativeNetRequest.updateDynamicRules(
            {
                addRules: [
                    {
                        id: 1,
                        priority: 1,
                        action: { type: 'block' },
                        condition: { urlFilter: 'docs.google.com', resourceTypes: ['main_frame'] },
                    },
                ],
                removeRuleIds: [1],
            },
            () => console.log('Blocking rule applied')
        );

        setTimeout(() => {
            chrome.declarativeNetRequest.updateDynamicRules(
                { removeRuleIds: [1] },
                () => console.log('Blocking rule removed')
            );
        }, 60 * 1000); // Remove block after 1 minute
    };

    return (
        <Button onClick={blockDocs}>
            Block docs for 1 Minute
        </Button>
    );
};

export default Block;