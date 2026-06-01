import { Suspense } from "react";
import NewPopularClient from "./new-popular-client";

export default function NewPopularPage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    }>
      <NewPopularClient />
    </Suspense>
  );
}
