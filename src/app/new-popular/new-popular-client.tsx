"use client";

import BrowseByType from "@/components/browse-by-type";

export default function NewPopularClient() {
  return (
    <BrowseByType
      title="Mới & Phổ biến"
      apiParams="sort=newest"
    />
  );
}
