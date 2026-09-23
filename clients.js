// ─────────────────────────────────────────────────────────────────────────
// VLANCE CLIENT ROSTER
// ─────────────────────────────────────────────────────────────────────────
// This is the ONE place client info lives. The homepage reads this list to
// build:
//   - the "Faces behind the numbers" client carousel (the scrollwheel)
//   - the hero "Trusted by N+ creators" rotating avatar badge
//   - the "Trusted by N+ creators" count (N is just this list's length —
//     add or remove a client below and the count updates itself)
//
// TO ADD A CLIENT: drop their photo in png/clients/, then add a new line
// below. TO REMOVE ONE: delete their line. No other file needs to change.
//
// Fields:
//   name    (required) shown on their card
//   photo   (required) path to their photo, relative to index.html
//   handle  (optional) shown under their name, e.g. "@handle" — leave out
//           if you don't have one yet
//   url     (optional) their profile link — leave out if you don't have one
//           yet; the card just won't be clickable until you add it
// ─────────────────────────────────────────────────────────────────────────

window.VLANCE_CLIENTS = [
  { name: "Chico",     photo: "png/clients/chico pfp.png",      handle: "@chicoguerraa",         url: "https://www.tiktok.com/@chicoguerraa?is_from_webapp=1&sender_device=pc" },
  { name: "Anna",      photo: "png/clients/anna pfp.png",       handle: "@daynes_wife",           url: "https://www.tiktok.com/@daynes_wife?is_from_webapp=1&sender_device=pc" },
  { name: "Dayne",     photo: "png/clients/dayne pfp.png",      handle: "@trendyshopdealz",       url: "https://www.tiktok.com/@trendyshopdealz?is_from_webapp=1&sender_device=pc" },
  { name: "Susan",     photo: "png/clients/Susan L.png",        handle: "@susanluckhardt",        url: "https://www.tiktok.com/@susanluckhardt?is_from_webapp=1&sender_device=pc" },
  { name: "Maddie",    photo: "png/clients/Maddie M.png",       handle: "@maddieshomefinds",      url: "https://www.tiktok.com/@maddieshomefinds?is_from_webapp=1&sender_device=pc" },
  { name: "Cari",      photo: "png/clients/Cari C.png",         handle: "@cari_chapman",          url: "https://www.tiktok.com/@cari_chapman?is_from_webapp=1&sender_device=pc" },
  { name: "Steffany",  photo: "png/clients/Steffany B.png",     handle: "@Steff__bell",           url: "https://www.tiktok.com/@steff__bell?is_from_webapp=1&sender_device=pc" },
  { name: "Amanda",    photo: "png/clients/Amanda R.png",       handle: "@BusyboymomAmanda",      url: "https://www.tiktok.com/@busyboymomamanda?is_from_webapp=1&sender_device=pc" },
  { name: "Leah",      photo: "png/clients/Leah M.png",         handle: "@Leah_runhideandread",   url: "https://www.tiktok.com/@leah_runhideandread?is_from_webapp=1&sender_device=pc" },
  { name: "Andrew",    photo: "png/clients/Andrew K.png",       handle: "@Norman_Stevens",        url: "https://www.tiktok.com/@norman_stevens?is_from_webapp=1&sender_device=pc" },
  { name: "Taylor",    photo: "png/clients/Taylor G png.png",   handle: "@Taylorgfinds",          url: "https://www.tiktok.com/@taylorgfinds?is_from_webapp=1&sender_device=pc" },
  { name: "Savannah",  photo: "png/clients/Savannah Irwin.png", handle: "@savannahxraeee",        url: "https://www.tiktok.com/@savannahxraeee?is_from_webapp=1&sender_device=pc" },
  { name: "Maze",      photo: "png/clients/fern pfp.png" },
  { name: "Sophie",    photo: "png/clients/Sophie pfp.png" },

  // Newest additions — names taken straight from their image filenames for
  // now; rename any of these whenever you have their real name/handle.
  { name: "Candylocs",         photo: "png/clients/candylocs.jpeg" },
  { name: "Courtney Sabot",    photo: "png/clients/Courtney Sabot.jpeg" },
  { name: "Daisydorn",         photo: "png/clients/daisydorn.jpeg" },
  { name: "Heidilynwhite",     photo: "png/clients/heidilynwhite.jpeg" },
  { name: "Kellzshopping",     photo: "png/clients/kellzshopping.jpeg" },
  { name: "Lis Beautytips",    photo: "png/clients/lis_beautytips.jpeg" },
  { name: "Nikki Brownlee",    photo: "png/clients/Nikki_brownlee.jpeg" },
  { name: "Sarahsaxton",       photo: "png/clients/sarahsaxton.jpeg" },
  { name: "Stephanie Jaleen",  photo: "png/clients/Stephanie_jaleen.jpeg" },
  { name: "Theamandasyoung",   photo: "png/clients/theamandasyoung.jpeg" },
  { name: "Thegloriadays",     photo: "png/clients/thegloriadays.jpeg" },
];
