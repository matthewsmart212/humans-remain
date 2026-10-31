# Empty camp recovery after v105

The saved production camp remained intact at revision 64: 1,368 objects. The
asset-library retirement list hid seven old wall records from the artwork API.
Startup hydrated six records instead of thirteen, then rejected both the local
and remote layouts because their old walls were unknown. The editor silently
used and cached an empty placeholder; its newer timestamp could hide the intact
cloud camp on subsequent visits.

The runtime now explicitly requests the complete artwork registry. The picker
still hides retired walls. Server layout validation also retains compatibility
with retired IDs and fixed tier geometry. Startup restores a populated cloud
camp over an unedited legacy empty placeholder, while retaining newer real edits
and explicitly cleared drafts. Invalid loads block startup and cannot overwrite
the local cache. Before replacing an invalid local draft or deliberately clearing
a populated one, one prior copy is kept on the device.

`node scripts/check-world-recovery.mjs` reproduces the failure from the saved
pre-update camp through the built production Worker and the actual client
`fetchArtwork` function. It verifies fresh, intact, invalid, offline and cached
empty startup; intentional clear and newer edits; preservation of all 1,357
non-wall placements; and migration/save/reload of 1,411 objects with six gates.
All writes in this check use disposable SQLite, not the production database.

The production Worker perimeter persistence check and TypeScript/build checks
also pass. Browser automation was unavailable; no physical iPhone verification
was performed. No direct production layout overwrite was performed.
