export interface ParsedMessage {
  sender: string;
  timestamp: Date;
  text: string;
}

export interface ParsedCounts {
  weekly: { W1: number; W2: number; W3: number; W4: number };
  daily: { Mon: number; Tue: number; Wed: number; Thu: number; Fri: number };
}

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
const DAY_RE = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

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
    // Skip blank lines
    if (lines[i].trim() === "") { i++; continue; }

    const sender = lines[i].trim();
    if (i + 1 >= lines.length) break;

    const tsLine = lines[i + 1].trim();
    const ts = parseTimestamp(tsLine, refDate);

    if (ts) {
      // Collect message text (everything until next blank line or next sender block)
      let text = "";
      let j = i + 2;
      while (j < lines.length && lines[j].trim() !== "") {
        // Check if this line + next line form a new sender+timestamp pair
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

  // Sort by timestamp
  const sorted = [...userMessages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const earliest = sorted[0].timestamp;
  const latest = sorted[sorted.length - 1].timestamp;

  // Divide the date range into 4 equal-ish weeks
  const totalMs = latest.getTime() - earliest.getTime();
  const weekMs = Math.max(totalMs / 4, 7 * 24 * 60 * 60 * 1000);

  const weekly = { W1: 0, W2: 0, W3: 0, W4: 0 };
  const weekKeys = ["W1", "W2", "W3", "W4"] as const;

  for (const msg of sorted) {
    const elapsed = msg.timestamp.getTime() - earliest.getTime();
    const weekIdx = Math.min(Math.floor(elapsed / weekMs), 3);
    weekly[weekKeys[weekIdx]]++;
  }

  // Daily counts for the most recent week (W4 bucket)
  const w4Start = earliest.getTime() + weekMs * 3;
  const daily = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
  const dayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const msg of sorted) {
    if (msg.timestamp.getTime() >= w4Start) {
      const dayName = dayKeys[msg.timestamp.getDay()];
      if (dayName in daily) {
        daily[dayName as keyof typeof daily]++;
      }
    }
  }

  return { weekly, daily };
}
