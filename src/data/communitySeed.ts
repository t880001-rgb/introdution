import type { CommunityPost } from '../types/guide';
import {
  DONGSHAN_FOOD_IMAGE,
  DONGSHAN_HERO_IMAGE,
  DONGSHAN_STATION_IMAGE,
  DONGSHAN_TEA_IMAGE,
} from './dongshanSeed';

export const SEED_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'seed-post-1',
    spotId: 'seed-station',
    authorName: '陳映彤',
    authorGroup: '冬山國中走讀社',
    visitMode: '實地走訪',
    content:
      '早上八點從冬山火車站出發，陽光穿過白色瓜棚月台灑在稻田旁邊，風箏廣場也有好多在地手作風箏介紹，推薦大家把這裡當成探索冬山學習島的起點！',
    photoUrl: DONGSHAN_STATION_IMAGE,
    likes: 14,
    likedByMe: false,
    comments: [
      {
        id: 'seed-cmt-1',
        authorName: '林柏宇',
        content: '瓜棚下面租單車往生態綠舟騎超順，沿途風景很棒！',
        createdAt: '2026-10-12T04:15:00.000Z',
      },
    ],
    createdAt: '2026-10-12T01:30:00.000Z',
    isSeed: true,
  },
  {
    id: 'seed-post-2',
    spotId: 'seed-zhongshan-tea',
    authorName: '張雅雯老師',
    authorGroup: '鄉土農業踏查隊',
    visitMode: '師生共學',
    content:
      '帶學生到中山茶園體驗素馨紅茶揉茶，茶農叔叔分享冬山河上游霧氣如何滋養茶芽。我們也把訪談筆記整理成 CSV 匯入導覽誌了。',
    photoUrl: DONGSHAN_TEA_IMAGE,
    likes: 19,
    likedByMe: false,
    comments: [],
    createdAt: '2026-10-15T06:20:00.000Z',
    isSeed: true,
  },
  {
    id: 'seed-post-3',
    spotId: 'seed-meihua-lake',
    authorName: '吳宇軒',
    authorGroup: '蘭陽單車小隊',
    visitMode: '單車漫遊',
    content:
      '先在學習島把梅花湖風景島點亮，週末就真的騎車來環湖！2.2 公里步道很平坦，吊橋上吹風看紅冠水雞超療癒。',
    photoUrl: DONGSHAN_HERO_IMAGE,
    likes: 11,
    likedByMe: false,
    comments: [],
    createdAt: '2026-10-18T08:40:00.000Z',
    isSeed: true,
  },
  {
    id: 'seed-post-4',
    spotId: 'seed-old-street-food',
    authorName: '許家寧',
    authorGroup: '美食地圖組',
    visitMode: '實地走訪',
    content:
      '走讀完舊河道一定要繞回冬山市場喝一碗黑糖粉圓冰和米粉羹！我們在現場訪談到攤位傳承超過三十年的故事。',
    photoUrl: DONGSHAN_FOOD_IMAGE,
    likes: 23,
    likedByMe: false,
    comments: [],
    createdAt: '2026-10-20T03:10:00.000Z',
    isSeed: true,
  },
];
