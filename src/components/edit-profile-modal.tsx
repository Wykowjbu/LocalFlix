"use client";

import { useState } from "react";
import Image from "next/image";
import Icon from "./icon";
import NetflixLogo from "./netflix-logo";
import type { Profile } from "@/data/netflix";
import { profileAvatars } from "@/data/netflix";

export default function EditProfileModal({
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
              <label htmlFor="profile-name" className="sr-only">Tên hồ sơ</label>
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
