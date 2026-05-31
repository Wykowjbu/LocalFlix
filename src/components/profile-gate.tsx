"use client";

import { useState } from "react";
import Icon from "./icon";
import NetflixLogo from "./netflix-logo";
import ProfileCard from "./profile-card";
import EditProfileModal from "./edit-profile-modal";
import { profiles, type Profile } from "@/data/netflix";

const PROFILE_STORAGE_KEY = "localflix.profiles";

function getStoredProfiles(): Profile[] {
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

function saveStoredProfiles(nextProfiles: Profile[]) {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles));
}

export default function ProfileGate({ onEnter }: { onEnter: (profile: Profile) => void }) {
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
