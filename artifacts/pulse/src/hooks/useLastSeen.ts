import { useState, useEffect } from "react";

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "не в сети";

  const ts = new Date(lastSeen).getTime();
  if (isNaN(ts)) return "не в сети";

  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "был(а) в сети только что";
  if (mins < 60) return `был(а) в сети ${mins} ${plural(mins, "минуту", "минуты", "минут")} назад`;
  if (hours < 24) return `был(а) в сети ${hours} ${plural(hours, "час", "часа", "часов")} назад`;
  if (days === 1) return "был(а) в сети вчера";
  return `был(а) в сети ${days} ${plural(days, "день", "дня", "дней")} назад`;
}

export function useLastSeen(lastSeen: string | null | undefined, status: string | undefined): string {
  const [label, setLabel] = useState<string>(() => {
    if (status === "online") return "в сети";
    return formatLastSeen(lastSeen);
  });

  useEffect(() => {
    if (status === "online") {
      setLabel("в сети");
      return;
    }

    setLabel(formatLastSeen(lastSeen));

    const id = setInterval(() => {
      setLabel(formatLastSeen(lastSeen));
    }, 60_000);

    return () => clearInterval(id);
  }, [lastSeen, status]);

  return label;
}
