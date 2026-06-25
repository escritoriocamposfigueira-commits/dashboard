export interface DailyMetric {
  date: string;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  views: number;
  total_interactions: number;
  follower_count: number;
}

export interface FbDailyMetric {
  date: string;
  impressions: number;
  reactions: number;
  clicks: number;
}

export interface ProfileInfo {
  followers_count: number;
  media_count: number;
  name: string;
  username: string;
  biography: string;
}

export const igProfile: ProfileInfo = {
  followers_count: 2386,
  media_count: 1232,
  name: "ESCRITORIO CAMPOS FIGUEIRA",
  username: "escritorio.figueira",
  biography: "Compromisso e excelência em cada serviço prestado | Responsabilidade, confiança e resultados excepcionais",
};

export const igDaily: DailyMetric[] = [
  { date: "2026-05-27", reach: 6, likes: 0, comments: 0, saves: 1, shares: 0, views: 0, total_interactions: 1, follower_count: 6 },
  { date: "2026-05-28", reach: 49, likes: 1, comments: 0, saves: 0, shares: 0, views: 223, total_interactions: 1, follower_count: 7 },
  { date: "2026-05-29", reach: 59, likes: 3, comments: 0, saves: 0, shares: 0, views: 262, total_interactions: 3, follower_count: 7 },
  { date: "2026-05-30", reach: 55, likes: 2, comments: 0, saves: 0, shares: 0, views: 437, total_interactions: 2, follower_count: 8 },
  { date: "2026-05-31", reach: 54, likes: 4, comments: 0, saves: 2, shares: 1, views: 183, total_interactions: 8, follower_count: 2 },
  { date: "2026-06-01", reach: 48, likes: 1, comments: 0, saves: 0, shares: 1, views: 190, total_interactions: 3, follower_count: 0 },
  { date: "2026-06-02", reach: 48, likes: 1, comments: 0, saves: 0, shares: 0, views: 229, total_interactions: 1, follower_count: 5 },
  { date: "2026-06-03", reach: 48, likes: 2, comments: 0, saves: 0, shares: 0, views: 138, total_interactions: 2, follower_count: 1 },
  { date: "2026-06-04", reach: 41, likes: 2, comments: 0, saves: 0, shares: 0, views: 213, total_interactions: 2, follower_count: 7 },
  { date: "2026-06-05", reach: 45, likes: 1, comments: 0, saves: 0, shares: 0, views: 203, total_interactions: 1, follower_count: 5 },
  { date: "2026-06-06", reach: 50, likes: 1, comments: 0, saves: 0, shares: 0, views: 328, total_interactions: 1, follower_count: 0 },
  { date: "2026-06-07", reach: 49, likes: 0, comments: 0, saves: 0, shares: 0, views: 765, total_interactions: 0, follower_count: 2 },
  { date: "2026-06-08", reach: 46, likes: 2, comments: 0, saves: 0, shares: 0, views: 282, total_interactions: 2, follower_count: 3 },
  { date: "2026-06-09", reach: 44, likes: 2, comments: 0, saves: 0, shares: 0, views: 152, total_interactions: 2, follower_count: 7 },
  { date: "2026-06-10", reach: 62, likes: 2, comments: 0, saves: 0, shares: 0, views: 156, total_interactions: 2, follower_count: 2 },
  { date: "2026-06-11", reach: 208, likes: 3, comments: 0, saves: 0, shares: 0, views: 377, total_interactions: 3, follower_count: 2 },
  { date: "2026-06-12", reach: 61, likes: 1, comments: 0, saves: 0, shares: 0, views: 140, total_interactions: 1, follower_count: 0 },
  { date: "2026-06-13", reach: 28, likes: 2, comments: 0, saves: 0, shares: 1, views: 79, total_interactions: 4, follower_count: 0 },
  { date: "2026-06-14", reach: 38, likes: 7, comments: 0, saves: 0, shares: 1, views: 197, total_interactions: 9, follower_count: 1 },
  { date: "2026-06-15", reach: 151, likes: 1, comments: 0, saves: 0, shares: 0, views: 288, total_interactions: 1, follower_count: 0 },
  { date: "2026-06-16", reach: 246, likes: 2, comments: 0, saves: 0, shares: 0, views: 408, total_interactions: 2, follower_count: 0 },
  { date: "2026-06-17", reach: 166, likes: 0, comments: 0, saves: 0, shares: 0, views: 229, total_interactions: 0, follower_count: 1 },
  { date: "2026-06-18", reach: 80, likes: 0, comments: 0, saves: 0, shares: 0, views: 136, total_interactions: 0, follower_count: 2 },
  { date: "2026-06-19", reach: 19, likes: 0, comments: 0, saves: 0, shares: 0, views: 22, total_interactions: 0, follower_count: 2 },
  { date: "2026-06-20", reach: 19, likes: 4, comments: 0, saves: 0, shares: 0, views: 39, total_interactions: 4, follower_count: 1 },
  { date: "2026-06-21", reach: 19, likes: 0, comments: 0, saves: 0, shares: 0, views: 26, total_interactions: 0, follower_count: 0 },
  { date: "2026-06-22", reach: 16, likes: 0, comments: 0, saves: 1, shares: 0, views: 37, total_interactions: 1, follower_count: 1 },
  { date: "2026-06-23", reach: 22, likes: 0, comments: 0, saves: 0, shares: 0, views: 235, total_interactions: 0, follower_count: 0 },
  { date: "2026-06-24", reach: 14, likes: 1, comments: 0, saves: 1, shares: 2, views: 42, total_interactions: 6, follower_count: 0 },
];

// Aggregate Facebook organic post-level data by day
export const fbDailyRaw: FbDailyMetric[] = [
  { date: "2026-05-28", impressions: 159, reactions: 0, clicks: 5 },
  { date: "2026-05-29", impressions: 307, reactions: 2, clicks: 8 },
  { date: "2026-05-30", impressions: 164, reactions: 2, clicks: 2 },
  { date: "2026-05-31", impressions: 218, reactions: 0, clicks: 4 },
  { date: "2026-06-01", impressions: 49, reactions: 1, clicks: 0 },
  { date: "2026-06-02", impressions: 147, reactions: 1, clicks: 6 },
  { date: "2026-06-03", impressions: 109, reactions: 2, clicks: 5 },
  { date: "2026-06-04", impressions: 107, reactions: 0, clicks: 1 },
  { date: "2026-06-05", impressions: 183, reactions: 4, clicks: 7 },
  { date: "2026-06-06", impressions: 112, reactions: 2, clicks: 6 },
  { date: "2026-06-07", impressions: 156, reactions: 0, clicks: 0 },
  { date: "2026-06-08", impressions: 84, reactions: 0, clicks: 2 },
  { date: "2026-06-09", impressions: 153, reactions: 1, clicks: 5 },
  { date: "2026-06-10", impressions: 58, reactions: 2, clicks: 0 },
  { date: "2026-06-11", impressions: 194, reactions: 3, clicks: 11 },
  { date: "2026-06-12", impressions: 99, reactions: 2, clicks: 4 },
  { date: "2026-06-13", impressions: 166, reactions: 4, clicks: 9 },
  { date: "2026-06-14", impressions: 185, reactions: 2, clicks: 10 },
  { date: "2026-06-15", impressions: 188, reactions: 3, clicks: 6 },
  { date: "2026-06-18", impressions: 72, reactions: 1, clicks: 4 },
];

export function computeIgTotals(data: DailyMetric[]) {
  return data.reduce(
    (acc, d) => ({
      reach: acc.reach + (d.reach ?? 0),
      likes: acc.likes + (d.likes ?? 0),
      comments: acc.comments + (d.comments ?? 0),
      saves: acc.saves + Math.max(d.saves ?? 0, 0),
      shares: acc.shares + (d.shares ?? 0),
      views: acc.views + (d.views ?? 0),
      interactions: acc.interactions + Math.max(d.total_interactions ?? 0, 0),
      newFollowers: acc.newFollowers + (d.follower_count ?? 0),
    }),
    { reach: 0, likes: 0, comments: 0, saves: 0, shares: 0, views: 0, interactions: 0, newFollowers: 0 }
  );
}

export function computeFbTotals(data: FbDailyMetric[]) {
  return data.reduce(
    (acc, d) => ({
      impressions: acc.impressions + d.impressions,
      reactions: acc.reactions + d.reactions,
      clicks: acc.clicks + d.clicks,
    }),
    { impressions: 0, reactions: 0, clicks: 0 }
  );
}
