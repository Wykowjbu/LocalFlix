"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Browse from "@/components/browse";
import { getStoredSession, getStoredActiveProfileId } from "@/lib/session";
import { profiles, type Profile } from "@/data/netflix";

function BrowseContent() {
  const router = useRouter();
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { router.replace("/login"); return; }
    const storedActiveProfileId = getStoredActiveProfileId();
    const profile = session.profiles.find((p: Profile) => p.id === storedActiveProfileId) || session.profiles[0] || profiles[0];
    setActiveProfile(profile);
  }, [router]);

  if (!activeProfile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    );
  }

  return <Browse activeProfile={activeProfile} onProfileChange={setActiveProfile} />;
}

export default function BrowseClient() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    }>
      <BrowseContent />
    </Suspense>
  );
}
