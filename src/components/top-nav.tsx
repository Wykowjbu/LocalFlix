"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Icon from "./icon";
import NetflixLogo from "./netflix-logo";
import TagDropdown from "./tag-dropdown";
import type { Profile } from "@/data/netflix";

export default function TopNav({
  activeProfile,
  accountProfiles,
  onProfileChange,
  onLogout,
  onSeed,
  onSeedForce,
  seeding,
  seedResult,
}: {
  activeProfile: Profile;
  accountProfiles: Profile[];
  onProfileChange: (profile: Profile) => void;
  onLogout: () => void;
  onSeed: () => void;
  onSeedForce: () => void;
  seeding: boolean;
  seedResult: string | null;
}) {
  const router = useRouter();
  const [solid, setSolid] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [confirmForceSync, setConfirmForceSync] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const accountCloseTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [accountOpen]);

  useEffect(() => {
    return () => {
      if (accountCloseTimer.current) window.clearTimeout(accountCloseTimer.current);
    };
  }, []);

  const openAccountMenu = () => {
    if (accountCloseTimer.current) {
      window.clearTimeout(accountCloseTimer.current);
      accountCloseTimer.current = null;
    }
    setAccountOpen(true);
  };

  const closeAccountMenuLater = () => {
    if (accountCloseTimer.current) window.clearTimeout(accountCloseTimer.current);
    accountCloseTimer.current = window.setTimeout(() => {
      setAccountOpen(false);
      accountCloseTimer.current = null;
    }, 350);
  };

  const openSearch = () => {
    setSearchOpen(true);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const submitSearch = () => {
    const query = searchValue.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setSearchValue("");
  };

  const accountLinks = [
    { label: "Quản lý hồ sơ", icon: "pencil" as const },
    { label: "Chuyển hồ sơ", icon: "transfer" as const },
    { label: "Tài khoản", icon: "user" as const },
    { label: "Trung tâm trợ giúp", icon: "help" as const },
  ];

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-[4%] text-[14px] transition-colors duration-300 ${
        solid ? "bg-[#141414] shadow-[0_1px_8px_rgba(0,0,0,.55)]" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center gap-8">
        <NetflixLogo />
        <nav className="hidden items-center gap-5 text-[#e5e5e5] md:flex">
          {[
            { label: "Trang chủ", href: "/browse" },
            { label: "Phim truyền hình", href: "/tv-shows" },
            { label: "Phim", href: "/movies" },
            { label: "Mới & Phổ biến", href: "/new-popular" },
            { label: "Danh sách của tôi", href: "/my-list" },
          ].map((item, index) => (
            <a key={item.label} href={item.href} className={index === 0 ? "font-medium leading-[20px] text-white" : "leading-[20px] transition-colors hover:text-[#b3b3b3]"}>
              {item.label}
            </a>
          ))}
          <TagDropdown group="the-loai" label="Thể loại" hrefPrefix="/genre" />
          <TagDropdown group="quoc-gia" label="Quốc gia" hrefPrefix="/country" />
        </nav>
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={`flex items-center gap-1 text-white md:hidden ${mobileMenuOpen ? "opacity-70" : ""}`}
        >
          Duyệt tìm <Icon name="chevron" className={`h-4 w-4 transition-transform ${mobileMenuOpen ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 items-center overflow-hidden bg-black/55 transition-all duration-200 ${
          searchOpen ? "w-[min(320px,42vw)] px-2" : "w-9 border-transparent bg-transparent px-0"
        }`}>
          <button
            type="button"
            aria-label="Tìm kiếm"
            onClick={searchOpen ? submitSearch : openSearch}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center text-white"
          >
            <Icon name="search" />
          </button>
          <input
            ref={searchInputRef}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitSearch();
              if (event.key === "Escape") setSearchOpen(false);
            }}
            placeholder="Tên phim, diễn viên, thể loại..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#a3a3a3]"
          />
          {searchOpen && searchValue ? (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              onClick={() => {
                setSearchValue("");
                searchInputRef.current?.focus();
              }}
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center text-white/80 hover:text-white"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button aria-label="Thông báo" className="hidden cursor-pointer text-white md:block">
          <Icon name="bell" />
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Đồng bộ dữ liệu mới nhất"
            title="Đồng bộ dữ liệu mới nhất về database"
            onClick={onSeed}
            disabled={seeding}
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-sm border border-white/35 bg-black/35 px-3 text-[13px] font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="sync" className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{seeding ? "Đang sync" : "Sync DB"}</span>
          </button>
          {seedResult ? (
            <div className="absolute right-0 top-11 w-[min(280px,80vw)] rounded-sm border border-white/15 bg-black/90 px-3 py-2 text-right text-[12px] leading-5 text-white shadow-[0_3px_10px_rgba(0,0,0,.75)]">
              {seedResult}
            </div>
          ) : null}
        </div>
        <div
          className="relative"
          onMouseEnter={openAccountMenu}
          onMouseLeave={closeAccountMenuLater}
        >
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={accountOpen}
            aria-label={`${activeProfile.name} - Tài khoản & cài đặt`}
            onClick={() => {
              if (accountCloseTimer.current) {
                window.clearTimeout(accountCloseTimer.current);
                accountCloseTimer.current = null;
              }
              setAccountOpen((value) => !value);
            }}
            className="flex cursor-pointer items-center gap-2"
          >
            <Image src={activeProfile.avatar} alt={activeProfile.name} width={32} height={32} className="h-8 w-8 rounded-sm object-cover" />
            <Icon name="chevron" className={`h-4 w-4 text-white transition-transform ${accountOpen ? "-rotate-90" : "rotate-90"}`} />
          </button>
          {accountOpen ? (
            <div
              role="menu"
              tabIndex={0}
              className="absolute right-0 top-11 w-[230px] border border-white/15 bg-black/90 py-3 text-[13px] text-white shadow-[0_3px_10px_rgba(0,0,0,.75)]"
            >
              <div className="absolute -top-2 right-7 h-4 w-4 rotate-45 border-l border-t border-white/15 bg-black/90" />
              <ul className="space-y-2 px-3 pb-3" aria-label="Hồ sơ">
                {accountProfiles.map((profile) => (
                  <li key={profile.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onProfileChange(profile);
                        setAccountOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 text-left text-[#e5e5e5] hover:text-white hover:underline"
                    >
                      <Image src={profile.avatar} alt="" width={32} height={32} className="h-8 w-8 rounded-sm object-cover" />
                      <span className="truncate">{profile.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="border-t border-white/15 px-3 py-3" aria-label="Tài khoản">
                {accountLinks.map((link) => (
                  <li key={link.label}>
                    <a href="#" role="menuitem" className="flex items-center gap-3 py-1.5 text-[#e5e5e5] hover:text-white hover:underline">
                      <Icon name={link.icon} className="h-5 w-5 shrink-0" />
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/15 px-3 py-3">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                    setConfirmForceSync(true);
                  }}
                  disabled={seeding}
                  className="flex w-full cursor-pointer items-center gap-3 py-1.5 text-left text-[#e5e5e5] hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="database" className="h-5 w-5 shrink-0" />
                  <span>Sync Full (Toàn bộ phim)</span>
                </button>
              </div>
              <div className="border-t border-white/15 px-3 pt-3">
                <button type="button" role="menuitem" onClick={() => { setAccountOpen(false); onLogout(); }} className="flex w-full cursor-pointer items-center gap-3 py-1.5 text-left text-[#e5e5e5] hover:text-white hover:underline">
                  <Icon name="signout" className="h-5 w-5 shrink-0" />
                  <span>Đăng xuất khỏi Localflix</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
    {mobileMenuOpen ? (
      <div className="fixed inset-x-0 top-[68px] z-40 md:hidden">
        <div className="absolute inset-0 h-[calc(100vh-68px)] bg-black/60" onClick={() => setMobileMenuOpen(false)} />
        <div className="relative max-h-[calc(100vh-68px)] overflow-y-auto border-t border-white/10 bg-[#141414] shadow-[0_8px_30px_rgba(0,0,0,.75)]">
          <div className="space-y-1 py-2">
            {[
              { label: "Trang chủ", href: "/browse" },
              { label: "Phim truyền hình", href: "/tv-shows" },
              { label: "Phim", href: "/movies" },
              { label: "Mới & Phổ biến", href: "/new-popular" },
              { label: "Danh sách của tôi", href: "/my-list" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-[14px] text-[#e5e5e5] transition-colors hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="border-t border-white/10">
            <TagDropdown group="the-loai" label="Thể loại" hrefPrefix="/genre" mobileLayout />
          </div>
          <div className="border-t border-white/10">
            <TagDropdown group="quoc-gia" label="Quốc gia" hrefPrefix="/country" mobileLayout />
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmForceSync(true);
              setMobileMenuOpen(false);
            }}
            disabled={seeding}
            className="flex w-full items-center gap-3 border-t border-white/10 px-4 py-3 text-[14px] text-left text-[#e5e5e5] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <Icon name="database" className="h-5 w-5 shrink-0" />
            Sync Full (Toàn bộ phim)
          </button>
        </div>
      </div>
    ) : null}
    {confirmForceSync ? (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70" onClick={() => setConfirmForceSync(false)}>
        <div
          className="mx-4 w-full max-w-md rounded-md bg-[#181818] p-6 text-white shadow-[0_3px_10px_rgba(0,0,0,.75)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#e50914]/20 text-[#e50914]">
              <Icon name="database" className="h-5 w-5" />
            </span>
            <h3 className="text-[20px] font-bold">Xác nhận Sync Full</h3>
          </div>
          <p className="mb-2 text-[14px] leading-relaxed text-[#b3b3b3]">
            Quá trình sẽ đồng bộ lại <strong className="text-white">toàn bộ ~32,000+ phim</strong> từ API vào database.
          </p>
          <p className="mb-6 text-[14px] leading-relaxed text-[#e50914]">
            ⚠ Thời gian dự kiến: <strong>2-3 tiếng</strong>. Không tắt trình duyệt trong quá trình sync.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmForceSync(false)}
              className="cursor-pointer border border-[#808080] px-5 py-2 text-[14px] text-[#808080] transition-colors hover:border-white hover:text-white"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmForceSync(false);
                onSeedForce();
              }}
              disabled={seeding}
              className="cursor-pointer rounded-sm bg-[#e50914] px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-[#f40612] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {seeding ? "Đang sync..." : "Xác nhận Sync Full"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
