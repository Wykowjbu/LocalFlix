import { Suspense } from "react";
import BrowseClient from "./browse-client";

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    }>
      <BrowseClient />
    </Suspense>
  );
}
