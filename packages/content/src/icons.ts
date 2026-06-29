/**
 * Emoji -> premium Lucide ikonka (inline SVG) xaritasi.
 * Kontentdagi har bir emoji toza, minimalist chiziqli ikonkaga aylantiriladi.
 *
 * MUHIM: bu faylda hech qanday LITERAL emoji yo'q. Emoji kalitlari
 * `String.fromCodePoint(0xXXXX)` orqali (sof ASCII) quriladi.
 */

// Standart Lucide SVG o'rami (1em o'lcham, currentColor, "ic" klass)
function svg(inner: string, cls = "ic"): string {
  return (
    `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
  );
}

// Rangli to'ldirilgan nuqta (qiyinlik darajalari uchun)
function dot(color: string): string {
  return (
    `<svg class="ic ic-dot" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `aria-hidden="true"><circle cx="12" cy="12" r="7" fill="${color}"/></svg>`
  );
}

// Lucide ikonka ichki yo'llari (path) — nom bo'yicha
const I: Record<string, string> = {
  "book-open":
    '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  rocket:
    '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  target:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  "circle-check": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  "circle-x":
    '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  lightbulb:
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  "circle-alert":
    '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  "triangle-alert":
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  wrench:
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  "clipboard-list":
    '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  folder:
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
  "file-text":
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  hammer:
    '<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/>',
  flask:
    '<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/>',
  puzzle:
    '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  wallet:
    '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  languages:
    '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  boxes:
    '<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  brain:
    '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>',
  landmark:
    '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  keyboard:
    '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
  award:
    '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.69 21.65a.53.53 0 0 1-.771-.56l.882-5.139a2.123 2.123 0 0 0-.611-1.879L2.453 10.43a.53.53 0 0 1 .294-.904l5.166-.756a2.122 2.122 0 0 0 1.595-1.16z"/>',
  smartphone:
    '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  handshake:
    '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
  palette:
    '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  "graduation-cap":
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  dumbbell:
    '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>',
  briefcase:
    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
};

// Kod nuqtasidan (code point) emoji satrini quramiz — sof ASCII, literal emoji yo'q
const cp = (...n: number[]) => String.fromCodePoint(...n);

// Emoji -> SVG xaritasi (kalitlar runtime'da quriladi)
export const EMOJI_TO_SVG: Record<string, string> = {
  [cp(0x1f4d8)]: svg(I["book-open"]), // book (blue)
  [cp(0x1f4da)]: svg(I["book-open"]), // books
  [cp(0x1f4d6)]: svg(I["book-open"]), // open book
  [cp(0x1f680)]: svg(I.rocket), // rocket
  [cp(0x1f3af)]: svg(I.target), // target
  [cp(0x2705)]: svg(I["circle-check"], "ic ic-ok"), // check mark
  [cp(0x274c)]: svg(I["circle-x"], "ic ic-no"), // cross mark
  [cp(0x1f4a1)]: svg(I.lightbulb), // bulb
  [cp(0x2757)]: svg(I["circle-alert"], "ic ic-warn"), // exclamation
  [cp(0x26a0)]: svg(I["triangle-alert"], "ic ic-warn"), // warning
  [cp(0x1f9f0)]: svg(I.wrench), // toolbox
  [cp(0x1f527)]: svg(I.wrench), // wrench
  [cp(0x1f4cb)]: svg(I["clipboard-list"]), // clipboard
  [cp(0x1f4c2)]: svg(I.folder), // open folder
  [cp(0x1f4c1)]: svg(I.folder), // folder
  [cp(0x1f4e6)]: svg(I.boxes), // package
  [cp(0x1f50d)]: svg(I.search), // magnifier left
  [cp(0x1f50e)]: svg(I.search), // magnifier right
  [cp(0x1f5fa)]: svg(I.map), // map
  [cp(0x1f4c4)]: svg(I["file-text"]), // page
  [cp(0x1f3d7)]: svg(I.hammer), // construction
  [cp(0x1f528)]: svg(I.hammer), // hammer
  [cp(0x1f9ea)]: svg(I.flask), // test tube
  [cp(0x1f9e9)]: svg(I.puzzle), // puzzle
  [cp(0x1f465)]: svg(I.users), // users
  [cp(0x1f4b0)]: svg(I.wallet), // money bag
  [cp(0x1f9f1)]: svg(I.boxes), // bricks
  [cp(0x1f6ab)]: svg(I.ban, "ic ic-no"), // no entry
  [cp(0x1f5c2)]: svg(I.folder), // card index
  [cp(0x1f9e0)]: svg(I.brain), // brain
  [cp(0x1f3db)]: svg(I.landmark), // classical building
  [cp(0x1f50c)]: svg(I.plug), // plug
  [cp(0x1f5c4)]: svg(I.database), // file cabinet
  [cp(0x26a1)]: svg(I.zap), // high voltage
  [cp(0x2328)]: svg(I.keyboard), // keyboard
  [cp(0x1f389)]: svg(I.award), // party popper
  [cp(0x1f3c6)]: svg(I.award), // trophy
  [cp(0x27a1)]: svg(I["arrow-right"]), // arrow right
  [cp(0x2b50)]: svg(I.star), // star
  [cp(0x1f4f1)]: svg(I.smartphone), // phone
  [cp(0x1f310)]: svg(I.globe), // globe
  [cp(0x2699)]: svg(I.settings), // gear
  [cp(0x1f91d)]: svg(I.handshake), // handshake
  [cp(0x1f3a8)]: svg(I.palette), // palette
  [cp(0x270d)]: svg(I.pen), // writing hand
  [cp(0x1f393)]: svg(I["graduation-cap"]), // graduation cap
  [cp(0x1f3cb)]: svg(I.dumbbell), // weight lifter
  [cp(0x1f4bc)]: svg(I.briefcase), // briefcase
  [cp(0x1f52e)]: svg(I.target), // crystal ball
  [cp(0x1f517)]: svg(I.plug), // link
  [cp(0x1f4dd)]: svg(I["file-text"]), // memo
  [cp(0x1f3e0)]: svg(I["book-open"]), // home
  [cp(0x1f1ec, 0x1f1e7)]: svg(I.languages), // GB flag
  [cp(0x1f534)]: dot("#ef4444"), // red circle
  [cp(0x1f7e1)]: dot("#f59e0b"), // yellow circle
  [cp(0x1f7e2)]: dot("#22c55e"), // green circle
};

// Kod nuqtasi emoji diapazonidami? (literal belgi/regex'siz, sof son tekshiruvi)
export function isEmojiCodePoint(c: number): boolean {
  return (
    (c >= 0x1f000 && c <= 0x1faff) ||
    (c >= 0x2600 && c <= 0x27bf) ||
    (c >= 0x2190 && c <= 0x21ff) ||
    (c >= 0x2b00 && c <= 0x2bff) ||
    (c >= 0x2300 && c <= 0x23ff) ||
    (c >= 0x2460 && c <= 0x24ff) ||
    (c >= 0xfe00 && c <= 0xfe0f) ||
    c === 0x200d ||
    c === 0x20e3 ||
    c === 0x2705 ||
    c === 0x274c ||
    c === 0x2757 ||
    c === 0x2328 ||
    c === 0x2699 ||
    c === 0x270d
  );
}
