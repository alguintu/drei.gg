// Hand-edited bits of the home page. Posts live in src/content/posts.

export const domainBought = new Date('2026-10-16');

// The ticker under the hero. verb style: 'good' is blue, 'bad' is red.
export const killfeed = [
  { who: 'drei', verb: 'bought', what: 'drei.gg', style: 'good' },
  { who: 'drei', verb: 'shipped', what: 'this site', style: 'good' },
  { who: 'marketing', verb: 'was kicked', what: 'from the lobby', style: 'bad' },
  { who: 'the models', verb: 'got', what: 'better again', style: 'good' },
  { who: 'you', verb: 'joined', what: 'the server', style: 'good' },
] as const;

// Products. status: 'live' fills the slot, 'empty' draws a dashed placeholder.
export const inventory = [
  { name: 'drei.gg', note: 'this site · live', status: 'live', href: '/' },
  { name: 'empty slot', note: 'first product goes here', status: 'empty' },
  { name: 'empty slot', note: 'reserved', status: 'empty' },
] as const;

export const rules = [
  'We build, then we post. Never the other way around.',
  'Say what we actually think.',
  'Dead projects get a funeral, not a cover-up.',
  'Marketing happens somewhere else.',
];
