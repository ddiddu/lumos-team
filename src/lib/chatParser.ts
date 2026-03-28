export interface ParsedMessage {
  sender: string;
  timestamp: Date;
  text: string;
}

export interface ParsedCounts {
  weekly: { W1: number; W2: number; W3: number; W4: number };
  daily: { Mon: number; Tue: number; Wed: number; Thu: number; Fri: number };
}

export interface WeekLabel {
  key: "W1" | "W2" | "W3" | "W4";
  label: string; // e.g. "Mar W2"
}

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
const DAY_RE = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseTimestamp(raw: string, refDate: Date): Date | null {
  const dateMatch = raw.match(DATE_RE);
  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10) - 1;
    const day = parseInt(dateMatch[2], 10);
    let hour = parseInt(dateMatch[3], 10);
    const minute = parseInt(dateMatch[4], 10);
    const ampm = dateMatch[5].toUpperCase();
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const year = refDate.getFullYear();
    return new Date(year, month, day, hour, minute);
  }

  const dayMatch = raw.match(DAY_RE);
  if (dayMatch) {
    const targetDay = DAY_MAP[dayMatch[1].toLowerCase()];
    let hour = parseInt(dayMatch[2], 10);
    const minute = parseInt(dayMatch[3], 10);
    const ampm = dayMatch[4].toUpperCase();
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const today = new Date(refDate);
    const currentDay = today.getDay();
    let diff = currentDay - targetDay;
    if (diff < 0) diff += 7;
    const result = new Date(today);
    result.setDate(today.getDate() - diff);
    result.setHours(hour, minute, 0, 0);
    return result;
  }

  return null;
}

/**
 * Parse Teams chat format:
 * "Sender Name\ntimestamp\nmessage text"
 * Blocks separated by blank lines.
 */
export function parseTeamsChat(raw: string): ParsedMessage[] {
  const lines = raw.split("\n");
  const messages: ParsedMessage[] = [];
  const refDate = new Date();

  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === "") { i++; continue; }

    const sender = lines[i].trim();
    if (i + 1 >= lines.length) break;

    const tsLine = lines[i + 1].trim();
    const ts = parseTimestamp(tsLine, refDate);

    if (ts) {
      let text = "";
      let j = i + 2;
      while (j < lines.length && lines[j].trim() !== "") {
        if (j + 1 < lines.length && parseTimestamp(lines[j + 1].trim(), refDate)) {
          break;
        }
        text += (text ? "\n" : "") + lines[j];
        j++;
      }
      messages.push({ sender, timestamp: ts, text });
      i = j;
    } else {
      i++;
    }
  }

  return messages;
}

/**
 * Extract unique participant names — only from lines immediately followed by a valid timestamp.
 */
export function extractParticipants(raw: string): string[] {
  const lines = raw.split("\n");
  const names = new Set<string>();

  const DATE_TS = /^\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\s+(AM|PM)$/i;
  const DAY_TS = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}:\d{2}\s+(AM|PM)$/i;

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const nextLine = lines[i + 1].trim();
    if (DATE_TS.test(nextLine) || DAY_TS.test(nextLine)) {
      names.add(line);
    }
  }

  return [...names];
}

/**
 * Calculate real week labels from message timestamps.
 * Returns labels like "Mar W2", "Mar W3", etc.
 */
export function getWeekLabels(messages: ParsedMessage[]): WeekLabel[] {
  if (messages.length === 0) {
    return [
      { key: "W1", label: "W1" },
      { key: "W2", label: "W2" },
      { key: "W3", label: "W3" },
      { key: "W4", label: "W4" },
    ];
  }

  const sorted = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const latest = sorted[sorted.length - 1].timestamp;

  const latestDay = latest.getDay();
  const mondayOffset = latestDay === 0 ? 6 : latestDay - 1;
  const w4Monday = new Date(latest);
  w4Monday.setDate(latest.getDate() - mondayOffset);
  w4Monday.setHours(0, 0, 0, 0);

  const weekStarts = [
    new Date(w4Monday.getTime() - 21 * 86400000),
    new Date(w4Monday.getTime() - 14 * 86400000),
    new Date(w4Monday.getTime() - 7 * 86400000),
    w4Monday,
  ];

  const keys: ("W1" | "W2" | "W3" | "W4")[] = ["W1", "W2", "W3", "W4"];

  return weekStarts.map((start, i) => {
    const month = MONTH_NAMES[start.getMonth()];
    // Week of month (1-based)
    const weekOfMonth = Math.ceil(start.getDate() / 7);
    return {
      key: keys[i],
      label: `${month} W${weekOfMonth}`,
    };
  });
}

/**
 * Count messages from a specific user grouped by week and daily for most recent week.
 */
export function countMessages(messages: ParsedMessage[], userName: string): ParsedCounts {
  const userMessages = messages.filter(
    (m) => m.sender.toLowerCase() === userName.toLowerCase()
  );

  if (userMessages.length === 0) {
    return {
      weekly: { W1: 0, W2: 0, W3: 0, W4: 0 },
      daily: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 },
    };
  }

  const sorted = [...userMessages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const latest = sorted[sorted.length - 1].timestamp;

  const latestDay = latest.getDay();
  const mondayOffset = latestDay === 0 ? 6 : latestDay - 1;
  const w4Monday = new Date(latest);
  w4Monday.setDate(latest.getDate() - mondayOffset);
  w4Monday.setHours(0, 0, 0, 0);

  const weekStarts = [
    new Date(w4Monday.getTime() - 21 * 86400000),
    new Date(w4Monday.getTime() - 14 * 86400000),
    new Date(w4Monday.getTime() - 7 * 86400000),
    w4Monday,
  ];

  const weekly = { W1: 0, W2: 0, W3: 0, W4: 0 };
  const daily = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
  const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const msg of sorted) {
    const t = msg.timestamp.getTime();
    if (t >= weekStarts[3].getTime()) {
      weekly.W4++;
      const dayName = dayMap[msg.timestamp.getDay()];
      if (dayName in daily) {
        daily[dayName as keyof typeof daily]++;
      }
    } else if (t >= weekStarts[2].getTime()) {
      weekly.W3++;
    } else if (t >= weekStarts[1].getTime()) {
      weekly.W2++;
    } else if (t >= weekStarts[0].getTime()) {
      weekly.W1++;
    }
  }

  return { weekly, daily };
}
