#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const ms=value=>finite(value)?`${value.toFixed(2)} ms`:'unavailable';
const decimal=value=>finite(value)?value.toFixed(2):'?';
const dimensions=[['frames','frameColumns'],['renderPhases','renderPhaseColumns'],['frameContexts','frameContextColumns'],['systemTimings','systemTimingColumns']];
export function validatePerformanceReport(report){
 if(!report||report.schema!=='safety-last-performance/v2')throw Error('Expected a safety-last-performance/v2 JSON recording.');
 if(!Array.isArray(report.frames)||!Array.isArray(report.frameColumns))throw Error('Missing frame rows or columns.');
 if(report.frames.length>120000)throw Error('Recording exceeds the supported 120,000-frame limit.');
 for(const [rowsKey,columnsKey] of dimensions){
  const rows=report[rowsKey],columns=report[columnsKey];if(rows===undefined&&rowsKey!=='frames')continue;
  if(!Array.isArray(rows)||!Array.isArray(columns)||columns.some(value=>typeof value!=='string')||new Set(columns).size!==columns.length||rows.length!==report.frames.length)throw Error(`Invalid or misaligned ${rowsKey}.`);
  for(const row of rows)if(!Array.isArray(row)||row.length!==columns.length||row.some(value=>!finite(value)&&!(rowsKey==='frameContexts'&&value===null)))throw Error(`Invalid numeric row in ${rowsKey}.`);
 }
 for(const required of ['elapsedMs','frameMs','updateCpuMs','renderCpuMs'])if(!report.frameColumns.includes(required))throw Error(`Missing frame column: ${required}.`);
 return report;
}
const contextText=context=>!context?'exact context unavailable':`player (${decimal(context.playerX)}, ${decimal(context.playerY)}), zoom ${decimal(context.zoom)}, atlas ${decimal(context.atlasZoom)}, pinch ${context.pinching===true?'yes':context.pinching===false?'no':'?'}, map ${context.mapVisible===true?'open':context.mapVisible===false?'closed':'?'}, enemies ${finite(context.enemyCount)?context.enemyCount:'?'}`;
const workText=frame=>{
 if(!frame)return 'unavailable (first interval after start/resume or old log)';
 const detail=Object.entries(frame.systems||{}).filter(([,value])=>finite(value)&&value>0).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,value])=>`${name} ${ms(value)}`).join(', ');
 return `update ${ms(frame.updateCpuMs)}, draw ${ms(frame.renderCpuMs)}${detail?`; spans: ${detail}`:''}`;
};
export function analyzePerformanceReport(input){
 const report=validatePerformanceReport(input),summary=report.summary||{},lines=[];
 lines.push(`Humans Remain performance · ${report.startedAt||'unknown start'} · ${report.recorderRevision||'legacy recorder'}`);
 lines.push(`Platform: ${report.metadata?.platform||'unknown'} · JS mode: ${report.metadata?.developmentBuild===true?'development':report.metadata?.developmentBuild===false?'production (native build type unverified)':'unknown'} · ${report.frames.length} active intervals`);
 lines.push(`JS callback cadence: ${decimal(summary.averageFps)} FPS · p95 ${ms(summary.p95FrameMs)} · p99 ${ms(summary.p99FrameMs)} · worst ${ms(summary.worstFrameMs)}`);
 lines.push(`Measured CPU: update ${ms(summary.meanUpdateCpuMs)} · draw ${ms(summary.meanRenderCpuMs)}`);
 if(report.uiCadence)lines.push(`Observed native UI cadence: ${decimal(report.uiCadence.callbackFps)} FPS · worst ${ms(report.uiCadence.worstFrameMs)} · ${report.uiCadence.intervals} intervals in delivered batches`);
 else lines.push('Native UI callback cadence is unavailable in this recording.');
 lines.push('Neither JS nor UI callback cadence measures GPU completion/displayed FPS. Nested system spans must not be added to their parent.');
 lines.push('');lines.push('Worst retained frames (the interval ends at current; preceding work may explain its delay):');
 const slow=(Array.isArray(report.slowFrames)?report.slowFrames:[]).slice(0,10);
 if(!slow.length)lines.push('No retained slow frames.');
 for(const event of slow){
  const current=event.current,previous=event.previous;
  if(!current||!finite(current.elapsedMs)||!finite(event.frameMs))continue;
  lines.push(`  ${(current.elapsedMs/1000).toFixed(3)}s · frame #${current.frameIndex} · interval ${ms(event.frameMs)}`);
  lines.push(`    Current: ${workText(current)}`);lines.push(`    ${contextText(current.context)}`);
  lines.push(`    Previous: ${workText(previous)}`);
  if(previous){lines.push(`    ${contextText(previous.context)}`);lines.push(`    Interval outside previous measured work: ${ms(Math.max(0,event.frameMs-(finite(previous.measuredCpuMs)?previous.measuredCpuMs:previous.updateCpuMs+previous.renderCpuMs)))} (includes frame pacing and uninstrumented work)`)}
 }
 if(Array.isArray(report.timeline)&&report.timeline.length){
  const worst=[...report.timeline].filter(bucket=>finite(bucket.worstFrameMs)).sort((a,b)=>b.worstFrameMs-a.worstFrameMs).slice(0,5);
  lines.push('');lines.push('Worst one-second callback buckets:');
  for(const bucket of worst)lines.push(`  ${bucket.fromMs/1000}–${bucket.toMs/1000}s · ${decimal(bucket.callbackFps)} FPS · p95 ${ms(bucket.p95FrameMs)} · worst ${ms(bucket.worstFrameMs)} · frames ${bucket.firstFrameIndex}–${bucket.lastFrameIndex}`);
 }
 const diagnostics=report.diagnostics||{};
 lines.push('');lines.push(`Retention: ${diagnostics.slowFramesOmitted??'?'} additional slow-frame summaries omitted; ${diagnostics.traceEventsDropped??'?'} trace events omitted; ${diagnostics.hitchCapturesOmitted??'?'} hitch windows omitted. All recorded frame rows remain available.`);
 lines.push('For unexplained gaps, correlate retained events and run an on-device release/profile Instruments capture; this report does not assign a cause from temporal overlap.');
 return lines.join('\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);if(args.length!==1||args[0].startsWith('--'))throw Error('Usage: node scripts/analyze-performance-log.mjs performance-logs/latest.json');
  const stat=fs.statSync(args[0]);if(stat.size>200*1024*1024)throw Error('Recording is larger than the supported 200 MiB limit.');
  console.log(analyzePerformanceReport(JSON.parse(fs.readFileSync(args[0],'utf8'))));
 }catch(error){console.error(`Cannot analyze recording: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1}
}
