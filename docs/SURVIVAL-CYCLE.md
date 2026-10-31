# Survival clock and weather

An authored Play run uses a 120-second day and 60-second night. The final 20 seconds of daytime fade into dusk, with a return-to-camp warning; the final 10 seconds of night fade into dawn. These transitions are included in the three-minute loop. The day counter advances at dawn.

The 2:1 day/night ratio follows the pacing documented for 99 Nights in the Forest (community wiki: 180-second day / 90-second night), shortened to the requested faster loop.

Weather selects weighted morning, afternoon and night patterns: clear skies, fog, showers, mist with rain, downpours and thunderstorms. Fronts blend over 20 seconds; the first morning is clear and the first afternoon can only bring mild showers. Consecutive days cannot select the same full pattern. Lightning waits for the front to arrive and respects reduced motion.

The shared simulation owns the clock on web and native. Pause and ended runs stop it; scene travel carries the clock and weather into interiors. Existing shelter and campfire lighting remain in use. The HUD shows day, stage, phase countdown and weather. No automatic enemy waves are added.

Verification: full cycle boundaries, smooth lighting, 60 deterministic weather cycles, first-day constraints, delayed lightning, reduced motion and actual authored play-loop integration. Existing weather, expedition, campfire and HUD checks pass. Layout proofs are software renders; browser and physical-device checks were unavailable.
