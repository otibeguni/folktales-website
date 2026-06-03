export interface DialectMapEntry {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  audioUrl: string;
}

export const DIALECT_MAP_ENTRIES: DialectMapEntry[] = [
  {
    slug: "barisal",
    name: "Barisal",
    latitude: 22.701,
    longitude: 90.3535,
    description: "Southern delta speech from the Barisal region.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482135/valid_barishal_0001_orh2dd.wav",
  },
  {
    slug: "comilla",
    name: "Comilla",
    latitude: 23.4607,
    longitude: 91.1809,
    description: "Eastern-central speech from the Comilla region.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482135/valid_comilla_0006_hq8xwf.wav",
  },
  {
    slug: "chittagong",
    name: "Chittagong",
    latitude: 22.3569,
    longitude: 91.7832,
    description: "Coastal southeastern speech from Chittagong.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482134/valid_chittagong_0001_qvop1h.wav",
  },
  {
    slug: "habiganj",
    name: "Habiganj",
    latitude: 24.3745,
    longitude: 91.4155,
    description: "Northeastern speech from the Habiganj region.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482133/valid_habiganj_0030_pt0wdp.wav",
  },
  {
    slug: "kishoreganj",
    name: "Kishoreganj",
    latitude: 24.4449,
    longitude: 90.7766,
    description: "Central-northeastern speech from Kishoreganj.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482132/valid_kishoreganj_0012_w90rzx.wav",
  },
  {
    slug: "noakhali",
    name: "Noakhali",
    latitude: 22.8246,
    longitude: 91.1017,
    description: "Southeastern coastal speech from Noakhali.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482132/valid_noakhali_0008_qpmue4.wav",
  },
  {
    slug: "sandwip",
    name: "Sandwip",
    latitude: 22.4746,
    longitude: 91.4557,
    description: "Island dialect sample from Sandwip.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482131/valid_sandwip_0008_kfofdm.wav",
  },
  {
    slug: "rangpur",
    name: "Rangpur",
    latitude: 25.7439,
    longitude: 89.2752,
    description: "Northern speech from the Rangpur region.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482131/valid_rangpur_0001_q68fak.wav",
  },
  {
    slug: "narail",
    name: "Narail",
    latitude: 23.1725,
    longitude: 89.5127,
    description: "Southwestern speech from the Narail region.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482131/valid_narail_0003_ef7r2t.wav",
  },
  {
    slug: "sylhet",
    name: "Sylhet",
    latitude: 24.8949,
    longitude: 91.8687,
    description: "Northeastern speech from the Sylhet region.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482130/valid_sylhet_0014_s6argp.wav",
  },
  {
    slug: "narsingdi",
    name: "Narsingdi",
    latitude: 23.9322,
    longitude: 90.715,
    description: "Central river-basin speech from Narsingdi.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482129/valid_narsingdi_0014_iuvzxg.wav",
  },
  {
    slug: "tangail",
    name: "Tangail",
    latitude: 24.2513,
    longitude: 89.9167,
    description: "Central-western speech from the Tangail region.",
    audioUrl:
      "https://res.cloudinary.com/dx0tajutq/video/upload/v1780482129/valid_tangail_0026_ujkoq0.wav",
  },
];
