// src/components/Wallpaper.tsx
//
// Chat wallpaper background (dense scattered-icon texture, behind the
// message list only — see MessageThread.tsx). Distinct from
// AuthPattern.tsx (the sparse mudcloth-grid background used on Login/
// SignUp) — this is the busy, WhatsApp-style version: African motifs
// across Adinkra symbolism, ancient architecture (Giza, Nubian and
// Aksumite pyramids, Great Zimbabwe, Djenne), art & regalia (Benin
// bronze, Nok terracotta, kente, beaded crown, throne), instruments
// (kora, balafon, shekere, talking drum, djembe), and everyday/nature
// objects (giraffe, gorilla, palm tree, baobab, canoe, calabash). 72
// unique icons across 10 size classes (hero down to micro) plus tiny
// triangle dust, packed tightly via simple circle-packing so big pieces
// anchor the composition and everything smaller threads through the gaps
// they leave — tiled via one SVG <pattern> fill, no image asset. Uses
// `currentColor` + `text-ink`, so it re-themes for free under Ako's
// light/dark token swap.
//
// Usage — place as the first child of a `relative` (or `fixed`) container,
// then keep real content in a sibling with a higher z-index:
//
//   <div className="relative min-h-screen overflow-hidden bg-canvas">
//     <Wallpaper />
//     <div className="relative z-10">...messages...</div>
//   </div>

export function Wallpaper() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-ink/[0.07]"
      dangerouslySetInnerHTML={{ __html: `<defs><symbol id="ic-sankofa" viewBox="0 0 24 24"><path d="M4 16.5c0-3.3 3.2-5.8 7.3-5.8 2.6 0 4.7.9 5.9 2.3 1-.3 1.8.2 1.9 1.1.1 1-.7 1.7-1.7 1.6-.4 1.7-2.3 2.8-4.6 2.8H8.5"/><path d="M13 12.3c-1.8-1.6-1.6-4 .3-4.9 1.7-.8 3.6.2 3.9 1.9"/><circle cx="17.7" cy="8.5" r="1"/><path d="M9 19.5v2.2M12.5 19.5v2.2"/></symbol>
    <symbol id="ic-gyenyame" viewBox="0 0 24 24"><path d="M12 3c-3 2-3 5-1 6.5-3-1-6 .5-6 3.5s3 4.5 6 3.5c-2 1.5-2 4.5 1 6.5 3-2 3-5 1-6.5 3 1 6-.5 6-3.5s-3-4.5-6-3.5c2-1.5 2-4.5-1-6.5Z"/></symbol>
    <symbol id="ic-dwennimmen" viewBox="0 0 24 24"><path d="M9 19c-3-.5-5-3-5-6 0-2.2 1.6-3.5 3-2.3 1 .9.4 2.6-1 2.6"/><path d="M15 19c3-.5 5-3 5-6 0-2.2-1.6-3.5-3-2.3-1 .9-.4 2.6 1 2.6"/><path d="M6 19h12"/></symbol>
    <symbol id="ic-akoma" viewBox="0 0 24 24"><path d="M12 21c-5.5-4-9-7.6-9-11.4C3 6.7 5 4.5 7.6 4.5c1.7 0 3.3.9 4.4 2.6 1.1-1.7 2.7-2.6 4.4-2.6C19 4.5 21 6.7 21 9.6 21 13.4 17.5 17 12 21Z"/></symbol>
    <symbol id="ic-nkyinkyim" viewBox="0 0 24 24"><path d="M3 19c2-3 2-5 0-8s-2-5 0-8"/><path d="M9 19c2-3 2-5 0-8s-2-5 0-8"/><path d="M15 19c2-3 2-5 0-8s-2-5 0-8"/></symbol>
    <symbol id="ic-adinkrahene" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/></symbol>
    <symbol id="ic-nsibidi_unity" viewBox="0 0 24 24"><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M9 12h6"/></symbol>
    <symbol id="ic-nsibidi_gather" viewBox="0 0 24 24"><circle cx="12" cy="7" r="1.6"/><circle cx="6" cy="17" r="1.6"/><circle cx="18" cy="17" r="1.6"/><path d="M12 8.6 6 15.4M12 8.6l6 6.8"/></symbol>
    <symbol id="ic-ankh" viewBox="0 0 24 24"><circle cx="12" cy="6" r="3.4"/><path d="M12 9.4V21M7 14h10"/></symbol>
    <symbol id="ic-eye_of_horus" viewBox="0 0 24 24"><path d="M2 11c3-3 7-4 10-4s7 1 10 4c-3 3-7 4-10 4s-7-1-10-4Z"/><circle cx="12" cy="11" r="2"/><path d="M12 15v3.5l2.5 2M9 11 5 15"/></symbol>
    <symbol id="ic-scarab" viewBox="0 0 24 24"><path d="M7 10a5 5 0 0 1 10 0v5a5 5 0 0 1-10 0Z"/><path d="M9 6.5a3 3 0 0 1 6 0"/><path d="M12 6v14"/><path d="M6 9 3 7M6 13H2.5M6 17l-3 2M18 9l3-2M18 13h3.5M18 17l3 2"/></symbol>
    <symbol id="ic-pyramid_egypt" viewBox="0 0 24 24"><path d="M2 20 12 4l10 16Z"/><path d="M8.5 20 12 12.5 15.5 20"/></symbol>
    <symbol id="ic-obelisk" viewBox="0 0 24 24"><path d="M10 21V6l2-3 2 3v15Z"/><path d="M10 21h4"/></symbol>
    <symbol id="ic-pyramid_nubian" viewBox="0 0 24 24"><path d="M6 20 12 3l6 17Z"/><path d="M6 20h12"/></symbol>
    <symbol id="ic-aksum_stele" viewBox="0 0 24 24"><path d="M9 21V5.5L12 2l3 3.5V21Z"/><path d="M9 8h6M9 12h6M9 16h6"/></symbol>
    <symbol id="ic-djenne_mosque" viewBox="0 0 24 24"><path d="M4 21V13c0-3 2-5 4-5.5V6h1v1.3c1-.2 2-.2 3-.2s2 0 3 .2V6h1v1.5c2 .5 4 2.5 4 5.5v8Z"/><path d="M9 9v3M15 9v3M12 4v3M4 17h16"/></symbol>
    <symbol id="ic-great_zimbabwe" viewBox="0 0 24 24"><path d="M9 21V9c0-2 1.3-4 3-4s3 2 3 4v12Z"/><path d="M9 12h6M9 16h6"/><path d="M3 21c0-3 2-5 4-5M21 21c0-3-2-5-4-5"/></symbol>
    <symbol id="ic-nok_head" viewBox="0 0 24 24"><path d="M8 21v-5c0-4 2-8 4-8s4 4 4 8v5Z"/><path d="M9.5 11.5 8 9.5M14.5 11.5 16 9.5"/><path d="M10 21v-3M14 21v-3"/></symbol>
    <symbol id="ic-ceremonial_pot" viewBox="0 0 24 24"><path d="M8 4h8l1 3-1.5 2c1 1.5 1.5 3.5 1.5 5.5 0 3.5-2.2 6.5-5 6.5s-5-3-5-6.5c0-2 .5-4 1.5-5.5L7 7Z"/><path d="M9 4V2h6v2M9.5 9.5h5M9 13h6"/></symbol>
    <symbol id="ic-ceremonial_mask" viewBox="0 0 24 24"><path d="M7 3h10l1 8c0 5-3 10-6 10s-6-5-6-10Z"/><circle cx="9.5" cy="10" r="1.2"/><circle cx="14.5" cy="10" r="1.2"/><path d="M9.5 16h5M7.5 12.5v2M16.5 12.5v2"/></symbol>
    <symbol id="ic-ashanti_stool" viewBox="0 0 24 24"><path d="M4 5c2 2.5 14 2.5 16 0"/><path d="M9 5.2c0 4-1.5 6-3 8s-1.5 5 0 7M15 5.2c0 4 1.5 6 3 8s1.5 5 0 7"/><path d="M5 20h14"/></symbol>
    <symbol id="ic-talking_drum" viewBox="0 0 24 24"><path d="M8 3h8L14 10h-4Z"/><path d="M8 21h8l-2-7h-4Z"/><path d="M9.3 6.5 8 21M14.7 6.5 16 21"/></symbol>
    <symbol id="ic-calabash" viewBox="0 0 24 24"><path d="M12 3c1 1.5.5 2.5-.5 3.3C14 7 16 9.5 16 13c0 4-1.8 7-4 7s-4-3-4-7c0-3.5 2-6 4.5-6.7C11.5 5.5 11 4.5 12 3Z"/></symbol>
    <symbol id="ic-cowrie" viewBox="0 0 24 24"><path d="M4 12c0-4.5 3.5-8 8-8s8 3.5 8 8-3.5 8-8 8-8-3.5-8-8Z"/><path d="M9 12h6M9.8 9.5h4.4M9.8 14.5h4.4"/></symbol>
    <symbol id="ic-spear_shield" viewBox="0 0 24 24"><path d="M9 3c-3 1-5 3-5 7 0 5 2.5 9 5 11 2.5-2 5-6 5-11 0-4-2-6-5-7Z"/><path d="M9 4v16"/><path d="M15 21 21 4"/><path d="m21 4 1.3 2.1-3.3 1.4Z"/></symbol>
    <symbol id="ic-crown" viewBox="0 0 24 24"><path d="M4 18 3 9l4.5 3L12 6l4.5 6L21 9l-1 9Z"/><path d="M4 18h16"/></symbol>
    <symbol id="ic-kente" viewBox="0 0 24 24"><path d="M3 5h7v6H3zM14 5h7v6h-7zM3 13h7v6H3zM14 13h7v6h-7z"/><path d="M6.5 5v6M17.5 5v6M6.5 13v6M17.5 13v6M3 8h7M14 8h7M3 16h7M14 16h7"/></symbol>
    <symbol id="ic-aya" viewBox="0 0 24 24"><path d="M12 21V6"/><path d="M12 8c-2-2-5-2-6.5 0M12 8c2-2 5-2 6.5 0M12 12c-2-2-5-2-6.5 0M12 12c2-2 5-2 6.5 0M12 16c-1.5-1.6-4-1.6-5.3 0M12 16c1.5-1.6 4-1.6 5.3 0"/><path d="M9 4.5 12 6l3-1.5"/></symbol>
    <symbol id="ic-duafe" viewBox="0 0 24 24"><path d="M6 3h12v4H6Z"/><path d="M8 7v13M11 7v13M14 7v13M17 7v13"/></symbol>
    <symbol id="ic-fawohodie" viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></symbol>
    <symbol id="ic-mpatapo" viewBox="0 0 24 24"><path d="M8 8c-3 0-4 2.5-2.3 4.3C7.4 14 6 17 3 17"/><path d="M16 8c3 0 4 2.5 2.3 4.3C16.6 14 18 17 21 17"/><path d="M5.7 12.3h12.6"/></symbol>
    <symbol id="ic-akoben" viewBox="0 0 24 24"><path d="M4 20c0-9 5-16 12-16 1 3-1 5-3.5 5.5C15 10 16 13 14 15.5c1.5.5 2 2 1 3.5-2-1-6-1-11 1Z"/></symbol>
    <symbol id="ic-akofena" viewBox="0 0 24 24"><path d="M6 3 3 6l7 7 3-3Z"/><path d="M18 3l3 3-7 7-3-3Z"/><path d="M10 13 4 19M14 13l6 6"/></symbol>
    <symbol id="ic-bese_saka" viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2"/><circle cx="15" cy="9" r="3.2"/><circle cx="9" cy="15.5" r="3.2"/><circle cx="15" cy="15.5" r="3.2"/><path d="M12 5v14.5"/></symbol>
    <symbol id="ic-nyame_dua" viewBox="0 0 24 24"><path d="M12 22V10"/><path d="M12 10 6 4M12 10l6-6M12 10 8 3M12 10l4-7"/><path d="M8 22h8"/></symbol>
    <symbol id="ic-nkonsonkonson" viewBox="0 0 24 24"><ellipse cx="6" cy="12" rx="3.2" ry="4"/><ellipse cx="12" cy="12" rx="3.2" ry="4"/><ellipse cx="18" cy="12" rx="3.2" ry="4"/></symbol>
    <symbol id="ic-nyansapo" viewBox="0 0 24 24"><path d="M7 8c-2 0-3.5 1.8-2.5 3.8C3.5 14 4 17 7 17c2 0 3-1.5 3-3.3"/><path d="M17 8c2 0 3.5 1.8 2.5 3.8C20.5 14 20 17 17 17c-2 0-3-1.5-3-3.3"/><path d="M10 13.7c0 1.8 1 3.3 2 3.3s2-1.5 2-3.3"/></symbol>
    <symbol id="ic-mate_masie" viewBox="0 0 24 24"><path d="M8 4c-3 1.5-4 5-2.5 8-1.5 3-.5 6.5 2.5 8 1.5-2 1-4-.5-5.5C9 13 9 10.5 7.5 9 9 7.5 9 6 8 4Z"/></symbol>
    <symbol id="ic-mframadan" viewBox="0 0 24 24"><path d="M4 21V11l8-6 8 6v10Z"/><path d="M4 21h16M7 21v-6h10v6M2 13l2-2M22 13l-2-2"/></symbol>
    <symbol id="ic-osram_ne_nsoromma" viewBox="0 0 24 24"><path d="M13 4a7 7 0 1 0 5.8 11.8A7 7 0 0 1 13 4Z"/><path d="M19 15l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L16 17.3l2-.3Z"/></symbol>
    <symbol id="ic-eban" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="1"/><path d="M4 12h16M9 6v12M15 6v12"/></symbol>
    <symbol id="ic-giraffe" viewBox="0 0 24 24"><path d="M8 21v-5M11 21v-5M15 21v-6M18 21v-6"/><path d="M8 16c0-2 1.5-3.5 3.5-3.5H15c1.5 0 3-1 3-2.5"/><path d="M15 10c.5-2.5 1.5-5 3-6.5"/><circle cx="18.4" cy="3" r="1"/><path d="M17.5 1.8l-.4-1M19.3 1.8l.4-1"/><path d="M8 16.5c-1 .3-1.7 1-1.7 2"/></symbol>
    <symbol id="ic-gorilla" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M7 6.5c-1.5-.5-2 1-1 2M17 6.5c1.5-.5 2 1 1 2"/><circle cx="9.7" cy="7.5" r=".8"/><circle cx="14.3" cy="7.5" r=".8"/><path d="M10 10.5c1 .8 3 .8 4 0"/><path d="M8 13c-3 1-4 4-3 8h14c1-4 0-7-3-8-1.5 1.5-6.5 1.5-8 0Z"/></symbol>
    <symbol id="ic-fish" viewBox="0 0 24 24"><path d="M2 12c3-4 8-6 13-6 3 0 5.5 2.5 5.5 6S18 18 15 18c-5 0-10-2-13-6Z"/><path d="M20.5 12 23 9v6Z"/><circle cx="7.5" cy="11" r=".8"/><path d="M9 12c1 1 3 1 4 0"/></symbol>
    <symbol id="ic-palm_tree" viewBox="0 0 24 24"><path d="M12 21V11c-1-1-1-2 0-3"/><path d="M12 8c-3-1-5 0-7 2M12 8c3-1 5 0 7 2M12 8c-2-2-4-2-6-1M12 8c2-2 4-2 6-1M12 8c0-2.5-1-4-2.5-5M12 8c0-2.5 1-4 2.5-5"/><circle cx="11" cy="9.3" r=".7"/><circle cx="13" cy="9.3" r=".7"/></symbol>
    <symbol id="ic-bamboo" viewBox="0 0 24 24"><path d="M8 21V3M16 21V3"/><path d="M8 7h8M8 12h8M8 17h8"/></symbol>
    <symbol id="ic-hut" viewBox="0 0 24 24"><path d="M3 21 12 8l9 13Z"/><path d="M6.5 21v-6h11v6"/><path d="M9 21v-3h6v3"/></symbol>
    <symbol id="ic-baobab" viewBox="0 0 24 24"><path d="M12 21v-9"/><ellipse cx="12" cy="8" rx="6" ry="4.5"/><path d="M8 5.5c-1-1-1-2.5 0-3.5M12 4c0-1.3.8-2.3 2-2.7M16 5.5c1.2-.8 1.7-2 1.3-3.2"/><path d="M7 21h10"/></symbol>
    <symbol id="ic-giza" viewBox="0 0 24 24"><path d="M1 20 7 9l4 5-2 6Z"/><path d="M9 20l5-13 6 13Z"/><path d="M13.5 12.5 15 10l1.5 2.5"/></symbol>
    <symbol id="ic-benin_bronze" viewBox="0 0 24 24"><path d="M6 2h12v20H6Z"/><circle cx="12" cy="8" r="2.6"/><path d="M9 20v-5c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5v5"/><path d="M9 16.5h6"/></symbol>
    <symbol id="ic-kora" viewBox="0 0 24 24"><ellipse cx="10" cy="17" rx="5" ry="4.5"/><path d="M6 12h8"/><path d="M6 12 4 3M8 12 7.3 1.5M10 12v-11M12 12l2.7 1.5M14 12l3-9"/></symbol>
    <symbol id="ic-balafon" viewBox="0 0 24 24"><path d="M3 16 5 6h14l2 10Z"/><path d="M6.5 7v8.5M9.7 6.3v9M13 6v9.3M16.3 6.6v8.7"/><circle cx="4" cy="19" r="1.4"/><circle cx="20" cy="19" r="1.4"/></symbol>
    <symbol id="ic-shekere" viewBox="0 0 24 24"><circle cx="12" cy="13" r="7"/><path d="M12 6V2"/><path d="M8 9l1.5 1.5M16 9l-1.5 1.5M8 13.5h1.5M16 13.5h-1.5M9.5 17.5 11 16M14.5 17.5 13 16"/></symbol>
    <symbol id="ic-mortar_pestle" viewBox="0 0 24 24"><path d="M5 13c0 4 3 7 7 7s7-3 7-7"/><path d="M4 13h16"/><path d="M14 2 9 12"/></symbol>
    <symbol id="ic-wooden_spoon" viewBox="0 0 24 24"><ellipse cx="9" cy="6" rx="4" ry="5"/><path d="M9 11v10"/></symbol>
    <symbol id="ic-djembe" viewBox="0 0 24 24"><path d="M7 3h10l-1.5 8h-7Z"/><path d="M9.3 11 7 21h10l-2.3-10"/><path d="M8 21h8"/></symbol>
    <symbol id="ic-throne" viewBox="0 0 24 24"><path d="M6 21V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12"/><path d="M6 13H3v8h3M18 13h3v8h-3"/><path d="M9 21v-6h6v6"/><path d="M9 4v3M12 2v5M15 4v3"/></symbol>
    <symbol id="ic-arrow" viewBox="0 0 24 24"><path d="M4 20 19 5"/><path d="m19 5-5.5.5L19 5l-.5 5.5Z"/><path d="m7 15-2.5 2 2.5.5.5 2.5Z"/></symbol>
    <symbol id="ic-zulu_shield" viewBox="0 0 24 24"><path d="M12 2c4 1.5 6 3.5 6 7 0 6-3 10.5-6 13-3-2.5-6-7-6-13 0-3.5 2-5.5 6-7Z"/><path d="M12 4v18M8 8h8M8 15h8"/></symbol>
    <symbol id="ic-wooden_mask" viewBox="0 0 24 24"><path d="M9 2c-1.5 3-2 6-2 9 0 6 2 10 5 11 3-1 5-5 5-11 0-3-.5-6-2-9"/><path d="M9.3 10.5 8 9M14.7 10.5 16 9"/><path d="M12 13v3M10 19h4"/></symbol>
    <symbol id="ic-sword" viewBox="0 0 24 24"><path d="M12 2v14"/><path d="M9 4h6"/><path d="M12 16l-2.5 2.5M12 16l2.5 2.5"/><path d="M12 22v-3.5"/></symbol>
    <symbol id="ic-walking_stick" viewBox="0 0 24 24"><path d="M12 22V6"/><circle cx="12" cy="4" r="2"/><path d="M12 6c-1.5.5-2.5 1.5-2.5 3M12 6c1.5.5 2.5 1.5 2.5 3"/></symbol>
    <symbol id="ic-basket" viewBox="0 0 24 24"><path d="M4 10h16l-2 11H6Z"/><path d="M4 10c0-3 3.5-5 8-5s8 2 8 5"/><path d="M8 10l1 11M16 10l-1 11M12 10v11"/></symbol>
    <symbol id="ic-cooking_pot" viewBox="0 0 24 24"><path d="M4 10h16v3c0 4-3.5 7-8 7s-8-3-8-7Z"/><path d="M2 10h20"/><path d="M6 10V8h12v2"/></symbol>
    <symbol id="ic-beads" viewBox="0 0 24 24"><path d="M6 4c3 6 3 10 0 16M18 4c-3 6-3 10 0 16"/><circle cx="6.6" cy="6" r="1.1"/><circle cx="9.3" cy="9" r="1.1"/><circle cx="12" cy="12" r="1.2"/><circle cx="14.7" cy="9" r="1.1"/><circle cx="17.4" cy="6" r="1.1"/></symbol>
    <symbol id="ic-bangle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/></symbol>
    <symbol id="ic-canoe" viewBox="0 0 24 24"><path d="M2 14c2 4 6 6 10 6s8-2 10-6Z"/><path d="M6 14c1-6 3-10 6-12 3 2 5 6 6 12"/></symbol>
    <symbol id="ic-fishing_net" viewBox="0 0 24 24"><path d="M4 4h16v16H4Z"/><path d="M4 4l16 16M20 4 4 20M12 4v16M4 12h16"/></symbol>
    <symbol id="ic-mountain" viewBox="0 0 24 24"><path d="M1 20 8 8l3 4 4-8 8 16Z"/><path d="M11.5 12 13 14.3l1.7-1"/></symbol>
    <symbol id="ic-river_wave" viewBox="0 0 24 24"><path d="M2 8c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0"/><path d="M2 14c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0"/><path d="M2 20c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0"/></symbol>
    <symbol id="ic-yam" viewBox="0 0 24 24"><path d="M6 15c-2-3-1-7 2.5-9C11 4.3 14 4 16 6c2.5 2.5 2 6-1 8.5-2 1.7-2.5 3.7-1 5.5-3 1-6.5.5-8-2Z"/><path d="M9 8.5c1.5-1 3-1 4.5.5"/></symbol>
    <symbol id="ic-sun_burst" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/></symbol>
    <symbol id="ic-triangle" viewBox="0 0 24 24"><path d="M12 4 20 19H4Z"/></symbol><pattern id="authPattern" width="1100" height="1100" patternUnits="userSpaceOnUse"><g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><use href="#ic-adinkrahene" width="135.5" height="135.5" x="-67.7" y="-67.7" opacity="0.6" transform="translate(123.6 432.1) rotate(-13.0)"/>
    <use href="#ic-nkyinkyim" width="144.3" height="144.3" x="-72.1" y="-72.1" opacity="0.61" transform="translate(833.4 162.1) rotate(5.8)"/>
    <use href="#ic-pyramid_egypt" width="156.4" height="156.4" x="-78.2" y="-78.2" opacity="0.9" transform="translate(492.5 453.8) rotate(-13.7)"/>
    <use href="#ic-kora" width="170.5" height="170.5" x="-85.3" y="-85.3" opacity="0.98" transform="translate(375.7 226.5) rotate(-4.9)"/>
    <use href="#ic-yam" width="143.4" height="143.4" x="-71.7" y="-71.7" opacity="0.57" transform="translate(238.6 643.4) rotate(-15.8)"/>
    <use href="#ic-giza" width="142.2" height="142.2" x="-71.1" y="-71.1" opacity="0.88" transform="translate(148.2 162.4) rotate(-16.9)"/>
    <use href="#ic-djembe" width="169.7" height="169.7" x="-84.9" y="-84.9" opacity="0.64" transform="translate(716.3 240.2) rotate(8.3)"/>
    <use href="#ic-fish" width="123.4" height="123.4" x="-61.7" y="-61.7" opacity="0.81" transform="translate(241.1 45.6) rotate(-7.4)"/>
    <use href="#ic-obelisk" width="119.6" height="119.6" x="-59.8" y="-59.8" opacity="0.69" transform="translate(234.5 824.2) rotate(10.4)"/>
    <use href="#ic-mate_masie" width="112.2" height="112.2" x="-56.1" y="-56.1" opacity="0.64" transform="translate(686.1 600.4) rotate(-14.6)"/>
    <use href="#ic-obelisk" width="130.1" height="130.1" x="-65.1" y="-65.1" opacity="0.68" transform="translate(661.5 764.9) rotate(6.1)"/>
    <use href="#ic-aksum_stele" width="115.3" height="115.3" x="-57.7" y="-57.7" opacity="0.91" transform="translate(923.2 973.4) rotate(-1.6)"/>
    <use href="#ic-djenne_mosque" width="118.7" height="118.7" x="-59.3" y="-59.3" opacity="0.94" transform="translate(867.8 617.8) rotate(-8.4)"/>
    <use href="#ic-ashanti_stool" width="123.3" height="123.3" x="-61.6" y="-61.6" opacity="0.93" transform="translate(1056.9 221.2) rotate(7.7)"/>
    <use href="#ic-nkonsonkonson" width="119.4" height="119.4" x="-59.7" y="-59.7" opacity="0.99" transform="translate(548.0 867.3) rotate(13.0)"/>
    <use href="#ic-basket" width="119.8" height="119.8" x="-59.9" y="-59.9" opacity="0.88" transform="translate(649.8 940.0) rotate(-13.0)"/>
    <use href="#ic-akofena" width="124.6" height="124.6" x="-62.3" y="-62.3" opacity="0.9" transform="translate(1070.5 844.3) rotate(-0.4)"/>
    <use href="#ic-adinkrahene" width="119.3" height="119.3" x="-59.6" y="-59.6" opacity="0.81" transform="translate(641.0 490.4) rotate(-13.2)"/>
    <use href="#ic-spear_shield" width="97.0" height="97.0" x="-48.5" y="-48.5" opacity="0.94" transform="translate(1015.7 975.5) rotate(16.1)"/>
    <use href="#ic-spear_shield" width="98.4" height="98.4" x="-49.2" y="-49.2" opacity="0.76" transform="translate(553.8 249.6) rotate(7.8)"/>
    <use href="#ic-djenne_mosque" width="98.9" height="98.9" x="-49.5" y="-49.5" opacity="0.71" transform="translate(513.6 147.0) rotate(0.8)"/>
    <use href="#ic-talking_drum" width="89.4" height="89.4" x="-44.7" y="-44.7" opacity="0.85" transform="translate(322.0 417.2) rotate(-16.5)"/>
    <use href="#ic-osram_ne_nsoromma" width="99.2" height="99.2" x="-49.6" y="-49.6" opacity="0.95" transform="translate(228.4 270.1) rotate(-10.6)"/>
    <use href="#ic-nkyinkyim" width="91.5" height="91.5" x="-45.8" y="-45.8" opacity="0.83" transform="translate(296.4 1033.2) rotate(-16.8)"/>
    <use href="#ic-balafon" width="102.1" height="102.1" x="-51.1" y="-51.1" opacity="0.75" transform="translate(895.3 400.3) rotate(-16.8)"/>
    <use href="#ic-mframadan" width="98.7" height="98.7" x="-49.4" y="-49.4" opacity="0.72" transform="translate(264.0 354.2) rotate(7.1)"/>
    <use href="#ic-walking_stick" width="99.9" height="99.9" x="-49.9" y="-49.9" opacity="0.75" transform="translate(72.6 273.9) rotate(14.0)"/>
    <use href="#ic-cooking_pot" width="97.7" height="97.7" x="-48.9" y="-48.9" opacity="0.85" transform="translate(22.7 996.9) rotate(15.9)"/>
    <use href="#ic-yam" width="95.3" height="95.3" x="-47.7" y="-47.7" opacity="0.9" transform="translate(426.4 744.9) rotate(13.9)"/>
    <use href="#ic-mpatapo" width="86.9" height="86.9" x="-43.4" y="-43.4" opacity="0.98" transform="translate(627.6 1055.0) rotate(-16.3)"/>
    <use href="#ic-akoben" width="98.3" height="98.3" x="-49.2" y="-49.2" opacity="0.89" transform="translate(876.2 67.8) rotate(8.3)"/>
    <use href="#ic-river_wave" width="93.7" height="93.7" x="-46.8" y="-46.8" opacity="0.56" transform="translate(247.9 947.6) rotate(-12.9)"/>
    <use href="#ic-fish" width="100.5" height="100.5" x="-50.2" y="-50.2" opacity="1.0" transform="translate(525.9 754.2) rotate(-9.5)"/>
    <use href="#ic-kora" width="94.4" height="94.4" x="-47.2" y="-47.2" opacity="0.7" transform="translate(394.8 1030.1) rotate(14.8)"/>
    <use href="#ic-nkyinkyim" width="74.2" height="74.2" x="-37.1" y="-37.1" opacity="0.74" transform="translate(752.6 922.7) rotate(13.8)"/>
    <use href="#ic-canoe" width="80.0" height="80.0" x="-40.0" y="-40.0" opacity="0.74" transform="translate(149.5 1061.5) rotate(14.8)"/>
    <use href="#ic-nok_head" width="76.9" height="76.9" x="-38.4" y="-38.4" opacity="0.69" transform="translate(863.2 498.9) rotate(13.4)"/>
    <use href="#ic-throne" width="79.3" height="79.3" x="-39.7" y="-39.7" opacity="0.74" transform="translate(852.3 917.5) rotate(11.5)"/>
    <use href="#ic-talking_drum" width="69.1" height="69.1" x="-34.6" y="-34.6" opacity="0.93" transform="translate(716.6 986.6) rotate(-13.8)"/>
    <use href="#ic-arrow" width="79.3" height="79.3" x="-39.7" y="-39.7" opacity="0.59" transform="translate(341.3 731.1) rotate(-2.4)"/>
    <use href="#ic-nsibidi_gather" width="69.5" height="69.5" x="-34.8" y="-34.8" opacity="0.69" transform="translate(760.5 530.6) rotate(-8.8)"/>
    <use href="#ic-giraffe" width="81.6" height="81.6" x="-40.8" y="-40.8" opacity="0.87" transform="translate(338.8 65.0) rotate(-13.7)"/>
    <use href="#ic-calabash" width="77.8" height="77.8" x="-38.9" y="-38.9" opacity="0.8" transform="translate(606.6 651.3) rotate(-8.5)"/>
    <use href="#ic-bese_saka" width="80.6" height="80.6" x="-40.3" y="-40.3" opacity="0.84" transform="translate(941.4 1072.8) rotate(8.9)"/>
    <use href="#ic-wooden_spoon" width="70.7" height="70.7" x="-35.3" y="-35.3" opacity="0.63" transform="translate(790.5 813.9) rotate(-1.7)"/>
    <use href="#ic-bamboo" width="75.4" height="75.4" x="-37.7" y="-37.7" opacity="0.77" transform="translate(146.6 964.7) rotate(10.8)"/>
    <use href="#ic-baobab" width="71.2" height="71.2" x="-35.6" y="-35.6" opacity="0.63" transform="translate(530.3 14.4) rotate(5.9)"/>
    <use href="#ic-obelisk" width="70.2" height="70.2" x="-35.1" y="-35.1" opacity="0.82" transform="translate(943.2 178.3) rotate(8.6)"/>
    <use href="#ic-eye_of_horus" width="73.5" height="73.5" x="-36.8" y="-36.8" opacity="0.96" transform="translate(943.5 865.2) rotate(9.1)"/>
    <use href="#ic-palm_tree" width="77.6" height="77.6" x="-38.8" y="-38.8" opacity="0.66" transform="translate(20.7 56.7) rotate(2.4)"/>
    <use href="#ic-mframadan" width="73.9" height="73.9" x="-37.0" y="-37.0" opacity="0.59" transform="translate(456.7 567.4) rotate(-3.6)"/>
    <use href="#ic-nkyinkyim" width="69.5" height="69.5" x="-34.8" y="-34.8" opacity="0.79" transform="translate(180.0 323.7) rotate(-5.6)"/>
    <use href="#ic-obelisk" width="74.3" height="74.3" x="-37.2" y="-37.2" opacity="0.66" transform="translate(316.3 844.2) rotate(-6.3)"/>
    <use href="#ic-aya" width="81.9" height="81.9" x="-41.0" y="-41.0" opacity="0.62" transform="translate(15.1 615.6) rotate(2.4)"/>
    <use href="#ic-nkonsonkonson" width="79.1" height="79.1" x="-39.5" y="-39.5" opacity="0.77" transform="translate(714.9 115.7) rotate(5.8)"/>
    <use href="#ic-hut" width="73.5" height="73.5" x="-36.8" y="-36.8" opacity="0.67" transform="translate(176.5 514.5) rotate(15.8)"/>
    <use href="#ic-giza" width="73.7" height="73.7" x="-36.9" y="-36.9" opacity="0.74" transform="translate(975.2 377.4) rotate(-10.8)"/>
    <use href="#ic-mountain" width="76.6" height="76.6" x="-38.3" y="-38.3" opacity="0.91" transform="translate(799.3 18.1) rotate(-5.9)"/>
    <use href="#ic-wooden_mask" width="63.4" height="63.4" x="-31.7" y="-31.7" opacity="0.79" transform="translate(748.9 854.3) rotate(-0.3)"/>
    <use href="#ic-nsibidi_unity" width="58.6" height="58.6" x="-29.3" y="-29.3" opacity="0.97" transform="translate(1.0 554.0) rotate(17.2)"/>
    <use href="#ic-arrow" width="55.4" height="55.4" x="-27.7" y="-27.7" opacity="0.75" transform="translate(1069.4 306.9) rotate(-9.2)"/>
    <use href="#ic-kora" width="54.9" height="54.9" x="-27.5" y="-27.5" opacity="0.76" transform="translate(947.0 28.1) rotate(-3.6)"/>
    <use href="#ic-wooden_mask" width="58.7" height="58.7" x="-29.3" y="-29.3" opacity="0.72" transform="translate(490.6 1048.9) rotate(5.0)"/>
    <use href="#ic-aya" width="55.6" height="55.6" x="-27.8" y="-27.8" opacity="0.69" transform="translate(626.8 75.1) rotate(-0.5)"/>
    <use href="#ic-djenne_mosque" width="57.3" height="57.3" x="-28.6" y="-28.6" opacity="0.59" transform="translate(622.2 168.8) rotate(-1.9)"/>
    <use href="#ic-giraffe" width="52.8" height="52.8" x="-26.4" y="-26.4" opacity="0.9" transform="translate(859.0 1085.6) rotate(-13.6)"/>
    <use href="#ic-talking_drum" width="61.8" height="61.8" x="-30.9" y="-30.9" opacity="0.93" transform="translate(1095.7 54.1) rotate(13.6)"/>
    <use href="#ic-sword" width="62.6" height="62.6" x="-31.3" y="-31.3" opacity="0.95" transform="translate(1099.9 546.3) rotate(10.3)"/>
    <use href="#ic-nsibidi_gather" width="58.8" height="58.8" x="-29.4" y="-29.4" opacity="0.92" transform="translate(709.3 25.8) rotate(7.1)"/>
    <use href="#ic-aksum_stele" width="64.0" height="64.0" x="-32.0" y="-32.0" opacity="0.73" transform="translate(1010.7 628.5) rotate(6.9)"/>
    <use href="#ic-yam" width="59.0" height="59.0" x="-29.5" y="-29.5" opacity="0.73" transform="translate(377.9 874.1) rotate(3.7)"/>
    <use href="#ic-hut" width="56.2" height="56.2" x="-28.1" y="-28.1" opacity="0.62" transform="translate(423.1 55.1) rotate(-17.9)"/>
    <use href="#ic-spear_shield" width="61.0" height="61.0" x="-30.5" y="-30.5" opacity="0.7" transform="translate(854.9 746.0) rotate(7.3)"/>
    <use href="#ic-eban" width="61.9" height="61.9" x="-30.9" y="-30.9" opacity="0.84" transform="translate(765.9 751.4) rotate(13.0)"/>
    <use href="#ic-mpatapo" width="58.5" height="58.5" x="-29.3" y="-29.3" opacity="0.87" transform="translate(1033.3 722.3) rotate(2.1)"/>
    <use href="#ic-fish" width="62.4" height="62.4" x="-31.2" y="-31.2" opacity="0.66" transform="translate(391.0 806.6) rotate(3.5)"/>
    <use href="#ic-eban" width="56.2" height="56.2" x="-28.1" y="-28.1" opacity="0.92" transform="translate(1095.7 1017.7) rotate(-15.4)"/>
    <use href="#ic-shekere" width="55.7" height="55.7" x="-27.8" y="-27.8" opacity="0.96" transform="translate(641.5 338.4) rotate(-2.7)"/>
    <use href="#ic-obelisk" width="57.2" height="57.2" x="-28.6" y="-28.6" opacity="0.73" transform="translate(805.5 954.0) rotate(12.3)"/>
    <use href="#ic-hut" width="58.1" height="58.1" x="-29.1" y="-29.1" opacity="0.89" transform="translate(793.7 706.8) rotate(4.5)"/>
    <use href="#ic-nyansapo" width="59.7" height="59.7" x="-29.9" y="-29.9" opacity="0.58" transform="translate(958.8 564.5) rotate(-10.7)"/>
    <use href="#ic-walking_stick" width="61.8" height="61.8" x="-30.9" y="-30.9" opacity="0.72" transform="translate(28.4 208.3) rotate(-17.8)"/>
    <use href="#ic-nyansapo" width="52.4" height="52.4" x="-26.2" y="-26.2" opacity="0.72" transform="translate(1009.0 769.7) rotate(-0.6)"/>
    <use href="#ic-cooking_pot" width="54.8" height="54.8" x="-27.4" y="-27.4" opacity="0.64" transform="translate(149.1 586.2) rotate(12.8)"/>
    <use href="#ic-nyansapo" width="56.1" height="56.1" x="-28.1" y="-28.1" opacity="0.87" transform="translate(314.9 920.7) rotate(10.6)"/>
    <use href="#ic-kente" width="58.0" height="58.0" x="-29.0" y="-29.0" opacity="0.71" transform="translate(494.2 62.1) rotate(-17.6)"/>
    <use href="#ic-gyenyame" width="63.1" height="63.1" x="-31.6" y="-31.6" opacity="0.8" transform="translate(683.6 676.1) rotate(-4.0)"/>
    <use href="#ic-nsibidi_unity" width="62.5" height="62.5" x="-31.2" y="-31.2" opacity="0.84" transform="translate(99.9 775.8) rotate(-0.3)"/>
    <use href="#ic-palm_tree" width="52.9" height="52.9" x="-26.4" y="-26.4" opacity="0.86" transform="translate(142.2 268.9) rotate(-3.3)"/>
    <use href="#ic-cowrie" width="60.5" height="60.5" x="-30.2" y="-30.2" opacity="0.74" transform="translate(392.1 558.0) rotate(17.4)"/>
    <use href="#ic-obelisk" width="54.2" height="54.2" x="-27.1" y="-27.1" opacity="0.79" transform="translate(865.2 254.8) rotate(-3.2)"/>
    <use href="#ic-nsibidi_gather" width="54.8" height="54.8" x="-27.4" y="-27.4" opacity="0.88" transform="translate(565.4 380.8) rotate(-4.0)"/>
    <use href="#ic-cooking_pot" width="46.4" height="46.4" x="-23.2" y="-23.2" opacity="0.72" transform="translate(32.3 494.0) rotate(10.6)"/>
    <use href="#ic-mpatapo" width="44.9" height="44.9" x="-22.4" y="-22.4" opacity="0.6" transform="translate(88.2 979.2) rotate(-11.3)"/>
    <use href="#ic-eye_of_horus" width="40.1" height="40.1" x="-20.0" y="-20.0" opacity="0.71" transform="translate(390.1 674.3) rotate(1.4)"/>
    <use href="#ic-akoma" width="41.2" height="41.2" x="-20.6" y="-20.6" opacity="0.89" transform="translate(486.3 655.0) rotate(0.5)"/>
    <use href="#ic-nyame_dua" width="43.8" height="43.8" x="-21.9" y="-21.9" opacity="0.75" transform="translate(8.3 848.7) rotate(12.7)"/>
    <use href="#ic-baobab" width="49.4" height="49.4" x="-24.7" y="-24.7" opacity="0.95" transform="translate(943.3 462.7) rotate(-13.1)"/>
    <use href="#ic-sankofa" width="42.7" height="42.7" x="-21.4" y="-21.4" opacity="0.68" transform="translate(7.1 689.9) rotate(11.7)"/>
    <use href="#ic-dwennimmen" width="48.3" height="48.3" x="-24.1" y="-24.1" opacity="0.68" transform="translate(464.4 905.4) rotate(-8.8)"/>
    <use href="#ic-throne" width="45.4" height="45.4" x="-22.7" y="-22.7" opacity="0.99" transform="translate(355.4 519.0) rotate(0.2)"/>
    <use href="#ic-cooking_pot" width="43.1" height="43.1" x="-21.5" y="-21.5" opacity="0.88" transform="translate(116.3 851.9) rotate(10.1)"/>
    <use href="#ic-djembe" width="42.0" height="42.0" x="-21.0" y="-21.0" opacity="0.77" transform="translate(260.0 497.7) rotate(17.6)"/>
    <use href="#ic-sankofa" width="41.2" height="41.2" x="-20.6" y="-20.6" opacity="0.94" transform="translate(32.2 771.1) rotate(-3.2)"/>
    <use href="#ic-gorilla" width="40.0" height="40.0" x="-20.0" y="-20.0" opacity="0.73" transform="translate(205.0 369.1) rotate(9.9)"/>
    <use href="#ic-kora" width="47.1" height="47.1" x="-23.6" y="-23.6" opacity="0.56" transform="translate(87.4 507.5) rotate(15.3)"/>
    <use href="#ic-adinkrahene" width="43.7" height="43.7" x="-21.8" y="-21.8" opacity="0.56" transform="translate(809.1 1031.3) rotate(-5.3)"/>
    <use href="#ic-eban" width="43.2" height="43.2" x="-21.6" y="-21.6" opacity="0.58" transform="translate(287.0 529.1) rotate(-8.8)"/>
    <use href="#ic-scarab" width="49.5" height="49.5" x="-24.7" y="-24.7" opacity="0.97" transform="translate(872.3 828.3) rotate(-13.1)"/>
    <use href="#ic-giraffe" width="42.3" height="42.3" x="-21.2" y="-21.2" opacity="0.69" transform="translate(621.3 850.6) rotate(-11.1)"/>
    <use href="#ic-ceremonial_mask" width="44.4" height="44.4" x="-22.2" y="-22.2" opacity="0.93" transform="translate(219.5 560.8) rotate(-10.9)"/>
    <use href="#ic-calabash" width="40.2" height="40.2" x="-20.1" y="-20.1" opacity="0.74" transform="translate(265.9 150.6) rotate(-0.5)"/>
    <use href="#ic-mortar_pestle" width="41.4" height="41.4" x="-20.7" y="-20.7" opacity="0.61" transform="translate(927.3 520.8) rotate(-13.9)"/>
    <use href="#ic-walking_stick" width="42.0" height="42.0" x="-21.0" y="-21.0" opacity="0.72" transform="translate(1046.3 19.5) rotate(6.0)"/>
    <use href="#ic-sankofa" width="44.8" height="44.8" x="-22.4" y="-22.4" opacity="0.95" transform="translate(79.0 624.4) rotate(9.2)"/>
    <use href="#ic-talking_drum" width="46.4" height="46.4" x="-23.2" y="-23.2" opacity="0.94" transform="translate(481.2 1004.6) rotate(7.2)"/>
    <use href="#ic-sun_burst" width="46.6" height="46.6" x="-23.3" y="-23.3" opacity="0.63" transform="translate(1027.1 906.0) rotate(-0.6)"/>
    <use href="#ic-sword" width="43.3" height="43.3" x="-21.7" y="-21.7" opacity="0.87" transform="translate(147.1 761.3) rotate(8.6)"/>
    <use href="#ic-osram_ne_nsoromma" width="41.8" height="41.8" x="-20.9" y="-20.9" opacity="0.59" transform="translate(698.9 866.7) rotate(9.5)"/>
    <use href="#ic-river_wave" width="46.8" height="46.8" x="-23.4" y="-23.4" opacity="0.92" transform="translate(764.9 1045.6) rotate(-13.8)"/>
    <use href="#ic-duafe" width="41.6" height="41.6" x="-20.8" y="-20.8" opacity="0.81" transform="translate(1090.6 751.7) rotate(-3.6)"/>
    <use href="#ic-cooking_pot" width="43.7" height="43.7" x="-21.8" y="-21.8" opacity="0.98" transform="translate(73.7 1055.9) rotate(-11.9)"/>
    <use href="#ic-aksum_stele" width="43.4" height="43.4" x="-21.7" y="-21.7" opacity="0.77" transform="translate(163.0 860.2) rotate(-2.1)"/>
    <use href="#ic-mframadan" width="40.1" height="40.1" x="-20.0" y="-20.0" opacity="0.78" transform="translate(756.2 444.6) rotate(-0.1)"/>
    <use href="#ic-nkyinkyim" width="48.8" height="48.8" x="-24.4" y="-24.4" opacity="0.86" transform="translate(1091.6 135.7) rotate(13.1)"/>
    <use href="#ic-nkonsonkonson" width="41.6" height="41.6" x="-20.8" y="-20.8" opacity="0.63" transform="translate(70.4 34.0) rotate(-8.2)"/>
    <use href="#ic-nok_head" width="43.5" height="43.5" x="-21.7" y="-21.7" opacity="0.6" transform="translate(107.9 1098.5) rotate(-15.8)"/>
    <use href="#ic-eban" width="46.5" height="46.5" x="-23.3" y="-23.3" opacity="0.65" transform="translate(1074.0 442.8) rotate(-9.5)"/>
    <use href="#ic-djembe" width="46.6" height="46.6" x="-23.3" y="-23.3" opacity="0.74" transform="translate(559.8 679.4) rotate(11.9)"/>
    <use href="#ic-giza" width="45.3" height="45.3" x="-22.7" y="-22.7" opacity="0.67" transform="translate(402.7 510.6) rotate(-12.4)"/>
    <use href="#ic-adinkrahene" width="46.5" height="46.5" x="-23.3" y="-23.3" opacity="0.88" transform="translate(559.1 591.6) rotate(-8.4)"/>
    <use href="#ic-mortar_pestle" width="41.8" height="41.8" x="-20.9" y="-20.9" opacity="0.84" transform="translate(253.2 416.0) rotate(-10.6)"/>
    <use href="#ic-bamboo" width="44.7" height="44.7" x="-22.3" y="-22.3" opacity="0.58" transform="translate(473.1 816.8) rotate(-0.2)"/>
    <use href="#ic-ceremonial_pot" width="43.8" height="43.8" x="-21.9" y="-21.9" opacity="0.94" transform="translate(1072.2 633.7) rotate(-0.9)"/>
    <use href="#ic-mate_masie" width="42.8" height="42.8" x="-21.4" y="-21.4" opacity="0.84" transform="translate(856.2 1044.0) rotate(-6.6)"/>
    <use href="#ic-giza" width="48.1" height="48.1" x="-24.0" y="-24.0" opacity="0.6" transform="translate(807.5 297.8) rotate(9.1)"/>
    <use href="#ic-hut" width="49.2" height="49.2" x="-24.6" y="-24.6" opacity="0.7" transform="translate(484.7 228.7) rotate(-15.3)"/>
    <use href="#ic-sun_burst" width="43.8" height="43.8" x="-21.9" y="-21.9" opacity="0.89" transform="translate(504.8 606.2) rotate(8.9)"/>
    <use href="#ic-giza" width="32.3" height="32.3" x="-16.1" y="-16.1" opacity="0.68" transform="translate(433.7 314.7) rotate(-16.3)"/>
    <use href="#ic-adinkrahene" width="36.6" height="36.6" x="-18.3" y="-18.3" opacity="0.83" transform="translate(961.4 246.9) rotate(6.5)"/>
    <use href="#ic-balafon" width="31.5" height="31.5" x="-15.7" y="-15.7" opacity="0.66" transform="translate(363.2 947.9) rotate(-2.2)"/>
    <use href="#ic-talking_drum" width="32.0" height="32.0" x="-16.0" y="-16.0" opacity="0.58" transform="translate(378.6 361.2) rotate(-1.7)"/>
    <use href="#ic-ashanti_stool" width="31.8" height="31.8" x="-15.9" y="-15.9" opacity="0.87" transform="translate(509.7 978.9) rotate(-8.5)"/>
    <use href="#ic-basket" width="37.9" height="37.9" x="-18.9" y="-18.9" opacity="0.62" transform="translate(988.4 911.9) rotate(-2.7)"/>
    <use href="#ic-ceremonial_mask" width="33.0" height="33.0" x="-16.5" y="-16.5" opacity="0.74" transform="translate(989.5 1037.4) rotate(-18.0)"/>
    <use href="#ic-pyramid_egypt" width="30.6" height="30.6" x="-15.3" y="-15.3" opacity="0.76" transform="translate(587.4 138.6) rotate(5.4)"/>
    <use href="#ic-river_wave" width="32.2" height="32.2" x="-16.1" y="-16.1" opacity="0.67" transform="translate(857.5 993.7) rotate(7.6)"/>
    <use href="#ic-ceremonial_pot" width="33.9" height="33.9" x="-17.0" y="-17.0" opacity="0.77" transform="translate(188.3 940.9) rotate(9.0)"/>
    <use href="#ic-crown" width="34.3" height="34.3" x="-17.2" y="-17.2" opacity="0.9" transform="translate(16.7 139.8) rotate(14.3)"/>
    <use href="#ic-sword" width="31.1" height="31.1" x="-15.5" y="-15.5" opacity="0.94" transform="translate(349.8 626.3) rotate(1.2)"/>
    <use href="#ic-kente" width="33.8" height="33.8" x="-16.9" y="-16.9" opacity="0.78" transform="translate(375.4 390.4) rotate(5.8)"/>
    <use href="#ic-baobab" width="34.3" height="34.3" x="-17.2" y="-17.2" opacity="0.94" transform="translate(555.9 508.9) rotate(15.8)"/>
    <use href="#ic-obelisk" width="34.0" height="34.0" x="-17.0" y="-17.0" opacity="0.92" transform="translate(113.8 232.1) rotate(-3.1)"/>
    <use href="#ic-yam" width="30.2" height="30.2" x="-15.1" y="-15.1" opacity="0.69" transform="translate(75.7 378.7) rotate(15.5)"/>
    <use href="#ic-mate_masie" width="34.4" height="34.4" x="-17.2" y="-17.2" opacity="0.95" transform="translate(806.8 505.9) rotate(-9.5)"/>
    <use href="#ic-akoben" width="35.4" height="35.4" x="-17.7" y="-17.7" opacity="0.89" transform="translate(591.5 542.7) rotate(-15.7)"/>
    <use href="#ic-mframadan" width="36.0" height="36.0" x="-18.0" y="-18.0" opacity="0.6" transform="translate(27.3 734.1) rotate(1.6)"/>
    <use href="#ic-ashanti_stool" width="34.6" height="34.6" x="-17.3" y="-17.3" opacity="0.81" transform="translate(24.8 392.4) rotate(0.6)"/>
    <use href="#ic-crown" width="30.7" height="30.7" x="-15.3" y="-15.3" opacity="0.67" transform="translate(74.2 721.8) rotate(0.1)"/>
    <use href="#ic-nyame_dua" width="34.5" height="34.5" x="-17.2" y="-17.2" opacity="0.58" transform="translate(45.4 358.5) rotate(-8.5)"/>
    <use href="#ic-nsibidi_gather" width="37.0" height="37.0" x="-18.5" y="-18.5" opacity="0.9" transform="translate(75.7 878.8) rotate(5.5)"/>
    <use href="#ic-walking_stick" width="37.6" height="37.6" x="-18.8" y="-18.8" opacity="0.97" transform="translate(1035.8 544.4) rotate(3.2)"/>
    <use href="#ic-arrow" width="35.6" height="35.6" x="-17.8" y="-17.8" opacity="0.93" transform="translate(676.2 376.7) rotate(-15.2)"/>
    <use href="#ic-canoe" width="34.9" height="34.9" x="-17.4" y="-17.4" opacity="0.76" transform="translate(991.6 129.1) rotate(1.3)"/>
    <use href="#ic-basket" width="34.9" height="34.9" x="-17.4" y="-17.4" opacity="0.65" transform="translate(100.6 1014.3) rotate(-13.4)"/>
    <use href="#ic-sword" width="36.6" height="36.6" x="-18.3" y="-18.3" opacity="0.9" transform="translate(36.2 907.6) rotate(-16.9)"/>
    <use href="#ic-giraffe" width="33.2" height="33.2" x="-16.6" y="-16.6" opacity="0.81" transform="translate(322.8 609.8) rotate(-9.9)"/>
    <use href="#ic-basket" width="30.4" height="30.4" x="-15.2" y="-15.2" opacity="0.88" transform="translate(337.9 15.8) rotate(-13.5)"/>
    <use href="#ic-nok_head" width="31.9" height="31.9" x="-16.0" y="-16.0" opacity="0.59" transform="translate(466.0 614.9) rotate(-0.5)"/>
    <use href="#ic-benin_bronze" width="36.0" height="36.0" x="-18.0" y="-18.0" opacity="0.86" transform="translate(4.9 1072.4) rotate(11.2)"/>
    <use href="#ic-eban" width="30.0" height="30.0" x="-15.0" y="-15.0" opacity="0.66" transform="translate(353.1 459.5) rotate(-8.3)"/>
    <use href="#ic-throne" width="32.5" height="32.5" x="-16.2" y="-16.2" opacity="0.8" transform="translate(1027.4 328.9) rotate(14.3)"/>
    <use href="#ic-bamboo" width="33.3" height="33.3" x="-16.7" y="-16.7" opacity="0.75" transform="translate(1056.5 355.3) rotate(-1.3)"/>
    <use href="#ic-pyramid_egypt" width="31.3" height="31.3" x="-15.6" y="-15.6" opacity="0.97" transform="translate(329.0 491.1) rotate(-10.8)"/>
    <use href="#ic-adinkrahene" width="37.7" height="37.7" x="-18.8" y="-18.8" opacity="0.72" transform="translate(790.0 580.9) rotate(-11.6)"/>
    <use href="#ic-bangle" width="30.5" height="30.5" x="-15.2" y="-15.2" opacity="0.7" transform="translate(1067.0 476.2) rotate(-17.8)"/>
    <use href="#ic-hut" width="33.7" height="33.7" x="-16.9" y="-16.9" opacity="0.61" transform="translate(999.3 1071.4) rotate(13.7)"/>
    <use href="#ic-eye_of_horus" width="32.1" height="32.1" x="-16.0" y="-16.0" opacity="0.89" transform="translate(345.8 655.4) rotate(4.9)"/>
    <use href="#ic-benin_bronze" width="33.0" height="33.0" x="-16.5" y="-16.5" opacity="0.79" transform="translate(970.4 290.6) rotate(-9.9)"/>
    <use href="#ic-cowrie" width="31.6" height="31.6" x="-15.8" y="-15.8" opacity="0.81" transform="translate(338.5 366.3) rotate(-6.0)"/>
    <use href="#ic-ceremonial_mask" width="34.1" height="34.1" x="-17.0" y="-17.0" opacity="0.63" transform="translate(141.6 6.4) rotate(17.4)"/>
    <use href="#ic-spear_shield" width="37.0" height="37.0" x="-18.5" y="-18.5" opacity="0.79" transform="translate(829.4 370.4) rotate(-1.7)"/>
    <use href="#ic-basket" width="34.5" height="34.5" x="-17.2" y="-17.2" opacity="0.68" transform="translate(585.4 87.1) rotate(2.0)"/>
    <use href="#ic-sun_burst" width="32.0" height="32.0" x="-16.0" y="-16.0" opacity="0.97" transform="translate(608.2 424.4) rotate(-0.8)"/>
    <use href="#ic-ashanti_stool" width="36.2" height="36.2" x="-18.1" y="-18.1" opacity="0.75" transform="translate(335.1 135.2) rotate(-3.8)"/>
    <use href="#ic-ankh" width="35.3" height="35.3" x="-17.6" y="-17.6" opacity="0.79" transform="translate(910.2 782.6) rotate(9.8)"/>
    <use href="#ic-shekere" width="30.9" height="30.9" x="-15.5" y="-15.5" opacity="0.95" transform="translate(965.0 643.4) rotate(-10.5)"/>
    <use href="#ic-baobab" width="33.6" height="33.6" x="-16.8" y="-16.8" opacity="0.86" transform="translate(505.8 536.1) rotate(13.6)"/>
    <use href="#ic-eban" width="34.1" height="34.1" x="-17.0" y="-17.0" opacity="0.74" transform="translate(625.6 2.2) rotate(-4.2)"/>
    <use href="#ic-kente" width="30.4" height="30.4" x="-15.2" y="-15.2" opacity="0.99" transform="translate(96.8 687.5) rotate(-7.1)"/>
    <use href="#ic-nsibidi_gather" width="33.8" height="33.8" x="-16.9" y="-16.9" opacity="0.87" transform="translate(528.0 694.8) rotate(10.8)"/>
    <use href="#ic-nok_head" width="34.5" height="34.5" x="-17.3" y="-17.3" opacity="0.59" transform="translate(1010.1 28.0) rotate(4.2)"/>
    <use href="#ic-mortar_pestle" width="35.0" height="35.0" x="-17.5" y="-17.5" opacity="0.82" transform="translate(559.4 546.6) rotate(0.6)"/>
    <use href="#ic-throne" width="27.7" height="27.7" x="-13.9" y="-13.9" opacity="0.99" transform="translate(291.6 770.9) rotate(5.5)"/>
    <use href="#ic-beads" width="23.4" height="23.4" x="-11.7" y="-11.7" opacity="0.82" transform="translate(622.1 261.6) rotate(-6.0)"/>
    <use href="#ic-adinkrahene" width="26.4" height="26.4" x="-13.2" y="-13.2" opacity="0.96" transform="translate(7.4 790.9) rotate(7.6)"/>
    <use href="#ic-spear_shield" width="25.3" height="25.3" x="-12.7" y="-12.7" opacity="0.61" transform="translate(92.0 65.0) rotate(-2.1)"/>
    <use href="#ic-akoben" width="24.5" height="24.5" x="-12.3" y="-12.3" opacity="0.92" transform="translate(125.3 327.2) rotate(-5.8)"/>
    <use href="#ic-arrow" width="23.1" height="23.1" x="-11.6" y="-11.6" opacity="0.83" transform="translate(534.5 1005.9) rotate(16.5)"/>
    <use href="#ic-pyramid_nubian" width="25.1" height="25.1" x="-12.5" y="-12.5" opacity="0.81" transform="translate(460.7 846.0) rotate(15.4)"/>
    <use href="#ic-obelisk" width="23.5" height="23.5" x="-11.7" y="-11.7" opacity="0.79" transform="translate(226.2 116.8) rotate(-10.8)"/>
    <use href="#ic-akoben" width="22.6" height="22.6" x="-11.3" y="-11.3" opacity="0.61" transform="translate(352.3 484.2) rotate(9.4)"/>
    <use href="#ic-nok_head" width="23.3" height="23.3" x="-11.7" y="-11.7" opacity="0.85" transform="translate(442.1 657.6) rotate(4.4)"/>
    <use href="#ic-sun_burst" width="25.9" height="25.9" x="-13.0" y="-13.0" opacity="0.73" transform="translate(699.3 1032.8) rotate(-10.1)"/>
    <use href="#ic-nkonsonkonson" width="24.9" height="24.9" x="-12.5" y="-12.5" opacity="0.65" transform="translate(138.4 804.4) rotate(9.7)"/>
    <use href="#ic-akofena" width="24.8" height="24.8" x="-12.4" y="-12.4" opacity="0.71" transform="translate(995.4 537.5) rotate(-7.2)"/>
    <use href="#ic-mate_masie" width="27.3" height="27.3" x="-13.6" y="-13.6" opacity="0.62" transform="translate(529.0 311.1) rotate(-8.9)"/>
    <use href="#ic-pyramid_nubian" width="23.0" height="23.0" x="-11.5" y="-11.5" opacity="0.74" transform="translate(977.9 226.7) rotate(2.5)"/>
    <use href="#ic-bese_saka" width="23.9" height="23.9" x="-11.9" y="-11.9" opacity="0.61" transform="translate(81.8 660.3) rotate(5.3)"/>
    <use href="#ic-adinkrahene" width="23.7" height="23.7" x="-11.8" y="-11.8" opacity="0.91" transform="translate(105.8 576.5) rotate(10.3)"/>
    <use href="#ic-pyramid_nubian" width="25.1" height="25.1" x="-12.6" y="-12.6" opacity="0.56" transform="translate(817.8 992.1) rotate(16.2)"/>
    <use href="#ic-sun_burst" width="22.8" height="22.8" x="-11.4" y="-11.4" opacity="0.92" transform="translate(1068.5 688.5) rotate(4.3)"/>
    <use href="#ic-mframadan" width="24.8" height="24.8" x="-12.4" y="-12.4" opacity="0.67" transform="translate(72.1 1099.2) rotate(-12.6)"/>
    <use href="#ic-nsibidi_gather" width="26.8" height="26.8" x="-13.4" y="-13.4" opacity="0.74" transform="translate(613.8 813.3) rotate(10.3)"/>
    <use href="#ic-pyramid_egypt" width="25.6" height="25.6" x="-12.8" y="-12.8" opacity="0.9" transform="translate(996.1 99.7) rotate(-4.9)"/>
    <use href="#ic-sword" width="22.4" height="22.4" x="-11.2" y="-11.2" opacity="0.68" transform="translate(1046.1 50.2) rotate(15.8)"/>
    <use href="#ic-akoben" width="22.3" height="22.3" x="-11.2" y="-11.2" opacity="0.81" transform="translate(218.4 1085.8) rotate(0.3)"/>
    <use href="#ic-sankofa" width="26.1" height="26.1" x="-13.0" y="-13.0" opacity="0.65" transform="translate(79.9 920.6) rotate(-11.6)"/>
    <use href="#ic-calabash" width="25.0" height="25.0" x="-12.5" y="-12.5" opacity="0.75" transform="translate(417.2 848.5) rotate(9.8)"/>
    <use href="#ic-cooking_pot" width="26.6" height="26.6" x="-13.3" y="-13.3" opacity="0.68" transform="translate(892.9 678.1) rotate(-11.2)"/>
    <use href="#ic-cooking_pot" width="28.0" height="28.0" x="-14.0" y="-14.0" opacity="0.74" transform="translate(291.4 168.7) rotate(-5.2)"/>
    <use href="#ic-hut" width="27.1" height="27.1" x="-13.6" y="-13.6" opacity="0.96" transform="translate(946.7 429.7) rotate(-0.4)"/>
    <use href="#ic-nyame_dua" width="25.0" height="25.0" x="-12.5" y="-12.5" opacity="0.81" transform="translate(713.0 501.0) rotate(3.9)"/>
    <use href="#ic-djembe" width="27.8" height="27.8" x="-13.9" y="-13.9" opacity="0.75" transform="translate(782.9 100.7) rotate(-8.3)"/>
    <use href="#ic-wooden_spoon" width="25.1" height="25.1" x="-12.6" y="-12.6" opacity="0.95" transform="translate(531.4 1082.1) rotate(-0.9)"/>
    <use href="#ic-scarab" width="22.6" height="22.6" x="-11.3" y="-11.3" opacity="0.72" transform="translate(519.1 810.4) rotate(14.0)"/>
    <use href="#ic-ashanti_stool" width="23.3" height="23.3" x="-11.6" y="-11.6" opacity="0.81" transform="translate(1034.0 479.0) rotate(9.3)"/>
    <use href="#ic-mate_masie" width="26.7" height="26.7" x="-13.3" y="-13.3" opacity="0.69" transform="translate(132.3 923.2) rotate(-8.1)"/>
    <use href="#ic-wooden_mask" width="22.0" height="22.0" x="-11.0" y="-11.0" opacity="0.76" transform="translate(965.6 494.2) rotate(14.6)"/>
    <use href="#ic-cowrie" width="26.8" height="26.8" x="-13.4" y="-13.4" opacity="0.84" transform="translate(919.7 127.5) rotate(13.2)"/>
    <use href="#ic-nok_head" width="23.0" height="23.0" x="-11.5" y="-11.5" opacity="0.8" transform="translate(917.5 209.5) rotate(-10.4)"/>
    <use href="#ic-balafon" width="27.8" height="27.8" x="-13.9" y="-13.9" opacity="0.71" transform="translate(283.0 562.3) rotate(-16.6)"/>
    <use href="#ic-beads" width="23.3" height="23.3" x="-11.6" y="-11.6" opacity="0.63" transform="translate(811.7 885.9) rotate(17.4)"/>
    <use href="#ic-eban" width="23.5" height="23.5" x="-11.8" y="-11.8" opacity="0.74" transform="translate(109.5 31.8) rotate(-14.3)"/>
    <use href="#ic-giza" width="27.3" height="27.3" x="-13.7" y="-13.7" opacity="0.88" transform="translate(31.8 440.0) rotate(-13.5)"/>
    <use href="#ic-cooking_pot" width="26.7" height="26.7" x="-13.3" y="-13.3" opacity="0.81" transform="translate(180.7 696.8) rotate(-17.2)"/>
    <use href="#ic-walking_stick" width="23.8" height="23.8" x="-11.9" y="-11.9" opacity="0.66" transform="translate(717.7 423.7) rotate(-12.9)"/>
    <use href="#ic-nkonsonkonson" width="27.9" height="27.9" x="-13.9" y="-13.9" opacity="0.78" transform="translate(1034.1 508.0) rotate(-6.4)"/>
    <use href="#ic-throne" width="26.0" height="26.0" x="-13.0" y="-13.0" opacity="0.72" transform="translate(383.2 628.3) rotate(-5.2)"/>
    <use href="#ic-bamboo" width="23.2" height="23.2" x="-11.6" y="-11.6" opacity="0.86" transform="translate(221.1 998.0) rotate(-11.0)"/>
    <use href="#ic-shekere" width="27.4" height="27.4" x="-13.7" y="-13.7" opacity="0.89" transform="translate(730.2 795.7) rotate(4.8)"/>
    <use href="#ic-gorilla" width="25.1" height="25.1" x="-12.5" y="-12.5" opacity="0.93" transform="translate(216.2 733.6) rotate(-7.9)"/>
    <use href="#ic-fawohodie" width="22.1" height="22.1" x="-11.0" y="-11.0" opacity="0.92" transform="translate(842.2 676.9) rotate(11.9)"/>
    <use href="#ic-kora" width="27.3" height="27.3" x="-13.6" y="-13.6" opacity="0.64" transform="translate(446.1 2.3) rotate(2.6)"/>
    <use href="#ic-scarab" width="23.5" height="23.5" x="-11.7" y="-11.7" opacity="0.64" transform="translate(163.5 809.8) rotate(-11.3)"/>
    <use href="#ic-fishing_net" width="25.2" height="25.2" x="-12.6" y="-12.6" opacity="0.85" transform="translate(4.4 106.5) rotate(-15.9)"/>
    <use href="#ic-sword" width="23.8" height="23.8" x="-11.9" y="-11.9" opacity="0.85" transform="translate(68.7 574.5) rotate(7.3)"/>
    <use href="#ic-giraffe" width="24.2" height="24.2" x="-12.1" y="-12.1" opacity="0.65" transform="translate(1050.7 678.0) rotate(-3.8)"/>
    <use href="#ic-hut" width="26.4" height="26.4" x="-13.2" y="-13.2" opacity="0.93" transform="translate(526.7 661.6) rotate(15.0)"/>
    <use href="#ic-akoben" width="25.1" height="25.1" x="-12.6" y="-12.6" opacity="0.56" transform="translate(48.6 415.2) rotate(13.3)"/>
    <use href="#ic-nkonsonkonson" width="22.6" height="22.6" x="-11.3" y="-11.3" opacity="0.74" transform="translate(1038.3 458.2) rotate(-15.5)"/>
    <use href="#ic-gorilla" width="27.8" height="27.8" x="-13.9" y="-13.9" opacity="0.98" transform="translate(886.2 1.2) rotate(11.3)"/>
    <use href="#ic-ceremonial_mask" width="23.4" height="23.4" x="-11.7" y="-11.7" opacity="0.92" transform="translate(920.9 577.0) rotate(3.8)"/>
    <use href="#ic-mframadan" width="25.9" height="25.9" x="-13.0" y="-13.0" opacity="0.65" transform="translate(793.2 378.3) rotate(-14.5)"/>
    <use href="#ic-benin_bronze" width="23.9" height="23.9" x="-11.9" y="-11.9" opacity="0.62" transform="translate(747.2 698.4) rotate(15.7)"/>
    <use href="#ic-djenne_mosque" width="27.2" height="27.2" x="-13.6" y="-13.6" opacity="0.67" transform="translate(938.9 711.5) rotate(17.5)"/>
    <use href="#ic-river_wave" width="24.8" height="24.8" x="-12.4" y="-12.4" opacity="0.65" transform="translate(624.6 305.5) rotate(17.0)"/>
    <use href="#ic-dwennimmen" width="26.2" height="26.2" x="-13.1" y="-13.1" opacity="0.81" transform="translate(1020.8 161.0) rotate(-13.5)"/>
    <use href="#ic-sankofa" width="15.3" height="15.3" x="-7.7" y="-7.7" opacity="0.62" transform="translate(58.8 786.2) rotate(-7.6)"/>
    <use href="#ic-throne" width="19.9" height="19.9" x="-10.0" y="-10.0" opacity="0.55" transform="translate(421.9 665.9) rotate(-4.0)"/>
    <use href="#ic-nsibidi_gather" width="16.6" height="16.6" x="-8.3" y="-8.3" opacity="0.64" transform="translate(286.9 476.3) rotate(-9.1)"/>
    <use href="#ic-kora" width="18.4" height="18.4" x="-9.2" y="-9.2" opacity="0.87" transform="translate(9.0 443.8) rotate(7.0)"/>
    <use href="#ic-benin_bronze" width="18.4" height="18.4" x="-9.2" y="-9.2" opacity="0.79" transform="translate(471.3 272.4) rotate(-11.2)"/>
    <use href="#ic-ankh" width="16.5" height="16.5" x="-8.3" y="-8.3" opacity="0.89" transform="translate(385.2 340.9) rotate(8.8)"/>
    <use href="#ic-duafe" width="17.6" height="17.6" x="-8.8" y="-8.8" opacity="0.87" transform="translate(975.0 813.1) rotate(-9.0)"/>
    <use href="#ic-bese_saka" width="19.8" height="19.8" x="-9.9" y="-9.9" opacity="0.75" transform="translate(755.9 2.7) rotate(17.0)"/>
    <use href="#ic-ceremonial_mask" width="18.5" height="18.5" x="-9.2" y="-9.2" opacity="0.65" transform="translate(768.8 626.1) rotate(10.0)"/>
    <use href="#ic-beads" width="19.2" height="19.2" x="-9.6" y="-9.6" opacity="0.8" transform="translate(279.5 867.0) rotate(-10.3)"/>
    <use href="#ic-gorilla" width="18.5" height="18.5" x="-9.3" y="-9.3" opacity="0.88" transform="translate(715.4 526.4) rotate(-6.9)"/>
    <use href="#ic-nkyinkyim" width="15.1" height="15.1" x="-7.5" y="-7.5" opacity="0.94" transform="translate(149.9 657.0) rotate(-14.4)"/>
    <use href="#ic-shekere" width="16.6" height="16.6" x="-8.3" y="-8.3" opacity="0.96" transform="translate(218.8 1040.3) rotate(16.0)"/>
    <use href="#ic-scarab" width="17.8" height="17.8" x="-8.9" y="-8.9" opacity="0.95" transform="translate(935.1 905.0) rotate(-1.6)"/>
    <use href="#ic-akoben" width="17.1" height="17.1" x="-8.6" y="-8.6" opacity="0.6" transform="translate(114.4 1038.8) rotate(0.1)"/>
    <use href="#ic-gyenyame" width="19.7" height="19.7" x="-9.8" y="-9.8" opacity="0.64" transform="translate(508.7 280.6) rotate(-1.6)"/>
    <use href="#ic-nsibidi_unity" width="18.5" height="18.5" x="-9.2" y="-9.2" opacity="0.94" transform="translate(791.3 901.6) rotate(2.1)"/>
    <use href="#ic-ankh" width="16.9" height="16.9" x="-8.4" y="-8.4" opacity="0.82" transform="translate(30.6 524.4) rotate(2.4)"/>
    <use href="#ic-dwennimmen" width="19.9" height="19.9" x="-9.9" y="-9.9" opacity="0.77" transform="translate(704.0 389.8) rotate(3.5)"/>
    <use href="#ic-eban" width="15.7" height="15.7" x="-7.9" y="-7.9" opacity="0.78" transform="translate(999.1 62.8) rotate(-6.0)"/>
    <use href="#ic-sun_burst" width="18.2" height="18.2" x="-9.1" y="-9.1" opacity="0.77" transform="translate(846.8 297.4) rotate(-16.4)"/>
    <use href="#ic-shekere" width="16.5" height="16.5" x="-8.2" y="-8.2" opacity="0.68" transform="translate(671.7 832.0) rotate(7.4)"/>
    <use href="#ic-sankofa" width="19.6" height="19.6" x="-9.8" y="-9.8" opacity="0.75" transform="translate(461.0 169.9) rotate(13.8)"/>
    <use href="#ic-wooden_mask" width="19.4" height="19.4" x="-9.7" y="-9.7" opacity="0.62" transform="translate(733.5 340.4) rotate(2.6)"/>
    <use href="#ic-pyramid_nubian" width="19.5" height="19.5" x="-9.8" y="-9.8" opacity="0.88" transform="translate(180.9 100.1) rotate(6.1)"/>
    <use href="#ic-wooden_mask" width="16.4" height="16.4" x="-8.2" y="-8.2" opacity="0.64" transform="translate(538.4 617.5) rotate(-16.6)"/>
    <use href="#ic-ceremonial_mask" width="19.0" height="19.0" x="-9.5" y="-9.5" opacity="0.82" transform="translate(798.3 661.7) rotate(-4.6)"/>
    <use href="#ic-cooking_pot" width="17.1" height="17.1" x="-8.5" y="-8.5" opacity="0.64" transform="translate(581.5 704.5) rotate(12.3)"/>
    <use href="#ic-hut" width="17.8" height="17.8" x="-8.9" y="-8.9" opacity="0.55" transform="translate(1012.1 88.0) rotate(-7.9)"/>
    <use href="#ic-osram_ne_nsoromma" width="17.7" height="17.7" x="-8.8" y="-8.8" opacity="0.72" transform="translate(712.6 1054.7) rotate(-0.9)"/>
    <use href="#ic-gyenyame" width="17.1" height="17.1" x="-8.5" y="-8.5" opacity="0.89" transform="translate(719.1 823.2) rotate(8.5)"/>
    <use href="#ic-adinkrahene" width="18.6" height="18.6" x="-9.3" y="-9.3" opacity="0.93" transform="translate(842.3 962.9) rotate(14.3)"/>
    <use href="#ic-adinkrahene" width="15.2" height="15.2" x="-7.6" y="-7.6" opacity="0.69" transform="translate(513.0 301.6) rotate(-0.3)"/>
    <use href="#ic-sankofa" width="17.3" height="17.3" x="-8.6" y="-8.6" opacity="0.68" transform="translate(743.6 720.1) rotate(8.9)"/>
    <use href="#ic-balafon" width="15.1" height="15.1" x="-7.5" y="-7.5" opacity="0.76" transform="translate(936.2 272.1) rotate(-1.4)"/>
    <use href="#ic-gorilla" width="17.6" height="17.6" x="-8.8" y="-8.8" opacity="0.97" transform="translate(964.5 756.6) rotate(-17.1)"/>
    <use href="#ic-nyansapo" width="16.8" height="16.8" x="-8.4" y="-8.4" opacity="0.95" transform="translate(1005.4 510.9) rotate(-2.7)"/>
    <use href="#ic-gyenyame" width="19.3" height="19.3" x="-9.7" y="-9.7" opacity="0.8" transform="translate(798.9 266.8) rotate(-8.9)"/>
    <use href="#ic-benin_bronze" width="19.9" height="19.9" x="-9.9" y="-9.9" opacity="0.67" transform="translate(347.6 1047.4) rotate(0.7)"/>
    <use href="#ic-spear_shield" width="17.0" height="17.0" x="-8.5" y="-8.5" opacity="0.62" transform="translate(1063.7 1096.0) rotate(13.4)"/>
    <use href="#ic-fawohodie" width="15.7" height="15.7" x="-7.9" y="-7.9" opacity="0.71" transform="translate(831.0 786.6) rotate(11.5)"/>
    <use href="#ic-cooking_pot" width="19.8" height="19.8" x="-9.9" y="-9.9" opacity="0.71" transform="translate(10.2 353.4) rotate(-11.3)"/>
    <use href="#ic-benin_bronze" width="15.3" height="15.3" x="-7.7" y="-7.7" opacity="0.64" transform="translate(49.3 330.6) rotate(7.1)"/>
    <use href="#ic-nok_head" width="18.9" height="18.9" x="-9.4" y="-9.4" opacity="0.9" transform="translate(320.6 529.9) rotate(-6.4)"/>
    <use href="#ic-pyramid_egypt" width="15.9" height="15.9" x="-7.9" y="-7.9" opacity="0.94" transform="translate(671.7 1049.5) rotate(-10.8)"/>
    <use href="#ic-kente" width="18.1" height="18.1" x="-9.1" y="-9.1" opacity="0.65" transform="translate(793.0 442.0) rotate(6.5)"/>
    <use href="#ic-cooking_pot" width="19.5" height="19.5" x="-9.7" y="-9.7" opacity="0.84" transform="translate(613.1 106.8) rotate(15.0)"/>
    <use href="#ic-aksum_stele" width="16.8" height="16.8" x="-8.4" y="-8.4" opacity="0.55" transform="translate(1038.3 280.8) rotate(11.3)"/>
    <use href="#ic-giraffe" width="19.0" height="19.0" x="-9.5" y="-9.5" opacity="0.77" transform="translate(124.3 77.7) rotate(-10.7)"/>
    <use href="#ic-talking_drum" width="16.7" height="16.7" x="-8.4" y="-8.4" opacity="0.93" transform="translate(478.0 322.3) rotate(17.9)"/>
    <use href="#ic-giza" width="15.8" height="15.8" x="-7.9" y="-7.9" opacity="0.89" transform="translate(178.7 784.4) rotate(8.2)"/>
    <use href="#ic-sword" width="19.6" height="19.6" x="-9.8" y="-9.8" opacity="0.68" transform="translate(967.7 786.4) rotate(-13.7)"/>
    <use href="#ic-nok_head" width="18.8" height="18.8" x="-9.4" y="-9.4" opacity="0.85" transform="translate(866.9 553.0) rotate(16.3)"/>
    <use href="#ic-mortar_pestle" width="18.9" height="18.9" x="-9.4" y="-9.4" opacity="0.7" transform="translate(822.0 399.1) rotate(16.6)"/>
    <use href="#ic-scarab" width="19.5" height="19.5" x="-9.8" y="-9.8" opacity="0.9" transform="translate(316.4 350.1) rotate(-5.1)"/>
    <use href="#ic-palm_tree" width="17.3" height="17.3" x="-8.6" y="-8.6" opacity="0.94" transform="translate(792.2 1086.0) rotate(3.5)"/>
    <use href="#ic-nkyinkyim" width="16.2" height="16.2" x="-8.1" y="-8.1" opacity="0.69" transform="translate(390.5 313.5) rotate(-11.9)"/>
    <use href="#ic-benin_bronze" width="19.0" height="19.0" x="-9.5" y="-9.5" opacity="0.83" transform="translate(904.0 822.7) rotate(-5.0)"/>
    <use href="#ic-eban" width="19.5" height="19.5" x="-9.8" y="-9.8" opacity="0.56" transform="translate(133.8 640.5) rotate(-17.3)"/>
    <use href="#ic-baobab" width="15.3" height="15.3" x="-7.6" y="-7.6" opacity="0.96" transform="translate(347.0 572.6) rotate(2.3)"/>
    <use href="#ic-cowrie" width="15.8" height="15.8" x="-7.9" y="-7.9" opacity="0.71" transform="translate(466.6 976.3) rotate(10.7)"/>
    <use href="#ic-zulu_shield" width="18.1" height="18.1" x="-9.0" y="-9.0" opacity="0.96" transform="translate(794.1 646.1) rotate(13.5)"/>
    <use href="#ic-sword" width="17.2" height="17.2" x="-8.6" y="-8.6" opacity="0.91" transform="translate(593.4 404.2) rotate(-9.7)"/>
    <use href="#ic-sword" width="17.5" height="17.5" x="-8.7" y="-8.7" opacity="0.62" transform="translate(901.8 321.2) rotate(-4.9)"/>
    <use href="#ic-hut" width="15.9" height="15.9" x="-7.9" y="-7.9" opacity="0.78" transform="translate(137.0 1022.4) rotate(-12.1)"/>
    <use href="#ic-aya" width="17.7" height="17.7" x="-8.9" y="-8.9" opacity="0.86" transform="translate(978.1 312.6) rotate(15.2)"/>
    <use href="#ic-mountain" width="17.1" height="17.1" x="-8.5" y="-8.5" opacity="0.88" transform="translate(585.0 1005.9) rotate(2.0)"/>
    <use href="#ic-yam" width="18.6" height="18.6" x="-9.3" y="-9.3" opacity="0.77" transform="translate(748.6 147.8) rotate(12.9)"/>
    <use href="#ic-spear_shield" width="16.5" height="16.5" x="-8.3" y="-8.3" opacity="0.86" transform="translate(377.2 128.4) rotate(9.1)"/>
    <use href="#ic-ankh" width="18.4" height="18.4" x="-9.2" y="-9.2" opacity="0.96" transform="translate(599.4 335.5) rotate(-15.8)"/>
    <use href="#ic-palm_tree" width="11.8" height="11.8" x="-5.9" y="-5.9" opacity="0.55" transform="translate(435.2 166.7) rotate(16.9)"/>
    <use href="#ic-giza" width="10.6" height="10.6" x="-5.3" y="-5.3" opacity="0.99" transform="translate(868.6 881.5) rotate(11.8)"/>
    <use href="#ic-ashanti_stool" width="12.8" height="12.8" x="-6.4" y="-6.4" opacity="0.84" transform="translate(820.3 1095.0) rotate(-7.7)"/>
    <use href="#ic-nsibidi_gather" width="12.9" height="12.9" x="-6.5" y="-6.5" opacity="0.95" transform="translate(542.8 102.9) rotate(-14.2)"/>
    <use href="#ic-gyenyame" width="12.4" height="12.4" x="-6.2" y="-6.2" opacity="0.57" transform="translate(180.0 918.9) rotate(8.1)"/>
    <use href="#ic-throne" width="11.2" height="11.2" x="-5.6" y="-5.6" opacity="0.67" transform="translate(754.3 658.0) rotate(-1.7)"/>
    <use href="#ic-pyramid_egypt" width="10.0" height="10.0" x="-5.0" y="-5.0" opacity="0.59" transform="translate(1088.6 408.2) rotate(-9.5)"/>
    <use href="#ic-canoe" width="10.1" height="10.1" x="-5.1" y="-5.1" opacity="0.74" transform="translate(900.0 751.5) rotate(-6.7)"/>
    <use href="#ic-balafon" width="12.9" height="12.9" x="-6.4" y="-6.4" opacity="0.69" transform="translate(920.9 323.4) rotate(-14.0)"/>
    <use href="#ic-mframadan" width="12.6" height="12.6" x="-6.3" y="-6.3" opacity="0.94" transform="translate(142.7 786.0) rotate(-15.6)"/>
    <use href="#ic-akoben" width="10.9" height="10.9" x="-5.5" y="-5.5" opacity="0.62" transform="translate(316.2 975.7) rotate(9.0)"/>
    <use href="#ic-ceremonial_pot" width="12.0" height="12.0" x="-6.0" y="-6.0" opacity="0.76" transform="translate(1016.2 374.0) rotate(-17.9)"/>
    <use href="#ic-river_wave" width="9.2" height="9.2" x="-4.6" y="-4.6" opacity="0.61" transform="translate(351.2 2.1) rotate(-6.8)"/>
    <use href="#ic-eban" width="11.1" height="11.1" x="-5.6" y="-5.6" opacity="0.76" transform="translate(672.0 1085.6) rotate(-1.1)"/>
    <use href="#ic-eban" width="11.7" height="11.7" x="-5.8" y="-5.8" opacity="0.95" transform="translate(963.8 667.2) rotate(-17.8)"/>
    <use href="#ic-sankofa" width="9.3" height="9.3" x="-4.6" y="-4.6" opacity="0.79" transform="translate(759.2 364.4) rotate(13.9)"/>
    <use href="#ic-sword" width="11.6" height="11.6" x="-5.8" y="-5.8" opacity="0.85" transform="translate(344.8 977.3) rotate(-1.0)"/>
    <use href="#ic-nok_head" width="9.8" height="9.8" x="-4.9" y="-4.9" opacity="0.77" transform="translate(37.9 663.6) rotate(13.5)"/>
    <use href="#ic-fish" width="12.9" height="12.9" x="-6.5" y="-6.5" opacity="0.75" transform="translate(1019.5 487.6) rotate(14.4)"/>
    <use href="#ic-akoben" width="9.8" height="9.8" x="-4.9" y="-4.9" opacity="0.57" transform="translate(1099.0 957.4) rotate(-6.7)"/>
    <use href="#ic-ankh" width="10.2" height="10.2" x="-5.1" y="-5.1" opacity="0.98" transform="translate(463.7 133.3) rotate(-15.9)"/>
    <use href="#ic-zulu_shield" width="11.3" height="11.3" x="-5.6" y="-5.6" opacity="0.61" transform="translate(481.1 1080.6) rotate(2.9)"/>
    <use href="#ic-shekere" width="10.0" height="10.0" x="-5.0" y="-5.0" opacity="0.97" transform="translate(902.6 800.6) rotate(-4.8)"/>
    <use href="#ic-sword" width="10.1" height="10.1" x="-5.0" y="-5.0" opacity="0.57" transform="translate(838.0 836.5) rotate(0.8)"/>
    <use href="#ic-cowrie" width="12.4" height="12.4" x="-6.2" y="-6.2" opacity="0.71" transform="translate(474.0 101.0) rotate(-5.6)"/>
    <use href="#ic-wooden_mask" width="9.6" height="9.6" x="-4.8" y="-4.8" opacity="0.62" transform="translate(891.7 1066.5) rotate(-15.9)"/>
    <use href="#ic-beads" width="10.2" height="10.2" x="-5.1" y="-5.1" opacity="0.94" transform="translate(589.2 1034.0) rotate(15.6)"/>
    <use href="#ic-nyansapo" width="9.1" height="9.1" x="-4.6" y="-4.6" opacity="0.77" transform="translate(1060.8 763.7) rotate(3.9)"/>
    <use href="#ic-nkyinkyim" width="11.3" height="11.3" x="-5.7" y="-5.7" opacity="0.58" transform="translate(555.7 1067.5) rotate(-16.4)"/>
    <use href="#ic-kora" width="11.3" height="11.3" x="-5.6" y="-5.6" opacity="0.76" transform="translate(145.8 330.9) rotate(-4.1)"/>
    <use href="#ic-beads" width="12.7" height="12.7" x="-6.3" y="-6.3" opacity="0.63" transform="translate(843.6 403.8) rotate(-15.7)"/>
    <use href="#ic-adinkrahene" width="11.0" height="11.0" x="-5.5" y="-5.5" opacity="0.68" transform="translate(967.7 1033.2) rotate(13.7)"/>
    <use href="#ic-crown" width="9.9" height="9.9" x="-4.9" y="-4.9" opacity="0.55" transform="translate(1048.2 90.8) rotate(-2.9)"/>
    <use href="#ic-fish" width="11.0" height="11.0" x="-5.5" y="-5.5" opacity="0.67" transform="translate(865.0 328.4) rotate(17.3)"/>
    <use href="#ic-nyansapo" width="10.1" height="10.1" x="-5.1" y="-5.1" opacity="0.81" transform="translate(367.3 412.8) rotate(-13.2)"/>
    <use href="#ic-dwennimmen" width="9.4" height="9.4" x="-4.7" y="-4.7" opacity="0.94" transform="translate(186.9 457.5) rotate(2.6)"/>
    <use href="#ic-nsibidi_unity" width="10.7" height="10.7" x="-5.4" y="-5.4" opacity="0.8" transform="translate(269.6 577.1) rotate(3.4)"/>
    <use href="#ic-zulu_shield" width="9.9" height="9.9" x="-5.0" y="-5.0" opacity="0.8" transform="translate(967.2 744.2) rotate(-1.7)"/>
    <use href="#ic-wooden_spoon" width="12.9" height="12.9" x="-6.5" y="-6.5" opacity="0.91" transform="translate(193.6 1012.2) rotate(-16.1)"/>
    <use href="#ic-mframadan" width="12.2" height="12.2" x="-6.1" y="-6.1" opacity="0.89" transform="translate(1094.3 362.6) rotate(5.1)"/>
    <use href="#ic-mate_masie" width="11.9" height="11.9" x="-6.0" y="-6.0" opacity="0.58" transform="translate(932.2 344.9) rotate(-3.4)"/>
    <use href="#ic-giraffe" width="12.7" height="12.7" x="-6.3" y="-6.3" opacity="0.95" transform="translate(96.5 874.6) rotate(3.3)"/>
    <use href="#ic-walking_stick" width="12.6" height="12.6" x="-6.3" y="-6.3" opacity="0.6" transform="translate(601.3 2.1) rotate(4.0)"/>
    <use href="#ic-akofena" width="12.7" height="12.7" x="-6.3" y="-6.3" opacity="0.81" transform="translate(503.0 686.6) rotate(8.6)"/>
    <use href="#ic-nok_head" width="12.0" height="12.0" x="-6.0" y="-6.0" opacity="0.69" transform="translate(909.1 341.5) rotate(7.0)"/>
    <use href="#ic-giza" width="9.5" height="9.5" x="-4.7" y="-4.7" opacity="0.57" transform="translate(649.0 49.9) rotate(-10.9)"/>
    <use href="#ic-osram_ne_nsoromma" width="12.2" height="12.2" x="-6.1" y="-6.1" opacity="0.9" transform="translate(150.8 26.3) rotate(8.0)"/>
    <use href="#ic-djembe" width="11.6" height="11.6" x="-5.8" y="-5.8" opacity="0.98" transform="translate(420.8 864.8) rotate(2.1)"/>
    <use href="#ic-mframadan" width="12.3" height="12.3" x="-6.1" y="-6.1" opacity="0.72" transform="translate(11.2 323.0) rotate(5.4)"/>
    <use href="#ic-river_wave" width="12.5" height="12.5" x="-6.3" y="-6.3" opacity="0.77" transform="translate(239.9 446.4) rotate(4.3)"/>
    <use href="#ic-hut" width="9.3" height="9.3" x="-4.6" y="-4.6" opacity="0.74" transform="translate(969.2 892.1) rotate(-15.4)"/>
    <use href="#ic-wooden_mask" width="12.6" height="12.6" x="-6.3" y="-6.3" opacity="0.57" transform="translate(491.3 325.4) rotate(9.9)"/>
    <use href="#ic-sun_burst" width="11.8" height="11.8" x="-5.9" y="-5.9" opacity="0.61" transform="translate(1093.8 384.9) rotate(11.3)"/>
    <use href="#ic-basket" width="9.1" height="9.1" x="-4.5" y="-4.5" opacity="0.63" transform="translate(944.3 284.8) rotate(-3.2)"/>
    <use href="#ic-pyramid_egypt" width="12.4" height="12.4" x="-6.2" y="-6.2" opacity="0.95" transform="translate(69.0 3.3) rotate(1.3)"/>
    <use href="#ic-sun_burst" width="11.1" height="11.1" x="-5.6" y="-5.6" opacity="0.6" transform="translate(919.9 350.4) rotate(11.7)"/>
    <use href="#ic-bese_saka" width="9.0" height="9.0" x="-4.5" y="-4.5" opacity="0.61" transform="translate(214.5 714.7) rotate(-9.6)"/>
    <use href="#ic-ashanti_stool" width="10.3" height="10.3" x="-5.1" y="-5.1" opacity="0.83" transform="translate(331.6 293.1) rotate(-12.9)"/>
    <use href="#ic-wooden_spoon" width="9.6" height="9.6" x="-4.8" y="-4.8" opacity="0.69" transform="translate(189.7 912.4) rotate(8.7)"/>
    <use href="#ic-talking_drum" width="11.2" height="11.2" x="-5.6" y="-5.6" opacity="0.71" transform="translate(271.0 763.4) rotate(-9.8)"/>
    <use href="#ic-sankofa" width="11.9" height="11.9" x="-5.9" y="-5.9" opacity="0.65" transform="translate(307.2 566.5) rotate(-5.6)"/>
    <use href="#ic-pyramid_nubian" width="10.4" height="10.4" x="-5.2" y="-5.2" opacity="0.61" transform="translate(391.0 118.2) rotate(2.9)"/>
    <use href="#ic-sun_burst" width="10.2" height="10.2" x="-5.1" y="-5.1" opacity="0.71" transform="translate(1.1 179.5) rotate(8.3)"/>
    <use href="#ic-basket" width="9.5" height="9.5" x="-4.8" y="-4.8" opacity="0.57" transform="translate(452.9 1053.7) rotate(3.7)"/>
    <use href="#ic-pyramid_nubian" width="11.2" height="11.2" x="-5.6" y="-5.6" opacity="0.89" transform="translate(75.7 68.3) rotate(0.5)"/>
    <use href="#ic-bese_saka" width="10.8" height="10.8" x="-5.4" y="-5.4" opacity="0.95" transform="translate(50.2 399.0) rotate(9.7)"/>
    <use href="#ic-giza" width="12.2" height="12.2" x="-6.1" y="-6.1" opacity="0.88" transform="translate(253.9 1072.0) rotate(-4.9)"/>
    <use href="#ic-ceremonial_mask" width="10.8" height="10.8" x="-5.4" y="-5.4" opacity="0.77" transform="translate(452.3 305.1) rotate(-10.0)"/>
    <use href="#ic-nkyinkyim" width="9.3" height="9.3" x="-4.7" y="-4.7" opacity="0.68" transform="translate(824.7 676.4) rotate(-9.8)"/>
    <use href="#ic-basket" width="10.3" height="10.3" x="-5.1" y="-5.1" opacity="0.9" transform="translate(1016.6 528.0) rotate(6.6)"/>
    <use href="#ic-walking_stick" width="11.7" height="11.7" x="-5.8" y="-5.8" opacity="0.97" transform="translate(1078.8 159.0) rotate(-8.2)"/>
    <use href="#ic-baobab" width="12.0" height="12.0" x="-6.0" y="-6.0" opacity="0.66" transform="translate(924.1 917.9) rotate(-16.5)"/>
    <use href="#ic-mpatapo" width="10.0" height="10.0" x="-5.0" y="-5.0" opacity="0.72" transform="translate(791.3 617.6) rotate(-4.5)"/>
    <use href="#ic-great_zimbabwe" width="10.3" height="10.3" x="-5.2" y="-5.2" opacity="0.72" transform="translate(689.9 161.0) rotate(-16.5)"/>
    <use href="#ic-mframadan" width="12.3" height="12.3" x="-6.1" y="-6.1" opacity="0.65" transform="translate(881.9 1043.3) rotate(-12.9)"/>
    <use href="#ic-mountain" width="9.2" height="9.2" x="-4.6" y="-4.6" opacity="0.64" transform="translate(409.1 414.0) rotate(-12.3)"/>
    <use href="#ic-ceremonial_mask" width="12.9" height="12.9" x="-6.4" y="-6.4" opacity="0.63" transform="translate(564.6 993.6) rotate(4.6)"/>
    <use href="#ic-bamboo" width="11.2" height="11.2" x="-5.6" y="-5.6" opacity="0.91" transform="translate(54.6 124.3) rotate(4.2)"/>
    <use href="#ic-nyansapo" width="12.7" height="12.7" x="-6.4" y="-6.4" opacity="0.92" transform="translate(568.2 59.1) rotate(-4.1)"/>
    <use href="#ic-duafe" width="9.3" height="9.3" x="-4.7" y="-4.7" opacity="0.85" transform="translate(586.8 976.7) rotate(-0.8)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.53" transform="translate(487.6 686.1) rotate(47.7)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.81" transform="translate(492.0 910.0) rotate(104.8)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.94" transform="translate(497.4 839.2) rotate(244.7)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.3" y="-4.3" opacity="0.93" transform="translate(574.7 720.5) rotate(231.3)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.65" transform="translate(979.0 523.1) rotate(122.6)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.55" transform="translate(1004.2 554.6) rotate(223.3)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.6" transform="translate(1028.8 669.7) rotate(96.6)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.71" transform="translate(895.4 880.5) rotate(332.7)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.93" transform="translate(686.5 330.2) rotate(167.8)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.66" transform="translate(593.2 795.8) rotate(347.6)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.1" y="-4.1" opacity="0.59" transform="translate(485.7 254.4) rotate(66.1)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.3" y="-4.3" opacity="0.48" transform="translate(267.1 540.1) rotate(167.9)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.84" transform="translate(294.9 1089.4) rotate(116.9)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.52" transform="translate(186.4 222.4) rotate(347.7)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.92" transform="translate(67.0 328.1) rotate(335.2)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-4.0" y="-4.0" opacity="0.5" transform="translate(1008.0 524.8) rotate(322.0)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.84" transform="translate(206.7 704.8) rotate(286.3)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.56" transform="translate(54.8 503.2) rotate(123.5)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.77" transform="translate(415.1 626.1) rotate(179.0)"/>
    <use href="#ic-triangle" width="5.5" height="5.5" x="-2.8" y="-2.8" opacity="0.77" transform="translate(816.4 739.1) rotate(138.3)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.73" transform="translate(374.3 29.9) rotate(315.1)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.48" transform="translate(352.6 981.3) rotate(37.6)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.64" transform="translate(710.1 1065.1) rotate(50.6)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.69" transform="translate(796.2 611.0) rotate(102.5)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.3" y="-3.3" opacity="0.69" transform="translate(714.2 548.9) rotate(46.1)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.61" transform="translate(1017.4 595.5) rotate(195.4)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.61" transform="translate(371.2 764.2) rotate(164.4)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.82" transform="translate(536.2 678.5) rotate(290.0)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.9" transform="translate(576.1 412.1) rotate(200.4)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.6" y="-2.6" opacity="0.79" transform="translate(774.1 317.7) rotate(125.6)"/>
    <use href="#ic-triangle" width="7.8" height="7.8" x="-3.9" y="-3.9" opacity="0.75" transform="translate(764.7 105.0) rotate(18.3)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.79" transform="translate(1007.8 892.2) rotate(223.6)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.62" transform="translate(64.9 958.7) rotate(338.4)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.76" transform="translate(262.1 1060.8) rotate(113.9)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.81" transform="translate(604.5 1014.4) rotate(208.6)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.2" y="-4.2" opacity="0.65" transform="translate(980.9 12.3) rotate(11.4)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.91" transform="translate(114.3 810.6) rotate(113.9)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.2" y="-4.2" opacity="0.91" transform="translate(317.0 689.3) rotate(211.9)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.55" transform="translate(604.2 120.6) rotate(112.2)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.92" transform="translate(470.9 295.4) rotate(314.3)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.3" y="-3.3" opacity="0.94" transform="translate(471.4 20.4) rotate(63.9)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.89" transform="translate(842.7 781.7) rotate(194.1)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.69" transform="translate(1018.4 868.5) rotate(172.2)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.88" transform="translate(673.4 28.6) rotate(8.7)"/>
    <use href="#ic-triangle" width="5.0" height="5.0" x="-2.5" y="-2.5" opacity="0.5" transform="translate(867.3 975.6) rotate(109.9)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.95" transform="translate(1099.0 727.4) rotate(190.7)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.1" y="-4.1" opacity="0.64" transform="translate(1065.4 902.2) rotate(237.5)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.55" transform="translate(535.4 1061.1) rotate(148.0)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.51" transform="translate(79.4 846.1) rotate(243.6)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.94" transform="translate(591.0 988.9) rotate(290.5)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.6" y="-2.6" opacity="0.45" transform="translate(827.7 60.0) rotate(26.8)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.92" transform="translate(417.7 899.5) rotate(330.1)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.61" transform="translate(255.4 545.7) rotate(134.6)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.52" transform="translate(852.6 286.1) rotate(302.2)"/>
    <use href="#ic-triangle" width="7.1" height="7.1" x="-3.5" y="-3.5" opacity="0.52" transform="translate(988.1 287.5) rotate(282.1)"/>
    <use href="#ic-triangle" width="7.8" height="7.8" x="-3.9" y="-3.9" opacity="0.93" transform="translate(137.4 1006.1) rotate(304.9)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.77" transform="translate(195.1 552.8) rotate(57.3)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.62" transform="translate(1096.2 455.2) rotate(305.0)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.58" transform="translate(914.9 195.2) rotate(47.4)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.62" transform="translate(479.5 839.6) rotate(344.1)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.8" transform="translate(1060.7 102.9) rotate(280.3)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.88" transform="translate(462.1 116.0) rotate(75.1)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.3" y="-4.3" opacity="0.93" transform="translate(66.7 947.8) rotate(284.0)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.71" transform="translate(475.7 934.5) rotate(284.4)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.71" transform="translate(161.0 679.4) rotate(25.6)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.1" y="-3.1" opacity="0.95" transform="translate(733.9 883.2) rotate(222.9)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.52" transform="translate(447.7 1084.1) rotate(63.8)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.94" transform="translate(13.9 293.5) rotate(16.6)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.87" transform="translate(576.9 736.8) rotate(166.9)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.4" y="-3.4" opacity="0.65" transform="translate(959.6 116.3) rotate(9.6)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.69" transform="translate(404.3 587.9) rotate(228.5)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.5" y="-2.5" opacity="0.56" transform="translate(49.0 806.6) rotate(230.9)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.72" transform="translate(430.8 281.6) rotate(237.9)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.65" transform="translate(189.6 418.5) rotate(4.3)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.92" transform="translate(503.6 907.4) rotate(291.1)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.84" transform="translate(362.9 444.4) rotate(345.1)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.93" transform="translate(969.6 467.5) rotate(122.3)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.3" y="-3.3" opacity="0.84" transform="translate(328.1 152.3) rotate(236.7)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.75" transform="translate(330.6 775.8) rotate(342.2)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.9" transform="translate(749.4 1092.6) rotate(80.7)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.47" transform="translate(924.9 248.3) rotate(104.1)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.95" transform="translate(921.0 98.0) rotate(225.9)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.92" transform="translate(149.3 47.6) rotate(209.1)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.68" transform="translate(609.6 575.5) rotate(262.2)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.75" transform="translate(972.6 269.3) rotate(217.0)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.52" transform="translate(1072.3 573.0) rotate(4.2)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.2" y="-4.2" opacity="0.6" transform="translate(579.7 758.7) rotate(22.5)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.67" transform="translate(1042.5 488.9) rotate(45.2)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.2" y="-4.2" opacity="0.52" transform="translate(1018.6 1065.3) rotate(353.7)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.82" transform="translate(1076.8 910.9) rotate(0.7)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.69" transform="translate(713.8 1082.4) rotate(292.7)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.87" transform="translate(659.5 82.7) rotate(193.8)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.74" transform="translate(330.3 460.2) rotate(329.0)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.5" y="-2.5" opacity="0.46" transform="translate(1069.7 1078.9) rotate(318.9)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.84" transform="translate(711.8 448.9) rotate(204.3)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.73" transform="translate(390.9 775.9) rotate(139.9)"/>
    <use href="#ic-triangle" width="7.8" height="7.8" x="-3.9" y="-3.9" opacity="0.55" transform="translate(636.3 544.4) rotate(237.3)"/>
    <use href="#ic-triangle" width="7.5" height="7.5" x="-3.8" y="-3.8" opacity="0.68" transform="translate(984.5 860.2) rotate(196.3)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.3" y="-4.3" opacity="0.51" transform="translate(406.8 369.0) rotate(69.8)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.4" y="-4.4" opacity="0.66" transform="translate(734.0 442.8) rotate(267.7)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.47" transform="translate(184.6 245.0) rotate(183.0)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.46" transform="translate(423.2 687.8) rotate(170.8)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.71" transform="translate(998.8 317.6) rotate(32.8)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.46" transform="translate(758.9 464.8) rotate(329.5)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.4" y="-3.4" opacity="0.64" transform="translate(972.8 669.1) rotate(82.1)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.5" transform="translate(7.2 500.8) rotate(7.8)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.72" transform="translate(1059.0 332.2) rotate(142.4)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.9" transform="translate(467.7 249.3) rotate(133.5)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.59" transform="translate(420.1 929.0) rotate(139.3)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.1" y="-3.1" opacity="0.52" transform="translate(66.1 89.9) rotate(67.6)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.57" transform="translate(1008.1 251.8) rotate(234.4)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.7" transform="translate(60.2 1035.1) rotate(292.3)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.71" transform="translate(287.2 1090.1) rotate(82.8)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.88" transform="translate(865.0 1012.1) rotate(117.1)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.3" y="-4.3" opacity="0.62" transform="translate(1050.5 946.4) rotate(61.8)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.6" y="-2.6" opacity="0.84" transform="translate(467.7 367.6) rotate(316.5)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.51" transform="translate(201.6 580.1) rotate(203.0)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.1" y="-4.1" opacity="0.91" transform="translate(310.4 135.4) rotate(42.2)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.9" y="-3.9" opacity="0.53" transform="translate(935.7 228.2) rotate(3.6)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.2" y="-3.2" opacity="0.57" transform="translate(521.6 1044.3) rotate(278.7)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-4.0" y="-4.0" opacity="0.75" transform="translate(218.8 193.0) rotate(147.7)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.86" transform="translate(535.8 630.5) rotate(73.2)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.6" y="-2.6" opacity="0.85" transform="translate(782.7 635.2) rotate(304.5)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.49" transform="translate(631.1 414.6) rotate(80.3)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.75" transform="translate(950.8 655.2) rotate(280.6)"/>
    <use href="#ic-triangle" width="7.8" height="7.8" x="-3.9" y="-3.9" opacity="0.67" transform="translate(125.9 996.0) rotate(46.2)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.85" transform="translate(881.6 704.6) rotate(146.8)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.69" transform="translate(969.8 1003.9) rotate(167.0)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.6" y="-3.6" opacity="0.46" transform="translate(891.3 1082.6) rotate(75.6)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.55" transform="translate(112.2 101.5) rotate(219.8)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.5" transform="translate(415.9 638.2) rotate(117.8)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.56" transform="translate(717.6 732.5) rotate(121.7)"/>
    <use href="#ic-triangle" width="6.5" height="6.5" x="-3.3" y="-3.3" opacity="0.8" transform="translate(501.7 291.2) rotate(8.3)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.64" transform="translate(720.9 1074.6) rotate(72.3)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.5" transform="translate(703.3 364.3) rotate(275.6)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.5" y="-2.5" opacity="0.83" transform="translate(486.1 381.2) rotate(166.0)"/>
    <use href="#ic-triangle" width="7.4" height="7.4" x="-3.7" y="-3.7" opacity="0.81" transform="translate(836.4 1003.3) rotate(8.8)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.69" transform="translate(413.9 991.0) rotate(150.7)"/>
    <use href="#ic-triangle" width="7.4" height="7.4" x="-3.7" y="-3.7" opacity="0.79" transform="translate(727.4 1059.3) rotate(176.1)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.2" y="-4.2" opacity="0.78" transform="translate(986.9 203.7) rotate(14.7)"/>
    <use href="#ic-triangle" width="9.0" height="9.0" x="-4.5" y="-4.5" opacity="0.66" transform="translate(649.9 90.4) rotate(271.3)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.81" transform="translate(953.7 486.9) rotate(40.9)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.65" transform="translate(433.3 356.5) rotate(81.3)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.8" y="-2.8" opacity="0.53" transform="translate(436.2 595.6) rotate(127.8)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.7" transform="translate(746.3 398.4) rotate(100.1)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.65" transform="translate(390.7 770.3) rotate(40.2)"/>
    <use href="#ic-triangle" width="6.5" height="6.5" x="-3.2" y="-3.2" opacity="0.73" transform="translate(896.4 554.2) rotate(246.5)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.48" transform="translate(299.5 153.0) rotate(110.3)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.2" y="-4.2" opacity="0.48" transform="translate(525.1 628.2) rotate(255.9)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.71" transform="translate(942.6 659.9) rotate(34.0)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.8" transform="translate(764.4 722.2) rotate(314.7)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.85" transform="translate(739.1 1072.1) rotate(26.4)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.58" transform="translate(668.5 871.6) rotate(266.6)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.7" transform="translate(1081.7 906.2) rotate(52.7)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.85" transform="translate(424.2 15.1) rotate(21.9)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.63" transform="translate(422.2 91.5) rotate(55.2)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.3" y="-4.3" opacity="0.91" transform="translate(535.6 77.1) rotate(1.5)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.4" y="-3.4" opacity="0.55" transform="translate(1067.5 728.9) rotate(260.6)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.89" transform="translate(1055.9 461.5) rotate(307.0)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.69" transform="translate(1009.2 699.6) rotate(142.1)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.51" transform="translate(709.1 461.4) rotate(13.6)"/>
    <use href="#ic-triangle" width="5.5" height="5.5" x="-2.8" y="-2.8" opacity="0.83" transform="translate(526.4 89.4) rotate(3.1)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.5" transform="translate(115.8 678.2) rotate(176.5)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.82" transform="translate(292.3 189.5) rotate(161.9)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.56" transform="translate(1008.1 812.1) rotate(80.3)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.64" transform="translate(427.3 508.7) rotate(333.5)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.2" y="-3.2" opacity="0.47" transform="translate(945.4 821.7) rotate(307.5)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.94" transform="translate(486.4 870.6) rotate(102.9)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.52" transform="translate(65.8 179.1) rotate(9.6)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.2" y="-4.2" opacity="0.66" transform="translate(623.7 826.9) rotate(204.6)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.5" y="-3.5" opacity="0.58" transform="translate(136.4 300.6) rotate(22.6)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-3.0" y="-3.0" opacity="0.85" transform="translate(571.2 188.5) rotate(212.5)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.4" y="-4.4" opacity="0.74" transform="translate(957.6 134.3) rotate(356.8)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.56" transform="translate(964.3 932.3) rotate(356.3)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.2" y="-4.2" opacity="0.59" transform="translate(882.5 317.9) rotate(187.6)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.51" transform="translate(551.7 924.6) rotate(40.4)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.0" y="-4.0" opacity="0.72" transform="translate(1057.2 997.0) rotate(87.7)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.61" transform="translate(529.4 63.3) rotate(327.4)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.6" y="-2.6" opacity="0.84" transform="translate(555.2 1019.5) rotate(5.2)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.85" transform="translate(704.1 418.5) rotate(211.2)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.74" transform="translate(748.1 66.9) rotate(343.6)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.77" transform="translate(559.4 1028.6) rotate(191.6)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.82" transform="translate(994.5 160.9) rotate(208.2)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.81" transform="translate(609.6 309.5) rotate(34.8)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.4" y="-3.4" opacity="0.92" transform="translate(331.0 996.4) rotate(295.2)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-3.0" y="-3.0" opacity="0.6" transform="translate(56.6 109.3) rotate(159.7)"/>
    <use href="#ic-triangle" width="6.5" height="6.5" x="-3.2" y="-3.2" opacity="0.86" transform="translate(261.6 550.8) rotate(335.1)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.88" transform="translate(257.8 1053.4) rotate(280.3)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.82" transform="translate(113.4 724.8) rotate(269.0)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.49" transform="translate(348.3 792.5) rotate(20.4)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.49" transform="translate(201.4 586.1) rotate(125.5)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.2" y="-4.2" opacity="0.59" transform="translate(987.5 662.2) rotate(278.9)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.84" transform="translate(670.2 356.6) rotate(167.2)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.67" transform="translate(574.5 956.9) rotate(57.7)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.93" transform="translate(246.4 879.4) rotate(148.2)"/>
    <use href="#ic-triangle" width="7.8" height="7.8" x="-3.9" y="-3.9" opacity="0.9" transform="translate(792.0 72.3) rotate(318.5)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.55" transform="translate(577.7 1019.0) rotate(339.2)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.72" transform="translate(662.4 702.1) rotate(338.3)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.7" transform="translate(713.2 352.5) rotate(200.5)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.73" transform="translate(173.8 231.3) rotate(51.9)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.66" transform="translate(0.5 657.9) rotate(280.0)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.46" transform="translate(213.1 1062.8) rotate(349.4)"/>
    <use href="#ic-triangle" width="9.0" height="9.0" x="-4.5" y="-4.5" opacity="0.7" transform="translate(554.9 169.8) rotate(316.5)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.3" y="-4.3" opacity="0.6" transform="translate(106.5 939.9) rotate(335.7)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.1" y="-4.1" opacity="0.79" transform="translate(880.3 875.3) rotate(219.9)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.47" transform="translate(476.6 15.2) rotate(172.7)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.1" y="-3.1" opacity="0.65" transform="translate(838.1 424.3) rotate(229.8)"/>
    <use href="#ic-triangle" width="9.0" height="9.0" x="-4.5" y="-4.5" opacity="0.81" transform="translate(162.3 11.1) rotate(261.1)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.51" transform="translate(545.0 400.8) rotate(220.0)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.1" y="-3.1" opacity="0.83" transform="translate(808.6 411.2) rotate(43.6)"/>
    <use href="#ic-triangle" width="7.4" height="7.4" x="-3.7" y="-3.7" opacity="0.8" transform="translate(146.7 555.9) rotate(93.6)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.94" transform="translate(477.0 760.5) rotate(248.3)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.6" transform="translate(366.5 902.5) rotate(292.4)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.1" y="-4.1" opacity="0.49" transform="translate(956.9 220.1) rotate(298.3)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.45" transform="translate(981.5 785.5) rotate(43.1)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.89" transform="translate(649.0 678.2) rotate(2.1)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.93" transform="translate(55.3 179.7) rotate(106.8)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.56" transform="translate(241.1 717.8) rotate(138.1)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.59" transform="translate(133.3 496.9) rotate(52.4)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.4" y="-3.4" opacity="0.49" transform="translate(656.9 1022.4) rotate(147.0)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.4" y="-4.4" opacity="0.79" transform="translate(86.7 1076.5) rotate(255.5)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.89" transform="translate(265.3 302.2) rotate(14.0)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.93" transform="translate(529.9 987.7) rotate(322.3)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.65" transform="translate(682.6 455.9) rotate(283.1)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.65" transform="translate(1005.5 732.7) rotate(66.3)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.3" y="-4.3" opacity="0.45" transform="translate(1003.5 439.6) rotate(97.8)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.85" transform="translate(1095.5 87.7) rotate(195.8)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.52" transform="translate(1059.3 408.9) rotate(4.4)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-3.0" y="-3.0" opacity="0.9" transform="translate(436.9 102.5) rotate(23.2)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.62" transform="translate(136.3 731.7) rotate(303.1)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.55" transform="translate(219.0 185.6) rotate(198.9)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.63" transform="translate(669.9 705.9) rotate(235.7)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.57" transform="translate(789.0 315.0) rotate(182.8)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.93" transform="translate(356.0 764.8) rotate(80.3)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.4" y="-3.4" opacity="0.5" transform="translate(711.0 407.5) rotate(20.2)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.9" y="-2.9" opacity="0.79" transform="translate(863.9 220.1) rotate(335.2)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.56" transform="translate(45.1 166.1) rotate(347.4)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.57" transform="translate(505.6 331.3) rotate(178.5)"/>
    <use href="#ic-triangle" width="7.5" height="7.5" x="-3.7" y="-3.7" opacity="0.63" transform="translate(838.1 693.7) rotate(244.1)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.74" transform="translate(104.2 829.3) rotate(213.7)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.2" y="-4.2" opacity="0.66" transform="translate(236.8 1047.5) rotate(73.0)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-2.9" y="-2.9" opacity="0.5" transform="translate(1015.7 520.4) rotate(135.0)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-4.0" y="-4.0" opacity="0.6" transform="translate(903.3 722.7) rotate(157.7)"/>
    <use href="#ic-triangle" width="5.5" height="5.5" x="-2.7" y="-2.7" opacity="0.54" transform="translate(1042.8 302.8) rotate(22.0)"/>
    <use href="#ic-triangle" width="6.5" height="6.5" x="-3.3" y="-3.3" opacity="0.78" transform="translate(38.2 107.1) rotate(289.4)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.6" y="-3.6" opacity="0.54" transform="translate(507.0 1001.6) rotate(114.0)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.4" y="-4.4" opacity="0.85" transform="translate(903.5 554.5) rotate(54.6)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.3" y="-4.3" opacity="0.86" transform="translate(976.3 1094.0) rotate(241.4)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.7" transform="translate(296.0 461.3) rotate(289.5)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.54" transform="translate(510.1 643.9) rotate(136.4)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.72" transform="translate(728.9 820.2) rotate(71.3)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.48" transform="translate(679.4 72.7) rotate(213.4)"/>
    <use href="#ic-triangle" width="7.5" height="7.5" x="-3.7" y="-3.7" opacity="0.76" transform="translate(445.3 630.2) rotate(282.3)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.6" y="-2.6" opacity="0.56" transform="translate(638.6 286.0) rotate(301.0)"/>
    <use href="#ic-triangle" width="7.5" height="7.5" x="-3.8" y="-3.8" opacity="0.77" transform="translate(204.5 1037.4) rotate(173.6)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.54" transform="translate(46.3 834.6) rotate(117.4)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.92" transform="translate(125.9 553.7) rotate(14.1)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.55" transform="translate(276.3 131.3) rotate(41.4)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-3.0" y="-3.0" opacity="0.46" transform="translate(764.5 396.9) rotate(180.3)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.3" y="-4.3" opacity="0.87" transform="translate(1099.7 990.0) rotate(230.8)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.2" y="-4.2" opacity="0.49" transform="translate(180.1 813.0) rotate(354.3)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.78" transform="translate(536.5 927.6) rotate(137.2)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.78" transform="translate(421.1 106.1) rotate(174.2)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.2" y="-3.2" opacity="0.45" transform="translate(946.1 607.7) rotate(219.8)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.84" transform="translate(840.1 795.9) rotate(264.4)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.87" transform="translate(83.6 153.7) rotate(139.2)"/>
    <use href="#ic-triangle" width="7.4" height="7.4" x="-3.7" y="-3.7" opacity="0.74" transform="translate(562.7 86.5) rotate(134.9)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.51" transform="translate(29.9 537.7) rotate(236.0)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.95" transform="translate(905.2 495.9) rotate(335.2)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.85" transform="translate(541.0 189.0) rotate(57.2)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.5" transform="translate(657.0 868.0) rotate(75.7)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.1" y="-4.1" opacity="0.55" transform="translate(380.1 419.3) rotate(304.4)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.1" y="-4.1" opacity="0.68" transform="translate(947.3 922.9) rotate(138.1)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.73" transform="translate(791.0 80.2) rotate(201.7)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.6" y="-2.6" opacity="0.58" transform="translate(398.3 643.0) rotate(249.3)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.84" transform="translate(533.0 1053.2) rotate(188.2)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.7" transform="translate(167.9 625.7) rotate(164.8)"/>
    <use href="#ic-triangle" width="5.5" height="5.5" x="-2.7" y="-2.7" opacity="0.87" transform="translate(710.6 712.1) rotate(187.2)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.57" transform="translate(455.8 942.1) rotate(308.4)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.87" transform="translate(181.2 474.2) rotate(303.6)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.5" y="-3.5" opacity="0.64" transform="translate(504.9 995.6) rotate(55.1)"/>
    <use href="#ic-triangle" width="7.5" height="7.5" x="-3.8" y="-3.8" opacity="0.54" transform="translate(353.6 112.2) rotate(342.6)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.65" transform="translate(712.1 655.4) rotate(276.6)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.79" transform="translate(299.0 307.3) rotate(351.2)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.84" transform="translate(107.4 917.4) rotate(22.9)"/>
    <use href="#ic-triangle" width="5.5" height="5.5" x="-2.7" y="-2.7" opacity="0.5" transform="translate(138.6 895.6) rotate(76.7)"/>
    <use href="#ic-triangle" width="6.5" height="6.5" x="-3.2" y="-3.2" opacity="0.57" transform="translate(532.6 946.2) rotate(306.3)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.1" y="-4.1" opacity="0.67" transform="translate(106.2 491.9) rotate(172.5)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.93" transform="translate(342.9 1027.7) rotate(173.6)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.91" transform="translate(136.8 348.1) rotate(23.0)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.74" transform="translate(383.9 89.0) rotate(7.3)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.4" y="-4.4" opacity="0.67" transform="translate(668.4 854.7) rotate(312.0)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.94" transform="translate(936.4 673.5) rotate(280.6)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-3.0" y="-3.0" opacity="0.9" transform="translate(1092.2 491.7) rotate(294.6)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.72" transform="translate(335.3 461.1) rotate(139.2)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.93" transform="translate(1089.5 680.1) rotate(177.8)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.72" transform="translate(811.4 862.2) rotate(158.4)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.1" y="-3.1" opacity="0.61" transform="translate(938.4 313.5) rotate(120.1)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.78" transform="translate(758.6 94.4) rotate(10.2)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.78" transform="translate(265.9 202.3) rotate(129.2)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.3" y="-4.3" opacity="0.55" transform="translate(713.6 156.0) rotate(87.7)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.81" transform="translate(715.5 895.1) rotate(72.8)"/>
    <use href="#ic-triangle" width="9.0" height="9.0" x="-4.5" y="-4.5" opacity="0.54" transform="translate(28.6 105.1) rotate(204.1)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.9" transform="translate(239.6 881.3) rotate(49.3)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.86" transform="translate(59.0 53.5) rotate(327.6)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.8" transform="translate(91.8 852.6) rotate(53.1)"/>
    <use href="#ic-triangle" width="7.1" height="7.1" x="-3.5" y="-3.5" opacity="0.89" transform="translate(870.8 713.7) rotate(18.1)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.71" transform="translate(449.8 827.8) rotate(219.5)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-3.0" y="-3.0" opacity="0.88" transform="translate(604.0 905.8) rotate(79.8)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.54" transform="translate(249.8 165.5) rotate(179.4)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.0" y="-4.0" opacity="0.77" transform="translate(48.0 557.4) rotate(358.4)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.71" transform="translate(107.2 73.4) rotate(243.3)"/>
    <use href="#ic-triangle" width="7.1" height="7.1" x="-3.5" y="-3.5" opacity="0.92" transform="translate(376.7 967.6) rotate(114.7)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.64" transform="translate(1001.2 203.0) rotate(111.8)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.74" transform="translate(742.1 1005.8) rotate(58.6)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.5" y="-3.5" opacity="0.65" transform="translate(355.0 311.7) rotate(44.5)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.57" transform="translate(754.6 67.3) rotate(83.0)"/>
    <use href="#ic-triangle" width="7.4" height="7.4" x="-3.7" y="-3.7" opacity="0.78" transform="translate(1073.9 516.5) rotate(259.6)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.9" y="-2.9" opacity="0.61" transform="translate(518.9 1050.5) rotate(305.3)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.9" y="-2.9" opacity="0.48" transform="translate(961.2 336.5) rotate(220.2)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.6" y="-2.6" opacity="0.67" transform="translate(45.3 862.7) rotate(354.6)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.52" transform="translate(1077.1 707.3) rotate(300.7)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.2" y="-3.2" opacity="0.48" transform="translate(430.5 1087.4) rotate(324.5)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.6" y="-2.6" opacity="0.55" transform="translate(885.0 748.3) rotate(305.1)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.1" y="-4.1" opacity="0.62" transform="translate(852.2 314.9) rotate(155.8)"/>
    <use href="#ic-triangle" width="5.5" height="5.5" x="-2.8" y="-2.8" opacity="0.56" transform="translate(54.8 825.2) rotate(14.3)"/>
    <use href="#ic-triangle" width="7.1" height="7.1" x="-3.5" y="-3.5" opacity="0.65" transform="translate(819.1 759.8) rotate(321.4)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.6" y="-2.6" opacity="0.58" transform="translate(562.9 1050.4) rotate(67.7)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.65" transform="translate(1064.4 1053.9) rotate(169.6)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.51" transform="translate(596.4 813.3) rotate(228.2)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.8" y="-2.8" opacity="0.85" transform="translate(615.4 994.0) rotate(17.4)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.69" transform="translate(913.7 650.9) rotate(226.0)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.78" transform="translate(179.6 1038.5) rotate(93.8)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.6" transform="translate(795.9 742.0) rotate(261.7)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.8" y="-2.8" opacity="0.71" transform="translate(834.6 347.9) rotate(277.9)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.73" transform="translate(28.4 837.0) rotate(86.9)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.8" y="-2.8" opacity="0.84" transform="translate(919.3 109.2) rotate(301.8)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.55" transform="translate(822.6 744.1) rotate(233.0)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.51" transform="translate(430.7 867.1) rotate(173.2)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.69" transform="translate(237.5 391.1) rotate(286.8)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.55" transform="translate(757.2 1090.0) rotate(317.1)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.9" y="-2.9" opacity="0.88" transform="translate(790.7 336.1) rotate(326.1)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.52" transform="translate(429.4 6.2) rotate(272.1)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.2" y="-3.2" opacity="0.67" transform="translate(922.9 10.4) rotate(131.5)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.79" transform="translate(594.3 206.3) rotate(53.4)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.88" transform="translate(810.1 79.4) rotate(121.2)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.1" y="-3.1" opacity="0.69" transform="translate(980.8 461.6) rotate(208.9)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.77" transform="translate(549.7 73.8) rotate(131.1)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.1" y="-4.1" opacity="0.93" transform="translate(211.1 496.5) rotate(53.3)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.47" transform="translate(872.8 317.1) rotate(319.1)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.6" y="-2.6" opacity="0.57" transform="translate(636.5 821.9) rotate(28.6)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.71" transform="translate(1045.9 577.9) rotate(2.7)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-2.9" y="-2.9" opacity="0.62" transform="translate(580.1 783.0) rotate(134.9)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.94" transform="translate(1025.3 98.6) rotate(17.2)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-2.9" y="-2.9" opacity="0.68" transform="translate(296.6 613.4) rotate(229.9)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.62" transform="translate(497.6 102.7) rotate(251.2)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.52" transform="translate(790.9 850.4) rotate(353.1)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.58" transform="translate(556.9 712.4) rotate(54.2)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.46" transform="translate(1018.4 284.5) rotate(118.7)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.56" transform="translate(992.7 679.6) rotate(296.9)"/>
    <use href="#ic-triangle" width="7.1" height="7.1" x="-3.5" y="-3.5" opacity="0.64" transform="translate(777.2 612.8) rotate(102.4)"/>
    <use href="#ic-triangle" width="7.4" height="7.4" x="-3.7" y="-3.7" opacity="0.73" transform="translate(970.7 49.5) rotate(80.0)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.1" y="-3.1" opacity="0.48" transform="translate(1014.7 853.4) rotate(74.8)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.2" y="-4.2" opacity="0.64" transform="translate(270.7 237.1) rotate(61.2)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.93" transform="translate(890.3 547.9) rotate(156.7)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.45" transform="translate(830.3 1076.3) rotate(313.1)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.59" transform="translate(761.7 330.7) rotate(16.1)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.2" y="-4.2" opacity="0.82" transform="translate(1013.6 659.5) rotate(43.8)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.84" transform="translate(272.3 1077.0) rotate(146.8)"/>
    <use href="#ic-triangle" width="7.5" height="7.5" x="-3.7" y="-3.7" opacity="0.9" transform="translate(402.7 593.3) rotate(133.9)"/>
    <use href="#ic-triangle" width="7.4" height="7.4" x="-3.7" y="-3.7" opacity="0.56" transform="translate(992.2 240.1) rotate(129.4)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.6" y="-3.6" opacity="0.77" transform="translate(42.2 1086.5) rotate(135.7)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.56" transform="translate(274.4 911.1) rotate(43.2)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.53" transform="translate(166.3 22.8) rotate(307.1)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.0" y="-4.0" opacity="0.91" transform="translate(350.7 1015.0) rotate(225.6)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.9" transform="translate(617.0 556.5) rotate(9.2)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.3" y="-3.3" opacity="0.71" transform="translate(1065.0 662.5) rotate(313.6)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.6" transform="translate(990.3 182.8) rotate(49.7)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.69" transform="translate(650.5 404.8) rotate(6.9)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.59" transform="translate(941.7 829.4) rotate(305.3)"/>
    <use href="#ic-triangle" width="7.1" height="7.1" x="-3.6" y="-3.6" opacity="0.88" transform="translate(752.1 1000.8) rotate(192.2)"/>
    <use href="#ic-triangle" width="8.3" height="8.3" x="-4.2" y="-4.2" opacity="0.69" transform="translate(829.6 320.7) rotate(150.3)"/>
    <use href="#ic-triangle" width="8.5" height="8.5" x="-4.3" y="-4.3" opacity="0.69" transform="translate(351.5 558.0) rotate(15.9)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.71" transform="translate(162.7 66.0) rotate(132.8)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.63" transform="translate(386.3 651.5) rotate(133.2)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.1" y="-4.1" opacity="0.65" transform="translate(65.5 907.5) rotate(64.8)"/>
    <use href="#ic-triangle" width="5.8" height="5.8" x="-2.9" y="-2.9" opacity="0.59" transform="translate(1039.3 96.6) rotate(231.2)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.9" transform="translate(553.0 649.1) rotate(338.3)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.1" y="-3.1" opacity="0.73" transform="translate(299.5 229.0) rotate(58.8)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.94" transform="translate(816.8 836.7) rotate(246.8)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.6" y="-2.6" opacity="0.85" transform="translate(589.2 454.2) rotate(338.4)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.1" y="-3.1" opacity="0.51" transform="translate(418.5 576.8) rotate(191.3)"/>
    <use href="#ic-triangle" width="5.0" height="5.0" x="-2.5" y="-2.5" opacity="0.58" transform="translate(794.7 864.3) rotate(200.7)"/>
    <use href="#ic-triangle" width="7.8" height="7.8" x="-3.9" y="-3.9" opacity="0.46" transform="translate(977.5 274.4) rotate(166.8)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.6" transform="translate(171.8 71.4) rotate(241.4)"/>
    <use href="#ic-triangle" width="5.5" height="5.5" x="-2.8" y="-2.8" opacity="0.58" transform="translate(395.9 302.2) rotate(54.4)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.63" transform="translate(649.9 308.7) rotate(51.6)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.3" y="-4.3" opacity="0.59" transform="translate(394.6 94.7) rotate(147.0)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.9" y="-2.9" opacity="0.83" transform="translate(180.1 745.8) rotate(159.8)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.8" y="-2.8" opacity="0.86" transform="translate(933.1 133.5) rotate(190.6)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.69" transform="translate(986.6 521.1) rotate(330.4)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.83" transform="translate(455.5 269.4) rotate(354.6)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.8" y="-2.8" opacity="0.77" transform="translate(750.6 108.1) rotate(50.1)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.74" transform="translate(124.0 874.7) rotate(338.4)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.3" y="-3.3" opacity="0.87" transform="translate(1078.8 935.6) rotate(268.2)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.56" transform="translate(458.9 80.9) rotate(357.7)"/>
    <use href="#ic-triangle" width="7.1" height="7.1" x="-3.5" y="-3.5" opacity="0.71" transform="translate(510.8 558.8) rotate(151.2)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.89" transform="translate(33.5 831.9) rotate(233.7)"/>
    <use href="#ic-triangle" width="6.5" height="6.5" x="-3.2" y="-3.2" opacity="0.49" transform="translate(1041.2 1037.8) rotate(131.0)"/>
    <use href="#ic-triangle" width="5.5" height="5.5" x="-2.8" y="-2.8" opacity="0.76" transform="translate(1029.8 1090.0) rotate(233.7)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.76" transform="translate(463.1 51.7) rotate(17.3)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.91" transform="translate(837.7 704.4) rotate(307.0)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.55" transform="translate(8.1 380.3) rotate(115.8)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.6" transform="translate(263.4 766.6) rotate(339.0)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.79" transform="translate(744.0 383.8) rotate(63.2)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.76" transform="translate(97.4 647.8) rotate(50.3)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.46" transform="translate(968.9 415.6) rotate(315.3)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.83" transform="translate(984.1 24.4) rotate(112.0)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.65" transform="translate(395.6 479.3) rotate(66.9)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.47" transform="translate(484.9 924.6) rotate(89.4)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.6" transform="translate(64.5 484.6) rotate(354.7)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.9" transform="translate(339.2 1036.5) rotate(7.9)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.0" y="-4.0" opacity="0.52" transform="translate(1032.5 786.6) rotate(297.3)"/>
    <use href="#ic-triangle" width="7.6" height="7.6" x="-3.8" y="-3.8" opacity="0.57" transform="translate(136.0 699.0) rotate(222.2)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.5" y="-3.5" opacity="0.73" transform="translate(289.9 444.7) rotate(56.6)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.6" transform="translate(347.8 785.5) rotate(106.1)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.88" transform="translate(349.9 1031.8) rotate(72.3)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.83" transform="translate(688.8 1021.9) rotate(300.6)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.71" transform="translate(450.6 788.1) rotate(264.4)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.83" transform="translate(180.1 881.2) rotate(344.8)"/>
    <use href="#ic-triangle" width="5.7" height="5.7" x="-2.9" y="-2.9" opacity="0.88" transform="translate(912.3 287.6) rotate(199.1)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-2.9" y="-2.9" opacity="0.94" transform="translate(1090.3 774.7) rotate(141.1)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.56" transform="translate(302.9 551.7) rotate(122.5)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.73" transform="translate(896.8 813.2) rotate(44.2)"/>
    <use href="#ic-triangle" width="6.2" height="6.2" x="-3.1" y="-3.1" opacity="0.65" transform="translate(1085.5 1049.8) rotate(53.4)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.77" transform="translate(454.8 87.5) rotate(333.7)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.52" transform="translate(1049.6 523.6) rotate(354.0)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.66" transform="translate(701.4 1072.9) rotate(25.3)"/>
    <use href="#ic-triangle" width="7.5" height="7.5" x="-3.7" y="-3.7" opacity="0.49" transform="translate(1045.0 293.0) rotate(111.3)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.7" transform="translate(391.9 424.1) rotate(230.9)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.82" transform="translate(585.8 24.3) rotate(141.2)"/>
    <use href="#ic-triangle" width="7.4" height="7.4" x="-3.7" y="-3.7" opacity="0.53" transform="translate(586.6 582.5) rotate(343.0)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.53" transform="translate(1018.7 796.7) rotate(29.3)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.75" transform="translate(791.9 349.0) rotate(118.2)"/>
    <use href="#ic-triangle" width="5.4" height="5.4" x="-2.7" y="-2.7" opacity="0.81" transform="translate(295.7 34.3) rotate(139.4)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.55" transform="translate(228.2 1025.8) rotate(163.1)"/>
    <use href="#ic-triangle" width="7.9" height="7.9" x="-3.9" y="-3.9" opacity="0.46" transform="translate(321.8 373.7) rotate(316.9)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.54" transform="translate(546.9 1074.5) rotate(155.7)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.47" transform="translate(147.7 878.0) rotate(31.4)"/>
    <use href="#ic-triangle" width="6.0" height="6.0" x="-3.0" y="-3.0" opacity="0.79" transform="translate(292.0 1097.4) rotate(72.9)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.76" transform="translate(1039.1 1063.2) rotate(124.6)"/>
    <use href="#ic-triangle" width="8.6" height="8.6" x="-4.3" y="-4.3" opacity="0.8" transform="translate(539.7 934.1) rotate(249.4)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.68" transform="translate(1084.3 718.9) rotate(90.1)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.1" y="-3.1" opacity="0.76" transform="translate(867.2 341.4) rotate(282.5)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.6" y="-3.6" opacity="0.82" transform="translate(1078.3 1049.6) rotate(303.7)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.61" transform="translate(1012.5 887.2) rotate(107.5)"/>
    <use href="#ic-triangle" width="6.6" height="6.6" x="-3.3" y="-3.3" opacity="0.77" transform="translate(541.8 972.5) rotate(109.0)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.91" transform="translate(474.1 3.9) rotate(199.2)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.71" transform="translate(769.1 395.3) rotate(39.4)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.8" transform="translate(815.6 1060.4) rotate(185.2)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.85" transform="translate(694.5 1011.3) rotate(2.8)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.6" y="-3.6" opacity="0.56" transform="translate(477.1 880.3) rotate(51.3)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.6" y="-2.6" opacity="0.77" transform="translate(429.9 530.6) rotate(314.9)"/>
    <use href="#ic-triangle" width="6.5" height="6.5" x="-3.2" y="-3.2" opacity="0.48" transform="translate(518.8 551.8) rotate(224.1)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.46" transform="translate(39.5 466.7) rotate(249.6)"/>
    <use href="#ic-triangle" width="7.0" height="7.0" x="-3.5" y="-3.5" opacity="0.55" transform="translate(238.0 474.9) rotate(59.8)"/>
    <use href="#ic-triangle" width="7.1" height="7.1" x="-3.6" y="-3.6" opacity="0.49" transform="translate(816.1 355.5) rotate(281.2)"/>
    <use href="#ic-triangle" width="7.2" height="7.2" x="-3.6" y="-3.6" opacity="0.67" transform="translate(685.1 70.6) rotate(263.4)"/>
    <use href="#ic-triangle" width="7.8" height="7.8" x="-3.9" y="-3.9" opacity="0.8" transform="translate(887.1 858.7) rotate(334.6)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.65" transform="translate(926.0 112.6) rotate(226.1)"/>
    <use href="#ic-triangle" width="8.7" height="8.7" x="-4.4" y="-4.4" opacity="0.45" transform="translate(371.5 696.1) rotate(23.7)"/>
    <use href="#ic-triangle" width="6.4" height="6.4" x="-3.2" y="-3.2" opacity="0.67" transform="translate(518.9 82.2) rotate(237.4)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.61" transform="translate(308.4 482.3) rotate(354.6)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.1" y="-3.1" opacity="0.88" transform="translate(209.4 425.7) rotate(192.0)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.0" y="-4.0" opacity="0.82" transform="translate(587.5 599.2) rotate(224.1)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.54" transform="translate(772.1 83.0) rotate(177.1)"/>
    <use href="#ic-triangle" width="6.7" height="6.7" x="-3.3" y="-3.3" opacity="0.86" transform="translate(438.7 855.7) rotate(238.1)"/>
    <use href="#ic-triangle" width="5.3" height="5.3" x="-2.7" y="-2.7" opacity="0.68" transform="translate(564.2 795.7) rotate(96.4)"/>
    <use href="#ic-triangle" width="5.2" height="5.2" x="-2.6" y="-2.6" opacity="0.68" transform="translate(400.7 421.7) rotate(241.0)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.0" y="-4.0" opacity="0.63" transform="translate(774.6 486.6) rotate(267.2)"/>
    <use href="#ic-triangle" width="6.3" height="6.3" x="-3.1" y="-3.1" opacity="0.84" transform="translate(1029.2 272.8) rotate(120.8)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.7" y="-3.7" opacity="0.51" transform="translate(926.1 484.1) rotate(183.3)"/>
    <use href="#ic-triangle" width="5.1" height="5.1" x="-2.6" y="-2.6" opacity="0.67" transform="translate(454.6 374.4) rotate(204.5)"/>
    <use href="#ic-triangle" width="7.5" height="7.5" x="-3.7" y="-3.7" opacity="0.47" transform="translate(994.8 481.3) rotate(233.1)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-3.0" y="-3.0" opacity="0.52" transform="translate(583.5 419.9) rotate(249.0)"/>
    <use href="#ic-triangle" width="8.9" height="8.9" x="-4.5" y="-4.5" opacity="0.94" transform="translate(780.0 294.8) rotate(101.3)"/>
    <use href="#ic-triangle" width="8.4" height="8.4" x="-4.2" y="-4.2" opacity="0.65" transform="translate(804.9 249.0) rotate(139.7)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.58" transform="translate(708.6 401.4) rotate(78.6)"/>
    <use href="#ic-triangle" width="7.3" height="7.3" x="-3.6" y="-3.6" opacity="0.55" transform="translate(838.6 13.9) rotate(91.9)"/>
    <use href="#ic-triangle" width="6.8" height="6.8" x="-3.4" y="-3.4" opacity="0.89" transform="translate(605.6 268.0) rotate(133.9)"/>
    <use href="#ic-triangle" width="8.1" height="8.1" x="-4.0" y="-4.0" opacity="0.51" transform="translate(461.5 283.0) rotate(29.6)"/>
    <use href="#ic-triangle" width="6.1" height="6.1" x="-3.0" y="-3.0" opacity="0.74" transform="translate(913.8 839.1) rotate(289.8)"/>
    <use href="#ic-triangle" width="8.2" height="8.2" x="-4.1" y="-4.1" opacity="0.84" transform="translate(1035.7 113.4) rotate(284.5)"/>
    <use href="#ic-triangle" width="8.8" height="8.8" x="-4.4" y="-4.4" opacity="0.83" transform="translate(625.4 115.9) rotate(124.5)"/>
    <use href="#ic-triangle" width="5.9" height="5.9" x="-3.0" y="-3.0" opacity="0.74" transform="translate(869.5 227.3) rotate(32.4)"/>
    <use href="#ic-triangle" width="8.0" height="8.0" x="-4.0" y="-4.0" opacity="0.53" transform="translate(1075.1 606.2) rotate(165.8)"/>
    <use href="#ic-triangle" width="6.9" height="6.9" x="-3.4" y="-3.4" opacity="0.47" transform="translate(496.1 694.2) rotate(154.9)"/>
    <use href="#ic-triangle" width="7.8" height="7.8" x="-3.9" y="-3.9" opacity="0.46" transform="translate(777.5 648.0) rotate(343.5)"/>
    <use href="#ic-triangle" width="5.6" height="5.6" x="-2.8" y="-2.8" opacity="0.81" transform="translate(534.9 526.3) rotate(203.2)"/>
    <use href="#ic-triangle" width="7.7" height="7.7" x="-3.8" y="-3.8" opacity="0.46" transform="translate(105.2 962.7) rotate(337.5)"/></g></pattern></defs><rect width="100%" height="100%" fill="url(#authPattern)" />` }}
    />
  );
}
