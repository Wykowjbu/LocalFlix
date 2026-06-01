<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Progress Log

### Genre Page (done)
- Genre page at `/genre/[slug]` with TopNav, HeroBillboard, MovieRow, MiniPreviewModal, DetailModal
- API `genre` query param with canonical name-based slug lookup
- Genre navigation from DetailModal, MiniPreview, TopNav dropdown
- `slugifyTagName` helper for name→slug conversion

### Duplicate Tag Cleanup (done)
- Ran cleanup script (`npm run db:cleanup-genre-tags`) — merged 1,949 MovieTag from HASH-slug → name-based canonical tags, deleted 35 duplicate tags, renamed 10 single-entry HASH tags
- Thể loại: 43→24 entries (no duplicates), Quốc gia: 40→24 entries (no duplicates)
- No data loss — all MovieTag associations preserved

### Seed Fix (done)
- `syncMovieDetail()` now looks up existing tags by name first, canonicalizes slug, falls back to `groupId_slug` upsert
- Prevents future duplicates between `seedFixedTags()` and `syncMovieDetail()`

### Next Steps
- Test genre pages, DetailModal, MiniPreview, TopNav dropdown, Search
- Full build pass
