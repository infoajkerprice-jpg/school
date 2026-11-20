import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  Image as ImageIcon,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  Video,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { clampStr } from '../../lib/grading';
import { downloadNoticePdf } from '../../lib/reports';
import {
  AUDIENCE_BN,
  GALLERY_CATEGORY_BN,
  NEWS_CATEGORY_BN,
  NOTICE_CATEGORY_BN,
  toBnDigits,
} from '../../i18n';
import {
  CAMPUS_IMAGES,
  type GalleryItem,
  type NewsArticle,
  type NoticeItem,
  type UserAccount,
} from '../../types';
import { useUIFeedback } from '../ToastContext';

interface Props {
  currentUser: UserAccount;
  initialTab?: 'notices' | 'news' | 'gallery';
}

const CAMPUS_PRESETS = [
  { label: 'ক্যাম্পাস গেট', url: CAMPUS_IMAGES.hero },
  { label: 'অ্যাসেম্বলি', url: CAMPUS_IMAGES.assembly1 },
  { label: 'আয়োজন', url: CAMPUS_IMAGES.event },
  { label: 'প্রাঙ্গণ', url: CAMPUS_IMAGES.courtyard },
];

export const NoticesNewsModule: React.FC<Props> = ({ currentUser, initialTab = 'notices' }) => {
  const { notify, confirm } = useUIFeedback();
  const [tab, setTab] = useState<'notices' | 'news' | 'gallery'>(initialTab);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTab(initialTab);
    setSearchQuery('');
  }, [initialTab]);

  const isAdmin = currentUser.role === 'admin';
  const canPostNotice = isAdmin || currentUser.role === 'teacher';

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    category: 'Urgent' as NoticeItem['category'],
    audience: 'All' as NoticeItem['audience'],
    publishedDate: new Date().toISOString().slice(0, 10),
    isPinned: false,
  });

  const [newsForm, setNewsForm] = useState({
    title: '',
    summary: '',
    body: '',
    category: 'Achievement' as NewsArticle['category'],
    eventDate: new Date().toISOString().slice(0, 10),
    imageUrl: CAMPUS_IMAGES.event as string,
  });

  const [galleryForm, setGalleryForm] = useState({
    title: '',
    caption: '',
    category: 'Campus' as GalleryItem['category'],
    mediaType: 'photo' as 'photo' | 'video',
    imageUrl: CAMPUS_IMAGES.hero as string,
    videoUrl: '',
    eventDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'notices'),
      (s) =>
        setNotices(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() } as NoticeItem))
            .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'notices')
    );
    const u2 = onSnapshot(
      collection(db, 'news'),
      (s) =>
        setNews(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() } as NewsArticle))
            .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'news')
    );
    const u3 = onSnapshot(
      collection(db, 'gallery'),
      (s) => setGallery(s.docs.map((d) => ({ id: d.id, ...d.data() } as GalleryItem))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'gallery')
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const filteredNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notices;
    return notices.filter((n) =>
      `${n.titleBn || n.title} ${n.contentBn || n.content}`.toLowerCase().includes(q)
    );
  }, [notices, searchQuery]);

  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return news;
    return news.filter((a) =>
      `${a.titleBn || a.title} ${a.summaryBn || a.summary}`.toLowerCase().includes(q)
    );
  }, [news, searchQuery]);

  const filteredGallery = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return gallery;
    return gallery.filter((g) =>
      `${g.titleBn || g.title} ${g.caption || ''}`.toLowerCase().includes(q)
    );
  }, [gallery, searchQuery]);

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPostNotice) return;
    setSaving(true);
    try {
      const payload = {
        title: clampStr(noticeForm.title, 180),
        titleBn: clampStr(noticeForm.title, 180),
        content: clampStr(noticeForm.content, 3000),
        contentBn: clampStr(noticeForm.content, 3000),
        category: noticeForm.category,
        audience: noticeForm.audience,
        publishedDate: noticeForm.publishedDate,
        isPinned: noticeForm.isPinned,
      };
      if (editingNoticeId) {
        await updateDoc(doc(db, 'notices', editingNoticeId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        notify('নোটিশ সফলভাবে হালনাগাদ করা হয়েছে।', 'success');
      } else {
        const id = makeSafeDocId('ntc');
        await setDoc(doc(db, 'notices', id), {
          ...payload,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify('নতুন নোটিশ প্রকাশ করা হয়েছে এবং হোমপেজ টিকারে যুক্ত হয়েছে।', 'success');
      }
      setEditingNoticeId(null);
      setNoticeForm({
        title: '',
        content: '',
        category: 'Urgent',
        audience: 'All',
        publishedDate: new Date().toISOString().slice(0, 10),
        isPinned: false,
      });
    } catch (err) {
      notify('নোটিশ সংরক্ষণ করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, editingNoticeId ? OperationType.UPDATE : OperationType.CREATE, 'notices');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('nws');
      await setDoc(doc(db, 'news', id), {
        title: clampStr(newsForm.title, 180),
        titleBn: clampStr(newsForm.title, 180),
        summary: clampStr(newsForm.summary, 500),
        summaryBn: clampStr(newsForm.summary, 500),
        body: clampStr(newsForm.body || newsForm.summary, 4000),
        category: newsForm.category,
        eventDate: newsForm.eventDate,
        imageUrl: clampStr(newsForm.imageUrl, 500),
        authorUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewsForm({
        title: '',
        summary: '',
        body: '',
        category: 'Achievement',
        eventDate: new Date().toISOString().slice(0, 10),
        imageUrl: CAMPUS_IMAGES.event,
      });
      notify('নতুন সংবাদ সফলভাবে প্রকাশিত হয়েছে।', 'success');
    } catch (err) {
      notify('সংবাদ প্রকাশ করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.CREATE, 'news');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('gal');
      await setDoc(doc(db, 'gallery', id), {
        title: clampStr(galleryForm.title, 140),
        titleBn: clampStr(galleryForm.title, 140),
        caption: clampStr(galleryForm.caption, 400),
        category: galleryForm.category,
        mediaType: galleryForm.mediaType,
        imageUrl: clampStr(galleryForm.imageUrl, 500),
        videoUrl: galleryForm.mediaType === 'video' ? clampStr(galleryForm.videoUrl, 500) : '',
        eventDate: galleryForm.eventDate,
        authorUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setGalleryForm({
        title: '',
        caption: '',
        category: 'Campus',
        mediaType: 'photo',
        imageUrl: CAMPUS_IMAGES.hero,
        videoUrl: '',
        eventDate: new Date().toISOString().slice(0, 10),
      });
      notify('গ্যালারিতে নতুন মিডিয়া যুক্ত করা হয়েছে।', 'success');
    } catch (err) {
      notify('গ্যালারিতে মিডিয়া যুক্ত করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.CREATE, 'gallery');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (col: 'notices' | 'news' | 'gallery', id: string, title: string) => {
    if (!isAdmin) return;
    const label = col === 'notices' ? 'নোটিশ' : col === 'news' ? 'সংবাদ' : 'গ্যালারি আইটেম';
    const ok = await confirm({
      title: `${label} মুছে ফেলবেন?`,
      message: `"${title}" স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি আর ফিরিয়ে আনা যাবে না।`,
      confirmLabel: 'হ্যাঁ, মুছুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, col, id));
      notify(`${label}টি সফলভাবে মুছে ফেলা হয়েছে।`, 'success');
    } catch (err) {
      notify('মুছে ফেলতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.DELETE, `${col}/${id}`);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2.5 text-sm text-[#263B35] transition focus:border-[#087F5B] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
  const labelClass = 'mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#123B67] dark:text-white">
            {tab === 'notices'
              ? 'নোটিশ বোর্ড ব্যবস্থাপনা'
              : tab === 'news'
              ? 'সংবাদ ও বিজ্ঞপ্তি ব্যবস্থাপনা'
              : 'ছবি ও ভিডিও গ্যালারি ব্যবস্থাপনা'}
          </h2>
          <p className="text-xs text-[#546E7A] dark:text-slate-400">
            প্রকাশিত সকল নোটিশ, সংবাদ এবং ছবি-ভিডিও সরাসরি হোমপেজে রিয়েল-টাইমে আপডেট হয়।
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'notices', label: `নোটিশ (${toBnDigits(notices.length)})`, active: 'bg-[#087F5B] text-white' },
              { id: 'news', label: `সংবাদ (${toBnDigits(news.length)})`, active: 'bg-[#21A9D6] text-white' },
              { id: 'gallery', label: `গ্যালারি (${toBnDigits(gallery.length)})`, active: 'bg-[#805AD5] text-white' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === t.id
                  ? `${t.active} shadow-xs`
                  : 'bg-white text-[#263B35] ring-1 ring-[#D4E6DD] hover:bg-[#E9F7F1] dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Search Bar */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            tab === 'notices'
              ? 'নোটিশ খুঁজুন...'
              : tab === 'news'
              ? 'সংবাদ খুঁজুন...'
              : 'গ্যালারি শিরোনাম খুঁজুন...'
          }
          className="w-full rounded-xl border border-[#CFE0D6] bg-white py-2.5 pr-4 pl-10 text-xs text-[#263B35] focus:border-[#087F5B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* ==================== NOTICES TAB ==================== */}
      {tab === 'notices' && (
        <div className="space-y-5">
          {canPostNotice && (
            <form
              onSubmit={handleSaveNotice}
              className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#087F5B] dark:text-emerald-400">
                  {editingNoticeId ? 'নোটিশ সম্পাদনা করুন' : 'নতুন নোটিশ প্রকাশ করুন'}
                </h3>
                {editingNoticeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoticeId(null);
                      setNoticeForm({
                        title: '',
                        content: '',
                        category: 'Urgent',
                        audience: 'All',
                        publishedDate: new Date().toISOString().slice(0, 10),
                        isPinned: false,
                      });
                    }}
                    className="rounded-lg bg-[#F2F8F5] px-3 py-1 text-xs font-bold text-[#123B67] dark:bg-slate-800 dark:text-slate-200"
                  >
                    বাতিল
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className={labelClass}>নোটিশের শিরোনাম *</label>
                  <input
                    required
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    placeholder="যেমন: ২০২৫ শিক্ষাবর্ষের অর্ধবার্ষিক পরীক্ষার সময়সূচি প্রকাশ সংক্রান্ত বিজ্ঞপ্তি"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>ক্যাটাগরি</label>
                  <select
                    value={noticeForm.category}
                    onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value as NoticeItem['category'] })}
                    className={inputClass}
                  >
                    {(['Urgent', 'Admission', 'Exam', 'Holiday', 'Result', 'Academic', 'General'] as const).map((c) => (
                      <option key={c} value={c}>
                        {NOTICE_CATEGORY_BN[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>প্রাপক</label>
                  <select
                    value={noticeForm.audience}
                    onChange={(e) => setNoticeForm({ ...noticeForm, audience: e.target.value as NoticeItem['audience'] })}
                    className={inputClass}
                  >
                    {Object.entries(AUDIENCE_BN).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>প্রকাশের তারিখ *</label>
                  <input
                    required
                    type="date"
                    value={noticeForm.publishedDate}
                    onChange={(e) => setNoticeForm({ ...noticeForm, publishedDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#263B35] dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={noticeForm.isPinned}
                      onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
                      className="h-4 w-4 accent-[#087F5B]"
                    />
                    উপরে পিন করে রাখুন
                  </label>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className={labelClass}>বিস্তারিত বিবরণ *</label>
                  <textarea
                    required
                    rows={3}
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                    placeholder="নোটিশের পূর্ণাঙ্গ বিবরণ লিখুন..."
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'সংরক্ষণ হচ্ছে...' : editingNoticeId ? 'নোটিশ হালনাগাদ করুন' : 'নোটিশ প্রকাশ করুন'}
              </button>
            </form>
          )}

          <div className="space-y-3">
            {filteredNotices.map((n) => (
              <div
                key={n.id}
                className="rounded-2xl border border-[#D4E6DD] bg-white p-4 shadow-xs transition hover:border-[#087F5B]/40 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      {n.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF5E4] px-2 py-0.5 text-[#9A5B00]">
                          <Pin className="h-3 w-3" /> পিন করা
                        </span>
                      )}
                      <span className="rounded-md bg-[#E9F7F1] px-2 py-0.5 text-[#087F5B] dark:bg-emerald-950/60 dark:text-emerald-300">
                        {NOTICE_CATEGORY_BN[n.category] || n.category}
                      </span>
                      <span className="text-[#5B727E] dark:text-slate-400">
                        {toBnDigits(n.publishedDate)}
                      </span>
                      <span className="text-[#5B727E] dark:text-slate-400">
                        · {AUDIENCE_BN[n.audience]}
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-[#123B67] dark:text-white">
                      {n.titleBn || n.title}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#4C6370] dark:text-slate-300">
                      {n.contentBn || n.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => downloadNoticePdf(n)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#E7F7FC] px-2.5 py-1.5 text-xs font-bold text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white dark:bg-sky-950/60 dark:text-sky-300"
                    >
                      <Download className="h-3.5 w-3.5" />
                      পিডিএফ
                    </button>
                    {canPostNotice && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoticeId(n.id);
                          setNoticeForm({
                            title: n.titleBn || n.title,
                            content: n.contentBn || n.content,
                            category: n.category,
                            audience: n.audience,
                            publishedDate: n.publishedDate,
                            isPinned: n.isPinned,
                          });
                        }}
                        aria-label="সম্পাদনা"
                        className="rounded-lg bg-[#E9F7F1] p-1.5 text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white dark:bg-emerald-950/60 dark:text-emerald-300"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void handleDelete('notices', n.id, n.titleBn || n.title)}
                        aria-label="মুছুন"
                        className="rounded-lg bg-rose-50 p-1.5 text-rose-700 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/60 dark:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== NEWS TAB ==================== */}
      {tab === 'news' && (
        <div className="space-y-5">
          {isAdmin && (
            <form
              onSubmit={handleSaveNews}
              className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="mb-3.5 text-sm font-extrabold text-[#21A9D6]">
                নতুন সংবাদ ও অনুষ্ঠান প্রকাশ করুন
              </h3>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>সংবাদের শিরোনাম *</label>
                  <input
                    required
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>বিভাগ</label>
                  <select
                    value={newsForm.category}
                    onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value as NewsArticle['category'] })}
                    className={inputClass}
                  >
                    {Object.entries(NEWS_CATEGORY_BN).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>তারিখ *</label>
                  <input
                    required
                    type="date"
                    value={newsForm.eventDate}
                    onChange={(e) => setNewsForm({ ...newsForm, eventDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>ছবির লিংক ও প্রিভিউ</label>
                  <div className="flex items-center gap-2.5">
                    <input
                      value={newsForm.imageUrl}
                      onChange={(e) => setNewsForm({ ...newsForm, imageUrl: e.target.value })}
                      className={inputClass}
                    />
                    {newsForm.imageUrl && (
                      <img
                        src={newsForm.imageUrl}
                        alt="News preview"
                        className="h-10 w-14 shrink-0 rounded-lg border border-[#D4E6DD] object-cover"
                      />
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelClass}>সংক্ষিপ্ত সারসংক্ষেপ *</label>
                  <textarea
                    required
                    rows={2}
                    value={newsForm.summary}
                    onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelClass}>বিস্তারিত প্রতিবেদন</label>
                  <textarea
                    rows={3}
                    value={newsForm.body}
                    onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#21A9D6] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0E7DA3]"
              >
                <Plus className="h-4 w-4" />
                সংবাদ প্রকাশ করুন
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredNews.map((a) => (
              <div
                key={a.id}
                className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                {a.imageUrl && <img src={a.imageUrl} alt={a.title} className="h-44 w-full object-cover" />}
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#087F5B]">
                    <span>{NEWS_CATEGORY_BN[a.category]}</span>
                    <span className="text-[#5B727E] dark:text-slate-400">{toBnDigits(a.eventDate)}</span>
                  </div>
                  <h4 className="mt-1.5 text-sm font-bold text-[#123B67] dark:text-white">
                    {a.titleBn || a.title}
                  </h4>
                  <p className="mt-1 text-xs text-[#4C6370] dark:text-slate-300">
                    {a.summaryBn || a.summary}
                  </p>
                  {isAdmin && (
                    <div className="mt-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete('news', a.id, a.titleBn || a.title)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/60 dark:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        মুছুন
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== GALLERY TAB ==================== */}
      {tab === 'gallery' && (
        <div className="space-y-5">
          {isAdmin && (
            <form
              onSubmit={handleSaveGallery}
              className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="mb-3.5 text-sm font-extrabold text-[#805AD5]">
                নতুন ছবি বা ভিডিও যোগ করুন
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>শিরোনাম *</label>
                    <input
                      required
                      value={galleryForm.title}
                      onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
                      placeholder="যেমন: বার্ষিক ক্রীড়া অনুষ্ঠানের ছবির একাংশ"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>মিডিয়ার ধরন</label>
                    <select
                      value={galleryForm.mediaType}
                      onChange={(e) =>
                        setGalleryForm({ ...galleryForm, mediaType: e.target.value as 'photo' | 'video' })
                      }
                      className={inputClass}
                    >
                      <option value="photo">ছবি</option>
                      <option value="video">ভিডিও</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>বিভাগ</label>
                    <select
                      value={galleryForm.category}
                      onChange={(e) =>
                        setGalleryForm({ ...galleryForm, category: e.target.value as GalleryItem['category'] })
                      }
                      className={inputClass}
                    >
                      {Object.entries(GALLERY_CATEGORY_BN).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>ছবি / থাম্বনেইল লিংক *</label>
                    <input
                      required
                      value={galleryForm.imageUrl}
                      onChange={(e) => setGalleryForm({ ...galleryForm, imageUrl: e.target.value })}
                      className={inputClass}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {CAMPUS_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setGalleryForm({ ...galleryForm, imageUrl: p.url })}
                          className="rounded-lg border border-[#D4E6DD] bg-[#F2F8F5] px-2.5 py-1 text-[11px] font-bold text-[#123B67] transition hover:bg-[#805AD5] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {galleryForm.mediaType === 'video' && (
                    <div className="sm:col-span-2">
                      <label className={labelClass}>ভিডিও লিংক (YouTube বা MP4)</label>
                      <input
                        value={galleryForm.videoUrl}
                        onChange={(e) => setGalleryForm({ ...galleryForm, videoUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className={inputClass}
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className={labelClass}>সংক্ষিপ্ত ক্যাপশন</label>
                    <input
                      value={galleryForm.caption}
                      onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Live Thumbnail Preview */}
                <div className="flex flex-col justify-between rounded-2xl border border-[#D4E6DD] bg-[#F8FBF9] p-3.5 dark:border-slate-800 dark:bg-slate-800/60 lg:col-span-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#123B67] dark:text-slate-300">
                    <Eye className="h-3.5 w-3.5 text-[#805AD5]" />
                    লাইভ মিডিয়া প্রিভিউ
                  </div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#DCE8E1] bg-[#123B67]">
                    {galleryForm.imageUrl ? (
                      <img
                        src={galleryForm.imageUrl}
                        alt="Gallery preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-white/70">
                        ছবির লিংক দিন
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#805AD5] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#6B46C1]"
                  >
                    <Plus className="h-4 w-4" />
                    গ্যালারিতে সংরক্ষণ করুন
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGallery.map((g) => (
              <div
                key={g.id}
                className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative h-44">
                  <img src={g.imageUrl} alt={g.title} className="h-full w-full object-cover" />
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-lg bg-[#123B67]/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                    {g.mediaType === 'video' || g.videoUrl ? (
                      <>
                        <Video className="h-3 w-3 text-[#F4A62A]" /> ভিডিও
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3 w-3 text-[#21A9D6]" /> ছবি
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#123B67] dark:text-white">
                      {g.titleBn || g.title}
                    </p>
                    <p className="text-[11px] text-[#5B727E] dark:text-slate-400">
                      {GALLERY_CATEGORY_BN[g.category]}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => void handleDelete('gallery', g.id, g.titleBn || g.title)}
                      aria-label="মুছুন"
                      className="rounded-lg bg-rose-50 p-1.5 text-rose-700 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/60 dark:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
