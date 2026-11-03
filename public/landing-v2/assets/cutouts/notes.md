# Section cutouts

People on a transparent background, so they stand on the section colour the way `hero-students-cutout` does
in the hero. Both are AI-generated images, not real students or teachers.

| File | Size | Used in |
| --- | --- | --- |
| `support-mentor-ai.webp` | 1527 × 1016 | the support section (`StaticSections.tsx`) |
| `support-mentor-ai-800.webp` | 800 × 532 | same, small screens |
| `exam-student-v2.webp` | 1356 × 1024 | the exam panel (`ExamIntroSection.tsx`) |
| `exam-student-v2-800.webp` | 800 × 604 | same, small screens |

In the `-800` names, 800 is the width, matching the repo's `800w` srcSet convention.

## What is in the frame

- **Support:** a teacher points at the open notebook while a student writes in it. Beside them, a tablet on
  its stand shows an AI tutor chat with abstract bubbles and a small robot. No words are readable.
- **Exam:** a student fills in a bubble answer sheet with a pencil while she holds the question booklet. The
  answer sheet runs off the bottom edge, so anchor the image to the bottom of its box.
- In both images the desk was removed. The notebook, the answer sheet and the tablet rest on an unseen desk.

## How they were made

1. Both were generated as 1536 × 1024 PNGs with transparent backgrounds, using Codex's built-in image
   generator. The prompts:
   - **Support:** a Vietnamese female mentor, about 28, in a soft-coloured blouse, sits beside a Vietnamese
     male high-school student in a white school shirt. She points at his notebook and explains while he
     listens and writes. A tablet angled toward them shows an AI tutor chat with abstract bubbles and a small
     friendly robot avatar. Photorealistic, soft daylight, no logos, no readable text.
   - **Exam:** a Vietnamese female high-school student in a white school shirt, hair tied back, takes a paper
     multiple-choice exam. She fills in bubbles with a pencil while holding and reading the question booklet,
     calm and focused, seen from a slight front angle. Photorealistic, soft daylight, no logos, no readable
     text.
2. The generator left the desk strip in, and it ran to the frame edges. The desk was taken out with rembg
   2.0.86 `birefnet-general` (`only_mask=True`, `post_process_mask=False`). The model also dropped part of
   the paper, so the paper was added back as neutral-coloured pixels below the desk line. Neutral here means
   |a\*| < 4.5 and b\* < 4.5 in Lab, which the warm desk is not. Each big piece of paper was then replaced by
   its convex hull. The result was intersected with the generator's own alpha.
3. Specks were removed by dropping connected components under 4000 px.
4. Edge colour was re-estimated with `pymatting.estimate_foreground_ml`, so the old background does not tint
   the fringe.
5. Each image was cropped to the alpha > 8 bounding box plus 4 px of padding.
6. Export used Pillow WebP at `quality=82, method=6, alpha_quality=90`. The `-800` files were resized with
   premultiplied-alpha Lanczos.
