"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { featuredMovie, movieRows, profileAvatars, profiles, type Movie, type Profile } from "@/data/netflix";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "play"
    | "info"
    | "plus"
    | "like"
    | "search"
    | "bell"
    | "pencil"
    | "chevron"
    | "check"
    | "volume"
    | "x"
    | "transfer"
    | "user"
    | "help"
    | "signout"
    | "sync"
    | "database";
  className?: string;
}) {
  const paths = {
    play: "M8 5v14l11-7z",
    info: "M11 17h2v-6h-2v6Zm1-8.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z",
    plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z",
    like: "M7 10v10H4V10h3Zm3.2 10H8V9.4L12.7 3l1.1.8c.4.3.6.8.5 1.3l-.7 3.4H20c.7 0 1.2.6 1 1.3l-1.6 8.1c-.2 1.2-1.2 2.1-2.4 2.1h-6.8Z",
    search: "m20 20-4.2-4.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    bell: "M18 16H6l1.2-1.4V10a4.8 4.8 0 1 1 9.6 0v4.6L18 16Zm-4 2a2 2 0 0 1-4 0",
    pencil: "M5 16.5V20h3.5L19 9.5 15.5 6 5 16.5Zm12.7-9.7 1.5-1.5-2.5-2.5-1.5 1.5 2.5 2.5Z",
    chevron: "m9 6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    volume: "M11 5 6.5 9H3v6h3.5l4.5 4V5Zm5.5 2.5a6.5 6.5 0 0 1 0 9M14 10a3 3 0 0 1 0 4",
    x: "m6 6 12 12M18 6 6 18",
    transfer: "M7 7h9m0 0-3-3m3 3-3 3M17 17H8m0 0 3 3m-3-3 3-3",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0",
    help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2-12a2 2 0 1 1 3.2 1.6c-.7.4-1.2.9-1.2 1.9v.5m0 3h.01",
    signout: "M10 17l5-5-5-5m5 5H3m10-8h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5",
    sync: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    database: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill={name === "play" ? "currentColor" : "none"} aria-hidden="true">
      <path d={paths[name]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NetflixLogo() {
  return (
    <Image
      src="/localflix-logo.png"
      alt="Localflix"
      width={289}
      height={86}
      priority
      className="h-auto w-[145px] md:w-[172px]"
    />
  );
}

function TopTenLabel({ rank }: { rank: number }) {
  return (
    <div className="flex h-[30px] items-center gap-[10px] text-white">
      <div className="relative size-[28px] shrink-0 overflow-hidden rounded-[4px] bg-[#f50723] text-center font-black leading-none">
        <span className="absolute left-1/2 top-[3px] -translate-x-1/2 text-[9.5px] tracking-[-0.5px]">TOP</span>
        <span className="absolute left-1/2 top-[9px] -translate-x-1/2 text-[14px] tracking-[-1px]">10</span>
      </div>
      <span className="text-[20.856px] font-medium leading-none tracking-[-0.4345px]">#{rank} in TV Shows Today</span>
    </div>
  );
}

function QualityBadge({ quality }: { quality: string }) {
  return (
    <span className="inline-flex h-4 items-center justify-center rounded-[4px] border border-[#808080] px-[6.5px] text-[11px] leading-none text-[#e5e5e5]">
      {quality}
    </span>
  );
}

function MaturityBadge({ rating }: { rating: string }) {
  return (
    <span className="inline-flex h-5 items-center justify-center border border-[#bcbcbc] px-[6px] text-[14.545px] leading-[18px] text-[#bcbcbc]">
      {rating}
    </span>
  );
}

const PROFILE_STORAGE_KEY = "localflix.profiles";

function getStoredProfiles() {
  if (typeof window === "undefined") return profiles;

  const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!stored) return profiles;

  try {
    const parsed = JSON.parse(stored) as Profile[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : profiles;
  } catch {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    return profiles;
  }
}

function ProfileCard({
  profile,
  manage,
  onSelect,
}: {
  profile: Profile;
  manage: boolean;
  onSelect: (profile: Profile) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(profile)}
      className="group w-[28vw] max-w-[150px] cursor-pointer text-center focus:outline-none sm:w-[15vw]"
    >
      <div className="relative aspect-square overflow-hidden rounded-sm border-2 border-transparent bg-[#181818] transition-colors duration-200 group-hover:border-white group-focus:border-white">
        <Image src={profile.avatar} alt={profile.name} fill sizes="150px" className="object-cover" />
        <div className="absolute inset-0 mix-blend-color" style={{ backgroundColor: profile.accent, opacity: 0.12 }} />
        {manage ? (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white">
              <Icon name="pencil" />
            </span>
          </div>
        ) : null}
      </div>
      <div className="mt-3 truncate text-[clamp(14px,1.3vw,18px)] text-[#808080] transition-colors duration-200 group-hover:text-white">
        {profile.name}
      </div>
    </button>
  );
}

function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: Profile;
  onClose: () => void;
  onSave: (profile: Profile) => void;
}) {
  const [draft, setDraft] = useState(profile);

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#141414] px-[4%] py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <NetflixLogo />
        <section className="mx-auto mt-10 max-w-3xl">
          <h1 className="border-b border-[#333333] pb-4 text-[clamp(34px,4vw,64px)] font-normal leading-tight">Sửa hồ sơ</h1>
          <div className="grid gap-8 border-b border-[#333333] py-8 sm:grid-cols-[144px_1fr]">
            <div className="relative size-36 overflow-hidden rounded-sm bg-[#181818]">
              <Image src={draft.avatar} alt={draft.name} fill sizes="144px" className="object-cover" />
              <div className="absolute inset-0 mix-blend-color" style={{ backgroundColor: draft.accent, opacity: 0.12 }} />
            </div>
            <div className="min-w-0">
              <label htmlFor="profile-name" className="sr-only">
                Tên hồ sơ
              </label>
              <input
                id="profile-name"
                value={draft.name}
                onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
                className="mb-7 w-full rounded-sm bg-[#666666] px-3 py-2 text-[20px] text-white outline-none placeholder:text-[#b3b3b3] focus:ring-2 focus:ring-white"
              />
              <h2 className="mb-3 text-[18px] text-[#b3b3b3]">Chọn avatar</h2>
              <div className="grid max-h-[45vh] grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3 overflow-y-auto pr-1">
                {profileAvatars.map((avatar) => {
                  const selected = draft.avatar === avatar.src;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      aria-label={avatar.name}
                      aria-pressed={selected}
                      onClick={() => setDraft((value) => ({ ...value, avatar: avatar.src }))}
                      className={`relative aspect-square overflow-hidden rounded-sm border-2 bg-[#181818] transition-transform hover:scale-105 ${
                        selected ? "border-white" : "border-transparent"
                      }`}
                    >
                      <Image src={avatar.src} alt="" fill sizes="96px" className="object-cover" />
                      {selected ? (
                        <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white text-black">
                          <Icon name="check" className="h-4 w-4" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onSave({ ...draft, name: draft.name.trim() || profile.name })}
              className="cursor-pointer rounded-sm bg-white px-7 py-2 text-[16px] font-medium text-black transition-colors hover:bg-[#c2c2c2]"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer border border-[#808080] px-7 py-2 text-[16px] uppercase tracking-[0.08em] text-[#808080] transition-colors hover:border-white hover:text-white"
            >
              Hủy
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileGate({ onEnter }: { onEnter: (profile: Profile) => void }) {
  const [manage, setManage] = useState(false);
  const [editableProfiles, setEditableProfiles] = useState(getStoredProfiles);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const saveProfiles = (nextProfiles: Profile[]) => {
    setEditableProfiles(nextProfiles);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles));
  };

  const handleProfileSelect = (profile: Profile) => {
    if (manage) {
      setEditingProfile(profile);
      return;
    }

    onEnter(profile);
  };

  const handleSaveProfile = (profile: Profile) => {
    saveProfiles(editableProfiles.map((item) => (item.id === profile.id ? profile : item)));
    setEditingProfile(null);
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#141414] text-white">
      <header className="px-[4%] py-6">
        <NetflixLogo />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center px-[4%] pb-20">
        <h1 className="mb-8 text-center text-[clamp(30px,3.5vw,64px)] font-normal leading-tight text-white">
          {manage ? "Quản lý hồ sơ" : "Ai đang xem?"}
        </h1>
        <div className="flex max-w-5xl flex-wrap justify-center gap-x-5 gap-y-8 md:gap-x-8">
          {editableProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} manage={manage} onSelect={handleProfileSelect} />
          ))}
          {manage ? null : (
            <button className="group w-[28vw] max-w-[150px] cursor-pointer text-center sm:w-[15vw]">
              <div className="grid aspect-square place-items-center rounded-sm bg-[#181818] text-[#808080] transition-colors duration-200 group-hover:bg-[#232323] group-hover:text-white">
                <Icon name="plus" className="h-16 w-16" />
              </div>
              <div className="mt-3 truncate text-[clamp(14px,1.3vw,18px)] text-[#808080] group-hover:text-white">Thêm hồ sơ</div>
            </button>
          )}
        </div>
        <div className="mt-14 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setManage((value) => !value)}
            className="cursor-pointer border border-[#808080] px-7 py-2 text-[16px] uppercase tracking-[0.08em] text-[#808080] transition-colors hover:border-white hover:text-white"
          >
            {manage ? "Xong" : "Quản lý hồ sơ"}
          </button>
          <button
            onClick={() => onEnter(editableProfiles[0])}
            className="cursor-pointer rounded-sm bg-white px-7 py-2 text-[16px] font-medium text-black transition-colors hover:bg-[#c2c2c2]"
          >
            Vào Localflix
          </button>
        </div>
      </section>
      {editingProfile ? (
        <EditProfileModal key={editingProfile.id} profile={editingProfile} onClose={() => setEditingProfile(null)} onSave={handleSaveProfile} />
      ) : null}
    </main>
  );
}

function TopNav({
  activeProfile,
  accountProfiles,
  onProfileChange,
  onSeed,
  seeding,
  seedResult,
}: {
  activeProfile: Profile;
  accountProfiles: Profile[];
  onProfileChange: (profile: Profile) => void;
  onSeed: () => void;
  seeding: boolean;
  seedResult: string | null;
}) {
  const [solid, setSolid] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
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

  const accountLinks = [
    { label: "Quản lý hồ sơ", icon: "pencil" as const },
    { label: "Chuyển hồ sơ", icon: "transfer" as const },
    { label: "Tài khoản", icon: "user" as const },
    { label: "Trung tâm trợ giúp", icon: "help" as const },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-[4%] text-[14px] transition-colors duration-300 ${
        solid ? "bg-[#141414] shadow-[0_1px_8px_rgba(0,0,0,.55)]" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center gap-8">
        <NetflixLogo />
        <nav className="hidden items-center gap-5 text-[#e5e5e5] md:flex">
          {["Trang chủ", "Phim truyền hình", "Phim", "Mới & Phổ biến", "Danh sách của tôi"].map((item, index) => (
            <a key={item} href="#" className={index === 0 ? "font-medium leading-[20px] text-white" : "leading-[20px] transition-colors hover:text-[#b3b3b3]"}>
              {item}
            </a>
          ))}
        </nav>
        <button className="flex items-center gap-1 text-white md:hidden">
          Duyệt tìm <Icon name="chevron" className="h-4 w-4 rotate-90" />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button aria-label="Tìm kiếm" className="hidden cursor-pointer text-white md:block">
          <Icon name="search" />
        </button>
        <button aria-label="Thông báo" className="hidden cursor-pointer text-white md:block">
          <Icon name="bell" />
        </button>
        <button
          type="button"
          aria-label="Đồng bộ dữ liệu"
          title="Đồng bộ dữ liệu từ API"
          onClick={onSeed}
          disabled={seeding}
          className="hidden cursor-pointer text-white transition-colors hover:text-[#e50914] disabled:opacity-50 disabled:cursor-not-allowed md:block"
        >
          <Icon name="sync" className={seeding ? "animate-spin" : ""} />
        </button>
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
              <div className="border-t border-white/15 px-3 pt-3">
                <a href="#" role="menuitem" className="flex items-center gap-3 py-1.5 text-center text-[#e5e5e5] hover:text-white hover:underline">
                  <Icon name="signout" className="h-5 w-5 shrink-0" />
                  <span>Đăng xuất khỏi Netflix</span>
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function HeroBillboard() {
  return (
    <section className="relative min-h-[620px] overflow-hidden md:h-[80vh]">
      <div className="absolute inset-0">
        <Image src={featuredMovie.image} alt={featuredMovie.title} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#141414] to-transparent" />
      </div>
      <div className="relative z-10 flex h-full min-h-[620px] max-w-[754px] flex-col justify-end px-[4%] pb-[12vw] pt-32 md:pb-[8vw]">
        <p className="mb-3 text-[14px] font-bold leading-[18px] tracking-[0.28em] text-[#e50914]">{featuredMovie.label}</p>
        <h1 className="text-[clamp(42px,6vw,88px)] font-black leading-[0.95] tracking-normal text-white">{featuredMovie.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[16px] leading-[24px] text-[#bcbcbc]">
          <span className="font-medium tracking-[0.5px] text-[#46d369]">New</span>
          <span>2026</span>
          <span>3 Seasons</span>
          <QualityBadge quality="HD" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <MaturityBadge rating="TV-MA" />
          <span className="text-[14px] leading-[18px] text-white">violence, language</span>
        </div>
        <div className="mt-[14px]">
          <TopTenLabel rank={2} />
        </div>
        <p className="mt-4 max-w-[481px] text-[16px] leading-[26px] text-white">{featuredMovie.synopsis}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-white px-7 py-2.5 text-[16px] font-bold text-black transition-colors hover:bg-[#c2c2c2]">
            <Icon name="play" /> Phát
          </button>
          <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-[rgba(109,109,110,.7)] px-7 py-2.5 text-[16px] font-bold text-white transition-colors hover:bg-[rgba(109,109,110,.9)]">
            <Icon name="info" /> Thông tin khác
          </button>
        </div>
      </div>
    </section>
  );
}

function RoundButton({
  icon,
  label,
  filled = false,
  size = "md",
  onClick,
}: {
  icon: "play" | "plus" | "like" | "chevron" | "check" | "volume" | "x";
  label: string;
  filled?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid cursor-pointer place-items-center rounded-full border-2 transition-colors ${
        size === "sm" ? "h-8 w-8" : "h-10 w-10"
      } ${
        filled ? "border-white bg-white text-black" : "border-white/50 bg-[#2a2a2a]/60 text-white hover:border-white hover:bg-[#3a3a3a]"
      }`}
    >
      <Icon name={icon} className={icon === "chevron" ? "h-5 w-5 rotate-90" : "h-5 w-5"} />
    </button>
  );
}

function MovieCard({
  movie,
  onExpand,
  onPreview,
  onPreviewEnd,
  variant = "standard",
  rank,
}: {
  movie: Movie;
  onExpand: (movie: Movie) => void;
  onPreview: (movie: Movie, rect: DOMRect) => void;
  onPreviewEnd: () => void;
  variant?: "standard" | "top10";
  rank?: number;
}) {
  const isTop10 = variant === "top10";

  return (
    <article
      onMouseEnter={(event) => onPreview(movie, event.currentTarget.getBoundingClientRect())}
      onMouseLeave={onPreviewEnd}
      className={`movie-card group/card relative shrink-0 cursor-pointer ${
        isTop10 ? "basis-[64%] sm:basis-[42%] md:basis-[31%] lg:basis-[24%] xl:basis-[20%]" : "basis-[48%] sm:basis-[31%] md:basis-[23.5%] lg:basis-[18.9%] xl:basis-[15.8%]"
      }`}
    >
      {isTop10 ? (
        <div className="relative flex h-[clamp(150px,13vw,210px)] items-end overflow-visible">
          <div
            className="rank-number pointer-events-none z-0 w-[45%] select-none text-right text-[clamp(120px,12vw,210px)] font-black leading-[0.78] text-[#141414]"
            style={{ WebkitTextStroke: "4px #595959", textShadow: "0 0 1px #000" }}
            aria-hidden="true"
          >
            {rank}
          </div>
          <div className="relative z-10 h-full aspect-[7/10] -ml-[7%] overflow-hidden bg-[#181818] shadow-[0_0_0_1px_rgba(255,255,255,.05)]">
            <Image
              src={movie.image}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 32vw, (max-width: 1024px) 18vw, 12vw"
              className="object-cover transition-transform duration-300 group-hover/card:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
              <p className="truncate text-[11px] font-bold text-white">{movie.title}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-sm bg-[#181818]">
          <Image
            src={movie.image}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 48vw, (max-width: 768px) 31vw, (max-width: 1024px) 24vw, 16vw"
            className="object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
          {movie.top10 ? (
            <div className="absolute left-2 top-2 grid size-8 place-items-center rounded-[4px] bg-[#f50723] text-center font-black leading-none text-white">
              <span className="text-[10px] tracking-[-0.5px]">TOP</span>
              <span className="-mt-1 text-[15px] tracking-[-1px]">10</span>
            </div>
          ) : null}
        </div>
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={movie.title}
        className="hidden"
      >
        <div className="relative aspect-video overflow-hidden bg-[#181818]">
          <Image src={movie.image} alt="" fill sizes="24vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          <div className="absolute bottom-3 left-3 right-12">
            <div className="text-[10px] font-bold tracking-[0.22em] text-[#e50914]">NETFLIX</div>
            <div className="max-w-[300px] truncate text-[24px] font-black leading-[30px] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.85)]">
              {movie.title}
            </div>
          </div>
          <div className="absolute right-2 top-2">
            <RoundButton icon="x" label="Đóng" size="sm" />
          </div>
          <div className="absolute bottom-3 right-3 opacity-60">
            <RoundButton icon="volume" label="Bật âm thanh" size="sm" />
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <RoundButton icon="play" label="Phát" filled />
              <RoundButton icon={movie.isNew ? "check" : "plus"} label="Danh sách của tôi" />
              <RoundButton icon="like" label="Thích" />
            </div>
            <RoundButton icon="chevron" label="Mở rộng" onClick={() => onExpand(movie)} />
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-[#e5e5e5]">
            <span className="font-bold text-[#46d369]">{movie.match}% phù hợp</span>
            <MaturityBadge rating={movie.maturity} />
            <span>{movie.duration}</span>
            <QualityBadge quality={movie.quality} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-white">
            {movie.genres.map((genre, index) => (
              <span key={genre} className="flex items-center gap-1.5">
                {genre}
                {index < movie.genres.length - 1 ? <span className="h-1 w-1 rounded-full bg-[#646464]" /> : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function MovieRow({
  title,
  movies,
  onExpand,
  onPreview,
  onPreviewEnd,
}: {
  title: string;
  movies: Movie[];
  onExpand: (movie: Movie) => void;
  onPreview: (movie: Movie, rect: DOMRect) => void;
  onPreviewEnd: () => void;
}) {
  const [page, setPage] = useState(0);
  const isTop10Row = title.toLowerCase().includes("top 10");
  const pageCount = Math.max(1, Math.ceil(movies.length / 6));
  const canGoBack = page > 0;
  const canGoNext = page < pageCount - 1;

  return (
    <section className="slider-row group/row relative py-[1.6vw]">
      <div className="mb-2 flex items-end gap-2 px-[4%]">
        <h2 className="text-[clamp(18px,1.4vw,24px)] font-bold leading-tight">{title}</h2>
        <span className="translate-x-[-8px] text-xs font-bold text-[#54b9c5] opacity-0 transition-all duration-200 group-hover/row:translate-x-0 group-hover/row:opacity-100">
          Khám phá tất cả <span aria-hidden="true">›</span>
        </span>
        <ul className="ml-auto hidden items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/row:flex group-hover/row:opacity-100" aria-hidden="true">
          {Array.from({ length: pageCount }, (_, index) => (
            <li key={index} className={`h-0.5 w-3 ${index === page ? "bg-[#aaa]" : "bg-[#4d4d4d]"}`} />
          ))}
        </ul>
      </div>
      <div className="relative overflow-x-clip overflow-y-visible py-12 -my-12">
        <div
          className="flex gap-2 px-[4%] transition-transform duration-700 ease-[cubic-bezier(.5,0,.1,1)]"
          style={{ transform: `translateX(calc(${page} * -92%))` }}
        >
          {movies.map((movie, index) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onExpand={onExpand}
              onPreview={onPreview}
              onPreviewEnd={onPreviewEnd}
              variant={isTop10Row ? "top10" : "standard"}
              rank={index + 1}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Xem video trước"
          disabled={!canGoBack}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
          className={`absolute left-0 top-12 bottom-12 z-20 grid w-[4%] min-w-10 cursor-pointer place-items-center bg-black/45 text-white opacity-0 transition-opacity duration-200 ${
            canGoBack ? "group-hover/row:opacity-100 hover:bg-black/65" : "pointer-events-none"
          }`}
        >
          <Icon name="chevron" className="h-10 w-10 rotate-180 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]" />
        </button>
        <button
          type="button"
          aria-label="Xem video khác"
          disabled={!canGoNext}
          onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
          className={`absolute right-0 top-12 bottom-12 z-20 grid w-[4%] min-w-10 cursor-pointer place-items-center bg-black/45 text-white opacity-0 transition-opacity duration-200 ${
            canGoNext ? "group-hover/row:opacity-100 hover:bg-black/65" : "pointer-events-none"
          }`}
        >
          <Icon name="chevron" className="h-10 w-10 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]" />
        </button>
      </div>
    </section>
  );
}

type PreviewState = {
  movie: Movie;
  top: number;
  left: number;
  width: number;
  active: boolean;
};

function MiniPreviewModal({
  preview,
  onExpand,
  onKeepOpen,
  onPreviewEnd,
}: {
  preview: PreviewState;
  onExpand: (movie: Movie) => void;
  onKeepOpen: () => void;
  onPreviewEnd: () => void;
}) {
  const { movie, top, left, width } = preview;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
      tabIndex={-1}
      data-uia="modal-motion-container-MINI_MODAL"
      className={`mini-preview-modal absolute z-[70] overflow-hidden rounded-md bg-[#181818] text-white shadow-[0_3px_10px_rgba(0,0,0,.75)] ${
        preview.active ? "active" : ""
      }`}
      style={{ top, left, width, transformOrigin: "50% 50%" }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onPreviewEnd}
    >
      <div className="relative aspect-video overflow-hidden bg-[#181818]">
        <Image src={movie.image} alt={movie.title} fill sizes={`${Math.round(width)}px`} className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          type="button"
          aria-label="Đóng"
          onClick={onPreviewEnd}
          className="absolute right-2 top-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[#181818]/90 text-white"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <RoundButton icon="play" label="Phát" filled size="sm" />
            <RoundButton icon={movie.isNew ? "check" : "plus"} label="Danh sách của tôi" size="sm" />
            <RoundButton icon="like" label="Thích" size="sm" />
          </div>
          <RoundButton icon="chevron" label="Mở rộng" size="sm" onClick={() => onExpand(movie)} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#e5e5e5]">
          <span className="font-bold text-[#46d369]">{movie.match}% phù hợp</span>
          <MaturityBadge rating={movie.maturity} />
          <span>{movie.duration}</span>
          <QualityBadge quality={movie.quality} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-white">
          {movie.genres.map((genre, index) => (
            <span key={genre} className="flex items-center gap-1.5">
              {genre}
              {index < movie.genres.length - 1 ? <span className="h-1 w-1 rounded-full bg-[#646464]" /> : null}
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

function DetailModal({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const episodes = Array.from({ length: 10 }, (_, index) => ({
    title: `Tập ${index + 1}`,
    duration: `${42 + (index % 4)}ph`,
    image: movieRows[(index + 1) % movieRows.length].movies[index % movieRows[0].movies.length].image,
    synopsis:
      index === 0
        ? "Nhân vật chính trở về sau nhiều năm biến mất, mang theo một bí mật có thể thay đổi tất cả."
        : "Những dấu vết mới kéo cả nhóm vào một cuộc đối đầu nguy hiểm hơn, nơi lòng tin bị thử thách.",
  }));
  const similar = movieRows.flatMap((row) => row.movies).filter((item) => item.id !== movie.id).slice(0, 9);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/70 px-3 py-8 md:px-8" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={movie.title}
        tabIndex={-1}
        className="mx-auto min-h-[80vh] w-[92vw] max-w-[850px] overflow-hidden rounded-md bg-[#181818] pb-8 text-white shadow-[0_3px_10px_rgba(0,0,0,.75)] outline-none"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-video min-h-[300px] overflow-hidden bg-[#141414]">
          <Image src={movie.image} alt={movie.title} fill sizes="92vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/20 to-transparent" />
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#181818] text-white transition-colors hover:bg-[#232323]"
          >
            <Icon name="x" />
          </button>
          <div className="absolute bottom-[8%] left-[clamp(20px,4vw,48px)] right-[clamp(20px,4vw,48px)]">
            <div className="mb-2 text-[14px] font-bold leading-[18px] tracking-[0.28em] text-[#e50914]">NETFLIX</div>
            <h2 className="max-w-[75%] text-[clamp(34px,6vw,72px)] font-black leading-none">{movie.title}</h2>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-white px-7 py-2.5 text-[16px] font-bold text-black transition-colors hover:bg-[#c2c2c2]">
                <Icon name="play" /> Phát
              </button>
              <RoundButton icon={movie.isNew ? "check" : "plus"} label="Danh sách của tôi" />
              <RoundButton icon="like" label="Thích" />
              <div className="ml-auto hidden opacity-60 sm:block">
                <RoundButton icon="volume" label="Bật âm thanh" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-[clamp(20px,4vw,48px)] py-8 md:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[#e5e5e5]">
              <span className="font-bold text-[#46d369]">{movie.match}% phù hợp</span>
              <span>2026</span>
              <span>10 tập</span>
              <QualityBadge quality={movie.quality} />
              <MaturityBadge rating={movie.maturity} />
            </div>
            <p className="text-[clamp(15px,1.5vw,18px)] leading-relaxed text-white">
              Sau một tín hiệu bí ẩn xuất hiện trong thành phố, một nhóm người xa lạ bị kéo vào cuộc truy tìm sự thật. Mọi lựa chọn của họ mở ra một lớp bí mật mới.
            </p>
          </div>
          <aside className="space-y-3 text-sm leading-relaxed text-white">
            <p>
              <span className="text-[#777777]">Diễn viên:</span> Minh Tran, Linh Dao, Bao Nguyen
            </p>
            <p>
              <span className="text-[#777777]">Thể loại:</span> {movie.genres.join(", ")}
            </p>
            <p>
              <span className="text-[#777777]">Phim này:</span> Gay cấn, Ly kỳ, Điện ảnh
            </p>
          </aside>
        </div>

        <section className="px-[clamp(20px,4vw,48px)]">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h3 className="text-[24px] font-bold leading-[30px]">Tập</h3>
            <span className="text-sm text-[#b3b3b3]">{movie.title}</span>
          </div>
          <div className="divide-y divide-[#333333] overflow-hidden rounded-sm border border-[#333333]">
            {episodes.map((episode, index) => (
              <article key={episode.title} className={`grid gap-4 p-4 transition-colors hover:bg-[#232323] sm:grid-cols-[32px_160px_1fr] ${index === 0 ? "bg-[#232323]" : ""}`}>
                <div className="self-center text-center text-xl text-[#b3b3b3]">{index + 1}</div>
                <div className="relative aspect-video overflow-hidden rounded-sm bg-[#141414]">
                  <Image src={episode.image} alt={episode.title} fill sizes="160px" className="object-cover" />
                  <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                    <Icon name="play" className="h-9 w-9 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <h4 className="font-bold">{episode.title}</h4>
                    <span className="shrink-0 text-sm text-[#b3b3b3]">{episode.duration}</span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-relaxed text-[#b3b3b3]">{episode.synopsis}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 px-[clamp(20px,4vw,48px)]">
          <h3 className="mb-4 text-[24px] font-bold leading-[30px]">Nội dung tương tự</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-sm bg-[#232323]">
                <div className="relative aspect-video">
                  <Image src={item.image} alt={item.title} fill sizes="280px" className="object-cover" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#e5e5e5]">
                      <span>{item.match}% phù hợp</span>
                      <MaturityBadge rating={item.maturity} />
                      <QualityBadge quality={item.quality} />
                    </div>
                    <RoundButton icon="plus" label="Danh sách của tôi" size="sm" />
                  </div>
                  <h4 className="font-bold">{item.title}</h4>
                  <p className="line-clamp-3 text-sm leading-relaxed text-[#b3b3b3]">
                    Một câu chuyện đầy bất ngờ với nhịp kể nhanh, nhân vật có bí mật riêng và nhiều ngã rẽ khó đoán.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 px-[clamp(20px,4vw,48px)] text-sm leading-relaxed">
          <h3 className="mb-4 text-[24px] font-bold leading-[30px]">
            Giới thiệu về <strong>{movie.title}</strong>
          </h3>
          <p>
            <span className="text-[#777777]">Đạo diễn:</span> Nguyen An
          </p>
          <p>
            <span className="text-[#777777]">Thể loại:</span> {movie.genres.join(", ")}, Chính kịch, Hành động và phiêu lưu
          </p>
          <p>
            <span className="text-[#777777]">Xếp hạng độ tuổi:</span> {movie.maturity}
          </p>
        </section>
      </section>
    </div>
  );
}

function Browse({
  activeProfile,
  onProfileChange,
}: {
  activeProfile: Profile;
  onProfileChange: (profile: Profile) => void;
}) {
  const [accountProfiles] = useState(getStoredProfiles);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [dbCollectionsMovies, setDbCollectionsMovies] = useState<Map<string, Movie[]>>(new Map());
  const [dbCollections, setDbCollections] = useState<{ slug: string; name: string }[]>([]);
  const previewOpenTimer = useRef<number | null>(null);
  const previewHideTimer = useRef<number | null>(null);
  const previewRemoveTimer = useRef<number | null>(null);
  const currentActivePopup = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/collections')
      .then((res) => res.json())
      .then((data) => {
        if (data.collections && data.collections.length > 0) {
          setDbCollections(data.collections);
          const moviesMap = new Map<string, Movie[]>();
          
          return Promise.all(
            data.collections.map(async (col: { slug: string }) => {
              const res = await fetch(`/api/movies?collection=${col.slug}&limit=50`);
              const result = await res.json();
              
              if (result.movies) {
                const movies: Movie[] = result.movies.map((m: any) => ({
                  id: m.slug,
                  title: m.name,
                  image: m.posterUrl || m.thumbUrl || '/placeholder.jpg',
                  match: 85,
                  maturity: 'T16',
                  duration: m.time || '45 phút',
                  quality: m.quality || 'HD',
                  genres: m.tags?.filter((t: any) => t.group === 'Thể loại').map((t: any) => t.name) || [],
                  isNew: false,
                }));
                moviesMap.set(col.slug, movies);
              }
            })
          ).then(() => {
            setDbCollectionsMovies(moviesMap);
          });
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải dữ liệu từ DB:', err);
      });
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setSeedResult(`✓ ${data.addedMovies} mới, ${data.updatedMovies} cập nhật, ${data.episodesUpserted} tập`);
        
        const colRes = await fetch('/api/collections');
        const colData = await colRes.json();
        if (colData.collections) {
          setDbCollections(colData.collections);
          
          const moviesMap = new Map<string, Movie[]>();
          
          await Promise.all(
            colData.collections.map(async (col: { slug: string }) => {
              const res = await fetch(`/api/movies?collection=${col.slug}&limit=50`);
              const result = await res.json();
              
              if (result.movies) {
                const movies: Movie[] = result.movies.map((m: any) => ({
                  id: m.slug,
                  title: m.name,
                  image: m.posterUrl || m.thumbUrl || '/placeholder.jpg',
                  match: 85,
                  maturity: 'T16',
                  duration: m.time || '45 phút',
                  quality: m.quality || 'HD',
                  genres: m.tags?.filter((t: any) => t.group === 'Thể loại').map((t: any) => t.name) || [],
                  isNew: false,
                }));
                moviesMap.set(col.slug, movies);
              }
            })
          );
          
          setDbCollectionsMovies(moviesMap);
        }
      } else {
        setSeedResult('Lỗi: ' + (data.error || 'Không xác định'));
      }
    } catch (err) {
      setSeedResult('Lỗi kết nối');
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedResult(null), 5000);
    }
  };

  const keepPreviewOpen = () => {
    if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current);
    if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current);
  };

  const fadePreviewOut = (removeDelay = 300) => {
    if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current);
    if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current);
    if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current);
    currentActivePopup.current = null;
    setPreview((value) => (value ? { ...value, active: false } : value));
    previewRemoveTimer.current = window.setTimeout(() => setPreview(null), removeDelay);
  };

  const closePreview = () => {
    if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current);
    if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current);
    previewHideTimer.current = window.setTimeout(() => fadePreviewOut(), 300);
  };

  const closePreviewNow = () => {
    fadePreviewOut();
  };

  const openPreview = (movie: Movie, rect: DOMRect) => {
    if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current);
    if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current);
    if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current);
    if (currentActivePopup.current && currentActivePopup.current !== movie.id) {
      setPreview((value) => (value ? { ...value, active: false } : value));
      currentActivePopup.current = null;
    }
    const width = Math.min(Math.max(window.innerWidth * 0.34, 360), 433, window.innerWidth - 32);
    const height = width * 0.5625 + 148;
    const centeredLeft = rect.left + window.scrollX + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(window.scrollX + 16, centeredLeft), window.scrollX + window.innerWidth - width - 16);
    const preferredTop = rect.top + window.scrollY - 52;
    const top = Math.min(Math.max(window.scrollY + 76, preferredTop), Math.max(window.scrollY + 76, window.scrollY + window.innerHeight - height - 16));
    previewOpenTimer.current = window.setTimeout(() => {
      currentActivePopup.current = movie.id;
      setPreview({ movie, top, left, width, active: true });
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current);
      if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current);
      if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#141414] pb-16 text-white">
      <TopNav
        activeProfile={activeProfile}
        accountProfiles={accountProfiles}
        onProfileChange={onProfileChange}
        onSeed={handleSeed}
        seeding={seeding}
        seedResult={seedResult}
      />
      <HeroBillboard />
      <div className="-mt-[7vw] space-y-[1vw]">
        {dbCollections.length > 0 ? (
          dbCollections.map((col) => {
            const movies = dbCollectionsMovies.get(col.slug) || [];
            if (movies.length === 0) return null;
            
            return (
              <MovieRow
                key={col.slug}
                title={col.name}
                movies={movies}
                onExpand={(movie) => {
                  setPreview(null);
                  setDetailMovie(movie);
                }}
                onPreview={openPreview}
                onPreviewEnd={closePreview}
              />
            );
          })
        ) : (
          movieRows.map((row) => (
            <MovieRow
              key={row.id}
              title={row.title}
              movies={row.movies}
              onExpand={(movie) => {
                setPreview(null);
                setDetailMovie(movie);
              }}
              onPreview={openPreview}
              onPreviewEnd={closePreview}
            />
          ))
        )}
      </div>
      {preview ? (
        <MiniPreviewModal
          preview={preview}
          onKeepOpen={keepPreviewOpen}
          onPreviewEnd={closePreviewNow}
          onExpand={(movie) => {
            closePreviewNow();
            setDetailMovie(movie);
          }}
        />
      ) : null}
      {detailMovie ? <DetailModal movie={detailMovie} onClose={() => setDetailMovie(null)} /> : null}
    </main>
  );
}

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [activeProfile, setActiveProfile] = useState(profiles[0]);

  const enterBrowse = (profile: Profile) => {
    setActiveProfile(profile);
    setEntered(true);
  };

  return entered ? <Browse activeProfile={activeProfile} onProfileChange={setActiveProfile} /> : <ProfileGate onEnter={enterBrowse} />;
}
