# Character refinement v2

Created with the built-in image_gen tool. Transparent PNG replacements for Mai and Nam, embedded via SVG symbols to preserve all existing hero and course-card placements. Original generation outputs are retained in the Codex generated_images folder.

## Prompt direction
- Mai: preserve navy side ponytail, golden clip, coral top, navy trousers and yellow book. Refine the book grip with thumb and curled fingers, an open five-finger greeting, natural wrists/elbows, expressive eyes and full shoes. Match the owl with crisp rounded silhouettes, subtle cel shading and soft highlights. Isolated full body, transparent background, no text or extra props.
- Nam: preserve navy tousled hair, rounded glasses, purple top, navy trousers and teal book. Use refined Mai and the owl as rendering references. Clear supporting hand around book, readable five-finger greeting, natural joints, coherent book thickness and spine, matching highlights and shaded blue shoes. Isolated full body, transparent background, no text or extra characters.

## Assets
- assets/mai-student-v2.png
- assets/nam-student-v2.png

## Verification
- Visually checked the hero on desktop and 390px mobile, plus course-card reuse.
- Both image references are embedded into hocluc-standalone.html as PNG data URLs.
- preserveAspectRatio="xMidYMid meet" prevents stretching.
- No horizontal overflow at 390px.