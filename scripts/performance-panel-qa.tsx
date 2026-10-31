// Internal-only fixture for the actual recording/export panel and renderer.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {GamePerformancePanel} from '../src/GamePerformance';
import type {GamePerformanceRecorder} from '../src/performance-recording';
import '../src/game-play.css';
export function mountPerformanceQA(recorder:GamePerformanceRecorder,onStart:()=>void,onSummary:()=>void){
 const panel=document.createElement('section');panel.style.cssText='max-width:760px;margin:16px;padding:16px';document.body.append(panel);
 const root=createRoot(panel);root.render(<GamePerformancePanel recorder={recorder} onStart={onStart} onBack={onSummary}/>);
}
