// What the desk's toolbar inserts into a post and the catalog shows: every post
// block (src/lib/post-blocks.mjs) with example text, each image frame, and a link.
import { EXAMPLES, FRAMES, IMAGE, markdown } from './post-blocks.mjs';

export type Block = { name: string; group: 'block' | 'frame' | 'inline'; md: string };

const captions: Record<string, string> = {
  offset: 'the image sits on a yellow block',
  teal: 'same, on Aeris teal',
  bracket: 'corner brackets',
  rounded: 'one rounded corner and a yellow tab',
  quarter: 'black and white with a yellow disc',
  tape: 'the caption on black tape',
};

export const BLOCKS: Block[] = [
  ...Object.entries(EXAMPLES).map(([name, data]) => ({ name, group: 'block' as const, md: markdown(name, data) })),
  ...FRAMES.map((frame) => ({ name: frame, group: 'frame' as const, md: IMAGE.markdown({ src: './image.png', alt: 'what it shows', frame, caption: captions[frame] }) })),
  { name: 'link', group: 'inline', md: '[text](https://)' },
];
