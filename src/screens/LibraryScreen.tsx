import React, { useEffect, useState } from 'react';
import { BookOpen, Search, User, X } from 'lucide-react';
import type {
  Era,
  Meter,
  PoemDetail,
  PoemSummary,
  Poet,
  Theme,
} from '../../packages/shared/src/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiClient } from '../services/apiClient.ts';
import { getAvatarImageUrl } from '../utils/feedback.ts';

export const LibraryScreen: React.FC = () => {
  const { isOnline, backendAvailable, recheckBackend, offlinePack } = useApp();
  const [tab, setTab] = useState<'poems' | 'poets'>('poems');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEraId, setSelectedEraId] = useState<number | undefined>(undefined);
  const [selectedMeterId, setSelectedMeterId] = useState<number | undefined>(undefined);
  const [selectedThemeId, setSelectedThemeId] = useState<number | undefined>(undefined);

  const [eras, setEras] = useState<Era[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [poems, setPoems] = useState<PoemSummary[]>([]);
  const [poets, setPoets] = useState<Poet[]>([]);
  const [loading, setLoading] = useState(true);

  const [openPoem, setOpenPoem] = useState<PoemDetail | null>(null);
  const [openPoet, setOpenPoet] = useState<{
    poet: Poet;
    poems: Array<{ id: number; titleAr: string; verseCount: number; meterNameAr: string | null }>;
  } | null>(null);

  useEffect(() => {
    if (isOnline && backendAvailable) {
      apiClient
        .getTaxonomy()
        .then((tax) => {
          setEras(tax.eras);
          setMeters(tax.meters);
          setThemes(tax.themes);
        })
        .catch(() => {
          if (offlinePack) {
            setEras(offlinePack.eras);
            setMeters(offlinePack.meters);
            setThemes(offlinePack.themes);
          }
        });
    } else if (offlinePack) {
      setEras(offlinePack.eras);
      setMeters(offlinePack.meters);
      setThemes(offlinePack.themes);
    }
  }, [backendAvailable, isOnline, offlinePack]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (isOnline && backendAvailable) {
      if (tab === 'poems') {
        apiClient
          .getPoems({
            q: searchQuery || undefined,
            eraId: selectedEraId,
            meterId: selectedMeterId,
            themeId: selectedThemeId,
            limit: 30,
          })
          .then((res) => {
            if (active) setPoems(res.data);
          })
          .catch(() => {
            if (active) setPoems([]);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      } else {
        apiClient
          .getPoets({
            q: searchQuery || undefined,
            eraId: selectedEraId,
          })
          .then((res) => {
            if (active) setPoets(res);
          })
          .catch(() => {
            if (active) setPoets([]);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      }
    } else if (offlinePack) {
      const qLower = searchQuery.trim();
      setPoems(
        offlinePack.poems.filter((p) => {
          if (selectedEraId && p.eraId !== selectedEraId) return false;
          if (selectedMeterId && p.meterId !== selectedMeterId) return false;
          if (selectedThemeId && p.themeId !== selectedThemeId) return false;
          if (
            qLower &&
            !p.titleAr.includes(qLower) &&
            !p.poetNameAr.includes(qLower) &&
            !p.verses.some((v) => v.sadr.includes(qLower) || v.ajuz.includes(qLower))
          ) {
            return false;
          }
          return true;
        })
      );
      setPoets(
        offlinePack.poets.filter((po) => {
          if (selectedEraId && po.eraId !== selectedEraId) return false;
          if (qLower && !po.nameAr.includes(qLower)) return false;
          return true;
        })
      );
      setLoading(false);
    } else {
      setPoems([]);
      setPoets([]);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [backendAvailable, isOnline, offlinePack, searchQuery, selectedEraId, selectedMeterId, selectedThemeId, tab]);

  async function handleOpenPoem(poemId: number) {
    if (isOnline && backendAvailable) {
      try {
        const detail = await apiClient.getPoemDetail(poemId);
        setOpenPoem(detail);
        return;
      } catch {
        // Fallback to offline pack if available
      }
    }
    if (offlinePack) {
      const found = offlinePack.poems.find((p) => p.id === poemId) || null;
      setOpenPoem(found);
    }
  }

  async function handleOpenPoet(poetId: number) {
    if (isOnline && backendAvailable) {
      try {
        const detail = await apiClient.getPoetDetail(poetId);
        setOpenPoet(detail);
        return;
      } catch {
        // Fallback to offline pack if available
      }
    }
    if (offlinePack) {
      const poet = offlinePack.poets.find((p) => p.id === poetId);
      if (!poet) return;
      const poetPoems = offlinePack.poems
        .filter((pm) => pm.poetId === poetId)
        .map((pm) => ({
          id: pm.id,
          titleAr: pm.titleAr,
          verseCount: pm.verseCount,
          meterNameAr: pm.meterNameAr,
        }));
      setOpenPoet({ poet, poems: poetPoems });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-poetry">مكتبة الشعر العربي</h1>
          <p className="text-sm text-[#697586] dark:text-[#C0CAD6]">
            ابحث في القصائد والأبيات، وتصفّح الشعراء والعصور التاريخية والبحور الشعرية.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E]">
          <button
            type="button"
            onClick={() => setTab('poems')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[40px] ${
              tab === 'poems'
                ? 'bg-white dark:bg-[#14243B] text-[#17233A] dark:text-[#F5F1E8] shadow-sm'
                : 'text-[#697586] dark:text-[#C0CAD6]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>القصائد</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('poets')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[40px] ${
              tab === 'poets'
                ? 'bg-white dark:bg-[#14243B] text-[#17233A] dark:text-[#F5F1E8] shadow-sm'
                : 'text-[#697586] dark:text-[#C0CAD6]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>الشعراء</span>
          </button>
        </div>
      </div>

      {/* Search and Taxonomy Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#697586] dark:text-[#C0CAD6]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مطلع بيت أو عنوان قصيدة أو اسم شاعر..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] text-sm min-h-[44px]"
          />
        </div>

        <select
          aria-label="تصفية حسب العصر"
          value={selectedEraId ?? ''}
          onChange={(e) => setSelectedEraId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] text-sm min-h-[44px]"
        >
          <option value="">جميع العصور</option>
          {eras.map((era) => (
            <option key={era.id} value={era.id}>
              {era.nameAr}
            </option>
          ))}
        </select>

        {tab === 'poems' ? (
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="تصفية حسب البحر"
              value={selectedMeterId ?? ''}
              onChange={(e) =>
                setSelectedMeterId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] text-xs min-h-[44px]"
            >
              <option value="">كل البحور</option>
              {meters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameAr}
                </option>
              ))}
            </select>
            <select
              aria-label="تصفية حسب الغرض"
              value={selectedThemeId ?? ''}
              onChange={(e) =>
                setSelectedThemeId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] text-xs min-h-[44px]"
            >
              <option value="">كل الأغراض</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameAr}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-10 text-center text-sm text-[#697586] dark:text-[#C0CAD6]">
          جارٍ البحث في الدواوين...
        </div>
      ) : !backendAvailable && !offlinePack ? (
        <div className="rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-8 sm:p-10 text-center space-y-3">
          <h2 className="text-xl font-bold font-poetry">المكتبة بانتظار ربط الخادم الخلفي</h2>
          <p className="text-sm text-[#697586] dark:text-[#C0CAD6] max-w-xl mx-auto leading-relaxed">
            لا تُعرض بيانات شعرية وهمية في وضع تطوير الواجهة. عند تشغيل الخادم الخلفي (<code dir="ltr">npm run dev:api</code>) أو ربط قاعدة بيانات الشعر، ستظهر هنا القصائد والشعراء والعصور والبحور الحقيقية.
          </p>
          <button
            type="button"
            onClick={() => void recheckBackend()}
            className="px-4 py-2.5 rounded-xl bg-[#14243B] dark:bg-[#C6A15B] text-white dark:text-[#14243B] text-sm font-semibold min-h-[44px]"
          >
            إعادة فحص الاتصال بالخادم
          </button>
        </div>
      ) : tab === 'poems' ? (
        poems.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-10 text-center text-sm text-[#697586] dark:text-[#C0CAD6]">
            لم يُعثر على قصائد مطابقة لمعايير البحث.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {poems.map((poem) => (
              <button
                key={poem.id}
                type="button"
                onClick={() => void handleOpenPoem(poem.id)}
                className="text-right rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] hover:border-[#14243B] dark:hover:border-[#C6A15B] p-6 transition-colors space-y-3"
              >
                <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">
                  {poem.poetNameAr} · {poem.eraNameAr}
                  {poem.meterNameAr ? ` · ${poem.meterNameAr}` : ''}
                </div>
                <h2 className="text-xl font-bold font-poetry">{poem.titleAr}</h2>
                {poem.excerptSadr && (
                  <p className="font-poetry text-base text-[#697586] dark:text-[#C0CAD6] line-clamp-2">
                    {poem.excerptSadr} · {poem.excerptAjuz}
                  </p>
                )}
              </button>
            ))}
          </div>
        )
      ) : poets.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-10 text-center text-sm text-[#697586] dark:text-[#C0CAD6]">
          لم يُعثر على شعراء مطابقين.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {poets.map((poet) => (
            <button
              key={poet.id}
              type="button"
              onClick={() => void handleOpenPoet(poet.id)}
              className="text-right rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] hover:border-[#14243B] dark:hover:border-[#C6A15B] p-5 transition-colors flex items-start gap-4"
            >
              <img
                src={getAvatarImageUrl(poet.avatarKey || 'scholar_astrolabe')}
                alt={poet.nameAr}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover shrink-0" loading="lazy" decoding="async" />
              <div className="space-y-1 min-w-0">
                <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">
                  {poet.eraNameAr}
                  {poet.poemCount !== undefined ? ` · ${poet.poemCount} قصائد` : ''}
                </div>
                <h2 className="text-lg font-bold font-poetry truncate">{poet.nameAr}</h2>
                <p className="text-xs text-[#697586] dark:text-[#C0CAD6] line-clamp-2 leading-relaxed">
                  {poet.bioAr}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Full Poem Reader Modal */}
      {openPoem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl max-h-[88dvh] flex flex-col rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#E2D8C5] dark:border-[#35465E] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">
                  {openPoem.poetNameAr} · {openPoem.eraNameAr}
                  {openPoem.meterNameAr ? ` · ${openPoem.meterNameAr}` : ''}
                  {openPoem.themeNameAr ? ` · ${openPoem.themeNameAr}` : ''}
                </div>
                <h2 className="text-2xl font-bold font-poetry">{openPoem.titleAr}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenPoem(null)}
                aria-label="إغلاق القصيدة"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[#EAE2D2] dark:hover:bg-[#1E2732]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              <div className="space-y-4">
                {openPoem.verses.map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8 py-2.5 border-b border-[#EAE2D2] dark:border-[#35465E]/60 font-poetry text-xl leading-loose text-center"
                  >
                    <span>{v.sadr}</span>
                    <span>{v.ajuz}</span>
                  </div>
                ))}
              </div>

              {openPoem.poetBioAr && (
                <div className="p-4 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B] space-y-1">
                  <div className="text-xs font-semibold text-[#14243B] dark:text-[#C6A15B]">
                    ترجمة الشاعر: {openPoem.poetNameAr}
                  </div>
                  <p className="text-xs text-[#697586] dark:text-[#C0CAD6] leading-relaxed">
                    {openPoem.poetBioAr}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Poet Biography & Poems Modal */}
      {openPoet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#E2D8C5] dark:border-[#35465E] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">
                  {openPoet.poet.eraNameAr}
                  {openPoet.poet.titleAr ? ` · ${openPoet.poet.titleAr}` : ''}
                </div>
                <h2 className="text-2xl font-bold font-poetry">{openPoet.poet.nameAr}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenPoet(null)}
                aria-label="إغلاق"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[#EAE2D2] dark:hover:bg-[#1E2732]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <p className="text-sm text-[#697586] dark:text-[#C0CAD6] leading-relaxed">
                {openPoet.poet.bioAr}
              </p>

              <div className="space-y-3">
                <h3 className="font-bold font-poetry text-lg">القصائد المختارة</h3>
                {openPoet.poems.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => {
                      setOpenPoet(null);
                      void handleOpenPoem(pm.id);
                    }}
                    className="w-full text-right p-4 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B] hover:border-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-poetry text-lg font-bold">{pm.titleAr}</div>
                      <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">
                        {pm.meterNameAr || 'متنوع'} · {pm.verseCount} أبيات
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#14243B] dark:text-[#C6A15B]">
                      قراءة
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
