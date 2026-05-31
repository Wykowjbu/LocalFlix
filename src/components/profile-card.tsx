"use client";

import Image from "next/image";
import Icon from "./icon";
import type { Profile } from "@/data/netflix";

export default function ProfileCard({
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
