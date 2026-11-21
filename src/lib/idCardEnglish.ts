import type { SiteSettings, StudentRecord } from '../types';

const BN_DIGIT_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

const HAS_BENGALI_RE = /[\u0980-\u09FF]/;

/** Common Bangladeshi student & parent name dictionary for natural English spelling */
const BN_NAME_WORD_DICT: Record<string, string> = {
  'মোঃ': 'Md.',
  'মো:': 'Md.',
  'মো': 'Md.',
  'মোছাঃ': 'Mst.',
  'মোছা:': 'Mst.',
  'মোছা': 'Mst.',
  'মোহাম্মদ': 'Mohammad',
  'মুহাম্মদ': 'Muhammad',
  'মুহাম্মাদ': 'Muhammad',
  'আব্দুল্লাহ': 'Abdullah',
  'আব্দুল্লা': 'Abdullah',
  'আবদুল্লাহ': 'Abdullah',
  'আব্দুল': 'Abdul',
  'আবদুল': 'Abdul',
  'আহাদ': 'Ahad',
  'ইবনে': 'Ibne',
  'ওমর': 'Omar',
  'উমর': 'Omar',
  'আহনাফ': 'Ahnaf',
  'খালিদ': 'Khalid',
  'রাফি': 'Rafi',
  'আঁইয়াদ': 'Aiyad',
  'আঁইয়াদ': 'Aiyad',
  'ভূইয়া': 'Bhuiyan',
  'ভূইঁয়া': 'Bhuiyan',
  'ভূঁইয়া': 'Bhuiyan',
  'ভূইয়া': 'Bhuiyan',
  'রুশদ': 'Rushd',
  'বাইয়ান': 'Bayan',
  'জারিফ': 'Zarif',
  'রাইয়ান': 'Rayan',
  'রাইয়ান': 'Rayan',
  'নাজিফা': 'Nazifa',
  'আক্তার': 'Akter',
  'আকতার': 'Akter',
  'রুফাইদা': 'Rufaida',
  'জান্নাত': 'Jannat',
  'রাইফা': 'Raifa',
  'সিদরাতুল': 'Sidratul',
  'মুনতাহা': 'Muntaha',
  'সাফা': 'Safa',
  'সাফওয়াত': 'Safwat',
  'রওহা': 'Rowha',
  'সাজীম': 'Sazim',
  'শোয়াইব': 'Shoaib',
  'হাসান': 'Hasan',
  'সালেহ': 'Saleh',
  'শুহাইব': 'Shuhaib',
  'সাহাম': 'Saham',
  'আব্রাহাম': 'Abraham',
  'আয়াত': 'Ayat',
  'আয়াত': 'Ayat',
  'ইরফান': 'Irfan',
  'ইউশা': 'Yusha',
  'ফাইরুজ': 'Fairuz',
  'সারাহ': 'Sarah',
  'মনি': 'Moni',
  'ফাহিম': 'Fahim',
  'আহম্মেদ': 'Ahmed',
  'আহমেদ': 'Ahmed',
  'আহমদ': 'Ahmad',
  'তাহমিদ': 'Tahmid',
  'নূর': 'Noor',
  'নুর': 'Noor',
  'আজওয়া': 'Ajwa',
  'তাসমিন': 'Tasmin',
  'তাওহীদ': 'Tawhid',
  'তাওহিদ': 'Tawhid',
  'সরকার': 'Sarker',
  'আলিয়া': 'Aliya',
  'আলিয়া': 'Aliya',
  'তাইমুর': 'Taimur',
  'ইসলাম': 'Islam',
  'রজব': 'Rajab',
  'ইবনাত': 'Ibnat',
  'শুহাদ': 'Shuhad',
  'আরওয়া': 'Arwa',
  'আরজা': 'Arza',
  'আসমাউল': 'Asmaul',
  'হুসনা': 'Husna',
  'আকসা': 'Aqsa',
  'জুনাইদ': 'Junaid',
  'শাহ': 'Shah',
  'শাহ্': 'Shah',
  'ওয়ালি': 'Wali',
  'উল্লাহ': 'Ullah',
  'তায়্যিবা': 'Tayyiba',
  'হুর': 'Hoor',
  'সিজদাহ': 'Sijdah',
  'ফারহান': 'Farhan',
  'সাদিক': 'Sadik',
  'জান্নাতুল': 'Jannatul',
  'ফিরদাউস': 'Firdaus',
  'সাইয়ারা': 'Saiyara',
  'রওজা': 'Rowza',
  'উম্মে': 'Umme',
  'আমারা': 'Amara',
  'রদীয়াহ': 'Radiyah',
  'মুবাশ্বিরা': 'Mubashira',
  'মাহমুদ': 'Mahmud',
  'আতিক': 'Atik',
  'আভা': 'Ava',
  'আল': 'Al',
  'বেরুনী': 'Beruni',
  'ইয়ানুর': 'Yanur',
  'সরদার': 'Sardar',
  'হাবিব': 'Habib',
  'সোলাইমান': 'Solaiman',
  'মাহিয়া': 'Mahiya',
  'সূরা': 'Sura',
  'ইসমাঈল': 'Ismail',
  'ইসমাইল': 'Ismail',
  'আমির': 'Amir',
  'হামজা': 'Hamza',
  'রিসালাত': 'Risalat',
  'ওরিশা': 'Orisha',
  'পিয়াল': 'Piyal',
  'কুরাইশ': 'Quraish',
  'সাইম': 'Saim',
  'নুসরাত': 'Nusrat',
  'জাহান': 'Jahan',
  'নুহা': 'Nuha',
  'আইরা': 'Aira',
  'তাইবা': 'Taiba',
  'মনিকা': 'Monika',
  'সিয়াম': 'Siam',
  'সিয়াম': 'Siam',
  'সামিয়া': 'Samiya',
  'মেহেজাবিন': 'Mehjabin',
  'মিফতাহুল': 'Miftahul',
  'মাইসা': 'Maisa',
  'মুইন': 'Muin',
  'নাদিম': 'Nadim',
  'মিম': 'Mim',
  'ইহসান': 'Ihsan',
  'আলী': 'Ali',
  'আলি': 'Ali',
  'রেহান': 'Rehan',
  'রিয়াজুল': 'Riazul',
  'জাবির': 'Zabir',
  'আয়শা': 'Ayesha',
  'আয়েশা': 'Ayesha',
  'সুমাইয়া': 'Sumaiya',
  'সুমাইয়া': 'Sumaiya',
  'মারিয়া': 'Maria',
  'মাওয়া': 'Mawa',
  'কানিজ': 'Kaniz',
  'ফাতেমা': 'Fatema',
  'সালমান': 'Salman',
  'আবু': 'Abu',
  'বকর': 'Bakar',
  'সিদ্দিক': 'Siddique',
  'কাওসার': 'Kawsar',
  'মনিরা': 'Monira',
  'নাসির': 'Nasir',
  'উদ্দীন': 'Uddin',
  'উদ্দিন': 'Uddin',
  'আরাফ': 'Araf',
  'মাহফুজ': 'Mahfuz',
  'হোসেন': 'Hossain',
  'সাদ': 'Saad',
  'তহা': 'Taha',
  'রোদেলা': 'Rodela',
  'তাবাসসুম': 'Tabassum',
  'রুম্পা': 'Rumpa',
  'বায়েজিদ': 'Bayezid',
  'তহমিনা': 'Tahmina',
  'নাবির': 'Nabir',
  'রহমান': 'Rahman',
  'করিম': 'Karim',
  'খাতুন': 'Khatun',
  'বেগম': 'Begum',
  'খান': 'Khan',
  'মিয়া': 'Mia',
  'মিয়া': 'Mia',
  'মন্ডল': 'Mondal',
  'মণ্ডল': 'Mondal',
  'প্রামাণিক': 'Pramanik',
  'চৌধুরী': 'Chowdhury',
  'তালুকদার': 'Talukder',
  'শেখ': 'Sheikh',
  'সৈয়দ': 'Syed',
  'হক': 'Haque',
  'কবির': 'Kabir',
  'আলম': 'Alam',
  'রশিদ': 'Rashid',
  'তারিক': 'Tarik',
  'তারেক': 'Tarek',
  'নাজমুল': 'Nazmul',
  'সাইফুল': 'Saiful',
  'কামরুল': 'Kamrul',
  'শরিফুল': 'Shariful',
  'জাহিদ': 'Zahid',
  'জাহিদুল': 'Zahidul',
  'তানভীর': 'Tanvir',
  'তানভির': 'Tanvir',
  'সাকিব': 'Sakib',
  'রাকিব': 'Rakib',
  'মাহিন': 'Mahin',
  'ইয়াসিন': 'Yasin',
  'আরিফ': 'Arif',
  'আরিফুল': 'Ariful',
  'আশরাফ': 'Ashraf',
  'আশরাফুল': 'Ashraful',
  'সাব্বির': 'Sabbir',
  'নাফিস': 'Nafis',
  'নাফিসা': 'Nafisa',
  'তাসনিম': 'Tasnim',
  'তাসনিয়া': 'Tasnia',
  'তানজিলা': 'Tanzila',
  'সাদিয়া': 'Sadia',
  'সাদিয়া': 'Sadia',
  'নাদিয়া': 'Nadia',
  'আফিয়া': 'Afia',
  'হাবিবা': 'Habiba',
  'মারজিয়া': 'Marzia',
  'সুদাইস': 'Sudais',
  'আব্বাসী': 'Abbasi',
  'অভিভাবক': 'Guardian',
};

const BN_VOWELS: Record<string, string> = {
  'অ': 'o',
  'আ': 'a',
  'ই': 'i',
  'ঈ': 'i',
  'উ': 'u',
  'ঊ': 'u',
  'ঋ': 'ri',
  'এ': 'e',
  'ঐ': 'oi',
  'ও': 'o',
  'ঔ': 'ou',
};

const BN_MATRAS: Record<string, string> = {
  'া': 'a',
  'ি': 'i',
  'ী': 'i',
  'ু': 'u',
  'ূ': 'u',
  'ৃ': 'ri',
  'ে': 'e',
  'ৈ': 'oi',
  'ো': 'o',
  'ৌ': 'ou',
};

const BN_CONSONANTS: Record<string, string> = {
  'ক': 'k',
  'খ': 'kh',
  'গ': 'g',
  'ঘ': 'gh',
  'ঙ': 'ng',
  'চ': 'ch',
  'ছ': 'chh',
  'জ': 'j',
  'ঝ': 'jh',
  'ঞ': 'n',
  'ট': 't',
  'ঠ': 'th',
  'ড': 'd',
  'ঢ': 'dh',
  'ণ': 'n',
  'ত': 't',
  'থ': 'th',
  'দ': 'd',
  'ধ': 'dh',
  'ন': 'n',
  'প': 'p',
  'ফ': 'f',
  'ব': 'b',
  'ভ': 'bh',
  'ম': 'm',
  'য': 'j',
  'র': 'r',
  'ল': 'l',
  'শ': 'sh',
  'ষ': 'sh',
  'স': 's',
  'হ': 'h',
  'ড়': 'r',
  'ঢ়': 'rh',
  'য়': 'y',
  'ৎ': 't',
  'ং': 'ng',
  'ঃ': 'h',
  'ঁ': '',
};

/** Converts any Bengali digits (০-৯) to standard English digits (0-9) */
export function toEnDigits(input: string | number | undefined | null): string {
  return String(input ?? '').replace(/[০-৯]/g, (d) => BN_DIGIT_MAP[d] ?? d);
}

/** Phonetic Bengali word transliterator fallback for names not in the common dictionary */
function transliterateBengaliWord(word: string): string {
  // Normalize nukta combinations (য + ় -> য়, ড + ় -> ড়, ঢ + ় -> ঢ়)
  const normalized = word
    .replace(/য\u09BC/g, 'য়')
    .replace(/ড\u09BC/g, 'ড়')
    .replace(/ঢ\u09BC/g, 'ঢ়');

  if (BN_NAME_WORD_DICT[normalized]) {
    return BN_NAME_WORD_DICT[normalized];
  }

  let out = '';
  const chars = Array.from(normalized);

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (BN_DIGIT_MAP[ch]) {
      out += BN_DIGIT_MAP[ch];
      continue;
    }

    if (BN_VOWELS[ch]) {
      out += BN_VOWELS[ch];
      continue;
    }

    if (BN_MATRAS[ch]) {
      out += BN_MATRAS[ch];
      continue;
    }

    if (ch === '্') {
      // Hasanta (virama) joins consonants silently
      if (next === 'য') {
        out += 'y';
        i++;
      } else if (next === 'ব') {
        out += 'w';
        i++;
      }
      continue;
    }

    if (BN_CONSONANTS[ch] !== undefined) {
      out += BN_CONSONANTS[ch];
      const isModifier = ch === 'ং' || ch === 'ঃ' || ch === 'ঁ' || ch === 'ৎ';
      const hasNextMatra = Boolean(next && BN_MATRAS[next]);
      const hasNextHasanta = next === '্';
      const isLast = i === chars.length - 1;
      const nextIsVowel = Boolean(next && BN_VOWELS[next]);
      // Add inherent vowel 'a' between consonants when appropriate
      if (!isModifier && !hasNextMatra && !hasNextHasanta && !isLast && !nextIsVowel) {
        out += 'a';
      }
      continue;
    }

    out += ch;
  }

  const cleaned = out.replace(/aa+/g, 'a').trim();
  if (!cleaned) return word;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Converts a student or guardian name into clean English Title Case.
 * If already in English, preserves capitalization cleanly; if Bengali, transliterates phonetically.
 */
export function toEnglishName(raw: string | undefined | null): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  if (!HAS_BENGALI_RE.test(trimmed)) {
    return toEnDigits(trimmed);
  }

  const tokens = trimmed.split(/(\s+|\(|\)|-)/);
  return tokens
    .map((tok) => {
      if (!tok || /^(\s+|\(|\)|-)$/.test(tok)) return tok;
      if (!HAS_BENGALI_RE.test(tok)) return toEnDigits(tok);
      return transliterateBengaliWord(tok);
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Derives English academic division from standard class name */
export function deriveEnglishDivision(className: string | undefined): string {
  const c = (className || '').trim().toLowerCase();
  if (c === 'play group' || c === 'nursery' || c === 'kg') return 'Pre-Primary';
  if (
    c === 'class 1' ||
    c === 'class 2' ||
    c === 'class 3' ||
    c === 'class 4' ||
    c === 'class 5'
  ) {
    return 'Primary';
  }
  if (c === 'class 6' || c === 'class 7' || c === 'class 8') return 'Junior Secondary';
  if (c === 'class 9' || c === 'class 10') return 'Secondary';
  if (c === 'class 11' || c === 'class 12') return 'Higher Secondary';
  return 'General';
}

export function getEnglishSchoolName(settings: SiteSettings): string {
  const en = (settings.schoolNameEn || '').trim();
  if (en && !HAS_BENGALI_RE.test(en)) {
    // Normalize accidental missing spaces (e.g. camelCase or cramped '&') and collapse whitespace
    const spaced = en
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s*&\s*/g, ' & ')
      .replace(/\s+/g, ' ')
      .trim();
    return spaced;
  }
  return 'Shah Islamic School & College';
}

export function getEnglishCampusAddress(settings: SiteSettings): string {
  const addr = (settings.address || '').trim();
  if (addr && !HAS_BENGALI_RE.test(addr)) return addr;
  return 'Tulshighat (West of Palli Bidyut Office), Gaibandha Sadar, Gaibandha-5700';
}

export function getEnglishShortAddress(settings: SiteSettings): string {
  const addr = (settings.address || '').trim();
  if (addr && !HAS_BENGALI_RE.test(addr)) return addr;
  return 'Tulshighat, Gaibandha Sadar, Gaibandha-5700';
}

export function getEnglishPhone(settings: SiteSettings): string {
  return toEnDigits(settings.phone || '+880 1711-759705').trim();
}

export function getEnglishStudentSummary(student: StudentRecord) {
  return {
    nameEn: toEnglishName(student.name),
    fatherEn: toEnglishName(student.fatherName || student.guardianName),
    divisionEn: deriveEnglishDivision(student.className),
    classEn: student.className || 'General',
    sectionEn: student.section || 'Padma',
    shiftEn: student.shift || 'Morning',
    rollEn: toEnDigits(student.rollNumber || '01'),
    idCodeEn: toEnDigits(student.studentIdCode),
    phoneEn: toEnDigits(student.guardianPhone || '—'),
    bloodEn: (student.bloodGroup || '').trim(),
    sessionEn: toEnDigits(student.admissionYear || String(new Date().getFullYear())),
  };
}
