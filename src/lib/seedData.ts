import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { syncPdfStudentsToFirestore } from './pdfStudentsRoster';
import { syncPdfTeachersToFirestore } from './pdfTeachersRoster';
import { CAMPUS_IMAGES, DEFAULT_SITE_SETTINGS } from '../types';

/**
 * Admin-triggered Firestore initializer for Shah Islamic School And College.
 * Populates ONLY verified institutional settings, authentic campus hero slides,
 * campus gallery photos, and official government education links without
 * creating any fabricated student, teacher, or achievement counts.
 */
export async function initializeSchoolDatabase(adminUid: string): Promise<void> {
  // 1. Official Institutional Settings (Shah Islamic School And College)
  try {
    await setDoc(doc(db, 'site_settings', 'main'), {
      ...DEFAULT_SITE_SETTINGS,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'site_settings/main');
  }

  // 2. Hero Image Slider (Authentic Campus Photos)
  const slidesSeed = [
    {
      id: 'slide_sisc_welcome',
      title: 'স্বাগতম শাহ ইসলামিক স্কুল এন্ড কলেজ-এ!',
      subtitle: 'এসো শিখি দুনিয়া ও আখিরাতের কল্যাণে · বাংলা, ইংরেজি ও আরবি ভাষার সমন্বয়ে আধুনিক ও ইসলামিক শিক্ষা',
      imageUrl: CAMPUS_IMAGES.hero,
      orderIndex: 1,
      isActive: true,
    },
    {
      id: 'slide_sisc_assembly',
      title: 'শৃঙ্খলাপূর্ণ পরিবেশে প্রাত্যহিক সমাবেশ ও পাঠদান',
      subtitle: 'প্লে গ্রুপ থেকে অষ্টম শ্রেণি পর্যন্ত মর্নিং ও ডে শিফটে পাঠদান এবং হিফজুল কুরআন বিভাগ',
      imageUrl: CAMPUS_IMAGES.assembly1,
      orderIndex: 2,
      isActive: true,
    },
    {
      id: 'slide_sisc_event',
      title: 'শিক্ষক-শিক্ষার্থীদের আনন্দঘন ক্যাম্পাস কার্যক্রম',
      subtitle: 'নৈতিক, আদর্শবান ও সৃজনশীল প্রজন্ম গঠনে আমাদের নিরন্তর প্রচেষ্টা',
      imageUrl: CAMPUS_IMAGES.event,
      orderIndex: 3,
      isActive: true,
    },
    {
      id: 'slide_sisc_campus',
      title: 'আধুনিক সাধারণ শিক্ষা ও ইসলামিক মূল্যবোধের সমন্বয়',
      subtitle: 'তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০',
      imageUrl: CAMPUS_IMAGES.courtyard,
      orderIndex: 4,
      isActive: true,
    },
  ];

  for (const s of slidesSeed) {
    try {
      await setDoc(doc(db, 'slides', s.id), {
        ...s,
        authorUid: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `slides/${s.id}`);
    }
  }

  // 3. Authentic Campus Gallery Photos
  const gallerySeed = [
    {
      id: 'gal_sisc_gate',
      title: 'শাহ ইসলামিক স্কুল এন্ড কলেজ মূল ফটক ও শিক্ষকমণ্ডলী',
      titleBn: 'শাহ ইসলামিক স্কুল এন্ড কলেজ মূল ফটক ও শিক্ষকমণ্ডলী',
      caption: 'তুলসীঘাট, গাইবান্ধা সদরে অবস্থিত শাহ ইসলামিক স্কুল এন্ড কলেজের মূল প্রবেশদ্বার ও শিক্ষকমণ্ডলী।',
      category: 'Campus',
      mediaType: 'photo',
      imageUrl: CAMPUS_IMAGES.hero,
      videoUrl: '',
      eventDate: '',
    },
    {
      id: 'gal_sisc_assembly1',
      title: 'ক্যাম্পাস মাঠে শিক্ষার্থীদের প্রাত্যহিক সমাবেশ',
      titleBn: 'ক্যাম্পাস মাঠে শিক্ষার্থীদের প্রাত্যহিক সমাবেশ',
      caption: 'সকালের শৃঙ্খলাবদ্ধ সমাবেশে শিক্ষক ও শিক্ষার্থীবৃন্দ।',
      category: 'Campus',
      mediaType: 'photo',
      imageUrl: CAMPUS_IMAGES.assembly1,
      videoUrl: '',
      eventDate: '',
    },
    {
      id: 'gal_sisc_event',
      title: 'শিক্ষক ও শিক্ষার্থীদের ক্যাম্পাস আনন্দ আয়োজন',
      titleBn: 'শিক্ষক ও শিক্ষার্থীদের ক্যাম্পাস আনন্দ আয়োজন',
      caption: 'বিদ্যালয় প্রাঙ্গণে শিক্ষক ও কোমলমতি শিক্ষার্থীদের বিশেষ আয়োজন।',
      category: 'Cultural',
      mediaType: 'photo',
      imageUrl: CAMPUS_IMAGES.event,
      videoUrl: '',
      eventDate: '',
    },
    {
      id: 'gal_sisc_assembly2',
      title: 'শিক্ষার্থীদের শৃঙ্খলাবদ্ধ লাইনআপ ও সমাবেশ',
      titleBn: 'শিক্ষার্থীদের শৃঙ্খলাবদ্ধ লাইনআপ ও সমাবেশ',
      caption: 'নিয়মিত প্রাত্যহিক সমাবেশে ইসলামিক আদব-কায়দা ও শৃঙ্খলার চর্চা।',
      category: 'Campus',
      mediaType: 'photo',
      imageUrl: CAMPUS_IMAGES.assembly2,
      videoUrl: '',
      eventDate: '',
    },
    {
      id: 'gal_sisc_courtyard',
      title: 'সবুজ খেলার মাঠ ও একাডেমিক শ্রেণিকক্ষ ভবন',
      titleBn: 'সবুজ খেলার মাঠ ও একাডেমিক শ্রেণিকক্ষ ভবন',
      caption: 'প্রশস্ত সবুজ মাঠ ও আধুনিক পরিবেশে সাজানো একাডেমিক ভবন।',
      category: 'Campus',
      mediaType: 'photo',
      imageUrl: CAMPUS_IMAGES.courtyard,
      videoUrl: '',
      eventDate: '',
    },
    {
      id: 'gal_sisc_building',
      title: 'দ্বিতল একাডেমিক ভবন ও ক্যাম্পাস প্রাঙ্গণ',
      titleBn: 'দ্বিতল একাডেমিক ভবন ও ক্যাম্পাস প্রাঙ্গণ',
      caption: 'পরিচ্ছন্ন ও নিরাপদ ক্যাম্পাস প্রাঙ্গণ এবং দ্বিতল শ্রেণিকক্ষ ভবন।',
      category: 'Campus',
      mediaType: 'photo',
      imageUrl: CAMPUS_IMAGES.building,
      videoUrl: '',
      eventDate: '',
    },
    {
      id: 'gal_sisc_field',
      title: 'ক্যাম্পাসের মনোরম পরিবেশ ও প্রাঙ্গণ',
      titleBn: 'ক্যাম্পাসের মনোরম পরিবেশ ও প্রাঙ্গণ',
      caption: 'শাহ ইসলামিক স্কুল এন্ড কলেজের খোলামেলা ও মনোরম শিক্ষাঙ্গন।',
      category: 'Campus',
      mediaType: 'photo',
      imageUrl: CAMPUS_IMAGES.field,
      videoUrl: '',
      eventDate: '',
    },
  ];

  for (const g of gallerySeed) {
    try {
      await setDoc(doc(db, 'gallery', g.id), {
        ...g,
        authorUid: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `gallery/${g.id}`);
    }
  }

  // 4. Official Important Education Links (Bangladesh & Dinajpur Board for Gaibandha)
  const linksSeed = [
    {
      id: 'lnk_sisc_web',
      title: 'শাহ ইসলামিক স্কুল এন্ড কলেজ (অফিসিয়াল ওয়েবসাইট)',
      url: 'https://shahislamicschool.com',
      category: 'প্রতিষ্ঠান',
      orderIndex: 1,
    },
    {
      id: 'lnk_moe',
      title: 'শিক্ষা মন্ত্রণালয়',
      url: 'https://moedu.gov.bd',
      category: 'সরকারি পোর্টাল',
      orderIndex: 2,
    },
    {
      id: 'lnk_dshe',
      title: 'মাধ্যমিক ও উচ্চ শিক্ষা অধিদপ্তর',
      url: 'https://dshe.gov.bd',
      category: 'সরকারি পোর্টাল',
      orderIndex: 3,
    },
    {
      id: 'lnk_dinajpur_board',
      title: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, দিনাজপুর',
      url: 'https://dinajpureducationboard.gov.bd',
      category: 'শিক্ষা বোর্ড',
      orderIndex: 4,
    },
    {
      id: 'lnk_nctb',
      title: 'জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (এনসিটিবি)',
      url: 'https://nctb.gov.bd',
      category: 'পাঠ্যবই',
      orderIndex: 5,
    },
    {
      id: 'lnk_eboardresults',
      title: 'শিক্ষা বোর্ড ফলাফল পোর্টাল',
      url: 'https://eboardresults.com',
      category: 'ফলাফল',
      orderIndex: 6,
    },
  ];

  for (const l of linksSeed) {
    try {
      await setDoc(doc(db, 'important_links', l.id), {
        ...l,
        authorUid: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `important_links/${l.id}`);
    }
  }

  // 5. Verified Student & Teacher Rosters from official school PDFs
  await syncPdfStudentsToFirestore();
  await syncPdfTeachersToFirestore();
}
