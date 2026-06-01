"use client";

import TagBrowseClient from "@/components/tag-browse-client";

export default function GenreClient({ slug }: { slug: string }) {
  return <TagBrowseClient type="genre" slug={slug} />;
}
