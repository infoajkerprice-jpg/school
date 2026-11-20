import {
  BookMarked,
  BookOpen,
  Compass,
  HeartHandshake,
  Languages,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface IslamicProgramMeta {
  slug: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  highlights: string[];
  applicableFor: string;
  icon: LucideIcon;
}

export interface EducationMediumMeta {
  indexBn: string;
  title: string;
  subtitle: string;
  description: string;
  focusPoints: string[];
}

export interface ClassStageGroup {
  stage: string;
  rangeLabel: string;
  summary: string;
  classes: string[];
}

const KNOWN_ISLAMIC_PROGRAMS: Record<string, Omit<IslamicProgramMeta, 'title'>> = {
  'সহিহ কুরআন শিক্ষা': {
    slug: 'sahih-quran',
    shortDesc: 'তাজবিদ ও শুদ্ধ মাখরাজ অনুযায়ী নিয়মিত কুরআন তিলাওয়াত অনুশীলন।',
    fullDesc:
      'প্রতিটি শিক্ষার্থী যেন ছোটবেলা থেকেই শুদ্ধ উচ্চারণ ও তাজবিদের নিয়ম মেনে পবিত্র কুরআন তিলাওয়াত করতে পারে, সেজন্য অভিজ্ঞ কারী ও হাফেজ শিক্ষকদের তত্ত্বাবধানে নিয়মিত নূরানী ও নাযেরা পাঠদান করা হয়।',
    highlights: [
      'আরবি হরফের সঠিক মাখরাজ ও সিফাত অনুশীলন',
      'নূরানী পদ্ধতিতে সহজ ও ধাপে ধাপে কুরআন পাঠ শিক্ষা',
      'প্রতিটি শিক্ষার্থীর ব্যক্তিগত তিলাওয়াত যাচাই ও সংশোধন',
    ],
    applicableFor: 'প্লে গ্রুপ থেকে অষ্টম শ্রেণি (সকল শিক্ষার্থী)',
    icon: BookOpen,
  },
  'হিফজুল কুরআন বিভাগ': {
    slug: 'hifzul-quran',
    shortDesc: 'সাধারণ শিক্ষার পাশাপাশি সুশৃঙ্খল পদ্ধতিতে পবিত্র কুরআন হিফজের সুযোগ।',
    fullDesc:
      'আগ্রহী শিক্ষার্থীদের জন্য স্কুলের সাধারণ পাঠ্যক্রমের সাথে সামঞ্জস্য রেখে পৃথক হিফজুল কুরআন বিভাগ পরিচালিত হয়। নিয়মিত সবক, সাতসবক ও আমুখতা তদারকির মাধ্যমে ধারাবাহিকভাবে হিফজ সম্পন্ন করতে সহায়তা করা হয়।',
    highlights: [
      'দৈনিক সবক, সাতসবক ও আমুখতার নিয়মিত মূল্যায়ন',
      'সাধারণ একাডেমিক পড়াশোনার সাথে ভারসাম্যপূর্ণ সময়সূচি',
      'অভিভাবকদের সাথে নিয়মিত অগ্রগতি পর্যালোচনা',
    ],
    applicableFor: 'আগ্রহী ও বাছাইকৃত শিক্ষার্থীবৃন্দ',
    icon: BookMarked,
  },
  'মাসনুন দোয়া শিক্ষা': {
    slug: 'masnun-dua',
    shortDesc: 'দৈনন্দিন জীবনের প্রয়োজনীয় মাসনুন দোয়া অর্থসহ মুখস্থ ও আমলের চর্চা।',
    fullDesc:
      'সকাল-সন্ধ্যা, খাওয়া-দাওয়া, ঘুম, পড়াশোনা, মসজিদে প্রবেশ ও বের হওয়াসহ দৈনন্দিন জীবনের প্রয়োজনীয় মাসনুন দোয়াসমূহ সহজভাবে বাংলা অর্থসহ শেখানো ও বাস্তব জীবনে আমলের অভ্যাস গড়ে তোলা হয়।',
    highlights: [
      'দৈনন্দিন আমলের জন্য প্রামাণ্য মাসনুন দোয়া সংকলন',
      'শুদ্ধ আরবি উচ্চারণের পাশাপাশি সহজ বাংলা অর্থ অনুধাবন',
      'শ্রেণিকক্ষে দলগত অনুশীলন ও বাস্তব প্রয়োগের উৎসাহ',
    ],
    applicableFor: 'প্লে গ্রুপ থেকে অষ্টম শ্রেণি',
    icon: HeartHandshake,
  },
  'ইসলামিক আদব-কায়দা': {
    slug: 'islamic-adab',
    shortDesc: 'পিতা-মাতা, শিক্ষক ও বড়দের প্রতি শ্রদ্ধা এবং সুন্দর আচরণের ব্যবহারিক অনুশীলন।',
    fullDesc:
      'শুধু পুঁথিগত শিক্ষা নয়—সালাম বিনিময়, পিতা-মাতা ও শিক্ষকদের সম্মান, সত্যবাদিতা, পরিচ্ছন্নতা এবং সহপাঠীদের সাথে সুন্দর আচরণের মাধ্যমে সুনাগরিক ও আদর্শ মানুষ হিসেবে গড়ে তোলা হয়।',
    highlights: [
      'পিতা-মাতা, শিক্ষক ও গুরুজনদের প্রতি শ্রদ্ধাবোধ চর্চা',
      'পরিচ্ছন্নতা, শৃঙ্খলা ও সুন্দর কথাবার্তার দৈনন্দিন অভ্যাস',
      'প্রাত্যহিক সমাবেশ ও শ্রেণিকক্ষে ব্যবহারিক শিষ্টাচার শিক্ষা',
    ],
    applicableFor: 'সকল শ্রেণি ও শিফট',
    icon: Compass,
  },
  'আরবি ভাষা শিক্ষা': {
    slug: 'arabic-language',
    shortDesc: 'ট্রিলিংগুয়াল কারিকুলামের অংশ হিসেবে সহজ ও ব্যবহারিক আরবি ভাষা চর্চা।',
    fullDesc:
      'বাংলা ও ইংরেজির পাশাপাশি আরবি ভাষায় প্রাথমিক দক্ষতা অর্জনের জন্য শব্দভান্ডার, সহজ বাক্য গঠন, লেখা ও পঠন অনুশীলন করানো হয়, যাতে শিক্ষার্থীরা কুরআন ও দ্বীনি শিক্ষার মূল ভাষা বুঝতে আগ্রহী হয়।',
    highlights: [
      'আরবি বর্ণমালা, হাতের লেখা ও প্রয়োজনীয় শব্দভান্ডার শিক্ষা',
      'বয়সোপযোগী সহজ কথোপকথন ও বাক্য গঠন অনুশীলন',
      'কুরআন ও হাদিসের মৌলিক শব্দগুলোর অর্থ বোঝার ভিত্তি তৈরি',
    ],
    applicableFor: 'প্লে গ্রুপ থেকে অষ্টম শ্রেণি',
    icon: Languages,
  },
  'নৈতিক ও ধর্মীয় শিক্ষা': {
    slug: 'moral-religious',
    shortDesc: 'আকিদা, সীরাত, সালাত ও ইসলামী নৈতিকতার সুদৃঢ় বুনিয়াদ গঠন।',
    fullDesc:
      'বয়স অনুযায়ী ইসলামের মৌলিক বিশ্বাস (আকিদা), ওযু ও নামাজের ব্যবহারিক নিয়মাবলি, নবী-রাসূলগণের জীবনী (সীরাত) এবং সততা ও মানবিক মূল্যবোধের শিক্ষা নিয়মিতভাবে প্রদান করা হয়।',
    highlights: [
      'ওযু, সালাত ও মৌলিক ইবাদতের ব্যবহারিক প্রশিক্ষণ',
      'সীরাতুন্নবী (সা.) ও সাহাবায়ে কেরামের আদর্শিক গল্প পাঠ',
      'সততা, আমানতদারিতা ও সামাজিক দায়িত্ববোধ গড়ে তোলা',
    ],
    applicableFor: 'সকল শ্রেণির শিক্ষার্থীবৃন্দ',
    icon: ShieldCheck,
  },
};

export function resolveIslamicPrograms(programNames: string[]): IslamicProgramMeta[] {
  return programNames.map((name, idx) => {
    const trimmed = name.trim();
    const matched = KNOWN_ISLAMIC_PROGRAMS[trimmed];
    if (matched) {
      return {
        title: trimmed,
        ...matched,
      };
    }
    return {
      slug: `program-${idx + 1}`,
      title: trimmed,
      shortDesc: `${trimmed} কার্যক্রমের মাধ্যমে শিক্ষার্থীদের নৈতিক ও দ্বীনি দক্ষতা বিকাশ।`,
      fullDesc: `${trimmed} আমাদের প্রতিষ্ঠানের নিয়মিত ইসলামিক ও নৈতিক শিক্ষা কার্যক্রমের গুরুত্বপূর্ণ অংশ হিসেবে অভিজ্ঞ শিক্ষকদের তত্ত্বাবধানে পরিচালিত হয়।`,
      highlights: [
        'বয়স ও শ্রেণি উপযোগী পাঠ পরিকল্পনা',
        'শিক্ষকদের নিবিড় তত্ত্বাবধান ও নিয়মিত অনুশীলন',
        'নৈতিক ও ব্যবহারিক জীবনে প্রয়োগের উৎসাহ',
      ],
      applicableFor: 'সকল প্রযোজ্য শ্রেণি',
      icon: BookOpen,
    };
  });
}

export function resolveEducationMediums(mediumNames: string[]): EducationMediumMeta[] {
  const bnIndices = ['০১', '০২', '০৩', '০৪', '০৫', '০৬'];
  return mediumNames.map((name, idx) => {
    const trimmed = name.trim();
    if (trimmed.includes('বাংলা')) {
      return {
        indexBn: bnIndices[idx] || String(idx + 1),
        title: trimmed,
        subtitle: 'জাতীয় শিক্ষাক্রম (NCTB) ভিত্তিক আধুনিক পাঠদান',
        description:
          'জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ডের (এনসিটিবি) পাঠ্যবই অনুসরণে বাংলা, গণিত, বিজ্ঞান ও সামাজিক শিক্ষায় শক্ত ভিত তৈরি করা হয়।',
        focusPoints: ['বোর্ড অনুমোদিত আধুনিক পাঠ্যক্রম', 'নিয়মিত শ্রেণি মূল্যায়ন ও অনুশীলন'],
      };
    }
    if (trimmed.includes('ইংরেজি')) {
      return {
        indexBn: bnIndices[idx] || String(idx + 1),
        title: trimmed,
        subtitle: 'আন্তর্জাতিক মানের ইংরেজি দক্ষতা ও ভার্সন পাঠদান',
        description:
          'শুরু থেকেই ইংরেজি রিডিং, রাইটিং, গ্রামার ও স্পোকেন দক্ষতা বাড়াতে আধুনিক ওয়ার্কবুক ও অনুশীলনভিত্তিক পাঠদান পরিচালিত হয়।',
        focusPoints: ['শুদ্ধ ইংরেজি উচ্চারণ ও কথোপকথন', 'প্রাথমিক স্তর থেকেই শক্তিশালী ভাষাগত ভিত্তি'],
      };
    }
    if (trimmed.includes('আরবি') || trimmed.includes('ট্রিলিংগুয়াল')) {
      return {
        indexBn: bnIndices[idx] || String(idx + 1),
        title: trimmed,
        subtitle: 'বাংলা, ইংরেজি ও আরবি—তিন ভাষার সুষম সমন্বয়',
        description:
          'আধুনিক বাংলা ও ইংরেজি শিক্ষার পাশাপাশি আরবি ভাষা ও কুরআনিক পরিভাষার সমন্বয়ে তৈরি বিশেষ ট্রিলিংগুয়াল কারিকুলাম।',
        focusPoints: ['তিন ভাষায় সমান দক্ষতার সমন্বিত পাঠ্যক্রম', 'দুনিয়া ও আখিরাতের কল্যাণে ভারসাম্যপূর্ণ শিক্ষা'],
      };
    }
    return {
      indexBn: bnIndices[idx] || String(idx + 1),
      title: trimmed,
      subtitle: 'সমন্বিত আধুনিক ও নৈতিক পাঠদান পদ্ধতি',
      description: `${trimmed} পদ্ধতিতে শিক্ষার্থীদের সৃজনশীলতা, ভাষাগত দক্ষতা ও নৈতিক মানোন্নয়নে নিয়মিত পাঠদান করা হয়।`,
      focusPoints: ['অভিজ্ঞ শিক্ষকমণ্ডলীর তত্ত্বাবধান', 'নিয়মিত একাডেমিক মূল্যায়ন'],
    };
  });
}

export function groupClassStages(classList: string[]): ClassStageGroup[] {
  const prePrimaryKeywords = ['প্লে', 'নার্সারি', 'কেজি', 'শিশু'];
  const juniorSecondaryKeywords = ['ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'নবম', 'দশম'];

  const prePrimary: string[] = [];
  const primary: string[] = [];
  const juniorSecondary: string[] = [];

  for (const cls of classList) {
    if (prePrimaryKeywords.some((k) => cls.includes(k))) {
      prePrimary.push(cls);
    } else if (juniorSecondaryKeywords.some((k) => cls.includes(k))) {
      juniorSecondary.push(cls);
    } else {
      primary.push(cls);
    }
  }

  const stages: ClassStageGroup[] = [];
  if (prePrimary.length > 0) {
    stages.push({
      stage: 'প্রাক-প্রাথমিক স্তর',
      rangeLabel: 'শিশুবান্ধব সূচনা',
      summary: 'খেলাধুলা, আদব-কায়দা, বাংলা-ইংরেজি-আরবি বর্ণমালা ও নূরানী কায়দার আনন্দময় ভিত্তি।',
      classes: prePrimary,
    });
  }
  if (primary.length > 0) {
    stages.push({
      stage: 'প্রাথমিক স্তর',
      rangeLabel: 'মৌলিক একাডেমিক ভিত্তি',
      summary: 'গণিত, বিজ্ঞান, বাংলা, ইংরেজি ও সহিহ কুরআন শিক্ষার সুসংগঠিত পাঠদান ও মূল্যায়ন।',
      classes: primary,
    });
  }
  if (juniorSecondary.length > 0) {
    stages.push({
      stage: 'জুনিয়র মাধ্যমিক স্তর',
      rangeLabel: 'উচ্চতর প্রস্তুতি',
      summary: 'বিষয়ভিত্তিক গভীর অনুশীলন, সৃজনশীল দক্ষতা, তথ্যপ্রযুক্তি ও ইসলামিক নৈতিক চরিত্র গঠন।',
      classes: juniorSecondary,
    });
  }

  return stages;
}
