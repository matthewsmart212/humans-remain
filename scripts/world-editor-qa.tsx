// Development-only entry: real editor and local drafts, no authentication override.
// Production builds do not include this page.
import React from 'react';
import {createRoot} from 'react-dom/client';
import WorldEditor from '../src/WorldEditor';
createRoot(document.getElementById('root')!).render(<WorldEditor onExit={()=>location.assign('/')} onPlay={()=>location.assign('/#game')}/>);
