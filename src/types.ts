import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface SiteSettings {
  id?: string;
  schoolNameBn: string;
  schoolNameEn?: string;
  schoolSubtitleBn?: string;
  logoUrl?: string;
  eiin?: string;
  schoolCode?: string;
  regNo?: string;
  establishedYear?: string;
  aboutTitle?: string;
  aboutText?: string;
  historyText?: string;
  missionText?: string;
  aboutImageUrl?: string;
  principalName?: string;
  principalDesignation?: string;
  principalPhotoUrl?: string;
  principalMessage?: string;
  tickerOverride?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  facebookVerified?: boolean;
  googleMapQuery?: string;
  officeHours?: string;
  educationMediums?: string[];
  classList?: string[];
  highestClass?: string;
  shifts?: string[];
  specialPrograms?: string[];
  totalStaffCount?: number;
  totalClassesCount?: number;
  passRatePercent?: number;
  academicCalendarNote?: string;
  holidayListNote?: string;
  updatedAt?: Timestamp | null;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  orderIndex: number;
  isActive: boolean;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface GoverningMember {
  id: string;
  name: string;
  designation: string;
  qualification?: string;
  responsibility?: string;
  bio?: string;
  speech?: string;
  photoUrl?: string;
  joinedDate?: string;
  termEndDate?: string;
  orderIndex: number;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ImportantLink {
  id: string;
  title: string;
  url: string;
  category?: string;
  orderIndex: number;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StudentAchievement {
  id: string;
  studentName: string;
  className: string;
  rollNumber: string;
  academicYear?: string;
  achievementTitle: string;
  description?: string;
  photoUrl?: string;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface UserAccount {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  linkedEntityId?: string;
  className?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StudentRecord {
  id: string;
  studentIdCode: string;
  rollNumber: string;
  name: string;
  nameBn?: string;
  fatherName?: string;
  motherName?: string;
  photoUrl?: string;
  className: string;
  section: string;
  shift: 'Morning' | 'Day';
  group: 'General' | 'Science' | 'Business Studies' | 'Humanities';
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  guardianName: string;
  guardianPhone: string;
  address?: string;
  bloodGroup?: string;
  status: 'Active' | 'Inactive' | 'Graduated';
  studentUid?: string;
  parentUid?: string;
  admissionYear?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FacultyPublic {
  id: string;
  name: string;
  nameBn?: string;
  designation: string;
  department: string;
  qualification?: string;
  responsibility?: string;
  bio?: string;
  photoUrl?: string;
  experienceYears?: number;
  subject: string;
  shift: 'Morning' | 'Day' | 'Both';
  status: 'Active' | 'OnLeave' | 'Inactive';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface TeacherHRRecord {
  id: string;
  employeeId: string;
  facultyId: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  salaryBdt: number;
  joiningDate?: string;
  status: 'Active' | 'OnLeave' | 'Inactive';
  teacherUid?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  applicantName: string;
  applicantNameBn?: string;
  fatherName?: string;
  motherName?: string;
  birthRegNo?: string;
  photoUrl?: string;
  applyingClass: string;
  shift: 'Morning' | 'Day';
  group: 'General' | 'Science' | 'Business Studies' | 'Humanities';
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  previousSchool?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  address: string;
  status: 'Pending' | 'UnderReview' | 'Approved' | 'Rejected';
  remarks?: string;
  applicantUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  className: string;
  section: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  remarks?: string;
  markedByUid: string;
  studentUid?: string;
  parentUid?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface SubjectMark {
  subject: string;
  marks: number;
  fullMarks: number;
  grade: string;
  point: number;
}

export interface ExamResult {
  id: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  className: string;
  section: string;
  examName: string;
  academicYear: string;
  meritPosition?: string;
  subjects: SubjectMark[];
  totalMarks: number;
  gpa: number;
  grade: 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D' | 'F';
  status: 'Draft' | 'Published';
  studentUid?: string;
  parentUid?: string;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface RoutineItem {
  id: string;
  type: 'class' | 'exam';
  className: string;
  section: string;
  dayOrDate: string;
  timeSlot: string;
  subject: string;
  teacherName?: string;
  room?: string;
  examName?: string;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FeeInvoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  className: string;
  month: string;
  academicYear: string;
  feeCategory: 'Tuition' | 'Exam' | 'Admission' | 'Library' | 'Transport' | 'Lab';
  amountBdt: number;
  paidAmountBdt: number;
  dueDate: string;
  status: 'Unpaid' | 'Partial' | 'Paid';
  paymentMethod: 'None' | 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank';
  transactionId?: string;
  paidDate?: string;
  studentUid?: string;
  parentUid?: string;
  createdByUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NoticeItem {
  id: string;
  title: string;
  titleBn?: string;
  content: string;
  contentBn?: string;
  category: 'Academic' | 'Exam' | 'Admission' | 'Holiday' | 'General' | 'Urgent' | 'Result';
  audience: 'All' | 'Students' | 'Teachers' | 'Parents';
  publishedDate: string;
  isPinned: boolean;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  titleBn?: string;
  summary: string;
  summaryBn?: string;
  body?: string;
  category: 'Achievement' | 'Event' | 'Academic' | 'Sports' | 'Cultural';
  eventDate: string;
  imageUrl?: string;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface GalleryItem {
  id: string;
  title: string;
  titleBn?: string;
  caption?: string;
  category: 'Campus' | 'Science' | 'Library' | 'Sports' | 'Cultural';
  mediaType?: 'photo' | 'video';
  imageUrl: string;
  videoUrl?: string;
  eventDate?: string;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface LibraryResource {
  id: string;
  title: string;
  titleBn?: string;
  author: string;
  subject: string;
  classLevel: string;
  resourceType: 'ebook' | 'lecture_note' | 'video_lesson' | 'assignment' | 'syllabus' | 'online_class';
  description?: string;
  resourceUrl?: string;
  isbnOrCode?: string;
  totalCopies: number;
  availableCopies: number;
  uploadedByUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface LmsSubmission {
  id: string;
  resourceId: string;
  resourceTitle: string;
  studentId?: string;
  studentName: string;
  className: string;
  submissionText: string;
  submissionLink?: string;
  grade?: string;
  feedback?: string;
  status: 'Submitted' | 'Graded';
  studentUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BookLoan {
  id: string;
  resourceId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  className: string;
  rollNumber: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  fineBdt: number;
  status: 'Issued' | 'Returned';
  studentUid?: string;
  issuedByUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface TransportRoute {
  id: string;
  busNumber: string;
  routeName: string;
  stops: string;
  driverName: string;
  driverPhone: string;
  helperName?: string;
  helperPhone?: string;
  monthlyFeeBdt: number;
  capacity: number;
  assignedStudentIds: string[];
  status: 'Active' | 'Maintenance' | 'Inactive';
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  roleType: 'Officer' | 'Accountant' | 'Librarian' | 'Support' | 'Driver' | 'Security';
  phone: string;
  email?: string;
  salaryBdt: number;
  bonusBdt?: number;
  joiningDate?: string;
  status: 'Active' | 'OnLeave' | 'Inactive';
  staffUid?: string;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StaffAttendance {
  id: string;
  date: string;
  personId: string;
  personName: string;
  designation: string;
  personType: 'Teacher' | 'Staff';
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  remarks?: string;
  markedByUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface LeaveRequest {
  id: string;
  applicantUid: string;
  applicantName: string;
  applicantRole: 'teacher' | 'staff' | 'student';
  leaveType: 'Casual' | 'Medical' | 'Emergency' | 'Annual';
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminRemarks?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FinancialEntry {
  id: string;
  entryType: 'Income' | 'Expense';
  category:
    | 'TuitionFee'
    | 'AdmissionFee'
    | 'Donation'
    | 'OtherIncome'
    | 'TeacherSalary'
    | 'StaffSalary'
    | 'Utility'
    | 'Maintenance'
    | 'Transport'
    | 'Library'
    | 'OtherExpense';
  title: string;
  amountBdt: number;
  date: string;
  paymentMethod: 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank';
  referenceNo?: string;
  notes?: string;
  recordedByUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FeedbackMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  category: 'Complaint' | 'Suggestion' | 'TeacherMessage' | 'SmsBroadcast';
  subject: string;
  message: string;
  targetAudience?: string;
  reply?: string;
  status: 'Open' | 'Replied' | 'Resolved';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CertificateRecord {
  id: string;
  certificateNo: string;
  certificateType: 'TC' | 'Testimonial' | 'Character' | 'Bonafide';
  studentId: string;
  studentName: string;
  fatherName?: string;
  motherName?: string;
  className: string;
  rollNumber: string;
  issueDate: string;
  reasonOrRemarks?: string;
  issuedByUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  module: string;
  details: string;
  createdAt?: Timestamp | null;
}

export const BD_CLASSES = [
  'Play Group',
  'Nursery',
  'KG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
] as const;

export const BD_SECTIONS = ['Padma', 'Meghna', 'Jamuna', 'Surma'] as const;

export const BD_SHIFTS = ['Morning', 'Day'] as const;

export const BD_GROUPS = ['General'] as const;

export const CAMPUS_IMAGES = {
  hero: '/src/assets/images/hero_sisc_gate_hd_1795176385722.jpg',
  assembly1: '/src/assets/images/hero_sisc_assembly_one_hd_1795176388343.jpg',
  event: '/src/assets/images/hero_sisc_campus_event_hd_1795176390221.jpg',
  courtyard: '/src/assets/images/hero_sisc_courtyard_hd_1795176421040.jpg',
  assembly2: '/assets/aistudio/image_4e4649e7.png',
  building: '/assets/aistudio/image_5821e699.png',
  field: '/assets/aistudio/image_57f9d7ca.png',
} as const;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  schoolNameBn: 'শাহ ইসলামিক স্কুল এন্ড কলেজ',
  schoolNameEn: 'Shah Islamic School And College',
  schoolSubtitleBn: 'আধুনিক সাধারণ শিক্ষা ও ইসলামিক মূল্যবোধের সমন্বিত বিদ্যাপীঠ',
  logoUrl: '',
  eiin: '',
  schoolCode: '',
  regNo: '',
  establishedYear: '২০১৯',
  aboutTitle: 'প্রতিষ্ঠান সম্পর্কে',
  aboutText:
    'শাহ ইসলামিক স্কুল এন্ড কলেজ (Shah Islamic School And College) ২০১৯ সালে গাইবান্ধা সদরের তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে) এলাকায় প্রতিষ্ঠিত একটি আধুনিক ও ইসলামিক শিক্ষাপ্রতিষ্ঠান। এখানে প্লে গ্রুপ থেকে অষ্টম শ্রেণি পর্যন্ত বাংলা ভার্সন, ইংরেজি ভার্সন এবং আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল কারিকুলামে পাঠদান করা হয়।',
  historyText:
    '২০১৯ সালে প্রতিষ্ঠার পর থেকে শাহ ইসলামিক স্কুল এন্ড কলেজ গাইবান্ধায় আধুনিক সাধারণ শিক্ষা এবং বিশুদ্ধ ইসলামিক শিক্ষার এক অনন্য সমন্বয় গড়ে তুলেছে। মর্নিং ও ডে—উভয় শিফটে শৃঙ্খলাপূর্ণ পরিবেশে প্লে গ্রুপ থেকে অষ্টম শ্রেণি পর্যন্ত নিয়মিত পাঠদানের পাশাপাশি সহিহ কুরআন শিক্ষা, হিফজুল কুরআন বিভাগ, মাসনুন দোয়া ও ইসলামিক আদব-কায়দা অনুশীলন করানো হয়।',
  missionText:
    'আমাদের লক্ষ্য ও উদ্দেশ্য হলো প্রতিটি শিক্ষার্থীকে আধুনিক সাধারণ শিক্ষায় দক্ষ, বাংলা-ইংরেজি-আরবি তিন ভাষায় পারদর্শী এবং বিশুদ্ধ কুরআন-সুন্নাহর আলোকে নৈতিক, আদর্শবান ও সচেতন নাগরিক হিসেবে গড়ে তোলা।',
  aboutImageUrl: CAMPUS_IMAGES.courtyard,
  principalName: '',
  principalDesignation: 'অধ্যক্ষ, শাহ ইসলামিক স্কুল এন্ড কলেজ',
  principalPhotoUrl: '',
  principalMessage: '',
  tickerOverride: '',
  address: 'তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০।',
  phone: '+880 1711-759705',
  email: '',
  websiteUrl: 'https://shahislamicschool.com',
  facebookUrl: '',
  facebookVerified: false,
  googleMapQuery: 'তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০',
  officeHours: 'মর্নিং শিফট ও ডে শিফট · রবিবার – বৃহস্পতিবার',
  educationMediums: [
    'বাংলা ভার্সন',
    'ইংরেজি ভার্সন',
    'আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল কারিকুলাম',
  ],
  classList: [
    'প্লে গ্রুপ',
    'নার্সারি',
    'কেজি',
    'প্রথম শ্রেণি',
    'দ্বিতীয় শ্রেণি',
    'তৃতীয় শ্রেণি',
    'চতুর্থ শ্রেণি',
    'পঞ্চম শ্রেণি',
    'ষষ্ঠ শ্রেণি',
    'সপ্তম শ্রেণি',
    'অষ্টম শ্রেণি',
  ],
  highestClass: 'অষ্টম শ্রেণি',
  shifts: ['মর্নিং শিফট', 'ডে শিফট'],
  specialPrograms: [
    'সহিহ কুরআন শিক্ষা',
    'হিফজুল কুরআন বিভাগ',
    'মাসনুন দোয়া শিক্ষা',
    'ইসলামিক আদব-কায়দা',
    'আরবি ভাষা শিক্ষা',
    'নৈতিক ও ধর্মীয় শিক্ষা',
  ],
  totalStaffCount: 0,
  totalClassesCount: 11,
  passRatePercent: 0,
  academicCalendarNote:
    'জানুয়ারি: নতুন শিক্ষাবর্ষ শুরু ও পাঠ্যবই বিতরণ · প্রথম ও দ্বিতীয় সাময়িক মূল্যায়ন · অর্ধবার্ষিক পরীক্ষা · বার্ষিক পরীক্ষা ও ফলাফল প্রকাশ।',
  holidayListNote:
    'সরকারি ও ধর্মীয় ছুটিসমূহ (শহীদ দিবস, স্বাধীনতা দিবস, পহেলা বৈশাখ, পবিত্র রমজান ও ঈদুল ফিতর, ঈদুল আযহা, বিজয় দিবস) এবং প্রতিষ্ঠান নির্ধারিত অবকাশ।',
};
