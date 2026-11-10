/** Title-card transition before The Reclamation begins. Film playback is
 * deliberately held until this sequence finishes; music starts on the tap.
 */
export const INTRO_TITLE_TRANSITION_MS=4000;
export const INTRO_BLACKOUT_MS=3000;
export const INTRO_LOGO_FADE_MS=INTRO_TITLE_TRANSITION_MS-INTRO_BLACKOUT_MS;
export const INTRO_SOUNDTRACK_HEADSTART_SECONDS=INTRO_TITLE_TRANSITION_MS/1000;

/** The soundtrack starts four seconds ahead of the film, then continues into
 * the menu without seeking back. Account for a looping MP3 during narration.
 */
export function introMusicTime(videoSeconds:number,soundtrackDuration=0){
 const time=Math.max(0,videoSeconds)+INTRO_SOUNDTRACK_HEADSTART_SECONDS;
 return soundtrackDuration>0?time%soundtrackDuration:time;
}
