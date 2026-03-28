import type { WorkStyle } from "@/types/analysis";

interface WorkStyleCardProps {
  workStyle: WorkStyle;
}

const fields: { label: string; key: keyof WorkStyle }[] = [
  { label: "Role", key: "role" },
  { label: "Style", key: "style" },
  { label: "Likes", key: "likes" },
  { label: "Dislikes", key: "dislikes" },
  { label: "Speech habits", key: "speech_habits" },
];

const WorkStyleCard = ({ workStyle }: WorkStyleCardProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Work Style
      </h3>
      <div className="space-y-3">
        {fields.map(({ label, key }) => (
          <div key={key}>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm">{workStyle[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkStyleCard;
