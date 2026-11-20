const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBnDigits(val: number | string | undefined | null): string {
  const str = String(val ?? '');
  return str.replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function formatBdtBn(amount: number): string {
  return `৳${toBnDigits(amount.toLocaleString('en-IN'))}`;
}

export const CLASS_BN: Record<string, string> = {
  'Play Group': 'প্লে গ্রুপ',
  Nursery: 'নার্সারি',
  KG: 'কেজি',
  'Class 1': 'প্রথম শ্রেণি',
  'Class 2': 'দ্বিতীয় শ্রেণি',
  'Class 3': 'তৃতীয় শ্রেণি',
  'Class 4': 'চতুর্থ শ্রেণি',
  'Class 5': 'পঞ্চম শ্রেণি',
  'Class 6': 'ষষ্ঠ শ্রেণি',
  'Class 7': 'সপ্তম শ্রেণি',
  'Class 8': 'অষ্টম শ্রেণি',
  'Class 9': 'নবম শ্রেণি',
  'Class 10': 'দশম শ্রেণি',
  'HSC 1st Year': 'একাদশ শ্রেণি',
  'HSC 2nd Year': 'দ্বাদশ শ্রেণি',
};

export const SECTION_BN: Record<string, string> = {
  Padma: 'পদ্মা',
  Meghna: 'মেঘনা',
  Jamuna: 'যমুনা',
  Surma: 'সুরমা',
};

export const SHIFT_BN: Record<string, string> = {
  Morning: 'মর্নিং শিফট',
  Day: 'ডে শিফট',
  Both: 'মর্নিং ও ডে শিফট',
};

export const GROUP_BN: Record<string, string> = {
  General: 'সাধারণ',
  Science: 'বিজ্ঞান',
  'Business Studies': 'ব্যবসায় শিক্ষা',
  Humanities: 'মানবিক',
};

export const GENDER_BN: Record<string, string> = {
  Male: 'ছাত্র',
  Female: 'ছাত্রী',
  Other: 'অন্যান্য',
};

export const ROLE_BN: Record<string, string> = {
  admin: 'প্রশাসক (অ্যাডমিন)',
  teacher: 'শিক্ষক',
  student: 'শিক্ষার্থী',
  parent: 'অভিভাবক',
};

export const NOTICE_CATEGORY_BN: Record<string, string> = {
  All: 'সকল নোটিশ',
  Urgent: 'জরুরি নোটিশ',
  Admission: 'ভর্তি বিজ্ঞপ্তি',
  Exam: 'পরীক্ষার রুটিন',
  Holiday: 'ছুটির বিজ্ঞপ্তি',
  Result: 'ফলাফল প্রকাশ',
  Academic: 'একাডেমিক',
  General: 'অন্যান্য বিজ্ঞপ্তি',
};

export const AUDIENCE_BN: Record<string, string> = {
  All: 'সবার জন্য',
  Students: 'শিক্ষার্থী',
  Teachers: 'শিক্ষকবৃন্দ',
  Parents: 'অভিভাবক',
};

export const ADMISSION_STATUS_BN: Record<string, string> = {
  Pending: 'অপেক্ষমাণ',
  UnderReview: 'পর্যালোচনাধীন',
  Approved: 'অনুমোদিত',
  Rejected: 'বাতিল',
};

export const ATTENDANCE_STATUS_BN: Record<string, string> = {
  Present: 'উপস্থিত',
  Absent: 'অনুপস্থিত',
  Late: 'বিলম্বে উপস্থিত',
  Leave: 'ছুটি',
};

export const STUDENT_STATUS_BN: Record<string, string> = {
  Active: 'সক্রিয়',
  Inactive: 'নিষ্ক্রিয়',
  Graduated: 'উত্তীর্ণ',
};

export const TEACHER_STATUS_BN: Record<string, string> = {
  Active: 'কর্মরত',
  OnLeave: 'ছুটিতে',
  Inactive: 'অবসরপ্রাপ্ত',
};

export const FEE_CATEGORY_BN: Record<string, string> = {
  Tuition: 'মাসিক বেতন',
  Exam: 'পরীক্ষার ফি',
  Admission: 'ভর্তি ফি',
  Library: 'লাইব্রেরি ফি',
  Transport: 'যাতায়াত ফি',
  Lab: 'বিজ্ঞানাগার ফি',
};

export const FEE_STATUS_BN: Record<string, string> = {
  Paid: 'পরিশোধিত',
  Partial: 'আংশিক পরিশোধিত',
  Unpaid: 'বকেয়া',
};

export const PAYMENT_METHOD_BN: Record<string, string> = {
  None: 'অপরিশোধিত',
  Cash: 'নগদ (হিসাব শাখা)',
  bKash: 'বিকাশ',
  Nagad: 'নগদ মোবাইল ব্যাংকিং',
  Rocket: 'রকেট',
  Bank: 'ব্যাংক জমা',
};

export const RESULT_STATUS_BN: Record<string, string> = {
  Published: 'প্রকাশিত',
  Draft: 'খসড়া',
};

export const NEWS_CATEGORY_BN: Record<string, string> = {
  Achievement: 'সাফল্য ও অর্জন',
  Event: 'অনুষ্ঠান',
  Academic: 'শিক্ষা কার্যক্রম',
  Sports: 'ক্রীড়া',
  Cultural: 'সাংস্কৃতিক',
};

export const GALLERY_CATEGORY_BN: Record<string, string> = {
  Campus: 'ক্যাম্পাস',
  Science: 'বিজ্ঞানাগার',
  Library: 'পাঠাগার',
  Sports: 'ক্রীড়া',
  Cultural: 'সাংস্কৃতিক',
};

export const RESOURCE_TYPE_BN: Record<string, string> = {
  ebook: 'পাঠ্যবই / ই-বুক',
  lecture_note: 'লেকচার নোট',
  assignment: 'হোমওয়ার্ক / অ্যাসাইনমেন্ট',
  syllabus: 'সিলেবাস',
  video_lesson: 'ভিডিও ক্লাস',
  online_class: 'অনলাইন ক্লাস লিংক',
};

export const STAFF_ROLE_BN: Record<string, string> = {
  Officer: 'প্রশাসনিক কর্মকর্তা',
  Accountant: 'হিসাবরক্ষক',
  Librarian: 'লাইব্রেরিয়ান',
  Support: 'সহায়ক কর্মচারী',
  Driver: 'বাস চালক',
  Security: 'নিরাপত্তা কর্মী',
};

export const LEAVE_TYPE_BN: Record<string, string> = {
  Casual: 'নৈমিত্তিক ছুটি',
  Medical: 'চিকিৎসা ছুটি',
  Emergency: 'জরুরি ছুটি',
  Annual: 'বার্ষিক ছুটি',
};

export const LEAVE_STATUS_BN: Record<string, string> = {
  Pending: 'অপেক্ষমাণ',
  Approved: 'অনুমোদিত',
  Rejected: 'প্রত্যাখ্যাত',
};

export const FINANCIAL_CATEGORY_BN: Record<string, string> = {
  TuitionFee: 'মাসিক বেতন আদায়',
  AdmissionFee: 'ভর্তি ফি আদায়',
  Donation: 'অনুদান / সহায়তা',
  OtherIncome: 'অন্যান্য আয়',
  TeacherSalary: 'শিক্ষক বেতন ও বোনাস',
  StaffSalary: 'কর্মচারী বেতন ও বোনাস',
  Utility: 'বিদ্যুৎ, পানি ও ইন্টারনেট',
  Maintenance: 'রক্ষণাবেক্ষণ ও মেরামত',
  Transport: 'পরিবহন ও জ্বালানি ব্যয়',
  Library: 'লাইব্রেরি ও শিক্ষা উপকরণ',
  OtherExpense: 'অন্যান্য ব্যয়',
};

export const CERTIFICATE_TYPE_BN: Record<string, string> = {
  TC: 'ছাড়পত্র (Transfer Certificate)',
  Testimonial: 'প্রশংসাপত্র (Testimonial)',
  Character: 'চারিত্রিক সনদপত্র',
  Bonafide: 'অধ্যয়নরত সনদপত্র (Bonafide)',
};

export const FEEDBACK_CATEGORY_BN: Record<string, string> = {
  Complaint: 'অভিযোগ',
  Suggestion: 'মতামত ও পরামর্শ',
  TeacherMessage: 'শিক্ষকের সাথে যোগাযোগ',
  SmsBroadcast: 'SMS / ইমেইল বার্তা',
};

export const DAY_BN: Record<string, string> = {
  Sunday: 'রবিবার',
  Monday: 'সোমবার',
  Tuesday: 'মঙ্গলবার',
  Wednesday: 'বুধবার',
  Thursday: 'বৃহস্পতিবার',
  Friday: 'শুক্রবার',
  Saturday: 'শনিবার',
};

export function labelClass(c: string): string {
  return CLASS_BN[c] || c;
}

export function labelSection(s: string): string {
  return SECTION_BN[s] || s;
}

export function labelDay(d: string): string {
  return DAY_BN[d] || toBnDigits(d);
}

export function isRecentDate(dateStr?: string, withinDays = 14): boolean {
  if (!dateStr) return false;
  const parsed = Date.parse(dateStr);
  if (Number.isNaN(parsed)) return false;
  const diffDays = (Date.now() - parsed) / (1000 * 60 * 60 * 24);
  return diffDays >= -2 && diffDays <= withinDays;
}
