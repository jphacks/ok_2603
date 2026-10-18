import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { coordinates, scheduleText, type Configuration } from './model';

export function PollingMap({ places }: { places: Configuration[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!container.current || !places.length) return;
    setTileError(false);
    const map = L.map(container.current, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on('tileerror', () => setTileError(true)).addTo(map);
    places.forEach((config, index) => {
      const popup = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = config.place.name; popup.append(heading);
      for (const line of [config.place.address, ...config.schedules.map(scheduleText)]) {
        const p = document.createElement('p'); p.textContent = line; popup.append(p);
      }
      L.marker(coordinates(config.place), {
        title: config.place.name, alt: `${index + 1}. ${config.place.name}`,
        icon: L.divIcon({ className: 'polling-pin', html: `<span>${index + 1}</span>`, iconSize: [32, 32], iconAnchor: [16, 32] }),
      }).addTo(map).bindPopup(popup);
    });
    map.fitBounds(L.latLngBounds(places.map(p => coordinates(p.place))), { padding: [36, 36], maxZoom: 15 });
    return () => { map.remove(); };
  }, [places]);
  return <>
    <div className="polling-map" ref={container} role="region" aria-label="投票所の地図（施設名のマーカーを選択できます）" />
    {tileError && <p role="status">背景地図を読み込めませんでした。投票所の住所・時間は下の一覧で確認できます。</p>}
  </>;
}
