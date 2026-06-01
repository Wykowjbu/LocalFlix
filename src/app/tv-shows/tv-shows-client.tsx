"use client";

import BrowseByType from "@/components/browse-by-type";

export default function TvShowsClient() {
  return (
    <BrowseByType
      title="Phim bộ"
      apiParams="type=phim-bo"
    />
  );
}
