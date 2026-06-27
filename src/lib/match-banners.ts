// Curated PUBG-themed banner library for tournament/match cards.
// Files live under /public/banners and are served at stable URLs.

export type MatchBanner = {
  url: string;
  label: string;
};

export const MATCH_BANNERS: MatchBanner[] = [
  { url: "/banners/erangel-sunset.jpg", label: "Erangel Sunset" },
  { url: "/banners/miramar-convoy.jpg", label: "Miramar Convoy" },
  { url: "/banners/vikendi-snow.jpg", label: "Vikendi Snow" },
  { url: "/banners/sanhok-jungle.jpg", label: "Sanhok Jungle" },
  { url: "/banners/night-ops.jpg", label: "Night Ops" },
  { url: "/banners/airdrop-jump.jpg", label: "Airdrop Jump" },
  { url: "/banners/airdrop.jpg", label: "Loot Drop" },
  { url: "/banners/sniper.jpg", label: "Rooftop Sniper" },
  { url: "/banners/squad.jpg", label: "Squad Action" },
  { url: "/banners/vehicle.jpg", label: "Vehicle Chase" },
  { url: "/banners/soldier.jpg", label: "Lone Soldier" },
  { url: "/banners/warzone.jpg", label: "Warzone" },
  { url: "/banners/solo.jpg", label: "Solo Mode" },
  { url: "/banners/duo.jpg", label: "Duo Mode" },
  { url: "/banners/squad-team.jpg", label: "Squad Team" },
  { url: "/banners/tdm.jpg", label: "TDM Arena" },
];

export function randomBanner(seed?: number): string {
  const i =
    seed !== undefined
      ? Math.abs(Math.floor(seed)) % MATCH_BANNERS.length
      : Math.floor(Math.random() * MATCH_BANNERS.length);
  return MATCH_BANNERS[i].url;
}
