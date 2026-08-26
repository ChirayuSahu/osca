export interface Repository {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  description: string | null;
  url: string;
  languages: Record<string, number> | null;
  frameworks: string[];
  techStack: string[];
  topics: string[];
  stars: number;
  forks: number;
  openIssuesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreInfo {
  repositoryId: string;
  totalScore: number;
  breakdown: {
    contentScore: number;
    collabScore: number;
    topicScore: number;
    fallback?: boolean;
  };
}

export interface FeedItem {
  repository: Repository;
  scoreInfo: ScoreInfo;
}

export interface FeedResponse {
  success: boolean;
  message: string;
  data: FeedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
