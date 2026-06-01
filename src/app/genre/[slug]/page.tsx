import { Suspense } from "react";
import GenreClient from "./genre-client";

export default async function GenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#141414]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </main>
      }
    >
      <GenreClient slug={slug} />
    </Suspense>
  );
}
