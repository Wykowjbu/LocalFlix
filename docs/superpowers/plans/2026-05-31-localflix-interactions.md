# Localflix Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoan thien cac tinh nang tuong tac con thieu: thay toan bo data tinh bang DB, My List, like/dislike, lich su xem, continue watching, search tot hon, actor/genre clickable search, phat phim that tu DB, va dong bo UI state theo profile dang chon.

**Architecture:** Giữ Frontend không gọi nguồn ngoài; UI chỉ gọi Next route handlers nội bộ. Prisma là source of truth cho movie, episode, favorite, reaction, watch history, va toan bo browse/detail/watch data. Client session hiện ở `localStorage`; API nhận `profileId` từ client và validate record tồn tại trước khi ghi.

**Tech Stack:** Next.js 16 App Router, React 19 client components, Prisma 6, SQLite, HLS.js, Tailwind CSS.

---

## Current Gap Review

- `Favorite` và `WatchHistory` đã có trong Prisma, nhưng chưa có API/UI dùng thật.
- Chưa có model `Reaction`; nút like hiện dummy.
- `RoundButton` trong card/modal chưa biết trạng thái favorite/liked.
- `WatchPage` đang dùng `mockResponse`, chưa đọc `Movie/Episode` từ DB.
- `Home`, `HeroBillboard`, `DetailModal`, episode list, actor text, similar content còn dùng nhiều data tĩnh/mock.
- Nút `Phát` chưa chuyển đến watch URL theo movie/episode.
- Search hiện dùng `contains` thường, chưa tốt với tiếng Việt không dấu, đảo thứ tự token, hoặc tên diễn viên.
- Detail modal đang hardcode 10 tập, diễn viên giả, đạo diễn giả, năm giả.
- HLS player chưa buffer ahead 90 giây và chưa dùng `m3u8Url` DB.
- Chưa có "Danh sách của tôi" row lấy từ `Favorite`.
- Chưa có "Tiếp tục xem" row lấy từ `WatchHistory`.
- Profile switch chỉ đổi UI local; interaction APIs cần dùng profile đang active.
- Logout trong menu vẫn dummy.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `Reaction` model for like/dislike per profile/movie.
- Create: `src/lib/session.ts`
  - Shared client helpers for reading/writing `localflix.session`.
- Create: `src/lib/movie-format.ts`
  - Convert DB movie JSON to `Movie` UI shape; remove duplicate mapper from `page.tsx`.
- Create: `src/app/api/interactions/route.ts`
  - GET profile interactions: favorites, reactions, history.
- Create: `src/app/api/interactions/favorites/route.ts`
  - POST toggle favorite.
- Create: `src/app/api/interactions/reactions/route.ts`
  - POST set/clear like/dislike.
- Create: `src/app/api/interactions/history/route.ts`
  - POST upsert watch progress.
- Modify: `src/app/api/movies/route.ts`
  - Support `favoritesProfileId`, `historyProfileId`, `slug`, `withEpisodes`, improved `q` search, actor/genre search.
- Modify: `src/app/watch/page.tsx`
  - Replace mock with DB-loaded movie/episodes from query params, use `m3u8Url`, persist history, configure HLS buffer.
- Modify: `src/app/page.tsx`
  - Wire play/favorite/like/history rows/logout/UI states, replace static data in browse/detail/modal with DB data.

---

## Task 1: Schema For Reactions

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] Add model:

```prisma
model Reaction {
  id        String   @id @default(cuid())
  profileId String
  movieSlug String
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile   Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  movie     Movie    @relation(fields: [movieSlug], references: [slug], onDelete: Cascade)

  @@unique([profileId, movieSlug])
  @@index([profileId])
  @@index([movieSlug])
}
```

- [ ] Add relation fields:

```prisma
model Profile {
  reactions Reaction[]
}

model Movie {
  reactions Reaction[]
}
```

- [ ] Run:

```powershell
npx prisma migrate dev --name add-reactions
npx prisma generate
npx prisma validate
```

Expected: schema valid, generated client updated.

---

## Task 2: Interaction APIs

**Files:**
- Create: `src/app/api/interactions/favorites/route.ts`
- Create: `src/app/api/interactions/reactions/route.ts`
- Create: `src/app/api/interactions/history/route.ts`
- Create: `src/app/api/interactions/route.ts`

- [ ] Implement favorite toggle:

```ts
// POST body: { profileId, movieSlug, enabled }
// enabled true => upsert Favorite
// enabled false => deleteMany Favorite
// return { favorite: boolean }
```

- [ ] Implement reaction set:

```ts
// POST body: { profileId, movieSlug, value }
// value "like" => upsert Reaction
// value null => deleteMany Reaction
// return { reaction: "like" | null }
```

- [ ] Implement history upsert:

```ts
// POST body: { profileId, movieSlug, episodeSlug, serverName, progress, duration }
// upsert by @@unique([profileId, movieSlug])
// return { ok: true }
```

- [ ] Implement interaction snapshot:

```ts
// GET /api/interactions?profileId=...
// return favoriteSlugs, likedSlugs, history rows ordered updatedAt desc
```

- [ ] Validate inputs:
  - `profileId` exists.
  - `movieSlug` exists for write APIs.
  - `progress >= 0`, `duration >= 0`.

---

## Task 3: Movie API Extensions

**Files:**
- Modify: `src/app/api/movies/route.ts`

- [ ] Add `slug` mode:

```ts
// /api/movies?slug=abc&withEpisodes=true
// return one movie with full detail:
// - slug, name, originalName, posterUrl, thumbUrl, description
// - casts string
// - director string
// - time, quality, language, currentEpisode, totalEpisodes
// - tags with tag/group
// - episodes when withEpisodes=true
```

- [ ] Ensure `withEpisodes=true` returns real DB episodes:

```ts
episodes: [
  {
    id: episode.id,
    name: episode.name,
    slug: episode.slug,
    serverName: episode.serverName,
    embedUrl: episode.embedUrl,
    m3u8Url: episode.m3u8Url,
  }
]
```

- [ ] Add search mode with normalized matching:

```ts
// /api/movies?q=bo%20gia
// Normalize query and searchable fields by:
// - lowercase
// - remove Vietnamese accents
// - collapse spaces/punctuation
// - split tokens
// Match when every query token appears in any order across:
// name, originalName, slug, description, director, casts, language, quality, tag names.
```

- [ ] Implement fuzzy-ish token scoring:

```ts
// "Bố Già", "bo gia", "Gia Bo", "Già Bố" all match same movie when fields contain "Bố Già".
// Sort exact normalized phrase first, then all-token matches, then partial-token matches.
```

- [ ] Add actor/genre broad search support:

```ts
// /api/movies?q=Tran Thanh
// matches casts contains actor token.
// /api/movies?q=Hành Động
// matches Tag.name and TagGroup.name.
```

- [ ] Add My List mode:

```ts
// /api/movies?favoritesProfileId=profileId
// return movies from Favorite ordered by Favorite.createdAt desc
```

- [ ] Add Continue Watching mode:

```ts
// /api/movies?historyProfileId=profileId
// return movies from WatchHistory ordered by updatedAt desc, include progress fields
```

---

## Task 4: Client State And UI Wiring

**Files:**
- Create: `src/lib/session.ts`
- Create: `src/lib/movie-format.ts`
- Modify: `src/app/page.tsx`

- [ ] Extract session helpers:

```ts
export const SESSION_STORAGE_KEY = "localflix.session";
export function getStoredSession(): LocalSession | null {}
export function saveStoredSession(session: LocalSession): void {}
```

- [ ] Load interactions after profile enters browse:
  - `GET /api/interactions?profileId=${activeProfile.id}`.
  - Store `favoriteSlugs`, `likedSlugs`.

- [ ] Wire buttons:
  - `+` toggles favorite and changes icon to `check`.
  - `like` toggles like and changes visual state.
  - `Phát` navigates to `/watch?movie=${slug}`.

- [ ] Replace static data in browse:
  - Do not render `movieRows` as normal logged-in browse if DB collections exist.
  - Hero should use first DB movie from `phim-moi-cap-nhat` or newest movie API.
  - Movie cards, modal, search result grid should use DB movie shape only.
  - Mock rows can remain fallback only when DB empty.

- [ ] Add rows:
  - `Tiếp tục xem` from `/api/movies?historyProfileId=...`.
  - `Danh sách của tôi` from `/api/movies?favoritesProfileId=...`.
  - Hide row when empty.

- [ ] Implement logout:
  - Clear `localStorage` session.
  - `router.replace("/login")`.

- [ ] Update `DetailModal` to load real detail:
  - On modal open, fetch `/api/movies?slug=${movie.slug}&withEpisodes=true`.
  - Replace hardcoded `episodes = Array.from({ length: 10 })`.
  - Replace fake casts `Minh Tran, Linh Dao, Bao Nguyen`.
  - Replace fake director `Nguyen An`.
  - Use API `casts`, `director`, `episodes`, `tags`, `description`, `totalEpisodes`, `currentEpisode`.

- [ ] Add clickable casts/genres/director in `DetailModal`:

```tsx
// DetailModal receives:
onSearch: (keyword: string) => void

// casts string split by comma:
movieDetail.casts?.split(",").map((cast) => (
  <button type="button" onClick={() => { onSearch(cast.trim()); onClose(); }}>
    {cast.trim()}
  </button>
))

// genres from tags where group === "Thể loại":
genres.map((genre) => (
  <button type="button" onClick={() => { onSearch(genre); onClose(); }}>
    {genre}
  </button>
))
```

- [ ] Wire play links in modal:

```tsx
// Main play button:
router.push(`/watch?movie=${movie.slug}`);

// Episode row:
router.push(`/watch?movie=${movie.slug}&episode=${episode.slug}`);
```

---

## Task 5: Real Watch Page

**Files:**
- Modify: `src/app/watch/page.tsx`

- [ ] Read query params:

```ts
const movieSlug = searchParams.get("movie");
const episodeSlug = searchParams.get("episode");
```

- [ ] Fetch movie:

```ts
fetch(`/api/movies?slug=${movieSlug}&withEpisodes=true`)
```

- [ ] Replace all mock response usage:
  - Remove `mockResponse`.
  - Do not use `mockResponse.movie.episodes[0].items`.
  - Use `movie.episodes` from API.
  - Use real `movie.name`, `movie.originalName`, `movie.quality`, `movie.language`.

- [ ] Select episode:
  - If `episodeSlug` exists, use it.
  - Else use history episode if available.
  - Else first episode.

- [ ] Persist progress:
  - On `timeupdate`, debounce every 10 seconds.
  - On `pause`, `ended`, `beforeunload`, send latest progress.
  - POST `/api/interactions/history`.

- [ ] Resume:
  - If history progress > 30 seconds and progress < 90% duration, set `video.currentTime`.

- [ ] Episode switch:
  - Update active episode.
  - Persist new `episodeSlug`.
  - URL can remain same or update with `history.replaceState`.

- [ ] Use DB HLS field:

```ts
const source = activeEpisode.m3u8Url;
```

Do not use `activeEpisode.m3u8`.

- [ ] Configure HLS 90-second forward buffer:

```ts
hls = new Hls({
  enableWorker: true,
  maxBufferLength: 90,
  maxMaxBufferLength: 90,
  backBufferLength: 30,
});
```

- [ ] Handle missing stream:
  - If active episode has no `m3u8Url`, show "Tập này chưa có link phát".
  - If `Hls.Events.ERROR` fatal, show retry/server message.

---

## Task 6: Verification

**Commands:**

```powershell
npx prisma validate
npm run lint
npx tsc --noEmit
npm run build
```

**Manual checks:**
- Register user -> profile name equals registration name.
- Add movie to My List -> row appears and persists after refresh.
- Remove movie -> row updates.
- Like movie -> icon state persists after refresh/profile switch.
- Play movie -> watch page loads DB episode, not mock.
- Watch 15+ seconds -> return home -> Continue Watching row appears.
- Continue Watching play resumes same movie/episode near saved progress.
- Search still works after interaction rows added.
- Search `Bố Già`, `bo gia`, `Gia Bo`, `Già Bố` returns same relevant movie when DB has matching title/cast/tag.
- Click actor in detail modal closes modal and opens search result grid for that actor.
- Click genre in detail modal closes modal and opens search result grid for that genre.
- Detail modal shows real `casts`, `director`, and real episode list from DB.
- `/api/movies?slug=abc&withEpisodes=true` returns `casts`, `director`, and episodes with `m3u8Url`, `serverName`, `slug`.
- Watch page uses `activeEpisode.m3u8Url`, not mock `m3u8`.
- HLS config buffers ahead up to 90 seconds.

---

## Execution Choice

Recommended: Subagent-Driven for Task 1-5, review after each task. Inline execution also OK if user wants single-session edits.
