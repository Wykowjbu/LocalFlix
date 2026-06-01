"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./icon";

type TagItem = { name: string; slug: string; movieCount: number };

const CACHE = new Map<string, { data: TagItem[]; expires: number }>();

export default function TagDropdown({
  group,
  label,
  hrefPrefix,
  maxItems = 12,
}: {
  group: string;
  label: string;
  hrefPrefix: string;
  maxItems?: number;
}) {
  const router = useRouter();
  const [tags, setTags] = useState<TagItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchTriggered = useRef(false);

  useEffect(() => {
    const cached = CACHE.get(group);
    if (cached && cached.expires > Date.now()) {
      setTags(cached.data);
      return;
    }
    if (fetchTriggered.current) return;
    fetchTriggered.current = true;
    setLoading(true);
    fetch(`/api/tags?group=${group}`)
      .then((r) => r.json())
      .then((data) => {
        const items: TagItem[] = data.tags ?? [];
        CACHE.set(group, { data: items, expires: Date.now() + 120_000 });
        setTags(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [group]);

  return (
    <div className="group relative">
      <span className="flex cursor-default items-center gap-1 leading-[20px] transition-colors hover:text-[#b3b3b3]">
        {label} <Icon name="chevron" className="h-3 w-3 rotate-90 transition-transform group-hover:-rotate-90" />
      </span>
      <div className="invisible absolute -left-3 top-full pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
        <div className="max-h-[70vh] w-[200px] overflow-y-auto border border-white/15 bg-[#141414] py-2 text-[13px] shadow-[0_3px_10px_rgba(0,0,0,.75)]">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : tags && tags.length > 0 ? (
            tags.slice(0, maxItems).map((tag) => (
              <a
                key={tag.slug}
                href={`${hrefPrefix}/${tag.slug}`}
                className="block px-4 py-1.5 transition-colors hover:text-white hover:underline"
              >
                {tag.name}
              </a>
            ))
          ) : (
            <div className="px-4 py-3 text-[#b3b3b3]">Đang tải...</div>
          )}
        </div>
      </div>
    </div>
  );
}
