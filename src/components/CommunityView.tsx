import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  Compass,
  Heart,
  ImagePlus,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  GUIDE_CATEGORIES,
  type CommunityPost,
  type GuideCategory,
  type GuideSpot,
  type TravelerProfile,
  type VisitMode,
} from '../types/guide';
import {
  VISIT_MODES,
  createCommunityPost,
  filterCommunityPosts,
  validateCommunityPostDraft,
} from '../utils/community';

interface CommunityViewProps {
  spots: GuideSpot[];
  posts: CommunityPost[];
  profile: TravelerProfile;
  onAddPost: (post: CommunityPost) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, authorName: string, content: string) => void;
  onDeletePost: (postId: string) => void;
  onInspectSpotOnMap: (spot: GuideSpot) => void;
  onWalkToSpotOnIsland: (spot: GuideSpot) => void;
  preselectedSpotId?: string | null;
  onClearPreselectedSpot?: () => void;
}

function formatPostDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(
      d.getDate()
    ).padStart(2, '0')}`;
  } catch {
    return iso.slice(0, 10);
  }
}

export function CommunityView({
  spots,
  posts,
  profile,
  onAddPost,
  onToggleLike,
  onAddComment,
  onDeletePost,
  onInspectSpotOnMap,
  onWalkToSpotOnIsland,
  preselectedSpotId,
  onClearPreselectedSpot,
}: CommunityViewProps) {
  const [spotId, setSpotId] = useState<string>(
    () => preselectedSpotId || spots[0]?.id || ''
  );
  const [authorName, setAuthorName] = useState(profile.displayName || '冬山旅人');
  const [authorGroup, setAuthorGroup] = useState(profile.groupLabel || '自由走讀');
  const [visitMode, setVisitMode] = useState<VisitMode>('實地走訪');
  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Feed filters
  const [filterSpotId, setFilterSpotId] = useState<string | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<GuideCategory | '全部'>('全部');
  const [filterVisitMode, setFilterVisitMode] = useState<VisitMode | '全部'>('全部');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline comment drafts per post ID
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  // Sync preselected spot when jumped from Map or Learning Island
  if (preselectedSpotId && preselectedSpotId !== spotId) {
    setSpotId(preselectedSpotId);
    onClearPreselectedSpot?.();
  }

  const spotMap = useMemo(() => new Map(spots.map((s) => [s.id, s])), [spots]);
  const effectiveSpotId = spotMap.has(spotId) ? spotId : spots[0]?.id ?? '';

  const filteredPosts = useMemo(
    () =>
      filterCommunityPosts(posts, spots, {
        spotId: filterSpotId,
        category: filterCategory,
        visitMode: filterVisitMode,
        query: searchQuery,
      }),
    [posts, spots, filterSpotId, filterCategory, filterVisitMode, searchQuery]
  );

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result ?? ''));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);

    const validation = validateCommunityPostDraft({
      spotId: effectiveSpotId,
      authorName,
      authorGroup,
      visitMode,
      content,
      photoUrl,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    const created = createCommunityPost({
      spotId: effectiveSpotId,
      authorName,
      authorGroup,
      visitMode,
      content,
      photoUrl,
    });
    onAddPost(created);
    setFormErrors([]);
    setContent('');
    setPhotoUrl('');
    const linked = spotMap.get(effectiveSpotId);
    setFormSuccess(
      `已發布走讀心得並關聯至「${linked?.name ?? '冬山景點'}」！`
    );
  };

  const handleSubmitComment = (postId: string) => {
    const draft = commentDrafts[postId] ?? '';
    if (!draft.trim()) return;
    onAddComment(postId, authorName || profile.displayName || '冬山旅人', draft);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  return (
    <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Masthead */}
      <section className="border-b border-[#E2DDD2] pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-medium text-[#1B5E43]">
            社群互動 · 免費走讀筆記牆 · 照片與文字關聯實境景點
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#1C1B18] leading-tight">
            冬山走讀社群牆：分享照片與田野心得
          </h1>
          <p className="text-sm text-[#57544D] leading-relaxed">
            將實際走訪或探索「學習島」的所見所聞寫成走讀紀錄，直接綁定至對應的冬山導覽景點，讓地圖、學習島與社群記憶形成虛實相連的地方故事。
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#57544D] tabular-nums shrink-0">
          <span>社群貼文 {posts.length} 則</span>
          <span aria-hidden="true">·</span>
          <span>涵蓋景點 {new Set(posts.map((p) => p.spotId)).size} 處</span>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Share Walk-Reading Post Composer */}
        <section
          aria-label="發表走讀照片與文字心得"
          className="lg:col-span-5 bg-white border border-[#E2DDD2] rounded-xl p-5 sm:p-6 space-y-4 lg:sticky lg:top-24"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[#1C1B18]">
              分享我的走讀心得
            </h2>
            <p className="text-xs text-[#57544D]">
              選擇關聯的導覽景點，上傳走讀照片並留下您的觀察或心情。
            </p>
          </div>

          {formErrors.length > 0 && (
            <div
              role="alert"
              className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-xs text-[#991B1B] space-y-1"
            >
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <span>請修正以下欄位：</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {formErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {formSuccess && (
            <div
              role="status"
              className="rounded-lg bg-[#EAF4EF] border border-[#1B5E43]/25 p-3 text-xs text-[#1B5E43] font-medium"
            >
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label
                htmlFor="community-spot-select"
                className="block text-xs font-medium text-[#1C1B18]"
              >
                關聯導覽景點 *
              </label>
              <select
                id="community-spot-select"
                value={effectiveSpotId}
                onChange={(e) => setSpotId(e.target.value)}
                className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
              >
                {spots.length === 0 ? (
                  <option value="">尚未匯入導覽景點（請先至學生匯入新增）</option>
                ) : (
                  spots.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.category}] {s.name}（{s.village}）
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="community-author"
                  className="block text-xs font-medium text-[#1C1B18]"
                >
                  分享者暱稱
                </label>
                <input
                  id="community-author"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="例：林小安"
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="community-group"
                  className="block text-xs font-medium text-[#1C1B18]"
                >
                  班級 / 小隊 / 身分
                </label>
                <input
                  id="community-group"
                  type="text"
                  value={authorGroup}
                  onChange={(e) => setAuthorGroup(e.target.value)}
                  placeholder="例：冬山國中 802"
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-medium text-[#1C1B18]">
                走讀方式
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {VISIT_MODES.map((mode) => {
                  const active = visitMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setVisitMode(mode)}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#EAF4EF] border-[#1B5E43] text-[#1B5E43] font-semibold'
                          : 'bg-[#F8F7F3] border-[#E2DDD2] text-[#57544D] hover:border-[#1B5E43]'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="community-content"
                  className="block text-xs font-medium text-[#1C1B18]"
                >
                  文字走讀心得 *
                </label>
                <span className="text-[11px] text-[#57544D] tabular-nums">
                  {content.length} / 800
                </span>
              </div>
              <textarea
                id="community-content"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="寫下在這個景點看到的風景、地方故事、美食口感或學習島探索發現…"
                className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
              />
            </div>

            {/* Photo Upload + Optional URL */}
            <div className="space-y-2 p-3 rounded-lg bg-[#F8F7F3] border border-[#E2DDD2]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="community-photo-file"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D8D2C5] hover:border-[#1B5E43] text-xs font-medium text-[#1B5E43] cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>上傳走讀照片</span>
                </label>
                <input
                  id="community-photo-file"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="inline-flex items-center gap-1 text-xs text-[#9A3412] hover:underline"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>移除照片</span>
                  </button>
                )}
              </div>

              <input
                type="text"
                aria-label="或貼上走讀相片網址"
                value={photoUrl.startsWith('data:') ? '' : photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="選填：貼上照片網址（https://...），或使用上方按鈕上傳本機照片"
                className="w-full rounded-md border border-[#D8D2C5] bg-white px-2.5 py-1.5 text-xs text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
              />

              {photoUrl && (
                <div className="aspect-[16/9] rounded-lg overflow-hidden bg-[#EFECE4] border border-[#E2DDD2]">
                  <img
                    src={photoUrl}
                    alt="待分享的走讀照片預覽"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1B5E43] text-white text-sm font-medium hover:bg-[#154A34] transition-colors"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>發布走讀心得並關聯景點</span>
            </button>
          </form>
        </section>

        {/* Right: Community Feed & Filters */}
        <section aria-label="社群走讀心得列表" className="lg:col-span-7 space-y-4">
          {/* Filters */}
          <div className="bg-white border border-[#E2DDD2] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 p-1 bg-[#EFECE4] rounded-lg overflow-x-auto">
              {(['全部', ...GUIDE_CATEGORIES] as const).map((cat) => {
                const active = filterCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#1B5E43] shadow-xs font-semibold'
                        : 'text-[#57544D] hover:text-[#1C1B18]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                aria-label="依關聯景點篩選貼文"
                value={filterSpotId}
                onChange={(e) => setFilterSpotId(e.target.value)}
                className="rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-2.5 py-1.5 text-xs text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
              >
                <option value="all">全部關聯景點</option>
                {spots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="依走讀方式篩選貼文"
                value={filterVisitMode}
                onChange={(e) =>
                  setFilterVisitMode(e.target.value as VisitMode | '全部')
                }
                className="rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-2.5 py-1.5 text-xs text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
              >
                <option value="全部">全部走讀方式</option>
                {VISIT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-[#57544D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="搜尋社群心得關鍵字"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋心得、作者或景點…"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] text-xs text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          {filteredPosts.length === 0 ? (
            <div className="bg-white border border-[#E2DDD2] rounded-xl p-10 text-center space-y-2">
              <p className="text-sm text-[#57544D]">目前沒有符合篩選條件的走讀分享</p>
              <button
                type="button"
                onClick={() => {
                  setFilterSpotId('all');
                  setFilterCategory('全部');
                  setFilterVisitMode('全部');
                  setSearchQuery('');
                }}
                className="text-xs font-medium text-[#1B5E43] hover:underline"
              >
                顯示全部社群心得
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const linkedSpot = spotMap.get(post.spotId);
                const commentValue = commentDrafts[post.id] ?? '';
                return (
                  <article
                    key={post.id}
                    className="bg-white border border-[#E2DDD2] rounded-xl overflow-hidden p-5 space-y-3.5"
                  >
                    {/* Author + Visit Mode Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-sm text-[#1C1B18]">
                            {post.authorName}
                          </span>
                          <span className="text-[#57544D]">{post.authorGroup}</span>
                          <span aria-hidden="true" className="text-[#D8D2C5]">
                            ·
                          </span>
                          <span className="font-medium text-[#1B5E43]">
                            {post.visitMode}
                          </span>
                          <span aria-hidden="true" className="text-[#D8D2C5]">
                            ·
                          </span>
                          <span className="text-[#57544D] tabular-nums">
                            {formatPostDate(post.createdAt)}
                          </span>
                        </div>
                      </div>

                      {!post.isSeed && (
                        <button
                          type="button"
                          onClick={() => onDeletePost(post.id)}
                          aria-label="刪除此篇走讀心得"
                          className="p-1.5 rounded-lg text-[#57544D] hover:text-[#991B1B] hover:bg-[#FEF2F2] transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {/* Text Content */}
                    <p className="text-sm text-[#2E2C28] leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Optional Shared Photo */}
                    {post.photoUrl && (
                      <div className="aspect-[16/9] rounded-lg overflow-hidden bg-[#EFECE4] border border-[#E2DDD2]">
                        <img
                          src={post.photoUrl}
                          alt={`${post.authorName} 分享的 ${linkedSpot?.name ?? '冬山'} 走讀照片`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Linked Spot Bridge (Virtual <-> Physical) */}
                    {linkedSpot && (
                      <div className="rounded-lg bg-[#F8F7F3] border border-[#E2DDD2] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="text-xs space-y-0.5 min-w-0">
                          <div className="text-[#1B5E43] font-medium">
                            關聯導覽景點 · {linkedSpot.category} · {linkedSpot.village}
                          </div>
                          <div className="font-semibold text-[#1C1B18] truncate">
                            {linkedSpot.name}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onInspectSpotOnMap(linkedSpot)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#D8D2C5] hover:border-[#1B5E43] text-xs font-medium text-[#1C1B18] whitespace-nowrap shrink-0"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#1B5E43]" aria-hidden="true" />
                            <span>實境地圖</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onWalkToSpotOnIsland(linkedSpot)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#D8D2C5] hover:border-[#1B5E43] text-xs font-medium text-[#1C1B18] whitespace-nowrap shrink-0"
                          >
                            <Compass className="w-3.5 h-3.5 text-[#9A3412]" aria-hidden="true" />
                            <span>學習島前往</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Like & Comment Footer */}
                    <div className="pt-2 border-t border-[#ECE8DE] space-y-3">
                      <div className="flex items-center gap-4 text-xs">
                        <button
                          type="button"
                          onClick={() => onToggleLike(post.id)}
                          aria-pressed={Boolean(post.likedByMe)}
                          className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                            post.likedByMe
                              ? 'text-[#9A3412]'
                              : 'text-[#57544D] hover:text-[#9A3412]'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${post.likedByMe ? 'fill-current' : ''}`}
                            aria-hidden="true"
                          />
                          <span className="tabular-nums">鼓勵 {post.likes}</span>
                        </button>

                        <span className="inline-flex items-center gap-1.5 text-[#57544D] tabular-nums">
                          <MessageCircle className="w-4 h-4" aria-hidden="true" />
                          <span>留言 {post.comments.length}</span>
                        </span>
                      </div>

                      {/* Existing Comments */}
                      {post.comments.length > 0 && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-[#E2DDD2]">
                          {post.comments.map((c) => (
                            <div key={c.id} className="text-xs text-[#312F2A]">
                              <span className="font-semibold text-[#1C1B18] mr-1.5">
                                {c.authorName}：
                              </span>
                              <span>{c.content}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          aria-label={`回覆 ${post.authorName} 的走讀貼文`}
                          value={commentValue}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSubmitComment(post.id);
                            }
                          }}
                          placeholder="留下一句鼓勵或交流心得…"
                          className="flex-1 rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-1.5 text-xs text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitComment(post.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#EFECE4] hover:bg-[#E2DDD2] text-xs font-medium text-[#1C1B18] whitespace-nowrap shrink-0"
                        >
                          留言
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
