/** Shared timing for Watch Intro and Continue. Continue starts music on
 * the tap; Watch Intro waits for the movie to actually start playing after
 * the silent title sequence. Music then continues across the menu handoff.
 */
export const INTRO_TITLE_TRANSITION_MS=4000;
export const INTRO_BLACKOUT_MS=3000;
export const INTRO_LOGO_FADE_MS=INTRO_TITLE_TRANSITION_MS-INTRO_BLACKOUT_MS;
