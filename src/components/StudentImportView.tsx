import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import {
  GUIDE_CATEGORIES,
  type GuideCategory,
  type GuideSpot,
  type LatLngPoint,
  type SpotDraft,
} from '../types/guide';
import {
  exportSpotsToCsv,
  exportSpotsToJson,
  generateSampleCsv,
  parseStudentImportText,
  validateSpotDraft,
} from '../utils/importer';
import { GooglePlaceFinder } from './GooglePlaceFinder';

interface StudentImportViewProps {
  spots: GuideSpot[];
  onImportSpots: (newSpots: GuideSpot[], mode: 'append' | 'replace-all') => void;
  onSaveSingleSpot: (spot: GuideSpot, isEdit: boolean) => void;
  onDeleteSpot: (id: string) => void;
  onClearAllSpots: () => void;
  onResetToSeed: () => void;
  pickCoordinateMode: boolean;
  onRequestMapPick: () => void;
  pickedCoords: LatLngPoint | null;
  onClearPickedCoords: () => void;
  onViewOnMap?: () => void;
}

type ImportTab = 'batch' | 'single' | 'manage';

const EMPTY_DRAFT: SpotDraft = {
  name: '',
  category: '人文',
  village: '',
  address: '',
  lat: '24.6361',
  lng: '121.7921',
  summary: '',
  story: '',
  highlights: '',
  stayMinutes: '45',
  bestTime: '上午',
  authorName: '',
  authorClass: '',
  imageUrl: '',
};

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function StudentImportView({
  spots,
  onImportSpots,
  onSaveSingleSpot,
  onDeleteSpot,
  onClearAllSpots,
  onResetToSeed,
  pickCoordinateMode,
  onRequestMapPick,
  pickedCoords,
  onClearPickedCoords,
  onViewOnMap,
}: StudentImportViewProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('batch');

  // Batch import state
  const [rawText, setRawText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace-all'>('append');
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  // Single form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SpotDraft>(() =>
    pickedCoords
      ? { ...EMPTY_DRAFT, lat: String(pickedCoords.lat), lng: String(pickedCoords.lng) }
      : EMPTY_DRAFT
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Sync pickedCoords into single form if user clicked adjacent map
  const effectiveLat = pickedCoords ? String(pickedCoords.lat) : String(draft.lat);
  const effectiveLng = pickedCoords ? String(pickedCoords.lng) : String(draft.lng);

  const parsedResult = useMemo(() => parseStudentImportText(rawText), [rawText]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawText(String(reader.result ?? ''));
      setBatchFeedback(null);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleConfirmBatchImport = () => {
    if (parsedResult.validSpots.length === 0) return;
    onImportSpots(parsedResult.validSpots, importMode);
    setBatchFeedback(
      `已成功匯入 ${parsedResult.validSpots.length} 筆學生導覽資料，並即時更新至地圖導覽與智慧推薦。`
    );
    setRawText('');
  };

  const handleSinglePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, imageUrl: String(reader.result ?? '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleSingleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);

    const validation = validateSpotDraft(
      {
        ...draft,
        lat: effectiveLat,
        lng: effectiveLng,
      },
      1,
      editingId ?? undefined
    );

    if (!validation.spot || validation.errors.length > 0) {
      setFormErrors(validation.errors);
      return;
    }

    onSaveSingleSpot(validation.spot, Boolean(editingId));
    onClearPickedCoords();
    setFormErrors([]);
    setFormSuccess(
      editingId
        ? `已更新學生景點「${validation.spot.name}」的導覽資料。`
        : `已匯入學生田野踏查景點「${validation.spot.name}」，並同步至地圖與推薦！`
    );
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const handleStartEdit = (spot: GuideSpot) => {
    setEditingId(spot.id);
    setDraft({
      name: spot.name,
      category: spot.category,
      village: spot.village,
      address: spot.address,
      lat: String(spot.lat),
      lng: String(spot.lng),
      summary: spot.summary,
      story: spot.story,
      highlights: spot.highlights.join(';'),
      stayMinutes: String(spot.stayMinutes),
      bestTime: spot.bestTime,
      authorName: spot.authorName,
      authorClass: spot.authorClass,
      imageUrl: spot.imageUrl ?? '',
    });
    setFormErrors([]);
    setFormSuccess(null);
    setActiveTab('single');
  };

  return (
    <div className="space-y-6">
      {/* Header & Template Actions */}
      <section className="bg-white border border-[#E2DDD2] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="max-w-3xl space-y-1.5">
          <div className="text-xs font-medium text-[#1B5E43]">
            學生田野踏查共創平台 · 目前地圖與推薦全部來自學生匯入資料（共 {spots.length} 筆）
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#1C1B18] leading-tight">
            匯入與管理學生冬山導覽內容
          </h2>
          <p className="text-xs sm:text-sm text-[#57544D] leading-relaxed">
            所有地圖導覽點與智慧行程推薦均由學生匯入資料構成。支援試算表複製貼上、CSV／JSON 批次匯入，或直接在旁邊地圖點選座標新增單筆景點。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              downloadFile('冬山鄉導覽匯入範本.csv', generateSampleCsv(), 'text/csv;charset=utf-8')
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D8D2C5] bg-white text-xs font-medium text-[#1C1B18] hover:border-[#1B5E43] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#1B5E43]" aria-hidden="true" />
            <span>下載 CSV 範本</span>
          </button>

          <button
            type="button"
            disabled={spots.length === 0}
            onClick={() =>
              downloadFile(
                '冬山鄉學生導覽資料匯出.csv',
                exportSpotsToCsv(spots),
                'text/csv;charset=utf-8'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D8D2C5] bg-white text-xs font-medium text-[#1C1B18] hover:border-[#1B5E43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#1B5E43]" aria-hidden="true" />
            <span>匯出 CSV</span>
          </button>

          <button
            type="button"
            disabled={spots.length === 0}
            onClick={() =>
              downloadFile(
                '冬山鄉學生導覽資料匯出.json',
                exportSpotsToJson(spots),
                'application/json;charset=utf-8'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D8D2C5] bg-white text-xs font-medium text-[#1C1B18] hover:border-[#1B5E43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <FileJson className="w-3.5 h-3.5 text-[#1B5E43]" aria-hidden="true" />
            <span>匯出 JSON</span>
          </button>
        </div>
      </section>

      {/* Mode Tabs */}
      <div
        className="inline-flex p-1 bg-[#EFECE4] rounded-lg gap-1 overflow-x-auto max-w-full"
        role="tablist"
        aria-label="學生匯入方式"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'batch'}
          onClick={() => setActiveTab('batch')}
          className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'batch'
              ? 'bg-white text-[#1B5E43] shadow-xs font-semibold'
              : 'text-[#57544D] hover:text-[#1C1B18]'
          }`}
        >
          批次匯入（CSV / JSON / 試算表貼上）
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'single'}
          onClick={() => setActiveTab('single')}
          className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'single'
              ? 'bg-white text-[#1B5E43] shadow-xs font-semibold'
              : 'text-[#57544D] hover:text-[#1C1B18]'
          }`}
        >
          {editingId ? '編輯單筆景點' : '單筆田野踏查新增'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'manage'}
          onClick={() => setActiveTab('manage')}
          className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'manage'
              ? 'bg-white text-[#1B5E43] shadow-xs font-semibold'
              : 'text-[#57544D] hover:text-[#1C1B18]'
          }`}
        >
          管理已匯入景點（{spots.length}）
        </button>
      </div>

      {/* Tab 1: Batch Import */}
      {activeTab === 'batch' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-white border border-[#E2DDD2] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-[#1C1B18]">
                步驟 1：上傳檔案或貼上表格內容
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRawText(generateSampleCsv().replace(/^\uFEFF/, ''));
                  setBatchFeedback(null);
                }}
                className="text-xs font-medium text-[#1B5E43] hover:underline whitespace-nowrap shrink-0"
              >
                填入學生範例 CSV 測試
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F8F7F3] border border-[#D8D2C5] hover:border-[#1B5E43] text-xs font-medium text-[#1C1B18] cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-[#1B5E43]" aria-hidden="true" />
                <span>選擇 CSV / JSON 檔案</span>
                <input
                  type="file"
                  accept=".csv,.json,.txt,.tsv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
              <span className="text-xs text-[#57544D]">
                支援 UTF-8 CSV、JSON 或從 Google Sheets 複製的表格
              </span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="batch-import-textarea" className="block text-xs font-medium text-[#57544D]">
                試算表內容貼上區（欄位：名稱、分類、村落、緯度、經度、簡介、導覽介紹、學生作者）
              </label>
              <textarea
                id="batch-import-textarea"
                rows={9}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setBatchFeedback(null);
                }}
                placeholder="可直接從 Google 試算表選取多列資料複製貼上，或貼入 CSV / JSON 文字…"
                className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] p-3 text-xs font-mono text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
              />
            </div>

            {batchFeedback && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#1B5E43]/10 border border-[#1B5E43]/30 p-3 text-xs text-[#1B5E43]"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{batchFeedback}</span>
                </div>
                {onViewOnMap && (
                  <button
                    type="button"
                    onClick={onViewOnMap}
                    className="font-semibold underline whitespace-nowrap shrink-0"
                  >
                    前往地圖與推薦查看 →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 bg-white border border-[#E2DDD2] rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-[#1C1B18]">
                  步驟 2：即時驗證與匯入預覽
                </h3>
                {parsedResult.rows.length > 0 && (
                  <span className="text-xs text-[#57544D] tabular-nums">
                    格式：{parsedResult.format.toUpperCase()} · 有效 {parsedResult.validSpots.length} 筆 ·
                    錯誤 {parsedResult.errorCount} 筆
                  </span>
                )}
              </div>

              {parsedResult.rows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#D8D2C5] p-8 text-center text-xs sm:text-sm text-[#57544D] space-y-2">
                  <p>左側貼入或上傳資料後，系統會自動檢查六大分類（人文、風景、歷史、產物、農業、美食）與臺灣經緯度座標格式。</p>
                </div>
              ) : (
                <div className="border border-[#E2DDD2] rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EFECE4] text-[#45423C]">
                      <tr>
                        <th className="py-2 px-3 font-medium">列</th>
                        <th className="py-2 px-3 font-medium">景點名稱</th>
                        <th className="py-2 px-3 font-medium">分類</th>
                        <th className="py-2 px-3 font-medium">驗證狀態</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECE8DE]">
                      {parsedResult.rows.map((row) => (
                        <tr key={row.rowIndex} className="bg-white">
                          <td className="py-2 px-3 font-mono tabular-nums text-[#57544D]">
                            {row.rowIndex}
                          </td>
                          <td className="py-2 px-3 font-medium text-[#1C1B18]">
                            {row.rawName}
                            {row.spot && (
                              <div className="text-[11px] font-normal text-[#57544D]">
                                {row.spot.authorName} · {row.spot.village}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[#45423C]">
                            {row.spot?.category ?? '—'}
                          </td>
                          <td className="py-2 px-3">
                            {row.errors.length > 0 ? (
                              <span className="text-[#9A3412] font-medium">
                                錯誤：{row.errors.join('；')}
                              </span>
                            ) : row.warnings.length > 0 ? (
                              <span className="text-[#B45309]">
                                通過（提醒：{row.warnings.join('；')}）
                              </span>
                            ) : (
                              <span className="text-[#1B5E43] font-medium">驗證通過</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#ECE8DE] space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#1C1B18]">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="accent-[#1B5E43]"
                  />
                  <span>合併新增至現有學生景點</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === 'replace-all'}
                    onChange={() => setImportMode('replace-all')}
                    className="accent-[#1B5E43]"
                  />
                  <span>取代目前全部學生景點資料</span>
                </label>
              </div>

              <button
                type="button"
                disabled={parsedResult.validSpots.length === 0}
                onClick={handleConfirmBatchImport}
                className="w-full py-2.5 px-4 rounded-lg bg-[#1B5E43] text-white text-sm font-medium hover:bg-[#154A34] disabled:opacity-40 transition-colors"
              >
                確認匯入 {parsedResult.validSpots.length} 筆學生有效資料
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Tab 2: Single Spot Fieldwork Form */}
      {activeTab === 'single' && (
        <section className="bg-white border border-[#E2DDD2] rounded-xl p-5 sm:p-6">
          <form onSubmit={handleSingleSubmit} className="space-y-5" noValidate>
            <div className="flex items-center justify-between gap-2 border-b border-[#ECE8DE] pb-3">
              <h3 className="text-lg font-semibold text-[#1C1B18]">
                {editingId ? '編輯學生導覽景點' : '新增學生田野踏查景點'}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(EMPTY_DRAFT);
                    setFormErrors([]);
                  }}
                  className="text-xs text-[#57544D] hover:text-[#1C1B18]"
                >
                  取消編輯
                </button>
              )}
            </div>

            {formErrors.length > 0 && (
              <div
                role="alert"
                className="rounded-lg bg-[#9A3412]/10 border border-[#9A3412]/30 p-3 space-y-1 text-xs text-[#9A3412]"
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  <span>請修正以下欄位後再送出：</span>
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
                className="rounded-lg bg-[#1B5E43]/10 border border-[#1B5E43]/30 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#1B5E43]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{formSuccess}</span>
                </div>
                {onViewOnMap && (
                  <button
                    type="button"
                    onClick={onViewOnMap}
                    className="font-semibold underline whitespace-nowrap shrink-0"
                  >
                    立即在地圖與推薦查看 →
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="spot-name" className="block text-xs font-medium text-[#1C1B18]">
                  景點名稱 *
                </label>
                <input
                  id="spot-name"
                  type="text"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="例：大進村百年茄苳與蜜餞工坊"
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="spot-category" className="block text-xs font-medium text-[#1C1B18]">
                  導覽分類 *
                </label>
                <select
                  id="spot-category"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as GuideCategory })}
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                >
                  {GUIDE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="spot-village" className="block text-xs font-medium text-[#1C1B18]">
                  所屬村落 / 地段
                </label>
                <input
                  id="spot-village"
                  type="text"
                  value={draft.village}
                  onChange={(e) => setDraft({ ...draft, village: e.target.value })}
                  placeholder="例：大進村 / 中山村 / 冬山老街"
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="spot-address" className="block text-xs font-medium text-[#1C1B18]">
                  地址或地標說明
                </label>
                <input
                  id="spot-address"
                  type="text"
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  placeholder="例：宜蘭縣冬山鄉大進路466號"
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>
            </div>

            {/* Coordinates + In-page Map Picker */}
            <div className="p-3.5 rounded-lg bg-[#F8F7F3] border border-[#E2DDD2] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1C1B18]">地圖座標（供即時導航與推薦距離計算）*</span>
                <button
                  type="button"
                  onClick={onRequestMapPick}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    pickCoordinateMode
                      ? 'bg-[#1B5E43] border-[#1B5E43] text-white'
                      : 'bg-white border-[#D8D2C5] text-[#1B5E43] hover:border-[#1B5E43]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{pickCoordinateMode ? '請點擊右側冬山導覽地圖取點…' : '從右側地圖直接點選座標'}</span>
                </button>
              </div>
              <GooglePlaceFinder
                onSelectPlace={(place) => {
                  onClearPickedCoords();
                  setDraft((prev) => ({
                    ...prev,
                    name: prev.name || place.name,
                    address: prev.address || place.address,
                    lat: String(place.coords.lat),
                    lng: String(place.coords.lng),
                    googlePlaceId: place.googlePlaceId,
                  }));
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="spot-lat" className="block text-xs text-[#57544D]">
                    緯度（Latitude）
                  </label>
                  <input
                    id="spot-lat"
                    type="text"
                    value={effectiveLat}
                    onChange={(e) => {
                      onClearPickedCoords();
                      setDraft({ ...draft, lat: e.target.value });
                    }}
                    className="w-full rounded-lg border border-[#D8D2C5] bg-white px-3 py-1.5 text-sm font-mono tabular-nums text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="spot-lng" className="block text-xs text-[#57544D]">
                    經度（Longitude）
                  </label>
                  <input
                    id="spot-lng"
                    type="text"
                    value={effectiveLng}
                    onChange={(e) => {
                      onClearPickedCoords();
                      setDraft({ ...draft, lng: e.target.value });
                    }}
                    className="w-full rounded-lg border border-[#D8D2C5] bg-white px-3 py-1.5 text-sm font-mono tabular-nums text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="spot-summary" className="block text-xs font-medium text-[#1C1B18]">
                導覽一句話簡介 *
              </label>
              <input
                id="spot-summary"
                type="text"
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                placeholder="精簡描述景點特色，將顯示於地圖、清單與行程推薦"
                className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="spot-story" className="block text-xs font-medium text-[#1C1B18]">
                詳細田野故事 / 產業介紹
              </label>
              <textarea
                id="spot-story"
                rows={4}
                value={draft.story}
                onChange={(e) => setDraft({ ...draft, story: e.target.value })}
                placeholder="記錄歷史脈絡、在地訪談、農產製程或飲食特色…"
                className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="spot-highlights" className="block text-xs font-medium text-[#1C1B18]">
                  特色亮點（以分號 ; 分隔）
                </label>
                <input
                  id="spot-highlights"
                  type="text"
                  value={typeof draft.highlights === 'string' ? draft.highlights : draft.highlights.join(';')}
                  onChange={(e) => setDraft({ ...draft, highlights: e.target.value })}
                  placeholder="百年老樹;傳統製程;手作體驗"
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="spot-stay" className="block text-xs font-medium text-[#1C1B18]">
                  建議停留（分鐘）
                </label>
                <input
                  id="spot-stay"
                  type="number"
                  min={5}
                  max={480}
                  value={draft.stayMinutes}
                  onChange={(e) => setDraft({ ...draft, stayMinutes: e.target.value })}
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm tabular-nums text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="spot-besttime" className="block text-xs font-medium text-[#1C1B18]">
                  推薦造訪時段
                </label>
                <select
                  id="spot-besttime"
                  value={draft.bestTime}
                  onChange={(e) => setDraft({ ...draft, bestTime: e.target.value })}
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                >
                  <option value="上午">上午</option>
                  <option value="下午">下午</option>
                  <option value="傍晚">傍晚</option>
                  <option value="全日">全日</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="spot-author" className="block text-xs font-medium text-[#1C1B18]">
                  學生作者姓名
                </label>
                <input
                  id="spot-author"
                  type="text"
                  value={draft.authorName}
                  onChange={(e) => setDraft({ ...draft, authorName: e.target.value })}
                  placeholder="例：林小安"
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="spot-class" className="block text-xs font-medium text-[#1C1B18]">
                  班級 / 踏查組別
                </label>
                <input
                  id="spot-class"
                  type="text"
                  value={draft.authorClass}
                  onChange={(e) => setDraft({ ...draft, authorClass: e.target.value })}
                  placeholder="例：冬山國中 802"
                  className="w-full rounded-lg border border-[#D8D2C5] bg-[#F8F7F3] px-3 py-2 text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="spot-photo-upload" className="block text-xs font-medium text-[#1C1B18]">
                  現場踏查照片（選填）
                </label>
                <input
                  id="spot-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSinglePhotoUpload}
                  className="w-full text-xs text-[#57544D] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#D8D2C5] file:bg-[#F8F7F3] file:text-xs file:font-medium file:text-[#1C1B18]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#1B5E43] text-white text-sm font-medium hover:bg-[#154A34] transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{editingId ? '儲存修改' : '匯入並新增至導覽地圖'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tab 3: Manage Spots */}
      {activeTab === 'manage' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[#1C1B18]">
              已匯入學生導覽景點清單（共 {spots.length} 筆）
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={spots.length === 0}
                onClick={onClearAllSpots}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-white text-xs font-medium text-[#9A3412] hover:bg-[#9A3412]/10 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>清空全部景點</span>
              </button>
              <button
                type="button"
                onClick={onResetToSeed}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-white text-xs font-medium text-[#57544D] hover:text-[#1B5E43] hover:border-[#1B5E43] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>載入學生踏查示範組（12 筆）</span>
              </button>
            </div>
          </div>

          {spots.length === 0 ? (
            <div className="bg-white border border-[#E2DDD2] rounded-xl p-8 text-center text-sm text-[#57544D] space-y-2">
              <p>目前已清空所有導覽景點，請切換至「批次匯入」或「單筆田野踏查新增」由學生匯入新資料。</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E2DDD2] rounded-xl divide-y divide-[#ECE8DE]">
              {spots.map((spot) => (
                <div
                  key={spot.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#57544D]">
                      <span className="font-semibold text-[#1B5E43]">{spot.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{spot.village}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#0F766E] font-medium">學生踏查匯入</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {spot.authorName}（{spot.authorClass}）
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[#1C1B18]">{spot.name}</div>
                    <div className="text-xs text-[#57544D] font-mono tabular-nums">
                      {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)} · {spot.address}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(spot)}
                      aria-label={`編輯 ${spot.name}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-white text-xs font-medium text-[#1C1B18] hover:border-[#1B5E43] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>編輯</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSpot(spot.id)}
                      aria-label={`刪除 ${spot.name}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-white text-xs font-medium text-[#9A3412] hover:bg-[#9A3412]/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>刪除</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
