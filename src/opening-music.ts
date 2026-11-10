/** The title, movie and menu share one streaming soundtrack. The movie keeps
 * its embedded narration and never replaces the soundtrack's source or clock.
 */
export function createOpeningMusic(
  audio: HTMLAudioElement,
  showRetry: (visible: boolean) => void,
  session?: { type: string },
) {
  audio.volume = 0.72;
  let previousSession: string | undefined;
  let wanted = false;
  let pending = false;
  let disposed = false;
  let generation = 0;

  function playbackFailed() {
    if (wanted && !disposed) showRetry(true);
  }

  function playbackStarted() {
    if (wanted && !disposed) showRetry(false);
  }

  function playbackPaused() {
    if (audio.paused) playbackFailed();
  }

  audio.addEventListener('error', playbackFailed);
  audio.addEventListener('pause', playbackPaused);
  audio.addEventListener('playing', playbackStarted);

  function start(retry = false) {
    if (disposed) return;
    wanted = true;
    if (pending || (!audio.paused && !audio.error)) return;
    if (audio.error) {
      if (!retry) { playbackFailed(); return; }
      audio.load();
    }

    // Choose the same media playback session before either the music or the
    // narrated film begins. Older browsers use the audio element's default.
    if (session && session.type !== 'playback') {
      try {
        previousSession ??= session.type;
        session.type = 'playback';
      } catch { /* Session selection is optional for HTML audio. */ }
    }

    const request = ++generation;
    pending = true;
    // Keep this call synchronous with the tap, even when the MP3 is buffering.
    void audio.play().then(() => {
      if (request === generation) playbackStarted();
    }, () => {
      if (request === generation) playbackFailed();
    }).finally(() => {
      if (request === generation) pending = false;
    });
  }

  function pause() {
    wanted = false;
    pending = false;
    ++generation;
    audio.pause();
  }

  function dispose() {
    disposed = true;
    pause();
    audio.removeEventListener('error', playbackFailed);
    audio.removeEventListener('pause', playbackPaused);
    audio.removeEventListener('playing', playbackStarted);
    if (session?.type === 'playback' && previousSession !== undefined) {
      try { session.type = previousSession; } catch { /* Optional browser API. */ }
    }
  }

  return { start, pause, dispose };
}
