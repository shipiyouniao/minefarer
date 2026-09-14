# River navigation artwork

Generated with OpenAI ImageGen on September 14, 2026. Both transparent PNGs are stored unchanged; game code composites the current profession above the empty hull. The existing [Tidekeeper anchor](tidekeeper-artwork.md) is reused for anchoring and moorings.

| Asset             | File                                   | Use                                                          |
| ----------------- | -------------------------------------- | ------------------------------------------------------------ |
| Empty river skiff | `public/assets/dungeon/river-boat.png` | Board hull, world entry, river selection and sailing control |
| Mooring pier      | `public/assets/dungeon/river-dock.png` | Boarding points, return points and illustrated help          |

## Skiff prompt

> Generate one production game sprite on a truly transparent background: an EMPTY small wooden river skiff viewed from near overhead, 3/4 top-down at 70 degrees, pointing up/north. Minefarer is a minimalist Japanese fantasy chibi board-game RPG: soft sculpted toy-like materials, warm tan wood with muted teal trim, chunky readable silhouette, restrained gold fastenings, a small rope coil. Wide open flat deck in the center/lower center so a separately composited chibi character can stand visibly above it. NO character, NO mast or sail or tall prow covering the passenger, no lettering, no frame, no water background, no painted shadow beyond subtle contact shadow directly underneath. Entire boat fits in central 85 percent of a square canvas. High quality 3D painted game asset, clear enough at 40 px.

## Pier prompt

> Create ONE production game icon on a genuinely transparent background: a tiny fantasy riverside mooring pier, empty, viewed 3/4 overhead at 70 degrees. Compact square wooden platform made of four warm tan planks, two short round posts with muted teal caps and a thick cream rope loop, a small brass cleat in front. Minimal Japanese fantasy chibi board-game RPG, softly sculpted painted 3D toy material, readable chunky silhouette matching warm wooden boat assets. Entire pier central 85 percent of square canvas. No people, no boat, no text, no frame, no surrounding shore or water, no background, no giant cast shadow. Avoid detail clutter, readable at 36px.

Current arrows, rope paths and tutorial layouts are board-native HTML, CSS and SVG. Movement follows the accepted route; no baked image substitutes for a live boat, character or marker state.
