export interface WorkStyle {
  role: string;
  style: string;
  likes: string;
  dislikes: string;
  speech_habits: string;
}

export interface Project {
  name: string;
  overview: string;
  left_off: string;
  status: "on track" | "blocked" | "in progress";
  weekly_summary: {
    W1: string;
    W2: string;
    W3: string;
    W4: string;
  };
  message_counts: {
    W1: number;
    W2: number;
    W3: number;
    W4: number;
    W4_daily: {
      Mon: number;
      Tue: number;
      Wed: number;
      Thu: number;
      Fri: number;
    };
  };
  next_up: string[];
}

export interface WeekLabelInfo {
  key: "W1" | "W2" | "W3" | "W4";
  label: string;
}

export interface AnalysisResult {
  work_style: WorkStyle;
  projects: Project[];
  weekLabels?: WeekLabelInfo[];
}
