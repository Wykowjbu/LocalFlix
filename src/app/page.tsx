"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { featuredMovie, movieRows, profileAvatars, profiles, type Movie, type Profile } from "@/data/netflix";
import { ACTIVE_PROFILE_STORAGE_KEY, getStoredActiveProfileId, getStoredSession, saveStoredActiveProfileId, SESSION_STORAGE_KEY } from "@/lib/session";
import { mapDbMovie, type DbMovie } from "@/lib/movie-format";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "play"
    | "info"
    | "plus"
    | "like"
    | "dislike"
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
    dislike: "M7 10v10H4V10h3Zm3.2 10H8V9.4L12.7 3l1.1.8c.4.3.6.8.5 1.3l-.7 3.4H20c.7 0 1.2.6 1 1.3l-1.6 8.1c-.2 1.2-1.2 2.1-2.4 2.1h-6.8Z",
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

type DbCollection = {
  slug: string;
  name: string;
};

function getStoredProfiles() {
  if (typeof window === "undefined") return profiles;

  const session = getStoredSession();
  if (session?.profiles.length) return session.profiles;

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

function saveStoredProfiles(nextProfiles: Profile[]) {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles));

  const session = getStoredSession();
  if (session) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...session, profiles: nextProfiles }));
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
    saveStoredProfiles(nextProfiles);
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
  onSearch,
  onLogout,
  onSeed,
  onSeedForce,
  seeding,
  seedResult,
}: {
  activeProfile: Profile;
  accountProfiles: Profile[];
  onProfileChange: (profile: Profile) => void;
  onSearch: (query: string) => void;
  onLogout: () => void;
  onSeed: () => void;
  onSeedForce: () => void;
  seeding: boolean;
  seedResult: string | null;
}) {
  const [solid, setSolid] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [confirmForceSync, setConfirmForceSync] = useState(false);
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
    onSearch(query);
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
      <div className="flex items-center gap-3">
        <div className={`flex h-9 items-center overflow-hidden border border-white/40 bg-black/55 transition-all duration-200 ${
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
                onSearch("");
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

function HeroBillboard({ heroMovie, onPlay, onInfo }: { heroMovie?: Movie | null; onPlay?: (slug: string) => void; onInfo?: (movie: Movie) => void }) {
  const hero = heroMovie || null;
  const heroImage = hero?.image || featuredMovie.image;
  const heroTitle = hero?.title || featuredMovie.title;
  const heroSynopsis = hero ? "" : featuredMovie.synopsis;
  const heroLabel = hero ? "LOCALFLIX" : featuredMovie.label;

  return (
    <section className="relative min-h-[620px] overflow-hidden md:h-[80vh]">
      <div className="absolute inset-0">
        <Image src={heroImage} alt={heroTitle} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#141414] to-transparent" />
      </div>
      <div className="relative z-10 flex h-full min-h-[620px] max-w-[754px] flex-col justify-end px-[4%] pb-[12vw] pt-32 md:pb-[8vw]">
        <p className="mb-3 text-[14px] font-bold leading-[18px] tracking-[0.28em] text-[#e50914]">{heroLabel}</p>
        <h1 className="text-[clamp(42px,6vw,88px)] font-black leading-[0.95] tracking-normal text-white">{heroTitle}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[16px] leading-[24px] text-[#bcbcbc]">
          <span className="font-medium tracking-[0.5px] text-[#46d369]">New</span>
          {hero ? <QualityBadge quality={hero.quality} /> : (
            <><span>2026</span><span>3 Seasons</span><QualityBadge quality="HD" /></>
          )}
        </div>
        {!hero && (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MaturityBadge rating="TV-MA" />
              <span className="text-[14px] leading-[18px] text-white">violence, language</span>
            </div>
            <div className="mt-[14px]">
              <TopTenLabel rank={2} />
            </div>
          </>
        )}
        {heroSynopsis && <p className="mt-4 max-w-[481px] text-[16px] leading-[26px] text-white">{heroSynopsis}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => { if (hero && onPlay) onPlay(hero.id); }} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-white px-7 py-2.5 text-[16px] font-bold text-black transition-colors hover:bg-[#c2c2c2]">
            <Icon name="play" /> Phát
          </button>
          <button onClick={() => { if (hero && onInfo) onInfo(hero); }} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-[rgba(109,109,110,.7)] px-7 py-2.5 text-[16px] font-bold text-white transition-colors hover:bg-[rgba(109,109,110,.9)]">
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
  icon: "play" | "plus" | "like" | "dislike" | "chevron" | "check" | "volume" | "x";
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
      <Icon name={icon} className={icon === "chevron" ? "h-5 w-5 rotate-90" : icon === "dislike" ? "h-5 w-5 rotate-180" : "h-5 w-5"} />
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
  favoriteSlugs,
  likedSlugs,
  dislikedSlugs,
  onToggleFavorite,
  onToggleLike,
  onToggleDislike,
  onPlay,
}: {
  movie: Movie;
  onExpand: (movie: Movie) => void;
  onPreview: (movie: Movie, rect: DOMRect) => void;
  onPreviewEnd: () => void;
  variant?: "standard" | "top10";
  rank?: number;
  favoriteSlugs?: Set<string>;
  likedSlugs?: Set<string>;
  dislikedSlugs?: Set<string>;
  onToggleFavorite?: (movie: Movie) => void;
  onToggleLike?: (movie: Movie) => void;
  onToggleDislike?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
}) {
  const isTop10 = variant === "top10";
  const isFav = favoriteSlugs?.has(movie.id) ?? false;
  const isLiked = likedSlugs?.has(movie.id) ?? false;
  const isDisliked = dislikedSlugs?.has(movie.id) ?? false;

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
              <RoundButton icon="play" label="Phát" filled onClick={() => onPlay?.(movie)} />
              <RoundButton icon={isFav ? "check" : "plus"} label="Danh sách của tôi" onClick={() => onToggleFavorite?.(movie)} />
              <RoundButton icon="like" label="Thích" filled={isLiked} onClick={() => onToggleLike?.(movie)} />
              <RoundButton icon="dislike" label="Không thích" filled={isDisliked} onClick={() => onToggleDislike?.(movie)} />
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
  favoriteSlugs,
  likedSlugs,
  dislikedSlugs,
  onToggleFavorite,
  onToggleLike,
  onToggleDislike,
  onPlay,
}: {
  title: string;
  movies: Movie[];
  onExpand: (movie: Movie) => void;
  onPreview: (movie: Movie, rect: DOMRect) => void;
  onPreviewEnd: () => void;
  favoriteSlugs?: Set<string>;
  likedSlugs?: Set<string>;
  dislikedSlugs?: Set<string>;
  onToggleFavorite?: (movie: Movie) => void;
  onToggleLike?: (movie: Movie) => void;
  onToggleDislike?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
}) {
  const [trackPage, setTrackPage] = useState(1);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const isTop10Row = title.toLowerCase().includes("top 10");
  const pageSize = 6;
  const pages = Array.from({ length: Math.max(1, Math.ceil(movies.length / pageSize)) }, (_, pageIndex) =>
    movies.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
  );
  const pageCount = pages.length;
  const loopPages = pageCount > 1 ? [pages[pageCount - 1], ...pages, pages[0]] : pages;
  const activePage = pageCount > 1 ? (trackPage - 1 + pageCount) % pageCount : 0;

  const handleLoopSnap = () => {
    if (pageCount <= 1) return;
    if (trackPage === 0) {
      setTransitionEnabled(false);
      setTrackPage(pageCount);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setTransitionEnabled(true));
      });
    }
    if (trackPage === pageCount + 1) {
      setTransitionEnabled(false);
      setTrackPage(1);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setTransitionEnabled(true));
      });
    }
  };

  const goBack = () => {
    if (pageCount <= 1) return;
    setTransitionEnabled(true);
    setTrackPage((value) => value - 1);
  };

  const goNext = () => {
    if (pageCount <= 1) return;
    setTransitionEnabled(true);
    setTrackPage((value) => value + 1);
  };
  const visibleTrackPage = pageCount > 1 ? Math.min(trackPage, pageCount + 1) : 0;

  return (
    <section className="slider-row group/row relative py-[1.6vw]">
      <div className="mb-2 flex items-end gap-2 px-[4%]">
        <h2 className="text-[clamp(18px,1.4vw,24px)] font-bold leading-tight">{title}</h2>
        <ul className="ml-auto hidden items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/row:flex group-hover/row:opacity-100" aria-hidden="true">
          {Array.from({ length: pageCount }, (_, index) => (
            <li key={index} className={`h-0.5 w-3 ${index === activePage ? "bg-[#aaa]" : "bg-[#4d4d4d]"}`} />
          ))}
        </ul>
      </div>
      <div className="relative overflow-x-clip overflow-y-visible py-12 -my-12">
        <div
          className={`flex ease-[cubic-bezier(.5,0,.1,1)] ${transitionEnabled ? "transition-transform duration-700" : ""}`}
          style={{ transform: `translateX(calc(${visibleTrackPage} * -100%))` }}
          onTransitionEnd={handleLoopSnap}
        >
          {loopPages.map((pageMovies, loopIndex) => {
            const pageOffset =
              pageCount > 1
                ? loopIndex === 0
                  ? (pageCount - 1) * pageSize
                  : loopIndex === loopPages.length - 1
                    ? 0
                    : (loopIndex - 1) * pageSize
                : 0;

            return (
              <div key={`${title}-${loopIndex}`} className="flex min-w-full gap-2 px-[4%]">
                {pageMovies.map((movie, index) => (
                  <MovieCard
                    key={`${loopIndex}-${movie.id}`}
                    movie={movie}
                    onExpand={onExpand}
                    onPreview={onPreview}
                    onPreviewEnd={onPreviewEnd}
                    variant={isTop10Row ? "top10" : "standard"}
                    rank={pageOffset + index + 1}
                    favoriteSlugs={favoriteSlugs}
                    likedSlugs={likedSlugs}
                    dislikedSlugs={dislikedSlugs}
                    onToggleFavorite={onToggleFavorite}
                    onToggleLike={onToggleLike}
                    onToggleDislike={onToggleDislike}
                    onPlay={onPlay}
                  />
                ))}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Xem video trước"
          disabled={pageCount <= 1}
          onClick={goBack}
          className={`absolute left-0 top-12 bottom-12 z-20 grid w-[4%] min-w-10 cursor-pointer place-items-center bg-black/45 text-white opacity-0 transition-opacity duration-200 ${
            pageCount > 1 ? "group-hover/row:opacity-100 hover:bg-black/65" : "pointer-events-none"
          }`}
        >
          <Icon name="chevron" className="h-10 w-10 rotate-180 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]" />
        </button>
        <button
          type="button"
          aria-label="Xem video khác"
          disabled={pageCount <= 1}
          onClick={goNext}
          className={`absolute right-0 top-12 bottom-12 z-20 grid w-[4%] min-w-10 cursor-pointer place-items-center bg-black/45 text-white opacity-0 transition-opacity duration-200 ${
            pageCount > 1 ? "group-hover/row:opacity-100 hover:bg-black/65" : "pointer-events-none"
          }`}
        >
          <Icon name="chevron" className="h-10 w-10 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]" />
        </button>
      </div>
    </section>
  );
}

function SearchResultsGrid({
  query,
  movies,
  searching,
  onExpand,
  onPreview,
  onPreviewEnd,
  favoriteSlugs,
  likedSlugs,
  dislikedSlugs,
  onToggleFavorite,
  onToggleLike,
  onToggleDislike,
  onPlay,
}: {
  query: string;
  movies: Movie[];
  searching: boolean;
  onExpand: (movie: Movie) => void;
  onPreview: (movie: Movie, rect: DOMRect) => void;
  onPreviewEnd: () => void;
  favoriteSlugs?: Set<string>;
  likedSlugs?: Set<string>;
  dislikedSlugs?: Set<string>;
  onToggleFavorite?: (movie: Movie) => void;
  onToggleLike?: (movie: Movie) => void;
  onToggleDislike?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
}) {
  return (
    <section className="min-h-screen px-[4%] pb-16 pt-[120px]">
      <div className="mb-8 flex flex-wrap items-end gap-x-3 gap-y-2">
        <h1 className="text-[clamp(22px,2.2vw,32px)] font-medium leading-tight">
          Kết quả tìm kiếm cho <span className="font-bold">&quot;{query}&quot;</span>
        </h1>
        <span className="text-sm text-[#a3a3a3]">
          {searching ? "Đang tìm..." : `${movies.length} kết quả`}
        </span>
      </div>

      {searching ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="aspect-video animate-pulse rounded-sm bg-[#232323]" />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onExpand={onExpand}
              onPreview={onPreview}
              onPreviewEnd={onPreviewEnd}
              favoriteSlugs={favoriteSlugs}
              likedSlugs={likedSlugs}
              dislikedSlugs={dislikedSlugs}
              onToggleFavorite={onToggleFavorite}
              onToggleLike={onToggleLike}
              onToggleDislike={onToggleDislike}
              onPlay={onPlay}
            />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl text-[16px] leading-7 text-[#b3b3b3]">
          Không tìm thấy kết quả. Thử tên phim, tên tiếng Anh, diễn viên, đạo diễn, quốc gia hoặc thể loại khác.
        </div>
      )}
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
  favoriteSlugs,
  likedSlugs,
  dislikedSlugs,
  onToggleFavorite,
  onToggleLike,
  onToggleDislike,
  onPlay,
}: {
  preview: PreviewState;
  onExpand: (movie: Movie) => void;
  onKeepOpen: () => void;
  onPreviewEnd: () => void;
  favoriteSlugs?: Set<string>;
  likedSlugs?: Set<string>;
  dislikedSlugs?: Set<string>;
  onToggleFavorite?: (movie: Movie) => void;
  onToggleLike?: (movie: Movie) => void;
  onToggleDislike?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
}) {
  const { movie, top, left, width } = preview;
  const isFav = favoriteSlugs?.has(movie.id) ?? false;
  const isLiked = likedSlugs?.has(movie.id) ?? false;
  const isDisliked = dislikedSlugs?.has(movie.id) ?? false;

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
            <RoundButton icon="play" label="Phát" filled size="sm" onClick={() => onPlay?.(movie)} />
            <RoundButton icon={isFav ? "check" : "plus"} label="Danh sách của tôi" size="sm" onClick={() => onToggleFavorite?.(movie)} />
            <RoundButton icon="like" label="Thích" size="sm" filled={isLiked} onClick={() => onToggleLike?.(movie)} />
            <RoundButton icon="dislike" label="Không thích" size="sm" filled={isDisliked} onClick={() => onToggleDislike?.(movie)} />
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

type DetailEpisode = { id: string; name: string; slug: string; serverName: string; embedUrl: string | null; m3u8Url: string | null };
type MovieDetail = {
  slug: string; name: string; originalName?: string | null; description?: string | null;
  casts?: string | null; director?: string | null; totalEpisodes?: number | null;
  currentEpisode?: string | null; time?: string | null; quality?: string | null;
  language?: string | null; thumbUrl?: string | null; posterUrl?: string | null;
  tags?: { name: string; group: string }[]; episodes?: DetailEpisode[];
};

function DetailModal({
  movie, onClose, onSearch, onPlay, isFavorite, isLiked, isDisliked, onToggleFavorite, onToggleLike, onToggleDislike,
}: {
  movie: Movie; onClose: () => void; onSearch?: (keyword: string) => void;
  onPlay?: (slug: string, episodeSlug?: string) => void;
  isFavorite?: boolean; isLiked?: boolean; isDisliked?: boolean;
  onToggleFavorite?: () => void; onToggleLike?: () => void; onToggleDislike?: () => void;
}) {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      setLoading(true);
      fetch(`/api/movies?slug=${encodeURIComponent(movie.id)}&withEpisodes=true`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && data.movie) setDetail(data.movie);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [movie.id]);

  const episodes = detail?.episodes || [];
  const casts = detail?.casts || "";
  const director = detail?.director || "";
  const description = detail?.description || "";
  const genres = detail?.tags?.filter((t) => t.group === "Thể loại").map((t) => t.name) || movie.genres;
  const totalEps = detail?.totalEpisodes;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/70 px-3 py-8 md:px-8" onMouseDown={onClose}>
      <section
        role="dialog" aria-modal="true" aria-label={movie.title} tabIndex={-1}
        className="mx-auto min-h-[80vh] w-[92vw] max-w-[850px] overflow-hidden rounded-md bg-[#181818] pb-8 text-white shadow-[0_3px_10px_rgba(0,0,0,.75)] outline-none"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-video min-h-[300px] overflow-hidden bg-[#141414]">
          <Image src={movie.image} alt={movie.title} fill sizes="92vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/20 to-transparent" />
          <button type="button" aria-label="Đóng" onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#181818] text-white transition-colors hover:bg-[#232323]">
            <Icon name="x" />
          </button>
          <div className="absolute bottom-[8%] left-[clamp(20px,4vw,48px)] right-[clamp(20px,4vw,48px)]">
            <div className="mb-2 text-[14px] font-bold leading-[18px] tracking-[0.28em] text-[#e50914]">LOCALFLIX</div>
            <h2 className="max-w-[75%] text-[clamp(34px,6vw,72px)] font-black leading-none">{movie.title}</h2>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => onPlay?.(movie.id)} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-white px-7 py-2.5 text-[16px] font-bold text-black transition-colors hover:bg-[#c2c2c2]">
                <Icon name="play" /> Phát
              </button>
              <RoundButton icon={isFavorite ? "check" : "plus"} label="Danh sách của tôi" onClick={onToggleFavorite} />
              <RoundButton icon="like" label="Thích" filled={isLiked} onClick={onToggleLike} />
              <RoundButton icon="dislike" label="Không thích" filled={isDisliked} onClick={onToggleDislike} />
              <div className="ml-auto hidden opacity-60 sm:block"><RoundButton icon="volume" label="Bật âm thanh" /></div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-[clamp(20px,4vw,48px)] py-8 md:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[#e5e5e5]">
              <span className="font-bold text-[#46d369]">{movie.match}% phù hợp</span>
              {totalEps && <span>{totalEps} tập</span>}
              <QualityBadge quality={detail?.quality || movie.quality} />
              <MaturityBadge rating={movie.maturity} />
              {detail?.language && <span>{detail.language}</span>}
            </div>
            <p className="text-[clamp(15px,1.5vw,18px)] leading-relaxed text-white">
              {loading ? "Đang tải..." : (description || "Chưa có mô tả.")}
            </p>
          </div>
          <aside className="space-y-3 text-sm leading-relaxed text-white">
            {casts && (
              <p><span className="text-[#777777]">Diễn viên: </span>
                {casts.split(",").map((cast, i) => (<span key={i}>{i > 0 && ", "}<button type="button" className="cursor-pointer text-white underline-offset-2 hover:underline" onClick={() => { onSearch?.(cast.trim()); onClose(); }}>{cast.trim()}</button></span>))}
              </p>
            )}
            <p><span className="text-[#777777]">Thể loại: </span>
              {genres.map((genre, i) => (<span key={i}>{i > 0 && ", "}<button type="button" className="cursor-pointer text-white underline-offset-2 hover:underline" onClick={() => { onSearch?.(genre); onClose(); }}>{genre}</button></span>))}
            </p>
            {director && (
              <p><span className="text-[#777777]">Đạo diễn: </span>
                <button type="button" className="cursor-pointer text-white underline-offset-2 hover:underline" onClick={() => { onSearch?.(director); onClose(); }}>{director}</button>
              </p>
            )}
          </aside>
        </div>

        {episodes.length > 0 && (
          <section className="px-[clamp(20px,4vw,48px)]">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h3 className="text-[24px] font-bold leading-[30px]">Tập</h3>
              <span className="text-sm text-[#b3b3b3]">{movie.title}</span>
            </div>
            <div className="divide-y divide-[#333333] overflow-hidden rounded-sm border border-[#333333]">
              {episodes.map((ep, index) => (
                <article key={ep.id} className={`grid cursor-pointer gap-4 p-4 transition-colors hover:bg-[#232323] sm:grid-cols-[32px_160px_1fr] ${index === 0 ? "bg-[#232323]" : ""}`} onClick={() => onPlay?.(movie.id, ep.slug)}>
                  <div className="self-center text-center text-xl text-[#b3b3b3]">{index + 1}</div>
                  <div className="relative aspect-video overflow-hidden rounded-sm bg-[#141414]">
                    <Image src={movie.image} alt={ep.name} fill sizes="160px" className="object-cover" />
                    <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition-opacity hover:opacity-100"><Icon name="play" className="h-9 w-9 text-white" /></div>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <h4 className="font-bold">Tập {ep.name}</h4>
                      <span className="shrink-0 text-xs text-[#808080]">{ep.serverName}</span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-[#b3b3b3]">{ep.m3u8Url ? "Có sẵn để phát" : "Chưa có link phát"}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 px-[clamp(20px,4vw,48px)] text-sm leading-relaxed">
          <h3 className="mb-4 text-[24px] font-bold leading-[30px]">Giới thiệu về <strong>{movie.title}</strong></h3>
          {director && <p><span className="text-[#777777]">Đạo diễn:</span> {director}</p>}
          {casts && <p><span className="text-[#777777]">Diễn viên:</span> {casts}</p>}
          <p><span className="text-[#777777]">Thể loại:</span> {genres.join(", ")}</p>
          <p><span className="text-[#777777]">Xếp hạng độ tuổi:</span> {movie.maturity}</p>
        </section>
      </section>
    </div>
  );
}

function Browse({ activeProfile, onProfileChange }: { activeProfile: Profile; onProfileChange: (profile: Profile) => void }) {
  const router = useRouter();
  const [accountProfiles] = useState(getStoredProfiles);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [dbCollectionsMovies, setDbCollectionsMovies] = useState<Map<string, Movie[]>>(new Map());
  const [dbCollections, setDbCollections] = useState<{ slug: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const [likedSlugs, setLikedSlugs] = useState<Set<string>>(new Set());
  const [dislikedSlugs, setDislikedSlugs] = useState<Set<string>>(new Set());
  const [myListMovies, setMyListMovies] = useState<Movie[]>([]);
  const [continueWatchingMovies, setContinueWatchingMovies] = useState<Movie[]>([]);
  const previewOpenTimer = useRef<number | null>(null);
  const previewHideTimer = useRef<number | null>(null);
  const previewRemoveTimer = useRef<number | null>(null);
  const currentActivePopup = useRef<string | null>(null);

  const loadInteractions = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/interactions?profileId=${profileId}`);
      const data = await res.json();
      if (data.favoriteSlugs) setFavoriteSlugs(new Set(data.favoriteSlugs));
      if (data.likedSlugs) setLikedSlugs(new Set(data.likedSlugs));
      if (data.dislikedSlugs) setDislikedSlugs(new Set(data.dislikedSlugs));
    } catch {}
  }, []);

  const loadMyList = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/movies?favoritesProfileId=${profileId}`);
      const data = await res.json();
      if (data.movies) setMyListMovies((data.movies as DbMovie[]).map(mapDbMovie));
    } catch {}
  }, []);

  const loadContinueWatching = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/movies?historyProfileId=${profileId}`);
      const data = await res.json();
      if (data.movies) setContinueWatchingMovies((data.movies as DbMovie[]).map(mapDbMovie));
    } catch {}
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      loadInteractions(activeProfile.id);
      loadMyList(activeProfile.id);
      loadContinueWatching(activeProfile.id);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeProfile.id, loadInteractions, loadMyList, loadContinueWatching]);

  useEffect(() => {
    fetch('/api/collections')
      .then((res) => res.json())
      .then((data) => {
        if (data.collections && data.collections.length > 0) {
          setDbCollections(data.collections);
          const moviesMap = new Map<string, Movie[]>();
          return Promise.all(
            data.collections.map(async (col: DbCollection) => {
              const res = await fetch(`/api/movies?collection=${col.slug}&limit=50`);
              const result = await res.json();
              if (result.movies) moviesMap.set(col.slug, (result.movies as DbMovie[]).map(mapDbMovie));
            })
          ).then(() => setDbCollectionsMovies(moviesMap));
        }
      })
      .catch((err) => console.error('Lỗi khi tải dữ liệu từ DB:', err));
  }, []);

  const handleToggleFavorite = useCallback(async (movie: Movie) => {
    const slug = movie.id;
    const isCurrentlyFav = favoriteSlugs.has(slug);
    setFavoriteSlugs((prev) => {
      const next = new Set(prev);
      if (isCurrentlyFav) next.delete(slug);
      else next.add(slug);
      return next;
    });
    try {
      await fetch('/api/interactions/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile.id, movieSlug: slug, enabled: !isCurrentlyFav }) });
      loadMyList(activeProfile.id);
    } catch {
      setFavoriteSlugs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFav) next.add(slug);
        else next.delete(slug);
        return next;
      });
    }
  }, [activeProfile.id, favoriteSlugs, loadMyList]);

  const handleToggleLike = useCallback(async (movie: Movie) => {
    const slug = movie.id;
    const isCurrentlyLiked = likedSlugs.has(slug);
    const wasDisliked = dislikedSlugs.has(slug);
    setLikedSlugs((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (!isCurrentlyLiked) {
      setDislikedSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
    try {
      await fetch('/api/interactions/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile.id, movieSlug: slug, value: isCurrentlyLiked ? null : 'like' }) });
    } catch {
      setLikedSlugs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(slug);
        else next.delete(slug);
        return next;
      });
      if (wasDisliked) {
        setDislikedSlugs((prev) => {
          const next = new Set(prev);
          next.add(slug);
          return next;
        });
      }
    }
  }, [activeProfile.id, dislikedSlugs, likedSlugs]);

  const handleToggleDislike = useCallback(async (movie: Movie) => {
    const slug = movie.id;
    const isCurrentlyDisliked = dislikedSlugs.has(slug);
    const wasLiked = likedSlugs.has(slug);
    setDislikedSlugs((prev) => {
      const next = new Set(prev);
      if (isCurrentlyDisliked) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (!isCurrentlyDisliked) {
      setLikedSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
    try {
      await fetch('/api/interactions/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile.id, movieSlug: slug, value: isCurrentlyDisliked ? null : 'dislike' }) });
    } catch {
      setDislikedSlugs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyDisliked) next.add(slug);
        else next.delete(slug);
        return next;
      });
      if (wasLiked) {
        setLikedSlugs((prev) => {
          const next = new Set(prev);
          next.add(slug);
          return next;
        });
      }
    }
  }, [activeProfile.id, dislikedSlugs, likedSlugs]);

  const handlePlay = useCallback((movie: Movie) => {
    router.push(`/watch?movie=${movie.id}`);
  }, [router]);

  const handlePlaySlug = useCallback((slug: string, episodeSlug?: string) => {
    router.push(`/watch?movie=${slug}${episodeSlug ? `&episode=${episodeSlug}` : ''}`);
  }, [router]);

  const handleProfileChange = useCallback((profile: Profile) => {
    saveStoredActiveProfileId(profile.id);
    onProfileChange(profile);
  }, [onProfileChange]);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
    window.localStorage.removeItem("localflix.profiles");
    router.replace("/login");
  }, [router]);

  const handleSeed = async () => {
    setSeeding(true); setSeedResult(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' }); const data = await res.json();
      if (!res.ok) { setSeedResult('Lỗi: ' + (data.error || `HTTP ${res.status}`)); return; }
      if (data.success) {
        setSeedResult(`Đã sync: ${data.addedMovies} mới, ${data.updatedMovies} cập nhật, ${data.episodesCreated} tập mới${data.errorCount ? `, ${data.errorCount} lỗi đã skip` : ''}`);
        const colRes = await fetch('/api/collections'); const colData = await colRes.json();
        if (colData.collections) {
          setDbCollections(colData.collections);
          const moviesMap = new Map<string, Movie[]>();
          await Promise.all(colData.collections.map(async (col: DbCollection) => {
            const r = await fetch(`/api/movies?collection=${col.slug}&limit=50`); const result = await r.json();
            if (result.movies) moviesMap.set(col.slug, (result.movies as DbMovie[]).map(mapDbMovie));
          }));
          setDbCollectionsMovies(moviesMap);
        }
      } else { setSeedResult('Lỗi: ' + (data.error || 'Không xác định')); }
    } catch { setSeedResult('Lỗi kết nối'); }
    finally { setSeeding(false); setTimeout(() => setSeedResult(null), 5000); }
  };

  const handleSeedForce = async () => {
    setSeeding(true); setSeedResult(null);
    try {
      const res = await fetch('/api/seed?force=true', { method: 'POST' }); const data = await res.json();
      if (!res.ok) { setSeedResult('Lỗi: ' + (data.error || `HTTP ${res.status}`)); return; }
      if (data.success) {
        setSeedResult(`Full sync: ${data.addedMovies} mới, ${data.updatedMovies} cập nhật, ${data.pagesSynced} pages${data.errorCount ? `, ${data.errorCount} lỗi đã skip` : ''}`);
        const colRes = await fetch('/api/collections'); const colData = await colRes.json();
        if (colData.collections) {
          setDbCollections(colData.collections);
          const moviesMap = new Map<string, Movie[]>();
          await Promise.all(colData.collections.map(async (col: DbCollection) => {
            const r = await fetch(`/api/movies?collection=${col.slug}&limit=50`); const result = await r.json();
            if (result.movies) moviesMap.set(col.slug, (result.movies as DbMovie[]).map(mapDbMovie));
          }));
          setDbCollectionsMovies(moviesMap);
        }
      } else { setSeedResult('Lỗi: ' + (data.error || 'Không xác định')); }
    } catch { setSeedResult('Lỗi kết nối'); }
    finally { setSeeding(false); setTimeout(() => setSeedResult(null), 10000); }
  };

  const handleSearch = async (query: string) => {
    const nextQuery = query.trim(); setSearchQuery(nextQuery); setPreview(null);
    if (!nextQuery) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/movies?q=${encodeURIComponent(nextQuery)}&limit=60`);
      const data = await res.json();
      setSearchResults(data.movies ? (data.movies as DbMovie[]).map(mapDbMovie) : []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const keepPreviewOpen = () => { if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current); };
  const fadePreviewOut = (removeDelay = 300) => { if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current); if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current); currentActivePopup.current = null; setPreview((v) => (v ? { ...v, active: false } : v)); previewRemoveTimer.current = window.setTimeout(() => setPreview(null), removeDelay); };
  const closePreview = () => { if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current); if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); previewHideTimer.current = window.setTimeout(() => fadePreviewOut(), 300); };
  const closePreviewNow = () => { fadePreviewOut(); };
  const openPreview = (movie: Movie, rect: DOMRect) => {
    if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current); if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current);
    if (currentActivePopup.current && currentActivePopup.current !== movie.id) { setPreview((v) => (v ? { ...v, active: false } : v)); currentActivePopup.current = null; }
    const width = Math.min(Math.max(window.innerWidth * 0.34, 360), 433, window.innerWidth - 32); const height = width * 0.5625 + 148;
    const centeredLeft = rect.left + window.scrollX + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(window.scrollX + 16, centeredLeft), window.scrollX + window.innerWidth - width - 16);
    const preferredTop = rect.top + window.scrollY - 52;
    const top = Math.min(Math.max(window.scrollY + 76, preferredTop), Math.max(window.scrollY + 76, window.scrollY + window.innerHeight - height - 16));
    previewOpenTimer.current = window.setTimeout(() => { currentActivePopup.current = movie.id; setPreview({ movie, top, left, width, active: true }); }, 450);
  };

  useEffect(() => { return () => { if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current); if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current); }; }, []);

  const heroMovie = dbCollections.length > 0 ? (dbCollectionsMovies.get(dbCollections[0]?.slug)?.[0] || null) : null;
  const interactionProps = { favoriteSlugs, likedSlugs, dislikedSlugs, onToggleFavorite: handleToggleFavorite, onToggleLike: handleToggleLike, onToggleDislike: handleToggleDislike, onPlay: handlePlay };
  const expandHandler = (movie: Movie) => { setPreview(null); setDetailMovie(movie); };

  return (
    <main className="min-h-screen bg-[#141414] pb-16 text-white">
      <TopNav activeProfile={activeProfile} accountProfiles={accountProfiles} onProfileChange={handleProfileChange} onSearch={handleSearch} onLogout={handleLogout} onSeed={handleSeed} onSeedForce={handleSeedForce} seeding={seeding} seedResult={seedResult} />
      {searchQuery ? (
        <SearchResultsGrid query={searchQuery} movies={searchResults} searching={searching} onExpand={expandHandler} onPreview={openPreview} onPreviewEnd={closePreview} {...interactionProps} />
      ) : (
        <>
          <HeroBillboard heroMovie={heroMovie} onPlay={handlePlaySlug} onInfo={(m) => setDetailMovie(m)} />
          <div className="-mt-[7vw] space-y-[1vw]">
            {continueWatchingMovies.length > 0 && (
              <MovieRow title="Tiếp tục xem" movies={continueWatchingMovies} onExpand={expandHandler} onPreview={openPreview} onPreviewEnd={closePreview} {...interactionProps} />
            )}
            {myListMovies.length > 0 && (
              <MovieRow title="Danh sách của tôi" movies={myListMovies} onExpand={expandHandler} onPreview={openPreview} onPreviewEnd={closePreview} {...interactionProps} />
            )}
            {dbCollections.length > 0 ? (
              dbCollections.map((col) => {
                const movies = dbCollectionsMovies.get(col.slug) || [];
                if (movies.length === 0) return null;
                return <MovieRow key={col.slug} title={col.name} movies={movies} onExpand={expandHandler} onPreview={openPreview} onPreviewEnd={closePreview} {...interactionProps} />;
              })
            ) : (
              movieRows.map((row) => <MovieRow key={row.id} title={row.title} movies={row.movies} onExpand={expandHandler} onPreview={openPreview} onPreviewEnd={closePreview} />)
            )}
          </div>
        </>
      )}
      {preview ? (
        <MiniPreviewModal preview={preview} onKeepOpen={keepPreviewOpen} onPreviewEnd={closePreviewNow} onExpand={(movie) => { closePreviewNow(); setDetailMovie(movie); }} {...interactionProps} />
      ) : null}
      {detailMovie ? (
        <DetailModal
          movie={detailMovie}
          onClose={() => setDetailMovie(null)}
          onSearch={handleSearch}
          onPlay={handlePlaySlug}
          isFavorite={favoriteSlugs.has(detailMovie.id)}
          isLiked={likedSlugs.has(detailMovie.id)}
          isDisliked={dislikedSlugs.has(detailMovie.id)}
          onToggleFavorite={() => handleToggleFavorite(detailMovie)}
          onToggleLike={() => handleToggleLike(detailMovie)}
          onToggleDislike={() => handleToggleDislike(detailMovie)}
        />
      ) : null}
    </main>
  );
}

export default function Home() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [entered, setEntered] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile>(() => getStoredProfiles()[0] || profiles[0]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { router.replace("/login"); return; }
    const frame = window.requestAnimationFrame(() => {
      const storedActiveProfileId = getStoredActiveProfileId();
      const sessionProfile = session.profiles.find((profile) => profile.id === storedActiveProfileId) || session.profiles[0] || profiles[0];
      setActiveProfile(sessionProfile);
      setAuthChecked(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [router]);

  const enterBrowse = (profile: Profile) => {
    saveStoredActiveProfileId(profile.id);
    setActiveProfile(profile);
    setEntered(true);
  };

  if (!authChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141414] text-white">
        <Image src="/localflix-logo.png" alt="Localflix" width={289} height={86} priority className="h-auto w-[170px]" />
      </main>
    );
  }

  return entered ? <Browse activeProfile={activeProfile} onProfileChange={setActiveProfile} /> : <ProfileGate onEnter={enterBrowse} />;
}
