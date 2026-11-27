import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  FileCode2,
  FileJson,
  HardDriveDownload,
  Image as ImageIcon,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA';
import type { GuideSpot, LatLngPoint } from '../types/guide';
import { resolveAppAssetUrl } from './SpotImage';
import {
  buildOfflinePackPayload,
  generateOfflineHtmlHandbook,
  generateOfflineMapSnapshotSvg,
  type OfflineCacheMetadata,
} from '../utils/offlinePack';

export const OFFLINE_CACHE_NAME = 'dongshan-offline-pack-v1';

interface OfflineMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: GuideSpot[];
  origin: LatLngPoint;
  cacheMeta: OfflineCacheMetadata | null;
  onUpdateCacheMeta: (meta: OfflineCacheMetadata | null) => void;
}

function triggerBlobDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function OfflineMapModal({
  isOpen,
  onClose,
  spots,
  origin,
  cacheMeta,
  onUpdateCacheMeta,
}: OfflineMapModalProps) {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const [caching, setCaching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const svgSnapshot = useMemo(
    () => generateOfflineMapSnapshotSvg(spots, origin),
    [spots, origin]
  );

  if (!isOpen) return null;

  const handleSaveOfflineCache = async () => {
    setCaching(true);
    setStatusMessage(null);
    try {
      const payload = buildOfflinePackPayload(spots, origin);
      const jsonText = JSON.stringify(payload, null, 2);
      const svgText = svgSnapshot;

      let cachedAssetsCount = 0;
      let totalBytes = new Blob([jsonText]).size + new Blob([svgText]).size;

      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await window.caches.open(OFFLINE_CACHE_NAME);

        // Cache core spot JSON & SVG map snapshot into Cache Storage
        const basePrefix = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        await cache.put(
          `${basePrefix}/offline-spots-pack.json`,
          new Response(jsonText, {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          })
        );
        await cache.put(
          `${basePrefix}/offline-dongshan-map.svg`,
          new Response(svgText, {
            headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
          })
        );
        cachedAssetsCount += 2;

        // Deduplicate local image URLs and cache them cleanly
        const imageUrls = Array.from(
          new Set(
            spots
              .map((s) => resolveAppAssetUrl(s.imageUrl))
              .filter(
                (url): url is string =>
                  Boolean(url) &&
                  (url!.includes('/src/assets/') || url!.startsWith('/'))
              )
          )
        );

        for (const url of imageUrls) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              const clone = resp.clone();
              const buf = await resp.arrayBuffer();
              totalBytes += buf.byteLength;
              await cache.put(url, clone);
              cachedAssetsCount += 1;
            }
          } catch {
            // Skip individual image fetch failures gracefully
          }
        }
      }

      const meta: OfflineCacheMetadata = {
        cachedAt: new Date().toISOString(),
        spotCount: spots.length,
        cachedAssetsCount,
        approxKilobytes: Math.max(1, Math.round(totalBytes / 1024)),
      };
      onUpdateCacheMeta(meta);
      setStatusMessage(
        `已完成瀏覽器離線快取！已儲存 ${spots.length} 處核心景點資料、地圖快照與 ${cachedAssetsCount} 筆離線資源。`
      );
    } catch {
      setStatusMessage('已完成本機資料儲存（目前環境不支援 Cache API，仍可下載下方地圖快照檔案）。');
    } finally {
      setCaching(false);
    }
  };

  const handleClearOfflineCache = async () => {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        await window.caches.delete(OFFLINE_CACHE_NAME);
      }
      onUpdateCacheMeta(null);
      setStatusMessage('已清除瀏覽器離線資料包快取。');
    } catch {
      onUpdateCacheMeta(null);
    }
  };

  const handleDownloadSvgSnapshot = () => {
    const blob = new Blob([svgSnapshot], { type: 'image/svg+xml;charset=utf-8' });
    triggerBlobDownload('冬山鄉離線地圖快照.svg', blob);
    setStatusMessage('已下載「冬山鄉離線地圖快照.svg」。');
  };

  const handleDownloadPngSnapshot = () => {
    const svgBlob = new Blob([svgSnapshot], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 860;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#F8F7F3';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            triggerBlobDownload('冬山鄉離線地圖快照.png', pngBlob);
            setStatusMessage('已下載高清「冬山鄉離線地圖快照.png」，可在手機相簿離線檢視。');
          }
          URL.revokeObjectURL(url);
        }, 'image/png');
      } else {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      handleDownloadSvgSnapshot();
    };
    img.src = url;
  };

  const handleDownloadHtmlHandbook = () => {
    const html = generateOfflineHtmlHandbook(spots, origin);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    triggerBlobDownload('冬山鄉離線走讀手冊.html', blob);
    setStatusMessage('已下載「冬山鄉離線走讀手冊.html」（含完整地圖快照與景點座標說明）。');
  };

  const handleDownloadJsonPack = () => {
    const payload = buildOfflinePackPayload(spots, origin);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    triggerBlobDownload('冬山鄉核心景點離線資料包.json', blob);
    setStatusMessage('已下載「冬山鄉核心景點離線資料包.json」。');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-modal-title"
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#F8F7F3] border border-[#D8D2C5] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E2DDD2] px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="text-[#1B5E43]">偏遠山區／低訊號走讀支援</span>
              <span aria-hidden="true" className="text-[#D8D2C5]">
                ·
              </span>
              <span
                className={`inline-flex items-center gap-1 ${
                  isOnline ? 'text-[#1B5E43]' : 'text-[#9A3412]'
                }`}
              >
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{isOnline ? '目前連線正常' : '目前為離線狀態'}</span>
              </span>
            </div>
            <h2
              id="offline-modal-title"
              className="text-xl sm:text-2xl font-semibold text-[#1C1B18]"
            >
              冬山鄉離線地圖與核心資料下載
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="關閉離線地圖視窗"
            className="p-2 rounded-lg text-[#57544D] hover:text-[#1C1B18] hover:bg-[#EFECE4] transition-colors shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {statusMessage && (
            <div
              role="status"
              className="rounded-xl bg-[#EAF4EF] border border-[#1B5E43]/25 px-4 py-3 text-xs sm:text-sm text-[#1B5E43] font-medium flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Section 1: Browser Cache + PWA Install */}
          <section className="bg-white border border-[#E2DDD2] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#1C1B18] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#1B5E43]" aria-hidden="true" />
                  <span>1. 一鍵快取至手機／瀏覽器離線存取</span>
                </h3>
                <p className="text-xs text-[#57544D] leading-relaxed">
                  出發前往新寮瀑布、中山茶園或茅埔城古道等訊號較弱路段前，先將目前共{' '}
                  <strong className="text-[#1C1B18]">{spots.length} 處景點</strong>（含學生匯入資料）、圖片與流域向量圖快取到裝置內。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveOfflineCache}
                  disabled={caching}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B5E43] text-white text-xs sm:text-sm font-medium hover:bg-[#154A34] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <HardDriveDownload className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {caching
                      ? '正在快取資料…'
                      : cacheMeta
                      ? '更新離線資料包'
                      : '下載離線資料包'}
                  </span>
                </button>

                {cacheMeta && (
                  <button
                    type="button"
                    onClick={handleClearOfflineCache}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#57544D] hover:text-[#991B1B] hover:border-[#FECACA] transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>清除快取</span>
                  </button>
                )}
              </div>
            </div>

            {cacheMeta ? (
              <div className="rounded-lg bg-[#F8F7F3] border border-[#E2DDD2] px-4 py-2.5 text-xs text-[#45423C] flex flex-wrap items-center justify-between gap-2 tabular-nums">
                <span>
                  快取狀態：<strong className="text-[#1B5E43]">已就緒</strong> · 收錄{' '}
                  {cacheMeta.spotCount} 處景點 · {cacheMeta.cachedAssetsCount} 項資源（約{' '}
                  {cacheMeta.approxKilobytes} KB）
                </span>
                <span className="text-[#57544D]">
                  更新時間：{cacheMeta.cachedAt.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            ) : (
              <div className="rounded-lg bg-[#F8F7F3] border border-[#E2DDD2] px-4 py-2.5 text-xs text-[#57544D]">
                尚未建立專屬離線快取包，點擊上方「下載離線資料包」即可預載全部圖文資料。
              </div>
            )}

            {/* PWA Install Action inside Offline Center */}
            {!isInstalled && (isInstallable || isIOS) && (
              <div className="pt-2 border-t border-[#ECE8DE] flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[#57544D]">
                  將「冬山鄉導覽誌」安裝到桌面／手機主畫面，無網路也能像 App 一樣快速開啟。
                </span>
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={install}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1B5E43] text-[#1B5E43] font-medium hover:bg-[#EAF4EF] transition-colors whitespace-nowrap"
                  >
                    <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>安裝為離線 App</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-[#1C1B18] font-medium hover:border-[#1B5E43] transition-colors whitespace-nowrap"
                  >
                    <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>iOS 加入主畫面教學</span>
                  </button>
                )}
              </div>
            )}

            {showIOSGuide && (
              <div className="rounded-lg bg-[#FDF5E6] border border-[#F3D5A5] p-3 text-xs text-[#78350F] space-y-1">
                <div className="font-semibold">iPhone / iPad Safari 安裝步驟：</div>
                <div>1. 點選 Safari 下方工具列的「分享」圖示。</div>
                <div>2. 向下滑動並選擇「加入主畫面」，即可於無網路時開啟已快取導覽。</div>
              </div>
            )}
          </section>

          {/* Section 2: Map Snapshot Preview & Image Downloads */}
          <section className="bg-white border border-[#E2DDD2] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#1C1B18] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#1B5E43]" aria-hidden="true" />
                  <span>2. 下載冬山鄉離線地圖快照（含編號座標索引）</span>
                </h3>
                <p className="text-xs text-[#57544D]">
                  即時把目前所有景點（包含學生新增景點）繪製成高解析地圖圖檔，存進手機相簿即可隨時查看方位與經緯度。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadPngSnapshot}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B5E43] text-white text-xs font-medium hover:bg-[#154A34] transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>下載 PNG 地圖快照</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvgSnapshot}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D8D2C5] bg-white text-xs font-medium text-[#1C1B18] hover:border-[#1B5E43] transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#1B5E43]" aria-hidden="true" />
                  <span>下載 SVG 向量圖</span>
                </button>
              </div>
            </div>

            {/* Live Map Snapshot Preview */}
            <div className="rounded-xl border border-[#E2DDD2] bg-[#F8F7F3] overflow-hidden">
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSnapshot)}`}
                alt="冬山鄉離線導覽地圖快照預覽"
                className="w-full h-auto block"
              />
            </div>
          </section>

          {/* Section 3: Portable Offline Handbook & JSON Core Data */}
          <section className="bg-white border border-[#E2DDD2] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[#1C1B18] flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#1B5E43]" aria-hidden="true" />
                <span>3. 匯出離線走讀手冊與核心景點資料</span>
              </h3>
              <p className="text-xs text-[#57544D]">
                下載單檔離線網頁手冊（內嵌地圖快照與全部導覽介紹），或 JSON 結構化核心景點包供教學班級傳閱。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadHtmlHandbook}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D8D2C5] bg-white hover:border-[#1B5E43] text-xs font-medium text-[#1C1B18] transition-colors whitespace-nowrap"
              >
                <FileCode2 className="w-3.5 h-3.5 text-[#1B5E43]" aria-hidden="true" />
                <span>離線走讀手冊 (.html)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJsonPack}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D8D2C5] bg-white hover:border-[#1B5E43] text-xs font-medium text-[#1C1B18] transition-colors whitespace-nowrap"
              >
                <FileJson className="w-3.5 h-3.5 text-[#9A3412]" aria-hidden="true" />
                <span>核心資料包 (.json)</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
