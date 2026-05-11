type YouTubeLink = {
  url?: string;
  cached_url?: string;
};

export const getYouTubeHref = (link?: YouTubeLink | string) => {
  if (!link) {
    return "";
  }

  if (typeof link === "string") {
    return link;
  }

  return link.url || link.cached_url || "";
};

export const getYouTubeVideoId = (url: string) => {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace(/^\/+/, "").split("/")[0] || "";
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return videoId;
      }

      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) {
        return embedMatch[1];
      }
    }
  } catch {
    return "";
  }

  return "";
};

export const getYouTubeEmbedUrl = (url: string) => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
};

export const getYouTubeThumbnailUrl = (url: string) => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
};
