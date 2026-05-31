# Routing & Navigation Optimization — Localflix

## 1. Vấn đề

- Search, detail modal, hover preview đều dùng React state, URL không thay đổi
- Mất browser back/forward, không share link được
- Mọi thứ dồn trong 1 file `page.tsx` (1643 dòng)
- Watch page dùng query param (`?movie=`) thay vì dynamic route

## 2. Target URL Structure

| Route | Mô tả | File |
|---|---|---|
| `/` | Auth check → redirect `/browse` hoặc `/login` | `src/app/page.tsx` |
| `/browse` | Browse chính (hero + rows) | `src/app/browse/page.tsx` |
| `/browse?jbv=slug` | Browse + detail modal mở sẵn | `src/app/browse/page.tsx` |
| `/browse/genre/[slug]` | Browse lọc theo thể loại | `src/app/browse/genre/[slug]/page.tsx` |
| `/browse/my-list` | Danh sách của tôi | `src/app/browse/my-list/page.tsx` |
| `/search?q=keyword` | Kết quả tìm kiếm | `src/app/search/page.tsx` |
| `/watch/[slug]` | Player (thay `/watch?movie=...`) | `src/app/watch/[slug]/page.tsx` |
| `/login` | Đăng nhập | `src/app/login/page.tsx` |
| `/register` | Đăng ký | `src/app/register/page.tsx` |

## 3. Component Extraction

Từ `page.tsx` hiện tại, tách ra `src/components/`:

| Component | File |
|---|---|
| `Icon` | `src/components/icon.tsx` |
| `NetflixLogo` | `src/components/netflix-logo.tsx` |
| `TopNav` | `src/components/top-nav.tsx` |
| `ProfileGate` | `src/components/profile-gate.tsx` |
| `MovieCard` | `src/components/movie-card.tsx` |
| `MiniPreviewModal` | `src/components/mini-preview-modal.tsx` |
| `DetailModal` | `src/components/detail-modal.tsx` |
| `SearchResultsGrid` | `src/components/search-results-grid.tsx` |
| `HeroBillboard` | `src/components/hero-billboard.tsx` |
| `MovieRow` | `src/components/movie-row.tsx` |
| `RoundButton` | `src/components/round-button.tsx` |
| `Browse` (logic chính) | `src/components/browse.tsx` |
| `UserProvider` + hooks | `src/lib/user-context.tsx` |

## 4. Data Flow

### Auth & Profile
```
Root / page.tsx
  → check session (getStoredSession)
  → no session → redirect /login
  → session exists → ProfileGate
    → chọn profile → save activeProfile → navigate /browse
```

### Browse
```
/browse page.tsx
  → đọc activeProfile từ localStorage
  → fetch collections, movies, favorites, history
  → render Browse (HeroBillboard + MovieRows)

  Khi có ?jbv=slug:
    → đọc slug từ useSearchParams
    → set detailMovie → render DetailModal
    → đóng modal → router.replace(/browse)
```

### Search
```
TopNav search submit
  → router.push(/search?q=keyword)

/search page.tsx
  → đọc q từ useSearchParams
  → q empty → empty state
  → fetch /api/movies?q=...&limit=60
  → render SearchResultsGrid
  → click movie → router.push(/browse?jbv=slug)
```

### Genre & My List
```
/browse/genre/[slug] page.tsx
  → đọc slug từ params
  → fetch movies filtered by genre
  → render Browse with filter

/browse/my-list page.tsx
  → fetch user's favorite movies
  → render Browse (my-list variant)
```

### Watch
```
/watch/[slug] page.tsx
  → đọc slug từ params
  → đọc episode từ ?ep= searchParams
  → fetch movie data
  → render player
  → back → router.back()
```

## 5. Detail Modal URL Behavior

- **Mở:** `router.push('/browse?jbv=' + slug, { scroll: false })`
- **Đóng:** `router.replace('/browse')` (xóa param, giữ scroll)
- **Back button:** tự động pop history stack → xóa param → modal đóng
- **Trực tiếp:** vào `/browse?jbv=slug` → load browse + mở modal luôn

## 6. Edge Cases

| Tình huống | Xử lý |
|---|---|
| Vào `/search` không có `?q=` | Hiển thị empty state "Nhập từ khóa để tìm kiếm" |
| Vào `/browse?jbv=invalid` | Browse load bình thường, không mở modal |
| User chưa đăng nhập vào `/browse` | Redirect `/login` |
| Refresh trang khi đang search | `?q=` vẫn giữ → re-fetch kết quả |
| Refresh trang khi modal đang mở | `?jbv=` vẫn giữ → browse + modal hiện lại |
| Search rồi click movie → back | Back: đóng modal (`?jbv=`), back tiếp: về search (`?q=`) |
| Watch → back | Về trang trước đó (browse/search/detail) |

## 7. Thứ tự thực hiện

### Step 1: Extract components (`src/components/`)
- Tách Icon, NetflixLogo, TopNav, ProfileGate, MovieCard, MiniPreviewModal
- Tách DetailModal, SearchResultsGrid, HeroBillboard, MovieRow, RoundButton
- Tách Browse component + UserProvider
- **Không thay đổi logic**, chỉ relocate

### Step 2: Tạo `/browse` route
- Tạo `src/app/browse/page.tsx`
- `page.tsx` gốc chỉ còn auth check + profile gate + redirect
- Browse đọc `?jbv=` từ URL, mở/đóng DetailModal theo param

### Step 3: Tạo `/search` route
- Tạo `src/app/search/page.tsx`
- TopNav search submit → `router.push('/search?q=' + query)`
- Search page tự fetch + render kết quả

### Step 4: Tạo genre & my-list routes
- `/browse/genre/[slug]/page.tsx`
- `/browse/my-list/page.tsx`
- Cả 2 reuse Browse component với filter prop

### Step 5: Migrate `/watch/[slug]`
- Đổi từ `/watch?movie=...` sang `/watch/[slug]`
- Update tất cả `router.push('/watch?movie=...')` → `router.push('/watch/' + slug)`

### Step 6: Handle back/forward
- Đảm bảo browser buttons hoạt động đúng
- Test các luồng: search → movie → back → back

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `page.tsx` 1643 dòng, dễ thiếu sót khi tách | Tách từng component 1, kiểm tra từng cái |
| `useSearchParams()` cần Suspense boundary | Wrap Browse/search pages trong Suspense |
| Mất state favorites khi navigate giữa routes | Re-fetch từ API hoặc dùng UserContext |
| Scroll position mất khi mở/đóng modal | `router.push({ scroll: false })` |
