export type Profile = {
  id: string;
  name: string;
  avatar: string;
  accent: string;
  isKids?: boolean;
};

export type ProfileAvatar = {
  id: string;
  name: string;
  src: string;
};

export type Movie = {
  id: string;
  title: string;
  image: string;
  match: number;
  maturity: string;
  duration: string;
  quality: string;
  genres: string[];
  top10?: number;
  isNew?: boolean;
};

export type MovieRow = {
  id: string;
  title: string;
  movies: Movie[];
};

export const profiles: Profile[] = [
  {
    id: "minh",
    name: "Minh",
    avatar: "/avatars/avatar-172.png",
    accent: "#0081ff",
  },
  {
    id: "linh",
    name: "Linh",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    accent: "#f5a623",
  },
  {
    id: "nhi",
    name: "Nhi",
    avatar: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=400&q=80",
    accent: "#8b5cf6",
  },
  {
    id: "kids",
    name: "Kids",
    avatar: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=400&q=80",
    accent: "#46d369",
    isKids: true,
  },
];

export const profileAvatars: ProfileAvatar[] = [
  {
    id: "figma-172",
    name: "Avatar 172",
    src: "/avatars/avatar-172.png",
  },
];

export const featuredMovie = {
  title: "Shadow Protocol",
  label: "LOCALFLIX ORIGINAL",
  synopsis:
    "A covert analyst discovers a citywide signal buried in old surveillance footage and has one night to stop it before every screen goes dark.",
  image: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=2400&q=85",
};

const images = [
  "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1497015289639-54688650d173?auto=format&fit=crop&w=900&q=80",
];

const titles = [
  "Midnight Circuit",
  "Neon Harbor",
  "Last Broadcast",
  "Glass Kingdom",
  "The Silent Crew",
  "Redline Avenue",
  "Afterimage",
  "Northern Heat",
  "Signal Seven",
  "Paper Moon Heist",
  "Deep Current",
  "Blue Hour",
];

const genreSets = [
  ["Gay cấn", "Bí ẩn", "Tâm lý"],
  ["Hành động", "Tội phạm", "Kịch tính"],
  ["Viễn tưởng", "Phiêu lưu", "Drama"],
  ["Hài đen", "Độc lập", "Khác thường"],
  ["Lãng mạn", "Ấm áp", "Đời thường"],
];

function movie(index: number, seed = 0): Movie {
  return {
    id: `movie-${seed}-${index}`,
    title: titles[(index + seed) % titles.length],
    image: images[(index + seed) % images.length],
    match: 82 + ((index * 3 + seed) % 17),
    maturity: index % 3 === 0 ? "18+" : index % 2 === 0 ? "T16" : "T13",
    duration: index % 2 === 0 ? "1h 48m" : "2h 06m",
    quality: index % 4 === 0 ? "4K" : "HD",
    genres: genreSets[(index + seed) % genreSets.length],
    top10: index < 3 ? index + 1 : undefined,
    isNew: (index + seed) % 4 === 0,
  };
}

export const movieRows: MovieRow[] = [
  { id: "popular", title: "Top 10 series tại Việt Nam hôm nay", movies: Array.from({ length: 10 }, (_, index) => movie(index, 0)) },
  { id: "new-popular", title: "Mới và phổ biến", movies: Array.from({ length: 10 }, (_, index) => movie(index, 1)) },
  { id: "continue", title: "Tiếp tục xem", movies: Array.from({ length: 10 }, (_, index) => movie(index, 3)) },
  { id: "action", title: "Phim hành động gay cấn", movies: Array.from({ length: 10 }, (_, index) => movie(index, 6)) },
  { id: "because", title: "Vì bạn đã xem Shadow Protocol", movies: Array.from({ length: 10 }, (_, index) => movie(index, 9)) },
];
