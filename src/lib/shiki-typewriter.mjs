// Code highlighting in the typewriter palette: ink and grey for most of it, blue
// for numbers and constants, teal for strings, and red only for keywords, which
// are short. A light and a dark variant, switched like the rest of the site.
const theme = (name, type, c) => ({
  name,
  type,
  colors: { 'editor.background': c.bg, 'editor.foreground': c.ink },
  tokenColors: [
    { settings: { foreground: c.ink } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: c.mute, fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.operator.new', 'keyword.control'], settings: { foreground: c.red } },
    { scope: ['keyword.operator', 'punctuation'], settings: { foreground: c.mute } },
    { scope: ['string', 'string.quoted', 'string.template', 'markup.inline.raw'], settings: { foreground: c.teal } },
    { scope: ['constant', 'constant.numeric', 'constant.language', 'support.constant', 'variable.other.constant'], settings: { foreground: c.blue } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function'], settings: { foreground: c.ink, fontStyle: 'bold' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'], settings: { foreground: c.ink, fontStyle: 'bold' } },
    { scope: ['entity.name.tag', 'meta.tag'], settings: { foreground: c.red } },
    { scope: ['entity.other.attribute-name', 'variable.parameter'], settings: { foreground: c.blue } },
    { scope: ['markup.heading', 'markup.bold'], settings: { fontStyle: 'bold' } },
    { scope: ['markup.inserted'], settings: { foreground: c.teal } },
    { scope: ['markup.deleted'], settings: { foreground: c.red } },
  ],
});

export const typewriterLight = theme('typewriter-light', 'light', {
  bg: '#f5f6f8', ink: '#15171d', mute: '#5b6070', red: '#c8221a', teal: '#1d8580', blue: '#2b3cf0',
});
export const typewriterDark = theme('typewriter-dark', 'dark', {
  bg: '#171a23', ink: '#e7e9ef', mute: '#9298a8', red: '#ff4d3d', teal: '#35c2bb', blue: '#8a94ff',
});
