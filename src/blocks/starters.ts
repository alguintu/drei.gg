// Page templates: ready-made pages to start from. "+ new page" in the desk and
// the MCP new_page tool make a page from one of these; /templates/ shows them all.
// Each is a page template (basic, wide, sidebar, docs) plus its first blocks,
// written so the page reads finished before anything is changed: swap the words.
// Every one is checked against the block schemas in npm test.
import type { BlockData } from './schema';

type B = BlockData;
type Regions = Record<string, B[]>;
export interface Starter {
  title: string;
  group: 'Essentials' | 'Product' | 'Work and people' | 'Writing and docs' | 'Utility';
  description: string;
  template: 'basic' | 'wide' | 'sidebar' | 'docs';
  regions: (name: string, id: string) => Regions;
}

const btn = (label: string, href: string, style: 'solid' | 'ghost' = 'solid') => ({ label, href, style });
const heading = (title: string, kicker = ''): B => ({ type: 'heading', kicker, title });
const prose = (markdown: string): B => ({ type: 'prose', markdown });
const posts = (label: string, count = 5, style: 'rows' | 'cards' = 'rows', tag: '' | 'ship' | 'build' | 'rant' | 'dead' = '', project?: string): B =>
  ({ type: 'postlist', label, tag, count, style, ...(project ? { project } : {}) }) as B;
const elsewhere = [
  { label: 'GitHub', value: '@alguintu', href: 'https://github.com/alguintu' },
  { label: 'RSS', value: 'drei.gg/feed.xml', href: '/feed.xml' },
];

export const STARTERS: Record<string, Starter> = {
  // ---- Essentials ----
  plain: {
    title: 'Plain page',
    group: 'Essentials',
    description: 'A heading and some text. Everything else is one “add block” away.',
    template: 'basic',
    regions: (name) => ({ main: [heading(name), prose('Write here.')] }),
  },
  about: {
    title: 'About',
    group: 'Essentials',
    description: 'Who’s behind this, the short version and the long one, with facts in a sidebar.',
    template: 'sidebar',
    regions: (name) => ({
      main: [
        { type: 'masthead', kicker: 'about', title: 'Hi. I’m Drei. I ==build things== and write down how it went.', lede: 'This is the devlog: what shipped, what broke, and what I’d do differently.', buttons: [btn('Read the log', '/log/'), btn('Get in touch', '/contact/', 'ghost')], size: 'big' },
        prose('## The short version\n\nOne person, one workstation (Aeris), two agents (Anya and Eris), and a habit of building in public.\n\n## The long version\n\nWrite the story here: how you got into this, what you care about, what this site is for.\n\n```pull\nShip it, then write down why it broke.\n-- the house rule\n```'),
        { type: 'timeline', label: 'So far', items: [
          { date: '2026', title: 'drei.gg', text: 'Bought the domain, built the ==desk==, started the log.' },
          { date: 'Before', title: 'Everything else', text: 'The jobs, the projects, the detours. One line each.' },
        ] },
      ],
      aside: [
        { type: 'specs', label: 'Facts', rows: [
          { key: 'Based in', value: 'Manila, PH' },
          { key: 'Builds with', value: 'Astro, Node, agents' },
          { key: 'Machine', value: 'Aeris' },
          { key: 'Status', value: '==shipping==' },
        ] },
        { type: 'contact', label: 'Find me', items: elsewhere },
      ],
    }),
  },
  now: {
    title: 'Now',
    group: 'Essentials',
    description: 'What has your attention this month, in the nownownow.com tradition.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Now', 'What I’m doing now'),
        { type: 'tape', text: 'Updated: write the month here' },
        { type: 'specs', label: 'This month', rows: [
          { key: 'Building', value: 'What’s on Aeris this week' },
          { key: 'Shipping next', value: 'The next thing in the inventory' },
          { key: 'Playing', value: 'The game, if there’s time' },
          { key: 'Reading', value: 'One or two things' },
        ] },
        prose('A [now page](https://nownownow.com/about) is what has my attention this month, not a résumé.'),
        posts('Latest from the log', 3),
      ],
    }),
  },
  uses: {
    title: 'Uses',
    group: 'Essentials',
    description: 'The kit: hardware, software, and what this site runs on, as spec sheets.',
    template: 'sidebar',
    regions: () => ({
      main: [
        heading('Uses', 'The kit'),
        prose('What drei.gg is built with and on. Links aren’t affiliate links; there’s nothing to sell yet.'),
        { type: 'specs', label: 'Aeris, the workstation', rows: [
          { key: 'CPU', value: '—' },
          { key: 'GPU', value: '—' },
          { key: 'Memory', value: '—' },
          { key: 'OS', value: 'Fedora, KDE' },
        ] },
        { type: 'specs', label: 'Software', rows: [
          { key: 'Agents', value: 'Anya (Claude) and Eris (Codex)' },
          { key: 'Editor', value: '—' },
          { key: 'Terminal', value: '—' },
        ] },
        { type: 'specs', label: 'This site', rows: [
          { key: 'Framework', value: 'Astro, static' },
          { key: 'Hosting', value: 'DigitalOcean App Platform' },
          { key: 'Editing', value: 'The ==desk==, local, with an MCP server' },
        ] },
      ],
      aside: [
        { type: 'aeris', heading: 'On Aeris', body: 'Anything machine-specific worth bragging about.' },
        { type: 'logos', label: 'Stack', items: [{ name: 'Astro' }, { name: 'Node' }, { name: 'Pagefind' }, { name: 'DigitalOcean' }] },
      ],
    }),
  },
  contact: {
    title: 'Contact',
    group: 'Essentials',
    description: 'An email set big, handles elsewhere, and what to expect from a reply.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Say hi', 'contact'),
        { type: 'contact', label: 'Email is best', email: 'hello@drei.gg', note: 'I read everything. I reply to *most* things, usually within a week.', items: elsewhere },
        { type: 'faq', label: 'Before you write', items: [
          { q: 'Do you take freelance work?', a: 'Sometimes. Say what it is and when it’s due.' },
          { q: 'Can I republish a post?', a: 'Ask first, link back, and it’s ==usually yes==.' },
        ] },
      ],
    }),
  },
  links: {
    title: 'Links',
    group: 'Essentials',
    description: 'A link-in-bio page: big stacked links, nothing else in the way.',
    template: 'basic',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'drei.gg', title: 'Links', lede: 'Everywhere else I am.', buttons: [], size: 'big' },
        { type: 'links', label: '', items: [
          { label: 'The devlog', href: '/log/', note: 'Everything I’ve shipped and broken' },
          { label: 'GitHub', href: 'https://github.com/alguintu', note: '@alguintu' },
          { label: 'RSS', href: '/feed.xml', note: 'No newsletter. On purpose.' },
          { label: 'Now', href: '/now/', note: 'What I’m on this month' },
        ] },
      ],
    }),
  },
  colophon: {
    title: 'Colophon',
    group: 'Essentials',
    description: 'How the site is made: type, stack, tools, and the rules it follows.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Colophon', 'how this is made'),
        prose('drei.gg is a static site. Every page is made of blocks, edited in a local tool called the desk, and pushed to GitHub, which deploys it.'),
        { type: 'specs', label: 'Made with', rows: [
          { key: 'Type', value: 'Anybody for display, the system mono for labels' },
          { key: 'Palette', value: 'Typewriter: ink, ==marker==, a ribbon of red' },
          { key: 'Framework', value: 'Astro' },
          { key: 'Search', value: 'Pagefind, no server' },
          { key: 'Hosting', value: 'DigitalOcean' },
        ] },
        { type: 'rules', label: 'Rules this site follows', items: ['No trackers.', 'No newsletter.', 'Works without JavaScript.', 'Red is an accent, never a wall.'] },
      ],
    }),
  },

  manifesto: {
    title: 'Manifesto',
    group: 'Essentials',
    description: 'Big type, numbered convictions and a sign-off.',
    template: 'basic',
    regions: () => ({
      main: [
        { type: 'shout', lines: ['BUILD', 'THEN', 'POST'] },
        prose('Every week there’s a new post saying software is over. Maybe. The tools got absurdly good, so the only sane move is to use them and ship more weird things than we ever could before.'),
        { type: 'features', label: 'We believe', columns: '2', items: [
          { mark: '01', title: 'Build, then post', text: 'Never the other way around.' },
          { mark: '02', title: 'Say what we think', text: 'Hedging is a funnel for opinions.' },
          { mark: '03', title: 'Funerals, not cover-ups', text: 'Dead projects get a post with a ==cause of death==.' },
          { mark: '04', title: 'Marketing happens elsewhere', text: 'This is a log, not a landing page.' },
        ] },
        { type: 'tape', text: 'Good luck. We’re all screwed. Build anyway.' },
      ],
    }),
  },

  // ---- Product ----
  project: {
    title: 'Project',
    group: 'Product',
    description: 'A product’s home: name, status, pitch, links, and the posts filed under it.',
    template: 'basic',
    regions: (name, id) => ({
      main: [
        { type: 'project', name, status: 'building', pitch: 'What it is, in a line.', links: [] },
        prose('Write here.'),
        posts('Log', 20, 'rows', '', id),
      ],
    }),
  },
  launch: {
    title: 'Launch',
    group: 'Product',
    description: 'A full landing page: huge masthead, stats, features, how it works, quotes, pricing, FAQ, final call.',
    template: 'wide',
    regions: (name) => ({
      main: [
        { type: 'masthead', kicker: 'new · v0.1', title: `${name}: the ==one-line promise== goes here`, lede: 'Who it’s for and what it saves them, in a sentence or two. No buzzwords.', buttons: [btn('Get it', '#pricing'), btn('Read the devlog', '/log/', 'ghost')], size: 'huge' },
        { type: 'logos', label: 'Built with', items: [{ name: 'Astro' }, { name: 'Node' }, { name: 'Claude' }, { name: 'Codex' }, { name: 'DigitalOcean' }] },
        { type: 'stats', label: 'So far', items: [{ number: '1', label: 'day to build' }, { number: '14', label: 'MCP tools' }, { number: '0', label: 'trackers' }] },
        { type: 'features', label: 'What you get', columns: '3', items: [
          { mark: '01', title: 'Does the thing', text: 'The main benefit, said plainly.' },
          { mark: '02', title: 'Without the other thing', text: 'The pain it removes.' },
          { mark: '03', title: 'And stays out of the way', text: 'Why it’s *pleasant* to use.' },
        ] },
        { type: 'split', kicker: 'how it feels', title: 'Show it ==working==', body: 'A screenshot or a short clip beats a paragraph. Put one here and say what the reader is looking at.', side: 'right', cta_label: 'See the changelog', cta_href: '/changelog/' },
        { type: 'steps', label: 'How it works', items: [
          { title: 'Install', text: 'One command.' },
          { title: 'Point it at your stuff', text: 'It finds what it needs.' },
          { title: 'Ship', text: 'That’s it. ==gg==.' },
        ] },
        { type: 'testimonials', label: 'People said', items: [
          { quote: 'Replace this with something a real person said.', name: 'A real person', role: '@handle' },
          { quote: 'Short quotes work best. One sentence, specific.', name: 'Another one', role: 'Builder' },
          { quote: 'If nobody has said anything yet, delete this block. Don’t make it up.', name: 'Drei', role: 'drei.gg' },
        ] },
        { type: 'pricing', label: 'Pricing', tiers: [
          { name: 'Free', price: '$0', period: 'forever', pitch: 'Everything you need to try it.', features: ['The core', 'Community help'], cta_label: 'Start', cta_href: '#', featured: false },
          { name: 'Pro', price: '$9', period: '/mo', pitch: 'For people who use it daily.', features: ['Everything in Free', 'The good stuff', 'Priority fixes'], cta_label: 'Go pro', cta_href: '#', featured: true },
        ], note: 'Prices in USD. Cancel any time.' },
        { type: 'faq', label: 'Questions', items: [
          { q: 'Is it ready?', a: 'It’s v0.1. It works, and it’ll get better in public.' },
          { q: 'What happens to my data?', a: 'Say exactly where it lives.' },
        ] },
        { type: 'cta', kicker: 'ready?', title: 'Try it today. ==gg==.', text: 'One line that removes the last doubt.', buttons: [btn('Get it', '#pricing')], tone: 'marker' },
      ],
    }),
  },
  product: {
    title: 'Product',
    group: 'Product',
    description: 'A product page that grows: project header, image and text, features, specs, its log.',
    template: 'wide',
    regions: (name, id) => ({
      main: [
        { type: 'project', name, status: 'live', pitch: 'What it is and who it’s for, in ==one line==.', links: [{ label: 'Open it', href: '#' }, { label: 'Source', href: '#' }] },
        { type: 'split', kicker: 'the idea', title: 'Why it exists', body: 'The problem, the moment you noticed it, and what this does about it.', side: 'left' },
        { type: 'features', label: 'Features', columns: '2', items: [
          { mark: '⌘', title: 'Fast', text: 'Say how fast, with a number.' },
          { mark: '∞', title: 'Yours', text: 'Local first; nothing leaves your machine.' },
          { mark: '↯', title: 'Scriptable', text: 'An API and an MCP server.' },
          { mark: 'GG', title: 'Fun', text: 'It has *personality*.' },
        ] },
        { type: 'specs', label: 'Specs', rows: [{ key: 'Version', value: 'v0.1.0' }, { key: 'License', value: 'MIT' }, { key: 'Runs on', value: 'Linux, macOS' }] },
        posts('Its log', 10, 'rows', '', id),
      ],
    }),
  },
  pricing: {
    title: 'Pricing',
    group: 'Product',
    description: 'Tiers side by side, a comparison sheet, and the questions people ask before paying.',
    template: 'wide',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'pricing', title: 'Pay for it if it’s ==worth it==', lede: 'Simple tiers, no seats, no tricks.', buttons: [], size: 'big' },
        { type: 'pricing', label: '', tiers: [
          { name: 'Hobby', price: '$0', period: 'forever', pitch: 'Try everything, keep what you make.', features: ['All the basics', '1 project'], cta_label: 'Start free', cta_href: '#', featured: false },
          { name: 'Pro', price: '$12', period: '/mo', pitch: 'For daily use.', features: ['Everything in Hobby', 'Unlimited projects', 'Priority fixes'], cta_label: 'Go pro', cta_href: '#', featured: true },
          { name: 'Lifetime', price: '$149', period: 'once', pitch: 'Pay once, own it.', features: ['Everything in Pro', 'Every future update'], cta_label: 'Buy once', cta_href: '#', featured: false },
        ], note: 'Prices in USD, taxes where they apply.' },
        { type: 'specs', label: 'Compare', rows: [
          { key: 'Projects', value: 'Hobby 1 · Pro and Lifetime unlimited' },
          { key: 'Updates', value: 'All tiers; Lifetime keeps them forever' },
          { key: 'Support', value: 'Hobby community · Pro and Lifetime ==priority==' },
        ] },
        { type: 'faq', label: 'Billing questions', items: [
          { q: 'Can I cancel?', a: 'Any time, in one click.' },
          { q: 'Refunds?', a: 'Within 14 days, no questions.' },
        ] },
      ],
    }),
  },
  changelog: {
    title: 'Changelog',
    group: 'Product',
    description: 'Releases down a timeline, the ship-tagged posts, and the RSS link.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Changelog', 'what changed'),
        { type: 'timeline', label: 'Releases', items: [
          { date: 'v0.2.0', title: 'The second one', text: 'What’s new, in one line. Link the post for the rest.' },
          { date: 'v0.1.0', title: 'First release', text: 'It ==shipped==.' },
        ] },
        { type: 'notes', items: [
          { kind: 'plus', text: 'added something' },
          { kind: 'tilde', text: 'changed something' },
          { kind: 'minus', text: 'removed something' },
          { kind: 'bang', text: 'broke something (and fixed it)' },
        ] },
        posts('Release posts', 10, 'rows', 'ship'),
      ],
    }),
  },
  roadmap: {
    title: 'Roadmap',
    group: 'Product',
    description: 'Now, next, later, plus what’s been shipped and what’s been killed.',
    template: 'wide',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'roadmap', title: 'What’s ==next==', lede: 'A promise of intent, not of dates.', buttons: [], size: 'big' },
        { type: 'roadmap', label: '', columns: [
          { title: 'Now', items: ['The thing on Aeris today'] },
          { title: 'Next', items: ['The thing after that', 'A smaller one'] },
          { title: 'Later', items: ['Ideas that need more thought'] },
        ] },
        { type: 'stats', label: 'The record', items: [{ number: '0', label: 'shipped' }, { number: '0', label: 'killed' }] },
        posts('Recently shipped', 5, 'rows', 'ship'),
      ],
    }),
  },
  'coming-soon': {
    title: 'Coming soon',
    group: 'Product',
    description: 'A teaser with a live countdown and somewhere to follow along.',
    template: 'wide',
    regions: (name) => ({
      main: [
        { type: 'masthead', kicker: 'coming soon', title: `${name} is ==almost here==`, lede: 'One line on what it is. Keep the rest a surprise.', buttons: [btn('Follow the devlog', '/log/'), btn('RSS', '/feed.xml', 'ghost')], size: 'huge' },
        { type: 'countdown', label: 'Launching in', until: '2026-12-01', done: 'It’s out. ==gg==.' },
        { type: 'cta', kicker: 'no newsletter', title: 'Follow along by RSS', text: 'Every step goes in the log first.', buttons: [btn('Subscribe', '/feed.xml')], tone: 'ink' },
      ],
    }),
  },
  'press-kit': {
    title: 'Press kit',
    group: 'Product',
    description: 'Facts, boilerplate, logos and screenshots to download, and who to contact.',
    template: 'basic',
    regions: (name) => ({
      main: [
        heading('Press kit', name),
        { type: 'specs', label: 'Facts', rows: [
          { key: 'Name', value: 'drei.gg' },
          { key: 'Made by', value: 'Drei, Manila' },
          { key: 'Launched', value: '2026' },
          { key: 'Website', value: 'drei.gg' },
        ] },
        prose('## Boilerplate\n\nTwo or three sentences a writer can paste as is.'),
        { type: 'gallery', label: 'Screenshots', columns: '3', images: [{ alt: 'Screenshot one', caption: 'Home' }, { alt: 'Screenshot two', caption: 'The desk' }, { alt: 'Screenshot three', caption: 'A post' }] },
        { type: 'listing', label: 'Downloads', items: [
          { meta: 'ZIP', title: 'Logos', detail: 'SVG and PNG, light and dark', href: '#' },
          { meta: 'ZIP', title: 'Screenshots', detail: 'Full size', href: '#' },
        ] },
        { type: 'contact', label: 'Press contact', email: 'press@drei.gg', items: [] },
      ],
    }),
  },

  // ---- Work and people ----
  portfolio: {
    title: 'Portfolio',
    group: 'Work and people',
    description: 'Selected work as a big image grid, with a line on each and a way to hire you.',
    template: 'wide',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'work', title: 'Things I’ve ==made==', lede: 'A few, picked. The rest are in the log.', buttons: [], size: 'big' },
        { type: 'gallery', label: '', columns: '2', images: [
          { alt: 'Project one', caption: 'Project one: what it was', href: '#' },
          { alt: 'Project two', caption: 'Project two: what it was', href: '#' },
          { alt: 'Project three', caption: 'Project three: what it was', href: '#' },
          { alt: 'Project four', caption: 'Project four: what it was', href: '#' },
        ] },
        { type: 'logos', label: 'Worked with', items: [{ name: 'Client one' }, { name: 'Client two' }, { name: 'Client three' }] },
        { type: 'cta', kicker: 'hire me', title: 'Got something to build?', buttons: [btn('Get in touch', '/contact/')], tone: 'marker' },
      ],
    }),
  },
  'case-study': {
    title: 'Case study',
    group: 'Work and people',
    description: 'One project told properly: the brief, the numbers, the process, the result.',
    template: 'basic',
    regions: (name) => ({
      main: [
        { type: 'masthead', kicker: 'case study', title: name, lede: 'What it was, for whom, and the one result worth bragging about.', buttons: [], size: 'big' },
        { type: 'specs', label: 'At a glance', rows: [{ key: 'Client', value: '—' }, { key: 'Role', value: '—' }, { key: 'When', value: '—' }, { key: 'Stack', value: '—' }] },
        { type: 'stats', label: 'Result', items: [{ number: '3×', label: 'faster' }, { number: '−40%', label: 'cost' }, { number: '0', label: 'pages at 3am' }] },
        prose('## The brief\n\nWhat they asked for.\n\n## What I did\n\nThe process, honestly, including the wrong turns.\n\n## What happened\n\nThe result, with numbers.'),
        { type: 'gallery', label: 'The result', columns: '2', images: [{ alt: 'Before', caption: 'Before' }, { alt: 'After', caption: 'After' }] },
        { type: 'testimonials', label: 'They said', items: [{ quote: 'A line from the client, if they’ll let you.', name: 'Client', role: 'Role' }] },
      ],
    }),
  },
  services: {
    title: 'Work with me',
    group: 'Work and people',
    description: 'What you offer, how it works, what it costs, and how to start.',
    template: 'wide',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'work with me', title: 'I build ==small, sharp== software', lede: 'For people who know what they want and want it shipped.', buttons: [btn('Start a project', '/contact/'), btn('See past work', '/portfolio/', 'ghost')], size: 'big' },
        { type: 'features', label: 'What I do', columns: '3', items: [
          { mark: '01', title: 'Prototypes', text: 'From idea to something you can click, fast.' },
          { mark: '02', title: 'Sites', text: 'Static, fast, editable, like this one.' },
          { mark: '03', title: 'Agents and tools', text: 'MCP servers, automations, internal tools.' },
        ] },
        { type: 'steps', label: 'How it goes', items: [
          { title: 'Talk', text: 'Thirty minutes, free.' },
          { title: 'Scope', text: 'A fixed price for a fixed thing.' },
          { title: 'Build in public', text: 'You see progress daily.' },
          { title: 'Hand over', text: 'Code, docs, and a walkthrough.' },
        ] },
        { type: 'pricing', label: 'Rates', tiers: [
          { name: 'Sprint', price: '$—', period: '/week', pitch: 'A focused week on one thing.', features: ['Daily updates', 'One deliverable'], cta_label: 'Book a sprint', cta_href: '/contact/', featured: true },
          { name: 'Project', price: 'Quote', pitch: 'Bigger, fixed scope.', features: ['Fixed price', 'Milestones'], cta_label: 'Ask', cta_href: '/contact/', featured: false },
        ] },
        { type: 'cta', kicker: 'next step', title: 'Tell me what you’re building', buttons: [btn('Get in touch', '/contact/')], tone: 'ink' },
      ],
    }),
  },
  team: {
    title: 'Team',
    group: 'Work and people',
    description: 'The people (and agents) behind it, with what each one does.',
    template: 'wide',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'team', title: 'Who builds this', lede: 'One human, a couple of agents, and a machine with a name.', buttons: [], size: 'big' },
        { type: 'people', label: '', items: [
          { name: 'Drei', role: 'Human. Decides, designs, ships.', href: '/about/' },
          { name: 'Anya', role: 'Claude. Builds, reviews, writes.' },
          { name: 'Eris', role: 'Codex. Builds, refactors, argues.' },
          { name: 'Aeris', role: 'The workstation. Runs everything.' },
        ] },
        { type: 'rules', label: 'How we work', items: ['Ship small, ship often.', 'Write it down.', 'Nobody waits for a “go”.'] },
      ],
    }),
  },
  testimonials: {
    title: 'Wall of love',
    group: 'Work and people',
    description: 'Every kind word, as a wall of quotes, with numbers on top.',
    template: 'wide',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'kind words', title: 'People said ==nice things==', lede: 'Real quotes only. Ask before you post one.', buttons: [], size: 'big' },
        { type: 'stats', label: '', items: [{ number: '—', label: 'users' }, { number: '—', label: 'stars' }, { number: '—', label: 'countries' }] },
        { type: 'testimonials', label: '', items: [
          { quote: 'The first quote.', name: 'Name', role: '@handle' },
          { quote: 'A longer one that goes on for a bit, because some people write paragraphs and the wall should handle it gracefully.', name: 'Name', role: 'Role' },
          { quote: 'Short and sharp.', name: 'Name', role: 'Role' },
          { quote: 'Another one.', name: 'Name', role: '@handle' },
        ] },
      ],
    }),
  },
  careers: {
    title: 'Careers',
    group: 'Work and people',
    description: 'Open roles as a listing, how you work, and how to apply.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Work here', 'careers'),
        prose('There’s nothing open yet. When there is, it goes here first.'),
        { type: 'listing', label: 'Open roles', items: [
          { meta: 'Contract', title: 'A role, when there is one', detail: 'What they’d do, in a line', tag: 'remote', href: '#' },
        ] },
        { type: 'features', label: 'What you get', columns: '2', items: [
          { mark: '↯', title: 'Small team', text: 'No meetings about meetings.' },
          { mark: '⌂', title: 'Remote', text: 'Work from where you work best.' },
        ] },
        { type: 'steps', label: 'How hiring goes', items: [{ title: 'Write in', text: 'Send something you made.' }, { title: 'Talk', text: 'An hour, no puzzles.' }, { title: 'Paid trial', text: 'A week of real work, paid.' }] },
      ],
    }),
  },
  sponsors: {
    title: 'Sponsors',
    group: 'Work and people',
    description: 'Who supports the work, the tiers to join them, and what the money buys.',
    template: 'wide',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'sponsors', title: 'Keep the lights on at ==drei.gg==', lede: 'Sponsorships pay for the time this takes.', buttons: [btn('Sponsor', '#tiers')], size: 'big' },
        { type: 'logos', label: 'Sponsored by', items: [{ name: 'Your name here' }] },
        { type: 'pricing', label: 'Tiers', tiers: [
          { name: 'Coffee', price: '$5', period: '/mo', pitch: 'A thank-you in the log.', features: ['Your name on this page'], cta_label: 'Sponsor', cta_href: '#', featured: false },
          { name: 'Backer', price: '$25', period: '/mo', pitch: 'Early looks at what’s next.', features: ['Everything in Coffee', 'Early access'], cta_label: 'Sponsor', cta_href: '#', featured: true },
        ] },
        { type: 'people', label: 'Backers', items: [{ name: 'You?', role: 'Be the first' }] },
      ],
    }),
  },
  speaking: {
    title: 'Speaking',
    group: 'Work and people',
    description: 'Talks and appearances as a listing, a bio to paste, and how to book you.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Talks', 'speaking'),
        { type: 'listing', label: 'Talks', items: [
          { meta: '2026', title: 'A talk title', detail: 'Event, city', tag: 'video', href: '#' },
          { meta: '2026', title: 'Another one', detail: 'Podcast', tag: 'audio', href: '#' },
        ] },
        { type: 'callout', heading: 'Bio, ready to paste', body: 'Drei builds software in Manila and writes the devlog at drei.gg.' },
        { type: 'contact', label: 'Book me', email: 'hello@drei.gg', items: [] },
      ],
    }),
  },

  // ---- Writing and docs ----
  docs: {
    title: 'Docs',
    group: 'Writing and docs',
    description: 'Documentation with a sticky contents column, steps, and callouts.',
    template: 'docs',
    regions: (name) => ({
      nav: [{ type: 'toc', label: 'Contents', items: [
        { label: 'Install', href: '#install' },
        { label: 'Configure', href: '#configure' },
        { label: 'Use it', href: '#use-it' },
        { label: 'Troubleshooting', href: '#troubleshooting' },
      ] }],
      main: [
        heading(name, 'docs'),
        { type: 'steps', label: 'Quick start', items: [{ title: 'Install', text: 'One command.' }, { title: 'Run', text: 'Another command.' }, { title: 'Done', text: '==gg==.' }] },
        prose('## Install\n\n```sh\nnpm install something\n```\n\n## Configure\n\nWhat to set and why.\n\n## Use it\n\nThe common tasks.\n\n## Troubleshooting\n\nWhat goes wrong, and the fix.'),
        { type: 'callout', heading: 'Heads up', body: 'The one thing people get wrong.' },
      ],
    }),
  },
  guide: {
    title: 'Guide',
    group: 'Writing and docs',
    description: 'A long-form tutorial: contents in a sidebar, numbered steps, code, and a wrap-up.',
    template: 'sidebar',
    regions: (name) => ({
      main: [
        { type: 'masthead', kicker: 'guide', title: name, lede: 'What you’ll build, and how long it takes.', buttons: [], size: 'big' },
        prose('## Before you start\n\nWhat you need.\n\n## Step one\n\nDo the first thing.\n\n```js\nconsole.log("gg");\n```\n\n## Step two\n\nThen this.\n\n## Wrap-up\n\nWhat you made, and where to go next.'),
        { type: 'cta', kicker: 'done?', title: 'Show me what you made', buttons: [btn('Get in touch', '/contact/')], tone: 'paper' },
      ],
      aside: [
        { type: 'toc', label: 'On this page', items: [{ label: 'Before you start', href: '#before-you-start' }, { label: 'Step one', href: '#step-one' }, { label: 'Step two', href: '#step-two' }, { label: 'Wrap-up', href: '#wrap-up' }] },
        { type: 'specs', label: 'Level', rows: [{ key: 'Time', value: '30 min' }, { key: 'Level', value: 'Beginner' }] },
      ],
    }),
  },
  help: {
    title: 'Help center',
    group: 'Writing and docs',
    description: 'Search, questions by topic, and how to reach a human.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('How can I help?', 'help'),
        { type: 'search', placeholder: 'Search the docs and the log' },
        { type: 'faq', label: 'Getting started', items: [{ q: 'Where do I start?', a: 'Here.' }, { q: 'Is it free?', a: 'The basics are.' }] },
        { type: 'faq', label: 'Accounts and billing', items: [{ q: 'How do I cancel?', a: 'In one click from settings.' }] },
        { type: 'contact', label: 'Still stuck?', email: 'help@drei.gg', items: [] },
      ],
    }),
  },
  graveyard: {
    title: 'Graveyard',
    group: 'Writing and docs',
    description: 'Projects you killed, why, and what you learned. RIP, with dignity.',
    template: 'basic',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'rip', title: 'The ==graveyard==', lede: 'Things I built, shipped or didn’t, and buried. Each one taught me something.', buttons: [], size: 'big' },
        { type: 'shout', lines: ['RIP'] },
        { type: 'timeline', label: 'Buried', items: [{ date: '2026', title: 'A project', text: 'What it was, why it died, what I kept.' }] },
        posts('Obituaries', 20, 'cards', 'dead'),
      ],
    }),
  },
  funeral: {
    title: 'Funeral',
    group: 'Writing and docs',
    description: 'Rule 03 as a page: one dead project’s obituary, its life in numbers, a timeline and the cause of death.',
    template: 'basic',
    regions: (name) => ({
      main: [
        { type: 'project', name, status: 'dead', pitch: 'Born 2026. Died 2026. It ==tried==.', links: [{ label: 'The code, archived', href: '#' }] },
        { type: 'stats', label: 'A life in numbers', items: [{ number: '47', label: 'days alive' }, { number: '3', label: 'users, one was us' }, { number: '$12', label: 'spent, mostly the domain' }] },
        { type: 'timeline', label: 'Its life', items: [
          { date: 'Day 1', title: 'Born', text: 'Full of promise.' },
          { date: 'Day 20', title: 'The pivot', text: 'It was never going to work.' },
          { date: 'Day 47', title: 'Switched off', text: 'Peacefully, at night.' },
        ] },
        { type: 'callout', heading: 'Cause of death', body: 'Built the thing before asking who wanted it. Rule 01 exists for a reason.' },
        { type: 'tape', text: 'gg. It played well.' },
      ],
    }),
  },
  stats: {
    title: 'Open stats',
    group: 'Writing and docs',
    description: 'Open-startup numbers: big stats, the log so far, and what’s next.',
    template: 'wide',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'open', title: 'The numbers, ==in public==', lede: 'Updated by hand, so expect lag.', buttons: [], size: 'big' },
        { type: 'stats', label: 'Money', items: [{ number: '$0', label: 'revenue' }, { number: '$0', label: 'costs' }, { number: '0', label: 'customers' }] },
        { type: 'scoreboard', label: 'The log', since: '2026-10-16', posts: 'posts', shipped: 'shipped', killed: 'killed', days: 'days in' },
        { type: 'roadmap', label: 'Next', columns: [{ title: 'Now', items: ['The current goal'] }, { title: 'Next', items: ['The one after'] }] },
      ],
    }),
  },
  history: {
    title: 'History',
    group: 'Writing and docs',
    description: 'The story so far as a timeline, with the milestones set big.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('The story so far', 'history'),
        { type: 'bignum', number: '2026', caption: 'The year drei.gg started.' },
        { type: 'timeline', label: '', items: [
          { date: '16 Oct 2026', title: 'Bought drei.gg', text: 'The domain kept calling.' },
          { date: '17 Oct 2026', title: 'Built the desk', text: 'A CMS in a day, ==with an MCP server==.' },
        ] },
      ],
    }),
  },
  library: {
    title: 'Reading list',
    group: 'Writing and docs',
    description: 'Books, links and videos worth your time, as a listing with tags.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Worth your time', 'reading list'),
        { type: 'listing', label: 'Books', items: [{ meta: 'Book', title: 'A book', detail: 'Author · why it’s here', tag: 'favorite', href: '#' }] },
        { type: 'listing', label: 'Links', items: [{ meta: 'Essay', title: 'An essay', detail: 'Site · one line', href: '#' }] },
        { type: 'embed', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: 'A video worth watching (swap this one)' },
      ],
    }),
  },

  // ---- Utility ----
  events: {
    title: 'Events',
    group: 'Utility',
    description: 'Upcoming and past events as listings, with a countdown to the next one.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Events', 'come say hi'),
        { type: 'countdown', label: 'Next one in', until: '2026-12-01', done: 'It’s on now.' },
        { type: 'listing', label: 'Upcoming', items: [{ meta: '1 Dec 2026', title: 'An event', detail: 'Manila', tag: 'free', href: '#' }] },
        { type: 'listing', label: 'Past', items: [{ meta: '2026', title: 'A past one', detail: 'Online', tag: 'video', href: '#' }] },
      ],
    }),
  },
  status: {
    title: 'Status',
    group: 'Utility',
    description: 'Is it down? Everything you run, its state, and the incident history.',
    template: 'basic',
    regions: () => ({
      main: [
        heading('Is it down?', 'status'),
        { type: 'listing', label: 'Updated 17 Oct 2026, 20:00', items: [
          { meta: 'site', title: 'drei.gg', detail: 'Static, on DigitalOcean', tag: 'up' },
          { meta: 'feed', title: 'RSS', tag: 'up' },
          { meta: 'search', title: 'Search', detail: 'Pagefind index', tag: 'up' },
          { meta: 'tool', title: 'The desk', detail: 'Local only; it’s on when Drei is', tag: 'maintenance' },
        ] },
        { type: 'timeline', label: 'Incidents', items: [{ date: '17 Oct 2026', title: 'Preview blinking on save', text: 'Fixed with a ==double-buffered== preview.' }] },
      ],
    }),
  },
  privacy: {
    title: 'Privacy',
    group: 'Utility',
    description: 'A plain-language privacy policy with a contents column. Not legal advice.',
    template: 'docs',
    regions: () => ({
      nav: [{ type: 'toc', label: 'Privacy', items: [{ label: 'The short version', href: '#the-short-version' }, { label: 'What’s collected', href: '#whats-collected' }, { label: 'Who sees it', href: '#who-sees-it' }, { label: 'Contact', href: '#contact' }] }],
      main: [
        heading('Privacy', 'updated 2026'),
        { type: 'callout', heading: 'The short version', body: 'No trackers, no cookies, no ads. The host keeps standard server logs.' },
        prose('## The short version\n\nNothing about you is collected on purpose.\n\n## What’s collected\n\nStandard server logs kept by the host.\n\n## Who sees it\n\nNobody, unless the law says otherwise.\n\n## Contact\n\nhello@drei.gg\n\n_Not legal advice. Have a lawyer read your real one._'),
      ],
    }),
  },
  terms: {
    title: 'Terms',
    group: 'Utility',
    description: 'Terms of use with numbered sections and a contents column. Not legal advice.',
    template: 'docs',
    regions: () => ({
      nav: [{ type: 'toc', label: 'Terms', items: [{ label: 'Using this site', href: '#using-this-site' }, { label: 'Your content', href: '#your-content' }, { label: 'Liability', href: '#liability' }, { label: 'Changes', href: '#changes' }] }],
      main: [
        heading('Terms', 'updated 2026'),
        prose('## Using this site\n\nBe decent.\n\n## Your content\n\nYou own what you make.\n\n## Liability\n\nProvided as is.\n\n## Changes\n\nChanges get a post in the log.\n\n_Not legal advice. Have a lawyer read your real one._'),
      ],
    }),
  },
  thanks: {
    title: 'Thank you',
    group: 'Utility',
    description: 'The page after someone buys, signs up or writes in: thanks, what’s next, where to go.',
    template: 'basic',
    regions: () => ({
      main: [
        { type: 'masthead', kicker: 'got it', title: 'Thanks. ==gg==.', lede: 'Here’s what happens next.', buttons: [btn('Back home', '/'), btn('Read the log', '/log/', 'ghost')], size: 'big' },
        { type: 'steps', label: 'Next', items: [{ title: 'Check your inbox', text: 'A receipt is on its way.' }, { title: 'Get started', text: 'The docs have the rest.' }] },
      ],
    }),
  },
  lost: {
    title: 'Lost and found',
    group: 'Utility',
    description: 'A maintenance or moved-page notice, with search and the latest posts to go somewhere useful.',
    template: 'basic',
    regions: () => ({
      main: [
        { type: 'shout', lines: ['BRB'] },
        heading('This page is being worked on', 'maintenance'),
        prose('It’ll be back. Meanwhile:'),
        { type: 'search', placeholder: 'Search instead' },
        posts('Latest', 5),
      ],
    }),
  },
};

export const STARTER_GROUPS = ['Essentials', 'Product', 'Work and people', 'Writing and docs', 'Utility'] as const;

// A page's JSON from a starter: { title, template, regions }.
export function fromStarter(key: string, name: string, id: string) {
  const s = STARTERS[key] ?? STARTERS.plain;
  return { title: name, template: s.template, regions: s.regions(name, id) };
}
