import { Suspense } from "react";
import TvShowsClient from "./tv-shows-client";

export default function TvShowsPage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    }>
      <TvShowsClient />
    </Suspense>
  );
}
