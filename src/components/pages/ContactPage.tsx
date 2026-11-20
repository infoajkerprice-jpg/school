import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Home,
  Mail,
  MapPin,
  Phone,
  SearchX,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { toBnDigits } from '../../i18n';
import { PageHeader } from '../PageHeader';
import { useUIFeedback } from '../ToastContext';

export const ContactPage: React.FC = () => {
  const { settings } = usePublicData();
  const { notify } = useUIFeedback();

  const telHref = `tel:${(settings.phone || '+8801711759705').replace(/[^\d+]/g, '')}`;
  const mapQuery = encodeURIComponent(
    settings.googleMapQuery?.trim() ||
      settings.address?.trim() ||
      'তুলসীঘাট, গাইবান্ধা সদর, গাইবান্ধা-৫৭০০'
  );
  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const mapOpenUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const showOfficialEmail = Boolean(settings.email?.trim());
  const showVerifiedFacebook = Boolean(settings.facebookVerified && settings.facebookUrl?.trim());
  const shifts = settings.shifts?.length ? settings.shifts : ['মর্নিং শিফট', 'ডে শিফট'];

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(settings.phone || '+880 1711-759705');
      notify('হেল্পলাইন নম্বর কপি করা হয়েছে।', 'success');
    } catch {
      notify('নম্বর কপি করা যায়নি।', 'warning');
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'যোগাযোগ' }]}
        badge="অফিসিয়াল হেল্পডেস্ক ও ক্যাম্পাস লোকেশন"
        icon={<MapPin className="h-3.5 w-3.5" />}
        title="যোগাযোগ ও ক্যাম্পাস ঠিকানা"
        subtitle={`${settings.schoolNameBn} — ভর্তি, একাডেমিক বা প্রশাসনিক যেকোনো প্রয়োজনে সরাসরি আমাদের সাথে যোগাযোগ করুন।`}
        accent="navy"
        rightSlot={
          settings.phone && (
            <a
              href={telHref}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#F4A62A] px-5 py-2.5 text-sm font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547]"
            >
              <Phone className="h-4 w-4" />
              <span>কল করুন: {settings.phone}</span>
            </a>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: Colorful Contact Channels */}
        <div className="space-y-4 rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs">
          <div>
            <h2 className="text-lg font-extrabold text-[#123B67]">অফিস ও যোগাযোগ তথ্য</h2>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="h-1 w-10 rounded-full bg-[#087F5B]" />
              <span className="h-1 w-4 rounded-full bg-[#F4A62A]" />
            </div>
          </div>

          <div className="space-y-3.5 pt-1 text-sm text-[#263B35]">
            <div className="flex items-start gap-3.5 rounded-xl border border-[#E8F1EC] bg-[#FAFDFB] p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#123B67]">ক্যাম্পাস ঠিকানা</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#4C6470]">{settings.address}</p>
              </div>
            </div>

            {settings.phone && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F8DFAF] bg-[#FFF8EA]/70 p-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#123B67]">মোবাইল নম্বর</p>
                    <a
                      href={telHref}
                      className="text-sm font-extrabold text-[#087F5B] hover:underline tabular-nums"
                    >
                      {settings.phone}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyPhone()}
                  aria-label="নম্বর কপি করুন"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5C98B] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                  কপি
                </button>
              </div>
            )}

            {settings.websiteUrl && (
              <div className="flex items-start gap-3.5 rounded-xl border border-[#BFE8F7] bg-[#EBF8FD]/60 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#21A9D6] text-white">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#123B67]">অফিসিয়াল ওয়েবসাইট</p>
                  <a
                    href={settings.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs font-bold text-[#0E7DA3] hover:underline"
                  >
                    {settings.websiteUrl}
                  </a>
                </div>
              </div>
            )}

            {showOfficialEmail && (
              <div className="flex items-start gap-3.5 rounded-xl border border-[#DDD1F5] bg-[#F5F0FF]/60 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#805AD5] text-white">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#123B67]">অফিসিয়াল ইমেইল</p>
                  <a
                    href={`mailto:${settings.email}`}
                    className="block truncate text-xs font-bold text-[#805AD5] hover:underline"
                  >
                    {settings.email}
                  </a>
                </div>
              </div>
            )}

            {showVerifiedFacebook && (
              <div className="flex items-start gap-3.5 rounded-xl border border-[#C8DDF2] bg-[#EDF4FB]/70 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123B67] text-white">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#123B67]">অফিসিয়াল ফেসবুক পেজ</p>
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#123B67] hover:text-[#087F5B] hover:underline"
                  >
                    ফেসবুক পেজ ভিজিট করুন →
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3.5 rounded-xl border border-[#E8F1EC] bg-[#FAFDFB] p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123B67] text-[#F4A62A]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#123B67]">শিফট ও সময়সূচি</p>
                <p className="mt-0.5 text-xs font-medium text-[#4C6470]">
                  {settings.officeHours || shifts.join(' ও ')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Institutional Info Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B]/12 text-[#087F5B]">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-[#123B67]">প্রতিষ্ঠানের মৌলিক তথ্য</h2>
                <p className="text-xs text-[#526B78]">প্রাতিষ্ঠানিক পরিচিতি ও দ্রুত সেবা</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-[#E2EDE7] bg-[#F8FBF9] p-5 text-sm">
              <div className="flex justify-between gap-2 border-b border-[#E5EFE9] pb-2.5">
                <span className="text-[#526B78]">প্রতিষ্ঠানের নাম</span>
                <strong className="text-right font-extrabold text-[#123B67]">{settings.schoolNameBn}</strong>
              </div>
              {settings.schoolNameEn && (
                <div className="flex justify-between gap-2 border-b border-[#E5EFE9] pb-2.5">
                  <span className="text-[#526B78]">ইংরেজি নাম</span>
                  <strong className="text-right font-bold text-[#123B67]">{settings.schoolNameEn}</strong>
                </div>
              )}
              <div className="flex justify-between gap-2 border-b border-[#E5EFE9] pb-2.5">
                <span className="text-[#526B78]">প্রতিষ্ঠার সাল</span>
                <strong className="font-extrabold text-[#087F5B] tabular-nums">
                  {toBnDigits(settings.establishedYear || '২০১৯')} খ্রি.
                </strong>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#E5EFE9] pb-2.5">
                <span className="text-[#526B78]">সর্বোচ্চ শ্রেণি</span>
                <strong className="font-extrabold text-[#805AD5]">
                  {settings.highestClass || 'অষ্টম শ্রেণি'}
                </strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#526B78]">শিফটসমূহ</span>
                <strong className="text-right font-extrabold text-[#0E7DA3]">
                  {shifts.join(' ও ')}
                </strong>
              </div>
              {settings.eiin?.trim() && (
                <div className="flex justify-between gap-2 border-t border-[#E5EFE9] pt-2.5">
                  <span className="text-[#526B78]">EIIN নম্বর</span>
                  <strong className="font-extrabold text-[#123B67] tabular-nums">
                    {toBnDigits(settings.eiin)}
                  </strong>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to="/admission"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#087F5B] py-3 text-center text-xs font-extrabold text-white shadow-xs transition hover:bg-[#06684A]"
            >
              অনলাইন ভর্তি আবেদন
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={telHref}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B67] py-3 text-center text-xs font-extrabold text-white shadow-xs transition hover:bg-[#0C2A4B]"
            >
              <Phone className="h-3.5 w-3.5 text-[#F4A62A]" />
              মোবাইলে কল করুন
            </a>
          </div>
        </div>
      </div>

      {/* Google Map Embed Section */}
      <div className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8F1EC] bg-[#F8FBF9] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#21A9D6]/15 text-[#0E7DA3]">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-[#123B67]">গুগল ম্যাপে আমাদের অবস্থান</h2>
              <p className="text-xs text-[#526B78]">{settings.address}</p>
            </div>
          </div>
          <a
            href={mapOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#EDF9F4] px-4 py-2 text-xs font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            গুগল ম্যাপে বড় করে দেখুন
          </a>
        </div>
        <div className="h-[360px] w-full bg-[#EDF4F0]">
          <iframe
            title="শাহ ইসলামিক স্কুল এন্ড কলেজ — গুগল ম্যাপ"
            src={mapEmbedUrl}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => (
  <div className="mx-auto my-6 max-w-xl overflow-hidden rounded-3xl border border-[#D4E6DD] bg-white p-8 text-center shadow-sm sm:p-12">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F0FF] text-[#805AD5]">
      <SearchX className="h-8 w-8" />
    </div>
    <p className="mt-4 bg-gradient-to-r from-[#123B67] via-[#087F5B] to-[#805AD5] bg-clip-text text-6xl font-black text-transparent tabular-nums">
      ৪০৪
    </p>
    <h1 className="mt-3 text-xl font-extrabold text-[#123B67] sm:text-2xl">
      পৃষ্ঠাটি খুঁজে পাওয়া যায়নি
    </h1>
    <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#526B78] sm:text-sm">
      আপনি যে ঠিকানায় প্রবেশ করার চেষ্টা করেছেন তা সঠিক নয় বা স্থানান্তর করা হয়েছে। নিচের লিংকগুলো থেকে প্রয়োজনীয় পাতায় যান।
    </p>
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-xl bg-[#087F5B] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#06684A]"
      >
        <Home className="h-4 w-4" />
        মূলপাতায় ফিরে যান
      </Link>
      <Link
        to="/notices"
        className="rounded-xl bg-[#EDF4FB] px-4 py-2.5 text-xs font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white"
      >
        নোটিশ বোর্ড
      </Link>
      <Link
        to="/admission"
        className="rounded-xl bg-[#FFF8EA] px-4 py-2.5 text-xs font-bold text-[#A66300] transition hover:bg-[#F4A62A] hover:text-[#123B67]"
      >
        অনলাইন ভর্তি
      </Link>
    </div>
  </div>
);
