import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, GraduationCap, Search, UserCheck, X } from 'lucide-react';
import { compareStudentsAcademic } from '../lib/pdfStudentsRoster';
import { labelClass, labelSection, toBnDigits } from '../i18n';
import { BD_CLASSES, type StudentRecord } from '../types';

const BN_TO_EN_DIGITS: Record<string, string> = {
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

/**
 * Normalizes Bengali & English text + Bengali digits (০-৯ -> 0-9) for fast, forgiving search.
 */
export function normalizeSearchText(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .replace(/[০-৯]/g, (d) => BN_TO_EN_DIGITS[d] || d)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface StudentPickerProps {
  students: StudentRecord[];
  value: string;
  onChange: (studentId: string) => void;
  classFilter?: string;
  onClassFilterChange?: (cls: string) => void;
  label?: string;
  required?: boolean;
  compact?: boolean;
  placeholder?: string;
}

export const StudentPicker: React.FC<StudentPickerProps> = ({
  students,
  value,
  onChange,
  classFilter: controlledClass,
  onClassFilterChange,
  label,
  required = false,
  compact = false,
  placeholder = 'নাম, রোল বা আইডি লিখে খুঁজুন...',
}) => {
  const [internalClass, setInternalClass] = useState<string>('ALL');
  const activeClass = controlledClass !== undefined ? controlledClass : internalClass;

  const setActiveClass = (next: string) => {
    if (onClassFilterChange) {
      onClassFilterChange(next);
    } else {
      setInternalClass(next);
    }
  };

  const [queryText, setQueryText] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedStudents = useMemo(
    () => [...students].sort(compareStudentsAcademic),
    [students]
  );

  const classOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sortedStudents) {
      counts.set(s.className, (counts.get(s.className) || 0) + 1);
    }
    const ordered: Array<{ value: string; label: string; count: number }> = [];
    for (const cls of BD_CLASSES) {
      const c = counts.get(cls);
      if (c && c > 0) {
        ordered.push({ value: cls, label: labelClass(cls), count: c });
        counts.delete(cls);
      }
    }
    // Include any extra custom classes present in DB
    for (const [cls, count] of counts.entries()) {
      ordered.push({ value: cls, label: labelClass(cls), count });
    }
    return ordered;
  }, [sortedStudents]);

  const classFilteredStudents = useMemo(() => {
    if (activeClass === 'ALL') return sortedStudents;
    return sortedStudents.filter((s) => s.className === activeClass);
  }, [sortedStudents, activeClass]);

  const matchingStudents = useMemo(() => {
    const q = normalizeSearchText(queryText);
    if (!q) return classFilteredStudents;
    const numericQ = q.replace(/^0+/, '');
    return classFilteredStudents.filter((s) => {
      const rollNorm = normalizeSearchText(s.rollNumber);
      const rollTrim = rollNorm.replace(/^0+/, '');
      return (
        normalizeSearchText(s.name).includes(q) ||
        normalizeSearchText(s.nameBn).includes(q) ||
        normalizeSearchText(s.studentIdCode).includes(q) ||
        rollNorm.includes(q) ||
        (numericQ.length > 0 && rollTrim === numericQ) ||
        normalizeSearchText(s.guardianName).includes(q) ||
        normalizeSearchText(s.guardianPhone).includes(q) ||
        normalizeSearchText(labelClass(s.className)).includes(q)
      );
    });
  }, [classFilteredStudents, queryText]);

  const selectedStudent = useMemo(
    () => sortedStudents.find((s) => s.id === value) || null,
    [sortedStudents, value]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Keep highlight index in range
  useEffect(() => {
    setHighlightIndex(0);
  }, [queryText, activeClass, open]);

  const handleClassChange = (nextClass: string) => {
    setActiveClass(nextClass);
    setQueryText('');
    const nextPool =
      nextClass === 'ALL'
        ? sortedStudents
        : sortedStudents.filter((s) => s.className === nextClass);

    if (selectedStudent && nextClass !== 'ALL' && selectedStudent.className !== nextClass) {
      if (!required && nextPool.length > 0) {
        onChange(nextPool[0].id);
      } else {
        onChange('');
      }
    }
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectStudent = (student: StudentRecord) => {
    onChange(student.id);
    setQueryText('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        matchingStudents.length === 0 ? 0 : (prev + 1) % matchingStudents.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        matchingStudents.length === 0
          ? 0
          : (prev - 1 + matchingStudents.length) % matchingStudents.length
      );
    } else if (e.key === 'Enter' && open) {
      if (matchingStudents[highlightIndex]) {
        e.preventDefault();
        handleSelectStudent(matchingStudents[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const fieldCls = compact
    ? 'w-full rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-semibold text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
    : 'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div ref={containerRef} className="relative space-y-2">
      {label && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-[#123B67] dark:text-slate-200">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <span className="text-[11px] font-semibold text-[#526B78] tabular-nums dark:text-slate-400">
            {activeClass === 'ALL'
              ? `মোট ${toBnDigits(sortedStudents.length)} জন`
              : `${labelClass(activeClass)}: ${toBnDigits(classFilteredStudents.length)} জন`}
          </span>
        </div>
      )}

      {/* Hidden native input for HTML5 form `required` validation */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
        {/* Step 1: Class Filter */}
        <div className="relative sm:col-span-5">
          <GraduationCap className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#087F5B] dark:text-emerald-400" />
          <select
            aria-label="শ্রেণি নির্বাচন করুন"
            value={activeClass}
            onChange={(e) => handleClassChange(e.target.value)}
            className={`${fieldCls} pl-8 pr-7`}
          >
            <option value="ALL">
              সকল শ্রেণি ({toBnDigits(sortedStudents.length)} জন)
            </option>
            {classOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({toBnDigits(opt.count)} জন)
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Live Name / Roll / ID Search & Dropdown */}
        <div className="relative sm:col-span-7">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#526B78] dark:text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQueryText(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedStudent
                ? `${selectedStudent.name} (রোল ${toBnDigits(selectedStudent.rollNumber)}) — অন্য কাউকে খুঁজুন...`
                : activeClass === 'ALL'
                ? placeholder
                : `${labelClass(activeClass)}-এর নাম বা রোল লিখুন...`
            }
            className={`${fieldCls} pl-8 pr-14`}
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
            {queryText && (
              <button
                type="button"
                aria-label="অনুসন্ধান মুছুন"
                onClick={() => {
                  setQueryText('');
                  inputRef.current?.focus();
                }}
                className="rounded-md p-1 text-[#526B78] hover:bg-[#F2F8F5] hover:text-[#123B67] dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="তালিকা খুলুন বা বন্ধ করুন"
              onClick={() => setOpen((o) => !o)}
              className="rounded-md p-1 text-[#526B78] hover:bg-[#F2F8F5] hover:text-[#123B67] dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Floating Suggestion Dropdown */}
          {open && (
            <div className="absolute right-0 left-0 z-40 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[#CFE0D6] bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E6F0EA] bg-[#F2F8F5] px-3 py-1.5 text-[11px] font-bold text-[#123B67] dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <span>
                  {activeClass === 'ALL' ? 'সকল শ্রেণি' : labelClass(activeClass)} ·{' '}
                  {toBnDigits(matchingStudents.length)} জন পাওয়া গেছে
                </span>
                {activeClass !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => handleClassChange('ALL')}
                    className="text-[#087F5B] underline hover:text-[#06684A] dark:text-emerald-400"
                  >
                    সব শ্রেণি দেখুন
                  </button>
                )}
              </div>

              {matchingStudents.length === 0 ? (
                <div className="px-3.5 py-6 text-center text-xs text-[#526B78] dark:text-slate-400">
                  এই শ্রেণি বা অনুসন্ধানে কোনো শিক্ষার্থী পাওয়া যায়নি।
                </div>
              ) : (
                <ul className="divide-y divide-[#EEF5F0] dark:divide-slate-800">
                  {matchingStudents.slice(0, 60).map((s, idx) => {
                    const isSelected = s.id === value;
                    const isHighlighted = idx === highlightIndex;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setHighlightIndex(idx)}
                          onClick={() => handleSelectStudent(s)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition ${
                            isSelected
                              ? 'bg-[#E9F7F1] text-[#087F5B] dark:bg-emerald-950/50 dark:text-emerald-300'
                              : isHighlighted
                              ? 'bg-[#F2F8F5] text-[#123B67] dark:bg-slate-800 dark:text-white'
                              : 'text-[#263B35] hover:bg-[#F7FBF9] dark:text-slate-200 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">{s.name}</p>
                            <p className="truncate text-[11px] text-[#526B78] tabular-nums dark:text-slate-400">
                              {labelClass(s.className)} ({labelSection(s.section)}) · রোল{' '}
                              {toBnDigits(s.rollNumber)} · {s.studentIdCode}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 shrink-0 text-[#087F5B] dark:text-emerald-400" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {matchingStudents.length > 60 && (
                    <li className="px-3 py-2 text-center text-[11px] font-semibold text-[#526B78] dark:text-slate-400">
                      আরও {toBnDigits(matchingStudents.length - 60)} জন রয়েছে — নাম বা রোল লিখে দ্রুত খুঁজুন।
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Student Confirmation Bar */}
      {selectedStudent && !compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#CBE6D8] bg-[#EFFAF4] px-3 py-2 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#087F5B] text-white">
              <UserCheck className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <span className="font-extrabold text-[#123B67] dark:text-white">
                {selectedStudent.name}
              </span>
              <span className="ml-2 text-[11px] font-semibold text-[#3C5B50] tabular-nums dark:text-emerald-300">
                {labelClass(selectedStudent.className)} · রোল{' '}
                {toBnDigits(selectedStudent.rollNumber)} · আইডি {selectedStudent.studentIdCode}
              </span>
            </div>
          </div>
          {required && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setQueryText('');
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="rounded-md px-2 py-0.5 text-[11px] font-bold text-[#087F5B] hover:bg-white dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              পরিবর্তন
            </button>
          )}
        </div>
      )}
    </div>
  );
};
