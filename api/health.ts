interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    institution: {
      name: 'Shah Islamic School And College',
      nameBn: 'শাহ ইসলামিক স্কুল এন্ড কলেজ',
      established: 2019,
      location: 'তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০।',
      phone: '+880 1711-759705',
      website: 'https://shahislamicschool.com',
      highestClass: 'অষ্টম শ্রেণি',
    },
    timestamp: new Date().toISOString(),
  });
}
