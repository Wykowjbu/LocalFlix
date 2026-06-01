# Localflix Features Design: Top 10, Search Opt, Watch History, TV/Movie & My List Pages
Date: 2026-06-01

## 1. Overview
This specification covers major enhancements to the Localflix application:
1.  **Netflix Top 10 Integration**: Automatic weekly scraping of Netflix Vietnam's Top 10 movies and TV shows.
2.  **Search Optimization (Ranking & Scoring)**: Advanced TypeScript-based scoring system for ranking search results.
3.  **Continue Watching (Watch History)**: Tracking the last watched episode and providing a "Next Episode" shortcut.
4.  **Dedicated TV Shows & Movies Pages**: Filtering and displaying content by type.
5.  **Dynamic Home Page Rows**: Personalized recommendation rows based on user interactions and popularity.
6.  **My List Page**: Dedicated page for user's favorite movies.

## 2. Technical Design

### 2.1 Netflix Top 10 Vietnam Scraper
-   **Source**: `https://www.netflix.com/tudum/top10/vietnam/movie` and `.../tv`.
-   **Execution**: API `/api/seed/top10` (manual/cron).
-   **Fuzzy Matching**:
    -   Use `string-similarity` with threshold > 0.8.
    -   Filter by Type (Movie/TV) before matching.
-   **Storage**: Add `top10RankVN` field to `Movie` model (lưu thứ hạng từ 1-10 tại Việt Nam).

### 2.2 Search Optimization (Detailed Scoring)
-   **Architecture**: Filter Candidates -> Score in TypeScript -> Sort by Score.
-   **Scoring Table**:
    | Điều kiện | Điểm |
    | :--- | :--- |
    | Tên chính xác (Exact Name) | +100 |
    | Tên không dấu chính xác (Unaccented Exact) | +90 |
    | Tên bắt đầu bằng Query | +70 |
    | Original name / Alias khớp Query | +60 |
    | Chứa nguyên cụm từ Query | +50 |
    | Chỉ chứa từ đơn lẻ (Bố hoặc Già) | +10 |
    | Phim đã xem nhiều / Trending nội bộ | +5 đến +20 |
    | Khớp Netflix Top 10 Việt Nam | +10 |

### 2.3 Watch History & "Next Episode"
-   **Tracking**: Store `profileId`, `movieSlug`, `episodeSlug`, and `serverName` on "Play".
-   **Next Episode Logic**:
    -   Fetch last watched `episodeSlug` and `serverName`.
    -   Numerical sort of episodes for that server.
    -   Find current index and return `index + 1`.

### 2.4 TV Shows & Movies Pages
-   **TV Shows**: Category slug `"phim-bo"` or `totalEpisodes > 1`.
-   **Movies**: Category slug `"phim-le"` or `totalEpisodes <= 1`.
-   Re-use Home page UI but with these specific filters.

### 2.5 Dynamic Home Page Rows (Personalized Recommendations)
Trang chủ sẽ không hiển thị một danh sách duy nhất mà chia thành nhiều hàng (Rows) khác nhau, mỗi hàng có một chủ đề và thuật toán gợi ý riêng dựa trên các tín hiệu (Signals) từ người dùng: **Xem (Watch History), Thích (Likes), và Thêm vào danh sách (Favorites).**

**Các loại hàng dự kiến:**
1.  **Tiếp tục xem (Continue Watching)**: Lấy từ `WatchHistory`, ưu tiên phim vừa xem xong hoặc đang xem dở.
2.  **Top 10 tại Việt Nam hôm nay**: Hiển thị 10 phim có `top10RankVN` (kèm số thứ tự lớn từ 1-10).
3.  **Vì bạn đã xem [Tên Phim]**: Chọn 1 phim mà user vừa xem hoặc đã **Like**, tìm các phim có cùng `Category` hoặc `Country`.
4.  **Phim [Thể loại] dành cho bạn**: Dựa trên thể loại mà user **Like** hoặc **Favorite** nhiều nhất (ví dụ: Phim Hàn Quốc, Phim Hành Động).
5.  **Phim mới cập nhật**: Danh sách phim có `updatedAt` mới nhất.
6.  **Phim Âu Mỹ thịnh hành**: Lọc theo quốc gia Âu Mỹ và sắp xếp theo độ hot/mới.
7.  **Phim bộ có thể bạn thích**: Gợi ý các Series dựa trên lịch sử xem phim bộ trước đó.
8.  **Danh sách của bạn**: Hiển thị nhanh một vài phim từ `Favorite` để user dễ truy cập.

**Thuật toán gợi ý:** 
Hệ thống sẽ ưu tiên các phim có điểm tương đồng cao với danh sách phim đã **Like** (Reaction table) và **Thêm vào danh sách** (Favorite table) của Profile hiện tại.

### 2.6 My List Page
-   Dedicated `/my-list` page rendering a Grid of items from the `Favorite` table.

## 3. Data Schema Changes
-   Sync `schema.prisma` first (add `Tag`, `Collection`, `Reaction`, `serverName`, `sourceModifiedAt`).
-   Add `top10RankVN` (Int) to `Movie` để lưu thứ hạng Top 10 tại Việt Nam.

## 4. Success Criteria
-   "Bố Già" search result appears first.
-   Home page shows "Continue Watching" if data exists.
-   Top 10 row correctly hiển thị thứ hạng 1-10 tại Việt Nam.
