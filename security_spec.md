# Firestore Security Specification — Dhaka Heritage Model School & College

## 1. Data Invariants & Master Source of Truth

1. **Identity & Role Integrity (`/users/{userId}`, `/admins/{userId}`)**:
   - Users can never self-assign `'admin'` or `'teacher'` roles on creation or modify their own `role` field on update.
   - Bootstrapped administrator (`info.ajkerprice@gmail.com` with `email_verified == true`) and verified entries in `/admins/{uid}` are the authoritative source of administrative authority.
   - All write operations require `request.auth != null && request.auth.token.email_verified == true`.
2. **PII Split-Collection Isolation (`/faculty` vs `/teacher_records`, `/students`, `/users`)**:
   - Public faculty directory (`/faculty`) contains strictly non-PII academic metadata (name, designation, department, qualification, subject, shift).
   - Private HR data (`/teacher_records`: phone, email, salaryBdt) is strictly readable only by Admins or the linked `teacherUid`.
   - Student records (`/students`: guardianPhone, address) are readable only by Admins, Teachers, or the linked `studentUid`/`parentUid`.
3. **Referential & Temporal Integrity**:
   - Every `create` enforces `incoming().createdAt == request.time && incoming().updatedAt == request.time`.
   - Every `update` enforces `incoming().createdAt == existing().createdAt && incoming().updatedAt == request.time`.
   - `lms_submissions` creation verifies parent resource exists via `exists(/databases/$(database)/documents/library_resources/$(incoming().resourceId))`.
   - `attendance`, `published_results`, and `fee_invoices` creation verify the target student exists via `exists(/databases/$(database)/documents/students/$(incoming().studentId))`.
4. **Terminal State Locking**:
   - `admissions`: Once `status` is `'Approved'` or `'Rejected'`, non-admin updates are permanently rejected.
   - `fee_invoices`: Once `status` is `'Paid'`, non-admin updates are permanently rejected.
   - `lms_submissions`: Once `status` is `'Graded'`, student updates are permanently rejected.
5. **Bounded Arrays & String Size Enforcements**:
   - Every string field enforces strict `.size()` bounds matching `firebase-blueprint.json`.
   - `published_results.subjects` is strictly bounded to `size() >= 1 && size() <= 15` with map type verification on element 0.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Self-Assigned Admin Escalation**: Unprivileged user creates `/users/{uid}` with `{ role: "admin" }`.
2. **Role Mutation on Update**: Authenticated student updates `/users/{uid}` changing `role` from `"student"` to `"teacher"`.
3. **Ghost / Shadow Field Injection**: Creating or updating a student document with an extra undeclared field `{ isVerified: true, scholarshipOverride: 100 }`.
4. **Unverified Email Spoofing**: Request claiming `email: "info.ajkerprice@gmail.com"` with `email_verified: false`.
5. **PII Harvesting on `/teacher_records`**: Authenticated student executes `get` on `/teacher_records/{teacherId}` to read teacher salary/phone.
6. **PII Harvesting on `/students`**: Unlinked parent executes `get` on another family's `/students/{studentId}`.
7. **ID Poisoning / Resource Exhaustion**: Writing to `/notices/<200-char-invalid-id!@#>` or injecting a 10KB string into `title`.
8. **Orphaned LMS Submission**: Student submits `/lms_submissions/{id}` referencing a non-existent `resourceId`.
9. **Terminal Fee Tampering**: Parent attempts to update a `fee_invoices` record whose `status` is already `'Paid'`.
10. **Admission Status Self-Approval**: Applicant updates their own `/admissions/{id}` changing `status` from `'Pending'` to `'Approved'`.
11. **Backdated Timestamp Forgery**: Creating a notice with client-forged `createdAt` instead of `serverTimestamp()`.
12. **Unbounded Subjects Array Poisoning**: Creating `/published_results/{id}` with 25 elements in `subjects` or non-map subject entries.
