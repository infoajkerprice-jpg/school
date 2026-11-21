import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { compareFacultyHierarchy, DEFAULT_FALLBACK_FACULTY } from '../lib/pdfTeachersRoster';
import {
  CAMPUS_IMAGES,
  DEFAULT_SITE_SETTINGS,
  type ExamResult,
  type FacultyPublic,
  type GalleryItem,
  type GoverningMember,
  type HeroSlide,
  type ImportantLink,
  type LibraryResource,
  type NewsArticle,
  type NoticeItem,
  type RoutineItem,
  type SiteSettings,
  type StudentAchievement,
} from '../types';

export function isLegacyRemovedImage(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('hero_dhaka_campus') ||
    url.includes('science_lab_students') ||
    url.includes('school_library_hall') ||
    url.includes('annual_sports_campus') ||
    url.includes('principal_portrait')
  );
}

function upgradeToHdCampusImage(url?: string): string {
  if (!url) return '';
  if (url.includes('image_f81b0478.png')) return CAMPUS_IMAGES.hero;
  if (url.includes('image_700ee452.png')) return CAMPUS_IMAGES.assembly1;
  if (url.includes('image_38773109.png')) return CAMPUS_IMAGES.event;
  if (url.includes('image_3200ce6a.png')) return CAMPUS_IMAGES.courtyard;
  return url;
}

export const DEFAULT_FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: 'default_1',
    title: 'স্বাগতম শাহ ইসলামিক স্কুল এন্ড কলেজ-এ!',
    subtitle: 'এসো শিখি দুনিয়া ও আখিরাতের কল্যাণে · বাংলা, ইংরেজি ও আরবি ভাষার সমন্বয়ে আধুনিক ও ইসলামিক শিক্ষা',
    imageUrl: CAMPUS_IMAGES.hero,
    orderIndex: 1,
    isActive: true,
    authorUid: 'system',
  },
  {
    id: 'default_2',
    title: 'শৃঙ্খলাপূর্ণ পরিবেশে প্রাত্যহিক সমাবেশ ও পাঠদান',
    subtitle: 'প্লে গ্রুপ থেকে অষ্টম শ্রেণি পর্যন্ত মর্নিং ও ডে শিফটে পাঠদান এবং হিফজুল কুরআন বিভাগ',
    imageUrl: CAMPUS_IMAGES.assembly1,
    orderIndex: 2,
    isActive: true,
    authorUid: 'system',
  },
  {
    id: 'default_3',
    title: 'শিক্ষক-শিক্ষার্থীদের আনন্দঘন ক্যাম্পাস কার্যক্রম',
    subtitle: 'নৈতিক, আদর্শবান ও সৃজনশীল প্রজন্ম গঠনে আমাদের নিরন্তর প্রচেষ্টা',
    imageUrl: CAMPUS_IMAGES.event,
    orderIndex: 3,
    isActive: true,
    authorUid: 'system',
  },
  {
    id: 'default_4',
    title: 'আধুনিক সাধারণ শিক্ষা ও ইসলামিক মূল্যবোধের সমন্বয়',
    subtitle: 'তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০',
    imageUrl: CAMPUS_IMAGES.courtyard,
    orderIndex: 4,
    isActive: true,
    authorUid: 'system',
  },
];

export const DEFAULT_FALLBACK_GALLERY: GalleryItem[] = [
  {
    id: 'gal_sisc_1',
    title: 'শাহ ইসলামিক স্কুল এন্ড কলেজ মূল ফটক ও শিক্ষকমণ্ডলী',
    titleBn: 'শাহ ইসলামিক স্কুল এন্ড কলেজ মূল ফটক ও শিক্ষকমণ্ডলী',
    caption: 'তুলসীঘাট, গাইবান্ধা সদরে অবস্থিত শাহ ইসলামিক স্কুল এন্ড কলেজের মূল প্রবেশদ্বার ও শিক্ষকমণ্ডলী।',
    category: 'Campus',
    mediaType: 'photo',
    imageUrl: CAMPUS_IMAGES.hero,
    eventDate: '',
    authorUid: 'system',
  },
  {
    id: 'gal_sisc_2',
    title: 'ক্যাম্পাস মাঠে শিক্ষার্থীদের প্রাত্যহিক সমাবেশ',
    titleBn: 'ক্যাম্পাস মাঠে শিক্ষার্থীদের প্রাত্যহিক সমাবেশ',
    caption: 'সকালের শৃঙ্খলাবদ্ধ সমাবেশে শিক্ষক ও শিক্ষার্থীবৃন্দ।',
    category: 'Campus',
    mediaType: 'photo',
    imageUrl: CAMPUS_IMAGES.assembly1,
    eventDate: '',
    authorUid: 'system',
  },
  {
    id: 'gal_sisc_3',
    title: 'শিক্ষক ও শিক্ষার্থীদের ক্যাম্পাস আনন্দ আয়োজন',
    titleBn: 'শিক্ষক ও শিক্ষার্থীদের ক্যাম্পাস আনন্দ আয়োজন',
    caption: 'বিদ্যালয় প্রাঙ্গণে শিক্ষক ও কোমলমতি শিক্ষার্থীদের বিশেষ আয়োজন।',
    category: 'Cultural',
    mediaType: 'photo',
    imageUrl: CAMPUS_IMAGES.event,
    eventDate: '',
    authorUid: 'system',
  },
  {
    id: 'gal_sisc_4',
    title: 'শিক্ষার্থীদের শৃঙ্খলাবদ্ধ লাইনআপ ও সমাবেশ',
    titleBn: 'শিক্ষার্থীদের শৃঙ্খলাবদ্ধ লাইনআপ ও সমাবেশ',
    caption: 'নিয়মিত প্রাত্যহিক সমাবেশে ইসলামিক আদব-কায়দা ও শৃঙ্খলার চর্চা।',
    category: 'Campus',
    mediaType: 'photo',
    imageUrl: CAMPUS_IMAGES.assembly2,
    eventDate: '',
    authorUid: 'system',
  },
  {
    id: 'gal_sisc_5',
    title: 'সবুজ খেলার মাঠ ও একাডেমিক শ্রেণিকক্ষ ভবন',
    titleBn: 'সবুজ খেলার মাঠ ও একাডেমিক শ্রেণিকক্ষ ভবন',
    caption: 'প্রশস্ত সবুজ মাঠ ও আধুনিক পরিবেশে সাজানো একাডেমিক ভবন।',
    category: 'Campus',
    mediaType: 'photo',
    imageUrl: CAMPUS_IMAGES.courtyard,
    eventDate: '',
    authorUid: 'system',
  },
  {
    id: 'gal_sisc_6',
    title: 'দ্বিতল একাডেমিক ভবন ও ক্যাম্পাস প্রাঙ্গণ',
    titleBn: 'দ্বিতল একাডেমিক ভবন ও ক্যাম্পাস প্রাঙ্গণ',
    caption: 'পরিচ্ছন্ন ও নিরাপদ ক্যাম্পাস প্রাঙ্গণ এবং দ্বিতল শ্রেণিকক্ষ ভবন।',
    category: 'Campus',
    mediaType: 'photo',
    imageUrl: CAMPUS_IMAGES.building,
    eventDate: '',
    authorUid: 'system',
  },
  {
    id: 'gal_sisc_7',
    title: 'ক্যাম্পাসের মনোরম পরিবেশ ও প্রাঙ্গণ',
    titleBn: 'ক্যাম্পাসের মনোরম পরিবেশ ও প্রাঙ্গণ',
    caption: 'শাহ ইসলামিক স্কুল এন্ড কলেজের খোলামেলা ও মনোরম শিক্ষাঙ্গন।',
    category: 'Campus',
    mediaType: 'photo',
    imageUrl: CAMPUS_IMAGES.field,
    eventDate: '',
    authorUid: 'system',
  },
];

export const DEFAULT_FALLBACK_LINKS: ImportantLink[] = [
  { id: 'lnk_1', title: 'শাহ ইসলামিক স্কুল এন্ড কলেজ (অফিসিয়াল ওয়েবসাইট)', url: 'https://shahislamicschool.com', orderIndex: 1, authorUid: 'system' },
  { id: 'lnk_2', title: 'শিক্ষা মন্ত্রণালয় (গণপ্রজাতন্ত্রী বাংলাদেশ সরকার)', url: 'https://moedu.gov.bd', orderIndex: 2, authorUid: 'system' },
  { id: 'lnk_3', title: 'মাধ্যমিক ও উচ্চ শিক্ষা অধিদপ্তর (মাউশি)', url: 'https://dshe.gov.bd', orderIndex: 3, authorUid: 'system' },
  { id: 'lnk_4', title: 'মাধ্যমিক ও উচ্চমাধ্যমিক শিক্ষা বোর্ড, দিনাজপুর', url: 'https://dinajpureducationboard.gov.bd', orderIndex: 4, authorUid: 'system' },
  { id: 'lnk_5', title: 'জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (এনসিটিবি)', url: 'https://nctb.gov.bd', orderIndex: 5, authorUid: 'system' },
];

export interface PublicDataState {
  settings: SiteSettings;
  slides: HeroSlide[];
  notices: NoticeItem[];
  news: NewsArticle[];
  faculty: FacultyPublic[];
  governingBody: GoverningMember[];
  importantLinks: ImportantLink[];
  achievements: StudentAchievement[];
  gallery: GalleryItem[];
  routines: RoutineItem[];
  libraryItems: LibraryResource[];
  publishedResults: ExamResult[];
  isLoading: boolean;
}

const PublicDataContext = createContext<PublicDataState | null>(null);

function isLegacyDemoSettings(data: Partial<SiteSettings>): boolean {
  const name = (data.schoolNameBn || '').trim();
  return name.includes('ঢাকা হেরিটেজ') || (data.email || '').includes('dhakaheritage');
}

export const PublicDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [faculty, setFaculty] = useState<FacultyPublic[]>([]);
  const [governingBody, setGoverningBody] = useState<GoverningMember[]>([]);
  const [importantLinks, setImportantLinks] = useState<ImportantLink[]>([]);
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryResource[]>([]);
  const [publishedResults, setPublishedResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const fallbackTimer = window.setTimeout(() => setIsLoading(false), 750);

    unsubs.push(
      onSnapshot(
        doc(db, 'site_settings', 'main'),
        (snap) => {
          if (snap.exists()) {
            const remote = snap.data() as SiteSettings;
            if (isLegacyDemoSettings(remote)) {
              setSettings(DEFAULT_SITE_SETTINGS);
            } else {
              const merged: SiteSettings = { ...DEFAULT_SITE_SETTINGS, ...remote, id: snap.id };
              if (isLegacyRemovedImage(merged.aboutImageUrl)) {
                merged.aboutImageUrl = DEFAULT_SITE_SETTINGS.aboutImageUrl;
              } else if (merged.aboutImageUrl) {
                merged.aboutImageUrl = upgradeToHdCampusImage(merged.aboutImageUrl);
              }
              if (isLegacyRemovedImage(merged.principalPhotoUrl)) {
                merged.principalPhotoUrl = '';
              }
              if (!merged.logoUrl || isLegacyRemovedImage(merged.logoUrl)) {
                merged.logoUrl = DEFAULT_SITE_SETTINGS.logoUrl;
              }
              setSettings(merged);
            }
          } else {
            setSettings(DEFAULT_SITE_SETTINGS);
          }
          setIsLoading(false);
        },
        (err) => {
          console.warn('site_settings read:', err);
          setIsLoading(false);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'slides'),
        (snap) => {
          const list = snap.docs
            .map((d) => {
              const item = { id: d.id, ...d.data() } as HeroSlide;
              return { ...item, imageUrl: upgradeToHdCampusImage(item.imageUrl) };
            })
            .filter((s) => s.isActive && !isLegacyRemovedImage(s.imageUrl))
            .sort((a, b) => a.orderIndex - b.orderIndex);
          setSlides(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'slides')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'notices'),
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as NoticeItem))
            .sort((a, b) => {
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              return b.publishedDate.localeCompare(a.publishedDate);
            });
          setNotices(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notices')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'news'),
        (snap) => {
          const list = snap.docs
            .map((d) => {
              const item = { id: d.id, ...d.data() } as NewsArticle;
              if (isLegacyRemovedImage(item.imageUrl)) {
                item.imageUrl = '';
              }
              return item;
            })
            .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
          setNews(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'news')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'faculty'),
        (snap) => {
          const list = snap.docs
            .map((d) => {
              const item = { id: d.id, ...d.data() } as FacultyPublic;
              if (isLegacyRemovedImage(item.photoUrl)) item.photoUrl = '';
              return item;
            })
            .filter((f) => f.status !== 'Inactive')
            .sort(compareFacultyHierarchy);
          setFaculty(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'faculty')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'governing_body'),
        (snap) => {
          const list = snap.docs
            .map((d) => {
              const item = { id: d.id, ...d.data() } as GoverningMember;
              if (isLegacyRemovedImage(item.photoUrl)) item.photoUrl = '';
              return item;
            })
            .sort((a, b) => a.orderIndex - b.orderIndex);
          setGoverningBody(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'governing_body')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'important_links'),
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as ImportantLink))
            .sort((a, b) => a.orderIndex - b.orderIndex);
          setImportantLinks(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'important_links')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'student_achievements'),
        (snap) => {
          setAchievements(
            snap.docs.map((d) => {
              const item = { id: d.id, ...d.data() } as StudentAchievement;
              if (isLegacyRemovedImage(item.photoUrl)) item.photoUrl = '';
              return item;
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'student_achievements')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'gallery'),
        (snap) => {
          const list = snap.docs
            .map((d) => {
              const item = { id: d.id, ...d.data() } as GalleryItem;
              return { ...item, imageUrl: upgradeToHdCampusImage(item.imageUrl) };
            })
            .filter((g) => !isLegacyRemovedImage(g.imageUrl));
          setGallery(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'gallery')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'routines'),
        (snap) => {
          setRoutines(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItem)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'routines')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'library_resources'),
        (snap) => {
          setLibraryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LibraryResource)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'library_resources')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'published_results'), where('status', '==', 'Published')),
        (snap) => {
          setPublishedResults(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExamResult)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'published_results')
      )
    );

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubs.forEach((u) => u());
    };
  }, []);

  return (
    <PublicDataContext.Provider
      value={{
        settings,
        slides: slides.length > 0 ? slides : DEFAULT_FALLBACK_SLIDES,
        notices,
        news,
        faculty: faculty.length > 0 ? faculty : DEFAULT_FALLBACK_FACULTY,
        governingBody,
        importantLinks: importantLinks.length > 0 ? importantLinks : DEFAULT_FALLBACK_LINKS,
        achievements,
        gallery: gallery.length > 0 ? gallery : DEFAULT_FALLBACK_GALLERY,
        routines,
        libraryItems,
        publishedResults,
        isLoading,
      }}
    >
      {children}
    </PublicDataContext.Provider>
  );
};

export function usePublicData(): PublicDataState {
  const ctx = useContext(PublicDataContext);
  if (!ctx) throw new Error('usePublicData must be used inside PublicDataProvider');
  return ctx;
}
