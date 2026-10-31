# Camp chicken viewing group

Ten runtime chickens spawn on clear ground immediately outside the current
camp walls when a new Play session starts. Homes derive from the actual traced
wall colliders; each bird stays within 180 units of home. Spawning never writes
to the saved editor layout. Build mode remains unchanged.

The approved russet-and-cream chicken uses five shared 896 × 896 lossless WebP
atlases (1,963,090 bytes compressed; about 15.3 MiB decoded RGBA). Mirroring
covers all eight directions. Artwork is from the approved chicken animation
pack; only its five runtime atlases are included in the game.

Nearby birds mix spontaneous runs with walking and short blink/peck pauses.
They flee when approached within 160 units, continuing for 1.1 seconds after
the last close approach. Run speed is 165 units/second, below the player's
walking speed. Decisions run at 10 Hz; movement/collision uses the ordinary
fixed simulation tick. Walk/run frames follow actual distance, so blocked birds
do not march in place. Detailed simulation sleeps beyond 1,800 units; rendering
culls against the camera with an 80-unit margin. Each visible bird adds one
image draw and a simple shadow. Moving birds use existing foliage contact.

Chickens have 32 HP: one axe hit or two punches yields one raw chicken through the
existing manual collection, backpack and cooking flow. The brief non-graphic
fall holds a downed pose and fades after two seconds. Dead birds do not move,
take repeat damage or create duplicate drops. There are ten per new run; this
viewing group does not automatically respawn.

Raw and cooked chicken now have matching dedicated whole-chicken artwork for
ground drops, cooking, held food, backpack, quick bar and the Eat button.
The shared renderer and locally bundled atlases serve both web and Expo/iOS.
Checks cover all ten starts, collision/leash, behavior, harvesting, culling,
atlas draws, unchanged editor data and production native renderer output via
the CanvasKit software adapter. The iOS/Hermes export also passes with all five
chicken atlases included. Physical iPhone performance remains unverified.
