import { useEffect, useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Cloud, CloudRain, Sun, CloudSun, Wind, Droplets, CloudFog, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* Live weather + hourly forecast for Lake Isle (Eastchester, NY) via Open-Meteo —
 * free, no API key, CORS-enabled. Hourly strip runs current hour → 4 AM. 10-min refresh. */
const LAT = 40.954;
const LON = -73.806;

const CODE: Record<number, { label: string; icon: LucideIcon }> = {
  0: { label: "Clear", icon: Sun },
  1: { label: "Mostly clear", icon: CloudSun },
  2: { label: "Partly cloudy", icon: CloudSun },
  3: { label: "Overcast", icon: Cloud },
  45: { label: "Fog", icon: CloudFog },
  48: { label: "Fog", icon: CloudFog },
  51: { label: "Drizzle", icon: CloudRain },
  53: { label: "Drizzle", icon: CloudRain },
  55: { label: "Drizzle", icon: CloudRain },
  61: { label: "Rain", icon: CloudRain },
  63: { label: "Rain", icon: CloudRain },
  65: { label: "Heavy rain", icon: CloudRain },
  80: { label: "Showers", icon: CloudRain },
  81: { label: "Showers", icon: CloudRain },
  82: { label: "Heavy showers", icon: CloudRain },
  95: { label: "Storms", icon: Zap },
  96: { label: "Storms", icon: Zap },
  99: { label: "Storms", icon: Zap },
};
const info = (c: number) => CODE[c] ?? { label: "—", icon: Cloud };
const hourLabel = (iso: string) => {
  const h = +iso.slice(11, 13);
  return `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
};

export function WeatherWidget() {
  const [w, setW] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,weather_code` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=2`;
    let alive = true;
    const load = () =>
      fetch(url)
        .then((r) => r.json())
        .then((d) => alive && setW(d))
        .catch(() => alive && setFailed(true));
    void load();
    const id = setInterval(load, 600_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (failed) return null;
  if (!w?.current || !w?.hourly) return <Card className="p-3 text-sm text-muted-foreground">Loading weather…</Card>;

  const c = w.current;
  const ci = info(c.weather_code);
  const CIcon = ci.icon;
  const H = w.hourly;
  const times: string[] = H.time ?? [];

  // Current ET hour key → slice hours from now through the 4 AM hour.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const curKey = `${parts.year}-${parts.month}-${parts.day}T${String(parts.hour).padStart(2, "0")}:00`;
  const startDay = curKey.slice(0, 10);
  const idxs: number[] = [];
  for (let i = 0; i < times.length; i++) {
    if (times[i] < curKey) continue;
    idxs.push(i);
    if (times[i].slice(0, 10) !== startDay && +times[i].slice(11, 13) >= 4) break;
  }

  let eveProb = 0;
  times.forEach((t, i) => {
    const h = +t.slice(11, 13);
    if (h >= 20 || h <= 1) eveProb = Math.max(eveProb, H.precipitation_probability?.[i] ?? 0);
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <CIcon className="h-9 w-9 text-pool" />
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {Math.round(c.temperature_2m)}°<span className="ml-1 text-sm font-medium text-muted-foreground">{ci.label}</span>
            </div>
            <div className="text-xs text-muted-foreground">feels {Math.round(c.apparent_temperature)}° · Lake Isle · live</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span className={`flex items-center gap-1 ${eveProb >= 40 ? "text-warn" : "text-muted-foreground"}`}>
            <Droplets className="h-3.5 w-3.5 text-pool" /> {eveProb}% tonight
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Wind className="h-3.5 w-3.5" /> {Math.round(c.wind_speed_10m)} mph
          </span>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto border-t border-border/60 px-3 py-2.5" style={{ scrollbarWidth: "none" }}>
        {idxs.map((i) => {
          const HIcon = info(H.weather_code?.[i] ?? 0).icon;
          const prob = H.precipitation_probability?.[i] ?? 0;
          return (
            <div key={i} className="flex w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-lg bg-muted/60 px-1 py-1.5 text-center">
              <span className="text-[10px] font-semibold text-muted-foreground">{hourLabel(times[i])}</span>
              <HIcon className="h-4 w-4 text-pool" />
              <span className="text-sm font-bold tabular-nums">{Math.round(H.temperature_2m?.[i])}°</span>
              <span className="text-[9px] tabular-nums text-muted-foreground">rf {Math.round(H.apparent_temperature?.[i])}°</span>
              <span className={`text-[10px] tabular-nums ${prob >= 40 ? "text-warn" : "text-pool"}`}>{prob}%💧</span>
              <span className="text-[9px] tabular-nums text-muted-foreground">{Math.round(H.wind_speed_10m?.[i])}mph</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
