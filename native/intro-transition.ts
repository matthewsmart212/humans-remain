/** Shared timing for Watch Intro and Continue. Music starts on the tap and
 * runs independently of video playback, including buffering and menu handoff.
 */
export const INTRO_TITLE_TRANSITION_MS=4000;
export const INTRO_BLACKOUT_MS=3000;
export const INTRO_LOGO_FADE_MS=INTRO_TITLE_TRANSITION_MS-INTRO_BLACKOUT_MS;
