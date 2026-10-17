# One-off generator for src/templates/*.json, the desk's page templates.
# Kept so the set can be regenerated or extended in one place; each template is
# also a plain JSON file you can edit directly.
import json, os

IMG = ['/templates/sample-hero.jpg', '/templates/sample-log.jpg', '/templates/sample-dark.jpg', '/templates/sample-phone.jpg']
out = {}

def head(kicker, title):
    return {"type": "heading", "kicker": kicker, "title": title}

def prose(md):
    return {"type": "prose", "markdown": md}

def cta(h, t, b, href, s='', sh='', style='marker'):
    return {"type": "cta", "heading": h, "text": t, "button": b, "href": href, "secondary": s, "secondary_href": sh, "style": style}

def T(id, name, group, description, title, blocks):
    out[id] = {"name": name, "group": group, "description": description, "page": {"title": title, "template": "basic", "regions": {"main": blocks}}}

# ---- About and people ----

T('about', 'About', 'Studio', 'Who, what, why: a short story, the numbers, the cast and a way in.', 'About', [
    head('About', 'Two humans’ worth of output, one human.'),
    {"type": "media", "label": "The short version", "heading": "We build things and post about them.", "text": "drei.gg is a one-person studio with ==two AI agents and a workstation== doing the heavy lifting. No funnel, no launch week. Things get built, then they get a post.", "image": IMG[0], "alt": "The drei.gg home page", "side": "right", "button": "Read the log", "href": "/log/"},
    {"type": "stats", "label": "So far", "items": [
        {"number": "1", "label": "human", "note": "Drei, in Manila"},
        {"number": "2", "label": "agents", "note": "Anya and Eris"},
        {"number": "1", "label": "workstation", "note": "Aeris"},
        {"number": "0", "label": "newsletters", "note": "on purpose"}]},
    prose("## Why .gg\n\nIt's a gamer thing, it's my name, and in PH lobbies it's what you type when the other team has already lost. Building software in the year of the AI doompost feels a lot like that: good luck, we're all screwed, build anyway."),
    {"type": "people", "label": "The squad", "heading": "Who's in the lobby", "items": [
        {"name": "Drei", "role": "Builds things, writes the posts", "bio": "Software engineer. Gamer at heart, even when there's no time to play.", "href": "", "image": "", "tag": "human"},
        {"name": "Anya", "role": "Engineering, Claude", "bio": "Sharp, precise, occasionally wicked. Built the desk.", "href": "", "image": "", "tag": "agent"},
        {"name": "Eris", "role": "Engineering, Codex", "bio": "Playful and irreverent. Breaks things so they can be rebuilt better.", "href": "", "image": "", "tag": "agent"},
        {"name": "Aeris", "role": "The workstation", "bio": "Fedora, KDE, and the fans you can hear in the background.", "href": "", "image": "", "tag": "machine"}]},
    cta('Want the long version?', 'Every build, rant and funeral is in the log.', 'Read the log', '/log/', 'RSS', '/feed.xml', 'ink'),
])

T('team', 'Team / credits', 'Studio', 'The cast with roles and bios, and a thank-you list for everything you stand on.', 'Credits', [
    head('Credits', 'Everyone who showed up'),
    {"type": "people", "label": "Core", "heading": "", "items": [
        {"name": "Drei", "role": "Design, code, words", "bio": "The one who has to explain all this.", "href": "/about/", "image": "", "tag": "human"},
        {"name": "Anya", "role": "Engineering", "bio": "Claude. Turned \"edit posts without a terminal\" into a CMS.", "href": "", "image": "", "tag": "agent"},
        {"name": "Eris", "role": "Engineering", "bio": "Codex. The second opinion, and occasionally the first.", "href": "", "image": "", "tag": "agent"}]},
    {"type": "divider", "style": "gg", "text": ""},
    {"type": "table", "label": "Standing on", "heading": "Built with", "columns": "What | For | Why", "rows": [
        "Astro | the site | static pages, no JavaScript tax",
        "Pagefind | search | an index, not a server",
        "React | the desk | the editor only; the site ships none",
        "DigitalOcean | hosting | static, free tier, deploys on push",
        "Anybody, Atkinson Hyperlegible, JetBrains Mono | type | condensed, readable, typewriter"]},
    prose("Thanks to everyone who builds in public and writes it down. That's the whole idea here."),
])

# ---- Product ----

T('product', 'Product landing', 'Product', 'A full launch page: hero, features, a closer look, numbers, quotes, pricing, FAQ and a final push.', 'Product', [
    {"type": "project", "name": "Product name", "status": "building", "pitch": "One line on what it does, and ==who it's for==.", "links": [{"label": "Try it", "href": "#"}, {"label": "Read the build log", "href": "/log/"}]},
    {"type": "features", "label": "What it does", "heading": "Three things, done properly", "columns": "3", "items": [
        {"glyph": "01", "title": "It does the first thing", "text": "A sentence on the job it takes off your plate."},
        {"glyph": "02", "title": "Then the second", "text": "Why it's better than the way you do it now."},
        {"glyph": "03", "title": "And never the third", "text": "What it ==refuses== to do, on purpose."}]},
    {"type": "media", "label": "Up close", "heading": "Show, don't pitch", "text": "A screenshot and two lines beat a page of adjectives. Say what you're looking at.", "image": IMG[3], "alt": "The product on a phone", "side": "left", "button": "", "href": ""},
    {"type": "stats", "label": "", "items": [
        {"number": "2.1s", "label": "to first result", "note": "on a cold start"},
        {"number": "0", "label": "trackers", "note": "none, ever"},
        {"number": "v0.3", "label": "current", "note": "shipped last week"}]},
    {"type": "quotes", "label": "Early players", "heading": "", "items": [
        {"quote": "It does the one thing I needed and then gets out of the way.", "who": "A real person", "role": "who tried it early"},
        {"quote": "Finally, a tool that doesn't want to be my whole personality.", "who": "Another one", "role": "beta tester"}]},
    {"type": "pricing", "label": "Pricing", "heading": "Pick a lane", "note": "Prices in USD. Cancel any time; we'll even post about it.", "tiers": [
        {"name": "Free", "price": "$0", "period": "", "pitch": "For trying it out.", "features": ["The core thing", "Community support", "Your data, exportable"], "cta": "Start free", "href": "#", "featured": False},
        {"name": "Pro", "price": "$9", "period": "/mo", "pitch": "For using it for real.", "features": ["Everything in Free", "The second thing", "Priority fixes"], "cta": "Go pro", "href": "#", "featured": True},
        {"name": "Team", "price": "$29", "period": "/mo", "pitch": "For a small crew.", "features": ["Everything in Pro", "Up to 5 seats", "One shared bill"], "cta": "Talk to us", "href": "/contact/", "featured": False}]},
    {"type": "faq", "label": "FAQ", "heading": "Before you ask", "items": [
        {"q": "Is it really free?", "a": "The free tier is free forever. The paid tiers pay for the servers and the coffee."},
        {"q": "What happens to my data?", "a": "It's yours. Export it any time, delete it any time."},
        {"q": "What if you shut it down?", "a": "You'll get months of notice, an export, and a funeral post."}]},
    cta('Ready when you are.', 'It takes a minute to set up. Less if you skip the docs.', 'Get started', '#', 'See the changelog', '/changelog/', 'marker'),
])

T('pricing', 'Pricing', 'Product', 'Tiers, a comparison table and the money questions.', 'Pricing', [
    head('Pricing', 'Simple prices. No funnel.'),
    {"type": "pricing", "label": "", "heading": "", "note": "All plans: no trackers, no dark patterns, cancel in two clicks.", "tiers": [
        {"name": "Solo", "price": "$0", "period": "", "pitch": "One person, one project.", "features": ["Unlimited drafts", "Public pages", "Export anything"], "cta": "Start", "href": "#", "featured": False},
        {"name": "Studio", "price": "$12", "period": "/mo", "pitch": "For people who ship weekly.", "features": ["Everything in Solo", "Custom domain", "Scheduled posts", "Priority support"], "cta": "Choose Studio", "href": "#", "featured": True},
        {"name": "Lobby", "price": "$40", "period": "/mo", "pitch": "For a crew of up to ten.", "features": ["Everything in Studio", "Ten seats", "Shared projects"], "cta": "Choose Lobby", "href": "#", "featured": False}]},
    {"type": "table", "label": "Compare", "heading": "What's in each", "columns": "Feature | Solo | Studio | Lobby", "rows": [
        "Projects | 1 | unlimited | unlimited",
        "Custom domain | — | yes | yes",
        "Scheduled posts | — | yes | yes",
        "Seats | 1 | 1 | 10",
        "Support | community | priority | priority"]},
    {"type": "faq", "label": "Money questions", "heading": "", "items": [
        {"q": "Can I switch plans?", "a": "Any time. We prorate to the day."},
        {"q": "Do you do refunds?", "a": "Within 30 days, no questions, no exit survey."},
        {"q": "Student or local pricing?", "a": "Yes. Write in and say where you are."}]},
    cta('Still deciding?', 'Start free. Upgrade when it earns it.', 'Start free', '#', '', '', 'ink'),
])

T('changelog', 'Changelog', 'Product', 'Release notes down a timeline, each with its version and the patch notes.', 'Changelog', [
    head('Changelog', 'Patch notes'),
    prose("Everything that shipped, newest first. The posts have the stories; this has the receipts."),
    {"type": "timeline", "label": "", "heading": "", "items": [
        {"date": "17 Oct 2026", "version": "v0.0.2", "title": "The desk", "text": "A local editor where every page is blocks, a preview you can click to edit, and an MCP server for the agents.", "kind": "ship"},
        {"date": "16 Oct 2026", "version": "v0.0.1", "title": "drei.gg goes up", "text": "Static Astro site, the log, covers, and an RSS feed. No newsletter.", "kind": "ship"},
        {"date": "15 Oct 2026", "version": "", "title": "Bought the domain", "text": "It kept calling.", "kind": "build"}]},
    {"type": "notes", "items": [{"kind": "plus", "text": "Added: what's new"}, {"kind": "minus", "text": "Removed: what's gone"}, {"kind": "tilde", "text": "Changed: what moved"}, {"kind": "bang", "text": "Broke: what we're fixing"}]},
])

T('roadmap', 'Roadmap', 'Product', 'Now, next, later on a board, with the shipped list underneath.', 'Roadmap', [
    head('Roadmap', 'What’s on the bench'),
    {"type": "roadmap", "label": "", "heading": "", "columns": [
        {"name": "Now", "items": [{"title": "The first product", "note": "In the inventory's empty slot"}, {"title": "Fill in /now and /uses", "note": "Drei's homework"}]},
        {"name": "Next", "items": [{"title": "A second series", "note": "Building in public, weekly"}, {"title": "Better covers for photos", "note": ""}]},
        {"name": "Later", "items": [{"title": "Comments without a database", "note": "Maybe. Probably not."}]},
        {"name": "Never", "items": [{"title": "A newsletter", "note": "Rule 04"}]}]},
    {"type": "divider", "style": "dots", "text": ""},
    {"type": "postlist", "label": "Recently shipped", "tag": "ship", "count": 5, "style": "rows"},
])

T('faq', 'FAQ', 'Product', 'Grouped questions with expanding answers and a way to ask more.', 'FAQ', [
    head('FAQ', 'Questions people actually asked'),
    {"type": "faq", "label": "The site", "heading": "", "items": [
        {"q": "Why no newsletter?", "a": "Because RSS exists and inboxes are full. The feed is at /feed.xml."},
        {"q": "Who writes the posts?", "a": "Drei, with Anya and Eris on the tools. If an agent drafted something, the post says so."},
        {"q": "Why .gg?", "a": "Good game. Also Drei's initial and surname. Also what you type when the other team has already lost."}]},
    {"type": "faq", "label": "The work", "heading": "", "items": [
        {"q": "Do you take client work?", "a": "Sometimes. Write in with what you're building."},
        {"q": "Can I use the code?", "a": "Ask first; most of it is happy to be borrowed."}]},
    cta('Didn’t find it?', 'Ask. The answer might become a post.', 'Get in touch', '/contact/', '', '', 'aeris'),
])

T('contact', 'Contact', 'Studio', 'An email front and centre, other channels, and what to expect.', 'Contact', [
    head('Contact', 'Say hi'),
    {"type": "contact", "label": "", "heading": "", "text": "The fastest way in is email. ==No forms==, no ticket numbers; a human reads it.", "email": "hello@drei.gg", "items": [
        {"label": "GitHub", "value": "@alguintu", "href": "https://github.com/alguintu"},
        {"label": "RSS", "value": "drei.gg/feed.xml", "href": "/feed.xml"},
        {"label": "Time zone", "value": "Manila, UTC+8", "href": ""}]},
    {"type": "features", "label": "What to expect", "heading": "", "columns": "3", "items": [
        {"glyph": "24h", "title": "A reply", "text": "Usually within a day, Manila time."},
        {"glyph": "!", "title": "Straight answers", "text": "If it's a no, you'll hear no, not silence."},
        {"glyph": "gg", "title": "No sales follow-up", "text": "You won't be added to anything."}]},
])

T('press', 'Press kit', 'Studio', 'Facts, the story in one paragraph, downloadable logos and screenshots, and who to ask.', 'Press kit', [
    head('Press', 'Press kit'),
    {"type": "stats", "label": "Fact sheet", "items": [
        {"number": "2026", "label": "founded", "note": "Manila, PH"},
        {"number": "1", "label": "human", "note": "plus two agents"},
        {"number": "0", "label": "funding", "note": "and proud of it"}]},
    prose("## Boilerplate\n\ndrei.gg is a devlog and a one-person studio run by Drei Guintu with two AI engineering agents. It builds small products and writes about every one of them, including the ones that die."),
    {"type": "downloads", "label": "Assets", "heading": "Logos and screenshots", "items": [
        {"name": "Wordmark, light", "href": "/favicon.svg", "size": "SVG", "note": "For dark backgrounds"},
        {"name": "Social card", "href": "/og/site.jpg", "size": "1200×675", "note": "The home page, as link previews show it"},
        {"name": "Screenshots", "href": "/templates/sample-hero.jpg", "size": "JPG", "note": "The site on desktop"}]},
    {"type": "gallery", "label": "Screens", "heading": "", "columns": "2", "items": [
        {"src": IMG[0], "alt": "Home page", "caption": "The home page", "href": ""},
        {"src": IMG[2], "alt": "Dark mode", "caption": "Dark mode", "href": ""}]},
    {"type": "contact", "label": "Press contact", "heading": "", "text": "Interviews, quotes, fact checks.", "email": "press@drei.gg", "items": []},
])

T('links', 'Links (link-in-bio)', 'Studio', 'A single column of big links for a bio: everything worth clicking, in order.', 'Links', [
    head('drei.gg', 'Links'),
    {"type": "links", "label": "", "heading": "", "items": [
        {"label": "The log", "href": "/log/", "note": "Every post, newest first"},
        {"label": "Latest ship", "href": "/tag/ship/", "note": "What went out the door"},
        {"label": "GitHub", "href": "https://github.com/alguintu", "note": "@alguintu"},
        {"label": "RSS", "href": "/feed.xml", "note": "No newsletter, on purpose"},
        {"label": "Say hi", "href": "/contact/", "note": "A human reads it"}]},
    {"type": "divider", "style": "tape", "text": "No funnel. Just links."},
])

# ---- Personal ----

T('now', 'Now', 'Personal', 'A now page: what has your attention this month, with the latest posts.', 'Now', [
    head("What I'm doing now", 'Now'),
    {"type": "table", "label": "This month", "heading": "", "columns": "On | Right now", "rows": [
        "Building | what's on Aeris this week",
        "Shipping next | the next thing in the inventory",
        "Playing | the game, if there's time",
        "Reading | one or two things"]},
    {"type": "divider", "style": "tape", "text": "Updated: this month"},
    {"type": "postlist", "label": "Latest from the log", "tag": "", "count": 3, "style": "rows"},
])

T('uses', 'Uses', 'Personal', 'The kit: hardware, software and what the site runs on, as tables.', 'Uses', [
    head('The kit', 'Uses'),
    {"type": "media", "label": "Aeris", "heading": "The workstation", "text": "Fedora, KDE Plasma, and enough RAM for two agents and a browser with too many tabs.", "image": IMG[2], "alt": "The desk", "side": "right", "button": "", "href": ""},
    {"type": "table", "label": "Hardware", "heading": "", "columns": "Thing | What | Notes", "rows": ["CPU | your CPU | ", "GPU | your GPU | ", "Display | your display | ", "Keyboard | your keyboard | the important one"]},
    {"type": "table", "label": "Software", "heading": "", "columns": "Tool | For", "rows": ["Claude Code (Anya) | engineering", "Codex (Eris) | engineering", "The desk | writing this site"]},
])

T('portfolio', 'Portfolio', 'Personal', 'Selected work as a gallery, a featured project up close, and what people said.', 'Work', [
    head('Selected work', 'Things that shipped'),
    {"type": "gallery", "label": "", "heading": "", "columns": "3", "items": [
        {"src": IMG[0], "alt": "", "caption": "drei.gg · 2026", "href": "/"},
        {"src": IMG[1], "alt": "", "caption": "The log · 2026", "href": "/log/"},
        {"src": IMG[2], "alt": "", "caption": "Dark mode · 2026", "href": ""},
        {"src": IMG[3], "alt": "", "caption": "On a phone · 2026", "href": ""},
        {"src": "", "alt": "", "caption": "Next thing · soon", "href": ""},
        {"src": "", "alt": "", "caption": "Empty slot", "href": ""}]},
    {"type": "media", "label": "Featured", "heading": "The desk", "text": "A visual editor where every page is blocks, built in a day and written up in the log.", "image": IMG[1], "alt": "", "side": "left", "button": "Read the case study", "href": "#"},
    {"type": "quotes", "label": "", "heading": "", "items": [{"quote": "Who knew an md cms would need an mcp?", "who": "Drei", "role": "client, apparently"}]},
])

T('case-study', 'Case study', 'Personal', 'Problem, approach, results: a project told with numbers, a timeline and a quote.', 'Case study', [
    head('Case study', 'How the desk got built in a day'),
    {"type": "stats", "label": "", "items": [
        {"number": "1", "label": "day", "note": "start to merged"},
        {"number": "42", "label": "block types", "note": "page, post and section"},
        {"number": "14", "label": "MCP tools", "note": "for the agents"}]},
    prose("## The problem\n\nWriting a post meant a terminal, a text editor and a guess at how it would look.\n\n## The approach\n\nAdopt what exists (Astro collections, react-jsonschema-form, Pagefind), build only the glue, and make the preview the editor."),
    {"type": "timeline", "label": "How it went", "heading": "", "items": [
        {"date": "Morning", "version": "", "title": "A local editor", "text": "Posts, covers, a live preview.", "kind": "build"},
        {"date": "Afternoon", "version": "", "title": "Everything is blocks", "text": "Pages, regions, schemas, click-to-edit.", "kind": "build"},
        {"date": "Evening", "version": "", "title": "Shipped", "text": "Tests, CI, merged.", "kind": "ship"}]},
    {"type": "pull", "quote": "Blocks are atomic. Pages arrange them. No turtles.", "by": "the design rule"},
    cta('Want something like this?', 'Write in with what you’re building.', 'Get in touch', '/contact/', '', '', 'marker'),
])

T('manifesto', 'Manifesto', 'Personal', 'Big type, numbered convictions and a sign-off.', 'Manifesto', [
    {"type": "shout", "lines": ["BUILD", "THEN", "POST"]},
    prose("Every week there's a new post saying software is over. Maybe. The tools got absurdly good, so the only sane move is to use them and ship more weird things than we ever could before."),
    {"type": "features", "label": "We believe", "heading": "", "columns": "2", "items": [
        {"glyph": "01", "title": "Build, then post", "text": "Never the other way around."},
        {"glyph": "02", "title": "Say what we think", "text": "Hedging is a funnel for opinions."},
        {"glyph": "03", "title": "Funerals, not cover-ups", "text": "Dead projects get a post with a cause of death."},
        {"glyph": "04", "title": "Marketing happens elsewhere", "text": "This is a log, not a landing page."}]},
    {"type": "divider", "style": "gg", "text": ""},
    {"type": "tape", "text": "Good luck. We're all screwed. Build anyway."},
])

# ---- Launch and events ----

T('launch', 'Launch / coming soon', 'Launch', 'A countdown to the moment, what it is, and how to hear when it lands.', 'Coming soon', [
    {"type": "project", "name": "Something new", "status": "building", "pitch": "Dropping soon. Here's ==exactly when==.", "links": []},
    {"type": "countdown", "label": "Launches in", "heading": "", "target": "2026-12-01T20:00", "done": "It's live. gg."},
    {"type": "features", "label": "What's coming", "heading": "", "columns": "3", "items": [
        {"glyph": "+", "title": "The thing", "text": "What it is."},
        {"glyph": "+", "title": "Why it matters", "text": "Who it's for."},
        {"glyph": "+", "title": "What it costs", "text": "Nothing to start."}]},
    cta('Hear when it lands', 'One post on launch day. Follow the feed.', 'RSS feed', '/feed.xml', 'The log', '/log/', 'ink'),
])

T('event', 'Event / talk', 'Launch', 'A talk or meetup: when and where, the schedule, the speakers and a call to join.', 'Event', [
    head('Talk · Manila', 'Building in public with two AI agents'),
    {"type": "stats", "label": "", "items": [
        {"number": "1 Dec", "label": "date", "note": "8:00 PM, Manila"},
        {"number": "45m", "label": "talk", "note": "plus Q&A"},
        {"number": "free", "label": "entry", "note": "bring a friend"}]},
    {"type": "timeline", "label": "Schedule", "heading": "", "items": [
        {"date": "19:30", "version": "", "title": "Doors", "text": "Find a seat.", "kind": "plain"},
        {"date": "20:00", "version": "", "title": "The talk", "text": "What changes when your engineers are agents.", "kind": "ship"},
        {"date": "20:45", "version": "", "title": "Q&A", "text": "Ask anything.", "kind": "build"}]},
    {"type": "people", "label": "Speakers", "heading": "", "items": [{"name": "Drei", "role": "drei.gg", "bio": "Builds things, posts about them.", "href": "/about/", "image": "", "tag": "speaker"}]},
    cta('Save a seat', 'It’s free; we just need a headcount.', 'RSVP', '#', 'Add to calendar', '#', 'marker'),
])

# ---- Site utility ----

T('status', 'Status', 'Utility', 'A status board for everything you run, with the incident history.', 'Status', [
    head('Status', 'Is it down?'),
    {"type": "status", "label": "", "heading": "", "updated": "Updated 17 Oct 2026, 20:00", "items": [
        {"name": "drei.gg", "state": "up", "note": "Static, on DigitalOcean"},
        {"name": "RSS feed", "state": "up", "note": ""},
        {"name": "Search", "state": "up", "note": "Pagefind index"},
        {"name": "The desk", "state": "maintenance", "note": "Local only; it's on when Drei is"}]},
    {"type": "timeline", "label": "Incidents", "heading": "", "items": [
        {"date": "17 Oct 2026", "version": "", "title": "Preview blinking on save", "text": "Fixed with a double-buffered preview.", "kind": "dead"}]},
])

T('archive', 'Archive', 'Utility', 'Every post grouped by year, with tag links and a search box.', 'Archive', [
    head('The log', 'Everything, ever'),
    {"type": "search", "placeholder": "Search the log"},
    {"type": "archive", "label": "", "tags": True},
])

T('legal', 'Legal', 'Utility', 'Privacy and terms in plain words, with a summary up top.', 'Privacy', [
    head('Legal', 'Privacy, in plain words'),
    {"type": "features", "label": "The short version", "heading": "", "columns": "3", "items": [
        {"glyph": "0", "title": "No trackers", "text": "No analytics scripts, no pixels."},
        {"glyph": "0", "title": "No cookies", "text": "Except your theme choice, kept in your own browser."},
        {"glyph": "0", "title": "No accounts", "text": "There's nothing to sign up for."}]},
    prose("## What we collect\n\nNothing directly. The host keeps standard server logs (IP address, time, page) for a short time to keep the site running.\n\n## Who to ask\n\nWrite to hello@drei.gg.\n\n_Last updated: write the date here._"),
])

T('funeral', 'Funeral', 'Launch', 'Rule 03 as a page: a dead project’s obituary, with its life in numbers, a timeline and the cause of death.', 'In memoriam', [
    {"type": "project", "name": "Project name", "status": "dead", "pitch": "Born 2026. Died 2026. It tried.", "links": [{"label": "The code, archived", "href": "#"}]},
    {"type": "stats", "label": "A life in numbers", "items": [
        {"number": "47", "label": "days alive", "note": ""},
        {"number": "3", "label": "users", "note": "one was us"},
        {"number": "$12", "label": "spent", "note": "mostly the domain"}]},
    {"type": "timeline", "label": "Its life", "heading": "", "items": [
        {"date": "Day 1", "version": "v0.1", "title": "Born", "text": "Full of promise.", "kind": "ship"},
        {"date": "Day 20", "version": "", "title": "The pivot", "text": "It was never going to work.", "kind": "rant"},
        {"date": "Day 47", "version": "", "title": "Switched off", "text": "Peacefully, at night.", "kind": "dead"}]},
    {"type": "callout", "heading": "Cause of death", "body": "Built the thing before asking who wanted it. Rule 01 exists for a reason."},
    {"type": "divider", "style": "tape", "text": "gg. It played well."},
])

os.makedirs('src/templates', exist_ok=True)
for id, t in out.items():
    with open(f'src/templates/{id}.json', 'w') as f:
        f.write(json.dumps(t, indent=2, ensure_ascii=False) + '\n')
print(len(out), 'templates')
