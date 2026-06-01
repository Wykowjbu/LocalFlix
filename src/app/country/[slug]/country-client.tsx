"use client";

import TagBrowseClient from "@/components/tag-browse-client";

export default function CountryClient({ slug }: { slug: string }) {
  return <TagBrowseClient type="country" slug={slug} />;
}
