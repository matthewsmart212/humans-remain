import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow-condensed/900.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import './styles.css';
import AssetWorldGate from './AssetWorldGate';
import WorldEditor from './WorldEditor';

// Each browser visit starts at camp; World Builder is opened from Settings.
window.history.replaceState(null,'',location.pathname+location.search+'#start');

// Keep the editor mounted across Build, Play and Library transitions.
createRoot(document.getElementById('root')!).render(<AssetWorldGate><WorldEditor/></AssetWorldGate>);
