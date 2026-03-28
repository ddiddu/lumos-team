import { Badge } from "@/components/ui/badge";
import ProjectCard from "@/components/ProjectCard";
import type { AnalysisResult, WorkStyle } from "@/types/analysis";

type MemberStatus = "active" | "blocked" | "quiet";

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "active": return "active" as const;
    case "blocked": return "blocked" as const;
    default: return "quiet" as const;
  }
};

function getAvatarClass(status: MemberStatus) {
  switch (status) {
    case "active": return "bg-[hsl(var(--status-active)/0.15)] text-[hsl(var(--status-active))]";
    case "blocked": return "bg-[hsl(var(--status-blocked)/0.15)] text-[hsl(var(--status-blocked))]";
    case "quiet": return "bg-[hsl(var(--status-quiet)/0.15)] text-[hsl(var(--status-quiet))]";
  }
}

function getInitials(name: string) {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const workStyleFields: { label: string; key: keyof WorkStyle }[] = [
  { label: "Role", key: "role" },
  { label: "Style", key: "style" },
  { label: "Likes", key: "likes" },
  { label: "Dislikes", key: "dislikes" },
  { label: "Speech habits", key: "speech_habits" },
];

interface MemberProfileViewProps {
  name: string;
  status: MemberStatus;
  result: AnalysisResult;
}

const MemberProfileView = ({ name, status, result }: MemberProfileViewProps) => {
  const role = result.work_style?.role || "Team member";

  return (
    <div className="space-y-8">
      {/* Header: Avatar + Name + Status + Role */}
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-base font-semibold shrink-0 ${getAvatarClass(status)}`}>
          {getInitials(name)}
        </div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{name}</h2>
          <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
        </div>
      </div>

      {/* Work style blocks */}
      {result.work_style && (
        <div className="flex flex-wrap gap-3">
          {workStyleFields.map(({ label, key }) => (
            <div key={key} className="bg-secondary rounded-md px-4 py-3 min-w-[140px] max-w-[240px]">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
              <p className="text-sm leading-snug">{result.work_style[key]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Projects</h3>
        {result.projects.length > 0 ? (
          result.projects.map((project, i) => (
            <ProjectCard key={i} project={project} weekLabels={result.weekLabels} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No project activity found.</p>
        )}
      </div>
    </div>
  );
};

export default MemberProfileView;
