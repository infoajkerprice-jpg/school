/**
 * Security Rule Contract & Dirty Dozen Payload Verification Suite
 * Mirrors the exact invariants enforced by firestore.rules and firebase-blueprint.json.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED' | 'ALLOW';
  actor: {
    uid: string | null;
    email: string | null;
    email_verified: boolean;
    role?: 'admin' | 'teacher' | 'student' | 'parent';
  };
  payload?: Record<string, unknown>;
  reason: string;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Self-Assigned Admin Escalation',
    collection: '/users/attacker_uid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker_uid', displayName: 'Attacker', email: 'attacker@example.com', role: 'admin' },
    reason: 'Non-admin users cannot self-assign admin or teacher roles during profile creation.',
  },
  {
    id: 2,
    name: 'Role Mutation on Update',
    collection: '/users/student_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'student_1', email: 'student@example.com', email_verified: true, role: 'student' },
    payload: { role: 'teacher' },
    reason: 'affectedKeys().hasOnly(["displayName", "className", "updatedAt"]) blocks role mutation.',
  },
  {
    id: 3,
    name: 'Shadow Field Injection',
    collection: '/notices/notice_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'admin_1', email: 'info.ajkerprice@gmail.com', email_verified: true, role: 'admin' },
    payload: { title: 'Test', content: 'Body text', ghostField: true },
    reason: 'keys().hasOnly(...) rejects any undeclared shadow fields.',
  },
  {
    id: 4,
    name: 'Unverified Email Spoofing',
    collection: '/students/stu_1',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'spoof_1', email: 'info.ajkerprice@gmail.com', email_verified: false },
    reason: 'Bootstrapped admin check strictly requires email_verified == true.',
  },
  {
    id: 5,
    name: 'Teacher HR PII Harvesting',
    collection: '/teacher_records/tr_1',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'student_1', email: 'student@example.com', email_verified: true, role: 'student' },
    reason: 'Private HR records are restricted strictly to Admin or linked teacherUid.',
  },
  {
    id: 6,
    name: 'Cross-Family Student PII Access',
    collection: '/students/stu_other',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'parent_a', email: 'parent_a@example.com', email_verified: true, role: 'parent' },
    reason: 'Parents can only read students where existing().parentUid == request.auth.uid.',
  },
  {
    id: 7,
    name: 'ID Poisoning with Invalid Characters',
    collection: '/notices/invalid$id!@#',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'admin_1', email: 'info.ajkerprice@gmail.com', email_verified: true, role: 'admin' },
    reason: 'isValidId() enforces ^[a-zA-Z0-9_\\-]+$ and max 128 chars.',
  },
  {
    id: 8,
    name: 'Orphaned LMS Submission',
    collection: '/lms_submissions/sub_orphan',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'student_1', email: 'student@example.com', email_verified: true, role: 'student' },
    payload: { resourceId: 'nonexistent_res', studentUid: 'student_1', status: 'Submitted' },
    reason: 'exists(/library_resources/$(incoming().resourceId)) rejects orphaned submissions.',
  },
  {
    id: 9,
    name: 'Terminal Paid Invoice Tampering',
    collection: '/fee_invoices/inv_paid_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'parent_1', email: 'parent@example.com', email_verified: true, role: 'parent' },
    payload: { paidAmountBdt: 0, status: 'Unpaid' },
    reason: 'Terminal state locking prevents non-admin updates when existing().status == "Paid".',
  },
  {
    id: 10,
    name: 'Admission Status Self-Approval',
    collection: '/admissions/adm_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'applicant_1', email: 'applicant@example.com', email_verified: true },
    payload: { status: 'Approved' },
    reason: 'Applicant update branch forbids changing status or remarks.',
  },
  {
    id: 11,
    name: 'Client Timestamp Forgery',
    collection: '/notices/notice_2',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'admin_1', email: 'info.ajkerprice@gmail.com', email_verified: true, role: 'admin' },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    reason: 'Temporal integrity requires incoming().createdAt == request.time.',
  },
  {
    id: 12,
    name: 'Unbounded Subjects Array Poisoning',
    collection: '/published_results/res_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    actor: { uid: 'admin_1', email: 'info.ajkerprice@gmail.com', email_verified: true, role: 'admin' },
    payload: { subjects: new Array(25).fill({ subject: 'Math', marks: 90 }) },
    reason: 'Total array guard requires subjects.size() >= 1 && subjects.size() <= 15.',
  },
];
