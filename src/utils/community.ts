import type {
  CommunityComment,
  CommunityPost,
  GuideCategory,
  GuideSpot,
  VisitMode,
} from '../types/guide';

export interface CommunityPostDraft {
  spotId: string;
  authorName: string;
  authorGroup: string;
  visitMode: VisitMode;
  content: string;
  photoUrl?: string;
}

export interface CommunityValidationResult {
  valid: boolean;
  errors: string[];
}

export const VISIT_MODES: VisitMode[] = [
  '實地走訪',
  '學習島探索',
  '單車漫遊',
  '師生共學',
];

export function validateCommunityPostDraft(
  draft: CommunityPostDraft
): CommunityValidationResult {
  const errors: string[] = [];
  if (!draft.spotId.trim()) {
    errors.push('請選擇要關聯的冬山導覽景點');
  }
  const cleanContent = draft.content.trim();
  if (!cleanContent) {
    errors.push('請輸入走讀文字心得');
  } else if (cleanContent.length < 6) {
    errors.push('走讀心得請至少輸入 6 個字');
  } else if (cleanContent.length > 800) {
    errors.push('走讀心得請勿超過 800 字');
  }

  if (draft.photoUrl && draft.photoUrl.trim()) {
    const url = draft.photoUrl.trim();
    const isSafeImage =
      url.startsWith('data:image/') ||
      url.startsWith('https://') ||
      url.startsWith('http://') ||
      url.startsWith('/src/assets/');
    if (!isSafeImage) {
      errors.push('照片網址格式不支援，請上傳圖片或輸入 http(s) 圖片連結');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createCommunityPost(draft: CommunityPostDraft): CommunityPost {
  const rand = Math.random().toString(36).slice(2, 7);
  return {
    id: `post-${Date.now()}-${rand}`,
    spotId: draft.spotId.trim(),
    authorName: draft.authorName.trim() || '冬山旅人',
    authorGroup: draft.authorGroup.trim() || '自由走讀',
    visitMode: draft.visitMode,
    content: draft.content.trim(),
    photoUrl: draft.photoUrl?.trim() || undefined,
    likes: 0,
    likedByMe: false,
    comments: [],
    createdAt: new Date().toISOString(),
    isSeed: false,
  };
}

export interface CommunityFilterOptions {
  spotId: string | 'all';
  category: GuideCategory | '全部';
  visitMode: VisitMode | '全部';
  query: string;
}

export function filterCommunityPosts(
  posts: CommunityPost[],
  spots: GuideSpot[],
  filters: CommunityFilterOptions
): CommunityPost[] {
  const spotMap = new Map(spots.map((s) => [s.id, s]));
  const q = filters.query.trim().toLowerCase();

  return posts.filter((post) => {
    if (filters.spotId !== 'all' && post.spotId !== filters.spotId) {
      return false;
    }
    const linkedSpot = spotMap.get(post.spotId);
    if (filters.category !== '全部' && linkedSpot?.category !== filters.category) {
      return false;
    }
    if (filters.visitMode !== '全部' && post.visitMode !== filters.visitMode) {
      return false;
    }
    if (!q) return true;
    return (
      post.content.toLowerCase().includes(q) ||
      post.authorName.toLowerCase().includes(q) ||
      post.authorGroup.toLowerCase().includes(q) ||
      (linkedSpot?.name.toLowerCase().includes(q) ?? false) ||
      (linkedSpot?.village.toLowerCase().includes(q) ?? false)
    );
  });
}

export function togglePostLike(posts: CommunityPost[], postId: string): CommunityPost[] {
  return posts.map((post) => {
    if (post.id !== postId) return post;
    const nextLiked = !post.likedByMe;
    return {
      ...post,
      likedByMe: nextLiked,
      likes: Math.max(0, post.likes + (nextLiked ? 1 : -1)),
    };
  });
}

export function appendPostComment(
  posts: CommunityPost[],
  postId: string,
  authorName: string,
  content: string
): CommunityPost[] {
  const clean = content.trim();
  if (!clean) return posts;
  const comment: CommunityComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    authorName: authorName.trim() || '冬山旅人',
    content: clean,
    createdAt: new Date().toISOString(),
  };
  return posts.map((post) =>
    post.id === postId
      ? { ...post, comments: [...post.comments, comment] }
      : post
  );
}
