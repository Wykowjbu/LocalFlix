"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ProfileGate from "@/components/profile-gate";
import { profiles, type Profile } from "@/data/netflix";
import { ACTIVE_PROFILE_STORAGE_KEY, getStoredActiveProfileId, getStoredSession, saveStoredActiveProfileId, SESSION_STORAGE_KEY } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { router.replace("/login"); return; }
    const frame = window.requestAnimationFrame(() => {
      setAuthChecked(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [router]);

  const enterBrowse = (profile: Profile) => {
    saveStoredActiveProfileId(profile.id);
    router.push("/browse");
  };

  if (!authChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141414] text-white">
        <Image src="/localflix-logo.png" alt="Localflix" width={289} height={86} priority className="h-auto w-[170px]" />
      </main>
    );
  }

  return <ProfileGate onEnter={enterBrowse} />;
}
