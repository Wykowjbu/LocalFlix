"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./icon";

type TagItem = { name: string; slug: string; movieCount: number };

const CACHE = new Map<string, { data: TagItem[]; expires: number }>();

let activeDropdownId: string | null = null;
const dismissAll = () => {
  activeDropdownId = null;
  window.dispatchEvent(new CustomEvent("tagdropdown:dismiss"));
};

type TagDropdownProps = {
  group: string;
  label: string;
  hrefPrefix: string;
  maxItems?: number;
  mobileLayout?: boolean;
};

export default function TagDropdown({
  group,
  label,
  hrefPrefix,
  maxItems = 12,
  mobileLayout = false,
}: TagDropdownProps) {
  const [tags, setTags] = useState<TagItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const fetchTriggered = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const dropdownId = `${group}-dropdown`;

  useEffect(() => {
    const handler = () => { if (activeDropdownId !== dropdownId) setOpen(false); };
    window.addEventListener("tagdropdown:dismiss", handler);
    return () => window.removeEventListener("tagdropdown:dismiss", handler);
  }, [dropdownId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); activeDropdownId = null; }
    };
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        activeDropdownId = null;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClickOutside, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClickOutside, true);
    };
  }, [open]);

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

  const toggle = () => {
    if (open) {
      setOpen(false);
      activeDropdownId = null;
    } else {
      dismissAll();
      setOpen(true);
      activeDropdownId = dropdownId;
    }
  };

  const handleHover = useCallback(() => {
    if (!open) {
      dismissAll();
      setOpen(true);
      activeDropdownId = dropdownId;
    }
  }, [open, dropdownId]);

  const handleHoverOut = useCallback(() => {
    setTimeout(() => {
      if (activeDropdownId === dropdownId) {
        setOpen(false);
        activeDropdownId = null;
      }
    }, 200);
  }, [dropdownId]);

  if (mobileLayout) {
    return (
      <div className="space-y-0.5">
        <div className="px-4 py-2 text-[13px] font-medium text-[#808080] uppercase tracking-wider">{label}</div>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : tags && tags.length > 0 ? (
          tags.slice(0, maxItems).map((tag) => (
            <a
              key={tag.slug}
              href={`${hrefPrefix}/${tag.slug}`}
              className="block px-4 py-2 text-[14px] text-[#e5e5e5] transition-colors hover:bg-white/10 hover:text-white"
            >
              {tag.name}
            </a>
          ))
        ) : (
          <div className="px-4 py-3 text-[13px] text-[#808080]">Đang tải...</div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative" ref={containerRef} onMouseEnter={handleHover} onMouseLeave={handleHoverOut}>
      <button
        type="button"
        onClick={toggle}
        className="flex cursor-default items-center gap-1 leading-[20px] transition-colors hover:text-[#b3b3b3]"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label} <Icon name="chevron" className={`h-3 w-3 transition-transform ${open ? "-rotate-90" : "rotate-90"} group-hover:-rotate-90`} />
      </button>
      <div className={`absolute -left-3 top-full pt-3 transition-all duration-200 ${open ? "visible opacity-100" : "invisible opacity-0 group-hover:visible group-hover:opacity-100"}`}>
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
                onClick={() => { setOpen(false); activeDropdownId = null; }}
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
