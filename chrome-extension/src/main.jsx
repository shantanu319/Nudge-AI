import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './components/main/Popup';
import './index.css';

const root = document.getElementById('root');
if (root) {
    const reactRoot = createRoot(root);
    reactRoot.render(
        <React.StrictMode>
            <Popup />
        </React.StrictMode>
    );
}