import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_COMMUNITY_POSTS } from '../data/communitySeed.ts';
import { SEED_DONGSHAN_SPOTS } from '../data/dongshanSeed.ts';
import {
  appendPostComment,
  createCommunityPost,
  filterCommunityPosts,
  togglePostLike,
  validateCommunityPostDraft,
} from './community.ts';

test('validateCommunityPostDraft rejects missing spot or too-short reflection and accepts valid post', () => {
  const invalid = validateCommunityPostDraft({
    spotId: '',
    authorName: '學生甲',
    authorGroup: '802',
    visitMode: '實地走訪',
    content: '太短',
  });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.length, 2);

  const valid = validateCommunityPostDraft({
    spotId: 'seed-station',
    authorName: '王小明',
    authorGroup: '冬山國中 802',
    visitMode: '實地走訪',
    content: '今天騎車走訪冬山車站瓜棚月台，稻浪和微風讓人印象深刻。',
    photoUrl: 'data:image/png;base64,iVBORw0KGgo=',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('filterCommunityPosts filters by linked spot, theme category, visitMode, and keyword', () => {
  const bySpot = filterCommunityPosts(SEED_COMMUNITY_POSTS, SEED_DONGSHAN_SPOTS, {
    spotId: 'seed-zhongshan-tea',
    category: '全部',
    visitMode: '全部',
    query: '',
  });
  assert.equal(bySpot.length, 1);
  assert.equal(bySpot[0].spotId, 'seed-zhongshan-tea');

  const byCategory = filterCommunityPosts(SEED_COMMUNITY_POSTS, SEED_DONGSHAN_SPOTS, {
    spotId: 'all',
    category: '美食',
    visitMode: '全部',
    query: '',
  });
  assert.equal(byCategory.length, 1);
  assert.equal(byCategory[0].spotId, 'seed-old-street-food');
});

test('togglePostLike and appendPostComment update post interaction state immutably', () => {
  const created = createCommunityPost({
    spotId: 'seed-station',
    authorName: '林小安',
    authorGroup: '走讀小隊',
    visitMode: '學習島探索',
    content: '從學習島出發到冬山老街走讀，拍下了很美的舊河道倒影。',
  });
  const posts = [created, ...SEED_COMMUNITY_POSTS];

  const liked = togglePostLike(posts, created.id);
  assert.equal(liked[0].likes, 1);
  assert.equal(liked[0].likedByMe, true);

  const unliked = togglePostLike(liked, created.id);
  assert.equal(unliked[0].likes, 0);
  assert.equal(unliked[0].likedByMe, false);

  const commented = appendPostComment(unliked, created.id, '陳老師', '視角構圖很棒！');
  assert.equal(commented[0].comments.length, 1);
  assert.equal(commented[0].comments[0].authorName, '陳老師');
});
