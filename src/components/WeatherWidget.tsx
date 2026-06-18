import { useEffect, useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Cloud, CloudRain, Sun, CloudSun, Wind, Droplets, CloudFog, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* Live weather for Lake Isle (Eastchester, NY) via Open-Meteo — free, no API key,
 * CORS-enabled, so it runs client-side (no secret to protect). Refreshes 10 min. */
const LAT = 40.954;
const LON = -73.806;

const CODE: Record<number, { label: string; icon: LucideIcon }> = {
  0: { label: "Clear", icon: Sun },
  1: { label: "Mainly clear", icon: CloudSun },
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
  95: { label: "Thunderstorm", icon: Zap },
  96: { label: "Thunderstorm", icon: Zap },
  99: { label: "Thunderstorm", icon: Zap },
};

export function WeatherWidget() {
  const [w, setW] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=1`;
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
  if (!w?.current)
    return <Card className="p-3 text-sm text-muted-foreground">Loading weather…</Card>;

  const c = w.current;
  const info = CODE[c.weather_code] ?? { label: "—", icon: Cloud };
  const Icon = info.icon;

  // Max precip probability during the party window (8pm–1am)
  const times: string[] = w.hourly?.time ?? [];
  const probs: number[] = w.hourly?.precipitation_probability ?? [];
  let eveProb = 0;
  times.forEach((t, i) => {
    const h = new Date(t).getHours();
    if (h >= 20 || h <= 1) eveProb = Math.max(eveProb, probs[i] ?? 0);
  });

  return (
    <Card className="flex items-center justify-between p-3">
      <div className="flex items-center gap-3">
        <Icon className="h-9 w-9 text-pool" />
        <div>
          <div className="text-2xl font-bold tabular-nums">
            {Math.round(c.temperature_2m)}°
            <span className="ml-1 text-sm font-medium text-muted-foreground">{info.label}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            feels {Math.round(c.apparent_temperature)}° · Lake Isle · live
          </div>
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
    </Card>
  );
}
