export type GuideCategory = '人文' | '風景' | '歷史' | '產物' | '農業' | '美食';

export const GUIDE_CATEGORIES: GuideCategory[] = [
  '人文',
  '風景',
  '歷史',
  '產物',
  '農業',
  '美食',
];

export type TimeOfDay = '上午' | '下午' | '傍晚' | '全日';

export type TravelMode = 'DRIVING' | 'BICYCLING' | 'WALKING' | 'TRANSIT';

export type SpotSource = 'seed' | 'student';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GuideSpot {
  id: string;
  name: string;
  category: GuideCategory;
  village: string;
  address: string;
  lat: number;
  lng: number;
  summary: string;
  story: string;
  highlights: string[];
  stayMinutes: number;
  bestTime: TimeOfDay;
  authorName: string;
  authorClass: string;
  imageUrl?: string;
  source: SpotSource;
  createdAt: string;
  googlePlaceId?: string;
}

export interface SpotDraft {
  name: string;
  category: string;
  village: string;
  address: string;
  lat: string | number;
  lng: string | number;
  summary: string;
  story: string;
  highlights: string | string[];
  stayMinutes: string | number;
  bestTime: string;
  authorName: string;
  authorClass: string;
  imageUrl?: string;
  googlePlaceId?: string;
}

export interface ImportRowValidation {
  rowIndex: number;
  rawName: string;
  spot: GuideSpot | null;
  errors: string[];
  warnings: string[];
}

export interface ParsedImportResult {
  format: 'json' | 'csv' | 'tsv';
  rows: ImportRowValidation[];
  validSpots: GuideSpot[];
  errorCount: number;
  warningCount: number;
}

export type RecommendationThemeId =
  | 'tea-eco'
  | 'heritage-walk'
  | 'food-market'
  | 'family-farm'
  | 'custom';

export interface RecommendationPreferences {
  theme: RecommendationThemeId;
  customCategories: GuideCategory[];
  timeOfDay: TimeOfDay;
  budgetMinutes: number;
  travelMode: TravelMode;
  preferStudentContent: boolean;
}

export interface ScoredSpot {
  spot: GuideSpot;
  score: number;
  distanceKm: number;
  travelMinutes: number;
  reasons: string[];
}

export interface ItineraryStop {
  order: number;
  spot: GuideSpot;
  legDistanceKm: number;
  legTravelMinutes: number;
  stayMinutes: number;
  cumulativeMinutes: number;
  reasons: string[];
}

export interface RecommendedItinerary {
  stops: ItineraryStop[];
  totalDistanceKm: number;
  totalTravelMinutes: number;
  totalStayMinutes: number;
  totalMinutes: number;
}

export interface RouteStepInfo {
  instruction: string;
  distanceText: string;
  durationText: string;
}

export interface ComputedRouteInfo {
  distanceMeters: number;
  durationMillis: number;
  steps: RouteStepInfo[];
  source: 'google-routes' | 'spatial-estimate';
}

export type ExploreWorkbenchMode = 'map' | 'recommend' | 'import';

export type AppSection = 'explore' | 'island' | 'community' | 'culture';

export type ExplorerAvatarId = 'cyclist' | 'ecologist' | 'historian';

export type VisitMode = '實地走訪' | '學習島探索' | '單車漫遊' | '師生共學';

export interface TravelerProfile {
  displayName: string;
  groupLabel: string;
  avatarId: ExplorerAvatarId;
}

export interface CommunityComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  spotId: string;
  authorName: string;
  authorGroup: string;
  visitMode: VisitMode;
  content: string;
  photoUrl?: string;
  likes: number;
  likedByMe?: boolean;
  comments: CommunityComment[];
  createdAt: string;
  isSeed?: boolean;
}

export interface IslandHexLayout {
  category: GuideCategory;
  cx: number;
  cy: number;
  subtitle: string;
  accentColor: string;
  surfaceTint: string;
}

export interface SpotRatingRecord {
  spotId: string;
  totalScore: number;
  count: number;
  userRating: number;
}


