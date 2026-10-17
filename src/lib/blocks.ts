// The blocks a post can use: fenced blocks that src/lib/rehype-notes.mjs turns
// into designed blocks, image frames, and a plain link. The desk's toolbar
// inserts these, and the desk's catalog (src/pages/desk/catalog) shows each one.
export type Block = { name: string; group: 'block' | 'frame' | 'inline'; md: string };

const frame = (name: string, caption: string): Block => ({ name, group: 'frame', md: `![what it shows](./image.png "${name} | ${caption}")` });

export const BLOCKS: Block[] = [
  { name: 'callout', group: 'block', md: '```callout\nHeads up\nThe one thing a reader should not miss.\n```' },
  { name: 'aeris', group: 'block', md: '```aeris\nBuilt on Aeris\nWorkstation notes, setup, things that happened on the machine.\n```' },
  { name: 'pull', group: 'block', md: '```pull\nA line worth pulling out.\n-- drei\n```' },
  { name: 'bignum', group: 'block', md: '```bignum\n80%\nWhat the number means.\n```' },
  { name: 'shout', group: 'block', md: '```shout\nGG\n```' },
  { name: 'tape', group: 'block', md: '```tape\nOne line on black tape\n```' },
  { name: 'notes', group: 'block', md: '```notes\n+ added\n- removed\n~ changed\n! broke\n```' },
  frame('offset', 'the image sits on a yellow block'),
  frame('teal', 'same, on Aeris teal'),
  frame('bracket', 'corner brackets'),
  frame('rounded', 'one rounded corner and a yellow tab'),
  frame('quarter', 'black and white with a yellow disc'),
  frame('tape', 'the caption on black tape'),
  { name: 'link', group: 'inline', md: '[text](https://)' },
];
