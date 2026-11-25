import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import type { LandmarkPin } from '../types';

const LANDMARKS: LandmarkPin[] = [
  {
    id: 'pho-co-hoa-lu',
    name: 'Phố cổ Hoa Lư (Hồ Kỳ Lân)',
    category: 'trong_khu',
    subtitle: 'Điểm trung tâm · Trung tâm Ninh Bình',
    description:
      'Không gian du lịch, tham quan, ẩm thực và trải nghiệm văn hóa nằm dưới chân núi Kỳ Lân, quanh hồ Kỳ Lân.',
    note: 'Kiểm tra bản đồ số hiện hành để cập nhật cách ghi địa chỉ hành chính mới nhất.',
    lat: 20.2586,
    lng: 105.9718,
    image_url: '/src/assets/images/ho_ky_lan_twilight_1795618579808.jpg',
  },
  {
    id: 'thap-tu-an',
    name: 'Tháp Tứ Ân & Lối dạo hồ Kỳ Lân',
    category: 'trong_khu',
    subtitle: 'Trong khuôn viên Phố cổ Hoa Lư',
    description:
      'Công trình nhiều tầng mái nổi bật trên hồ Kỳ Lân cùng khu vực cầu, thủy đình và dãy nhà gỗ đèn lồng.',
    note: 'Đẹp nhất vào khung giờ gợi ý chiều tối 17:30–21:30.',
    lat: 20.2591,
    lng: 105.9724,
    image_url: '/src/assets/images/thuy_dinh_performance_1795618580818.jpg',
  },
  {
    id: 'ga-ninh-binh',
    name: 'Ga Ninh Bình',
    category: 'ket_hop',
    subtitle: 'Điểm kết nối giao thông đường sắt',
    description:
      'Điểm đến thường được kết hợp thuận tiện khi di chuyển bằng tàu hỏa tới khu vực trung tâm Ninh Bình.',
    note: 'Khoảng cách di chuyển chỉ mang tính ước lượng tùy tuyến đường.',
    lat: 20.2517,
    lng: 105.9806,
    image_url: '/src/assets/images/pho_co_wooden_houses_1795618580199.jpg',
  },
  {
    id: 'trang-an',
    name: 'Quần thể danh thắng Tràng An',
    category: 'ket_hop',
    subtitle: 'Địa điểm kết hợp nổi bật',
    description:
      'Quần thể danh thắng nổi tiếng với cảnh quan núi đá vôi, sông nước và tuyến thuyền qua hang động.',
    note: 'Khoảng cách chỉ mang tính ước lượng; tra cứu chỉ đường thực tế trước khi xuất phát.',
    lat: 20.2506,
    lng: 105.9375,
    image_url: '/src/assets/images/trang_an_co_do_1795618582029.jpg',
  },
  {
    id: 'hang-mua',
    name: 'Hang Múa',
    category: 'ket_hop',
    subtitle: 'Địa điểm kết hợp ngắm cảnh',
    description:
      'Điểm ngắm cảnh từ trên cao với các bậc đá dẫn lên khu vực đỉnh núi nhìn ra thung lũng.',
    note: 'Khoảng cách chỉ mang tính ước lượng.',
    lat: 20.2323,
    lng: 105.9373,
    image_url: '/src/assets/images/trang_an_co_do_1795618582029.jpg',
  },
  {
    id: 'tam-coc',
    name: 'Tam Cốc – Bích Động',
    category: 'ket_hop',
    subtitle: 'Địa điểm kết hợp tuyến sông Ngô Đồng',
    description:
      'Tuyến tham quan sông Ngô Đồng, hệ thống hang động và chùa Bích Động.',
    note: 'Khoảng cách chỉ mang tính ước lượng.',
    lat: 20.2144,
    lng: 105.9327,
    image_url: '/src/assets/images/trang_an_co_do_1795618582029.jpg',
  },
  {
    id: 'co-do-hoa-lu',
    name: 'Khu di tích lịch sử Cố đô Hoa Lư (Trường Yên)',
    category: 'ket_hop',
    subtitle: 'Quần thể di tích lịch sử triều Đinh – Tiền Lê',
    description:
      'Quần thể di tích lịch sử tại Trường Yên gắn với kinh đô xưa của nhà nước Đại Cồ Việt (khác với Phố cổ Hoa Lư tại hồ Kỳ Lân).',
    note: 'Lưu ý phân biệt rõ với Phố cổ Hoa Lư khi tìm kiếm chỉ đường.',
    lat: 20.2856,
    lng: 105.9086,
    image_url: '/src/assets/images/trang_an_co_do_1795618582029.jpg',
  },
];

export const MapPage: React.FC = () => {
  const [selected, setSelected] = useState<LandmarkPin>(LANDMARKS[0]);
  const [filterType, setFilterType] = useState<'all' | 'trong_khu' | 'ket_hop'>('all');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  const visibleLandmarks = LANDMARKS.filter((l) =>
    filterType === 'all' ? true : l.category === filterType
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.256, 105.955],
      zoom: 13,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    LANDMARKS.forEach((lm) => {
      const isCore = lm.category === 'trong_khu';
      const marker = L.circleMarker([lm.lat, lm.lng], {
        radius: isCore ? 10 : 8,
        fillColor: isCore ? '#8B261D' : '#B8860B',
        color: '#FAF6EE',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.92,
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 190px;">
          <strong style="color:#2C1D14; font-size:13px;">${lm.name}</strong>
          <div style="color:#5C3D28; font-size:11.5px; margin-top:4px;">${lm.subtitle}</div>
        </div>`
      );

      marker.on('click', () => {
        setSelected(lm);
      });

      markersRef.current.set(lm.id, marker);
    });

    // Open initial popup
    markersRef.current.get(LANDMARKS[0].id)?.openPopup();
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  const focusLandmark = (lm: LandmarkPin) => {
    setSelected(lm);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([lm.lat, lm.lng], lm.category === 'trong_khu' ? 16 : 14, {
        duration: 0.6,
      });
      markersRef.current.get(lm.id)?.openPopup();
    }
  };

  const getGoogleMapsDirectionsUrl = (lm: LandmarkPin) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lm.lat},${lm.lng}`;

  const getOsmUrl = (lm: LandmarkPin) =>
    `https://www.openstreetmap.org/?mlat=${lm.lat}&mlon=${lm.lng}#map=16/${lm.lat}/${lm.lng}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="max-w-3xl space-y-3 mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
          Bản đồ &amp; Định vị
        </p>
        <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-[#2C1D14]">
          Bản đồ Phố cổ Hoa Lư &amp; Các điểm kết hợp
        </h1>
        <p className="text-sm sm:text-base text-[#5C3D28] leading-relaxed">
          Phố cổ Hoa Lư nằm tại khu vực hồ Kỳ Lân, dưới chân núi Kỳ Lân, trung tâm Ninh Bình. Địa
          chỉ hành chính và khoảng cách đến các điểm lân cận chỉ mang tính ước lượng — hãy mở chỉ
          đường trực tiếp trên bản đồ số khi xuất phát.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div
          role="tablist"
          aria-label="Lọc điểm trên bản đồ"
          className="flex items-center gap-1 p-1 bg-[#EFE6D5] rounded-xl border border-[#DED1BA]"
        >
          {[
            { id: 'all', label: 'Tất cả điểm (7)' },
            { id: 'trong_khu', label: 'Khu Phố cổ Hoa Lư' },
            { id: 'ket_hop', label: 'Điểm tham quan kết hợp' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filterType === tab.id}
              onClick={() => setFilterType(tab.id as 'all' | 'trong_khu' | 'ket_hop')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filterType === tab.id
                  ? 'bg-[#2C1D14] text-[#FAF6EE]'
                  : 'text-[#5C3D28] hover:text-[#2C1D14]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map + Directory Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left List */}
        <div className="lg:col-span-5 flex flex-col gap-3 max-h-[540px] overflow-y-auto pr-1">
          {visibleLandmarks.map((lm) => {
            const active = selected.id === lm.id;
            return (
              <div
                key={lm.id}
                onClick={() => focusLandmark(lm)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    focusLandmark(lm);
                  }
                }}
                className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#FCF9F3] border-[#8B261D]'
                    : 'bg-[#F5EFE4] border-[#DED1BA] hover:border-[#C2A476]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#8B261D]">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{lm.subtitle}</span>
                    </div>
                    <h2 className="font-serif text-lg font-semibold text-[#2C1D14]">{lm.name}</h2>
                    <p className="text-xs text-[#4A3222] leading-relaxed">{lm.description}</p>
                    <p className="text-[11px] text-[#7D6650] italic">{lm.note}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E6DAC5] flex flex-wrap items-center gap-3">
                  <a
                    href={getGoogleMapsDirectionsUrl(lm)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-xs font-medium transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Mở chỉ đường (Google Maps)</span>
                  </a>
                  <a
                    href={getOsmUrl(lm)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#5C3D28] hover:text-[#2C1D14]"
                  >
                    <span>OpenStreetMap</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Interactive OpenStreetMap */}
        <div className="lg:col-span-7 flex flex-col bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-[420px] lg:h-[470px]"
            aria-label="Bản đồ tương tác OpenStreetMap khu vực Phố cổ Hoa Lư và Ninh Bình"
          />
          <div className="p-4 bg-[#F5EFE4] border-t border-[#DFD2BC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-[#7D6650]">Đang chọn địa điểm</div>
              <div className="font-serif text-base font-semibold text-[#2C1D14]">
                {selected.name}
              </div>
            </div>
            <a
              href={getGoogleMapsDirectionsUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#2C1D14] hover:bg-[#3F2A1D] text-[#FAF6EE] text-xs font-semibold transition-colors shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Chỉ đường tới đây</span>
            </a>
          </div>
        </div>
      </div>

      {/* Transport & Parking Notice from Knowledge Doc */}
      <div className="mt-10 p-6 bg-[#F3ECDD] border border-[#DED1BA] rounded-xl space-y-2">
        <h3 className="font-serif text-xl font-semibold text-[#2C1D14]">
          Lưu ý phương tiện &amp; gửi xe
        </h3>
        <p className="text-sm text-[#4A3222] leading-relaxed">
          Du khách có thể đến khu vực Phố cổ Hoa Lư bằng xe máy, ô tô cá nhân, taxi hoặc xe đạp nếu
          lưu trú gần trung tâm Ninh Bình. Vị trí bãi gửi xe và mức phí gửi xe có thể thay đổi theo
          thời điểm — vui lòng quan sát biển niêm yết, hỏi nhân viên hướng dẫn và giữ vé gửi xe.
        </p>
      </div>
    </div>
  );
};
