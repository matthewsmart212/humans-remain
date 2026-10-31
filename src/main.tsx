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

// Keep the editor mounted across Build, Play and Library transitions.
createRoot(document.getElementById('root')!).render(<AssetWorldGate><WorldEditor/></AssetWorldGate>);
