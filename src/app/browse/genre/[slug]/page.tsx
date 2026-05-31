"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession, getStoredActiveProfileId } from "@/lib/session";
import { profiles } from "@/data/netflix";
import type { Profile } from "@/data/netflix";

function GenreContent({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const slug = typeof params === "object" && "slug" in params ? (params as { slug: string }).slug : "";

  const session = getStoredSession();
  if (!session) { router.replace("/login"); return null; }

  return (
    <main className="min-h-screen bg-[#141414] pt-[120px] text-white px-[4%]">
      <h1 className="text-[clamp(22px,2.2vw,32px)] font-medium capitalize">Thể loại: {slug}</h1>
    </main>
  );
}

export default function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    }>
      <GenreContent params={params} />
    </Suspense>
  );
}
