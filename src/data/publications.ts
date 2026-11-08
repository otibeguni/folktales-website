export type PublicationCatalogItem = {
  slug: string;
  title: string;
  description: string;
  cover: string;
  href: string;
  meta: string;
  section: "publication" | "comic";
};

export const PUBLICATION_CATALOG: PublicationCatalogItem[] = [
  {
    slug: "otiprakrito-volume-1",
    title: "Otiprakrito - Volume 1",
    description:
      "A beautifully illustrated bestiary with over one hundred mythical creatures from Bengali and indigenous folklore.",
    cover:
      "https://imagedelivery.net/IEMzXmjRvW0g933AN5ejrA/wwwnotionso-image-prod-files-secures3us-west-2amazonawscom-78db12f1-c691-45de-b1e3-0703df5f72a6-5554bf7c-7b19-4141-9fb9-b8ff93508371-img_4060jpeg/format=auto,w=1200",
    href: "/publications/otiprakrito",
    meta: "Hardcover | 303 pages | Bengali",
    section: "publication",
  },
  {
    slug: "chonde-chonde-golpo-boli",
    title: "Chonde Chonde Golpo Boli",
    description:
      "This book brings together fourteen traditional puthi narratives alongside twelve palas drawn from the song-based traditions of ancient Mymensingh and North Bengal.",
    cover:
      "https://res.cloudinary.com/dx0tajutq/image/upload/v1766991441/ChatGPT_Image_Dec_29_2025_05_56_31_PM_nbl7x1.png",
    href: "https://chonde-chonde.com/",
    meta: "Paperback | 241 pages | Bengali",
    section: "publication",
  },
  {
    slug: "mro-comic",
    title: "Mro Comic",
    description:
      "A traditional Mro folktale about the mythical origins of agricultural practices, a lost sacred book, and the community's reclaimed written language.",
    cover: "/images/comics/mro-comic-cover.png",
    href: "/publications/comics/mro-comic",
    meta: "Comic | Interactive preview",
    section: "comic",
  },
];
