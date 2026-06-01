"use client";

import BrowseByType from "@/components/browse-by-type";

export default function MoviesClient() {
  return (
    <BrowseByType
      title="Phim lẻ"
      apiParams="type=phim-le"
    />
  );
}
