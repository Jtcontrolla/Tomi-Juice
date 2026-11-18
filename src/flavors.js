// Single source of truth for the three Tomi flavours.
// Copy uses only what appears on the genuine packaging / official Instagram;
// headlines are creative lines from the project brief.
export const FLAVORS = [
  {
    key: 'mango',
    name: 'Mango',
    pack: 'Mango Flavoured Drink',
    headline: ['Mango.', 'Made to', 'move you.'],
    blurb: 'Golden mango flavour with Tomi’s signature sparkling kick. Sunshine you can sip.',
    label: '/tex/label-mango.jpg',
    accent: '#FFC21A',
    // hero background: glow (centre) → mid → edge
    bg: ['#2F7BFF', '#0B3FC0', '#041A57'],
    ink: '#FFFFFF',
  },
  {
    key: 'cranberry',
    name: 'Cranberry',
    pack: 'Cranberry Flavoured Drink',
    headline: ['Cranberry.', 'A different kind', 'of refreshment.'],
    blurb: 'Bold, ruby-red cranberry flavour — sparkling, bright, and marked with vitamin C on the can.',
    label: '/tex/label-cranberry.jpg',
    accent: '#FF5C77',
    bg: ['#F0425E', '#A30F2D', '#3E0413'],
    ink: '#FFFFFF',
  },
  {
    key: 'orange',
    name: 'Orange',
    pack: 'Orange Flavoured Drink',
    headline: ['Orange.', 'Brighten every', 'moment.'],
    blurb: 'Zesty orange flavour that fizzes from the first sip. Fresh vibes, fresh flavours.',
    label: '/tex/label-orange.jpg',
    accent: '#FFE07A',
    bg: ['#FFB23E', '#F26A0C', '#8F2A00'],
    ink: '#FFFFFF',
  },
];

export const INSTAGRAM = 'https://www.instagram.com/tomi.juice/';
export const INSTAGRAM_DM = 'https://ig.me/m/tomi.juice';
export const LINK_HUB = 'https://qrco.de/bcZr88';
