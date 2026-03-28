import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-4">
      <div className="text-center max-w-lg space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Waypoint</h1>
        <p className="text-lg font-medium">Know where your team actually stands.</p>
        <p className="text-muted-foreground leading-relaxed">
          Connect Teams or Slack — or paste your chat directly — and see who's active, who's blocked, and what needs your attention.
        </p>
      </div>

      <div className="flex gap-6">
        <button
          disabled
          className="flex h-36 w-36 flex-col items-center justify-center gap-3 rounded-xl border-2 border-border bg-card opacity-40 cursor-not-allowed"
        >
          <User className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">Me</span>
          <span className="text-[11px] text-muted-foreground text-center leading-tight px-2">
            Track your progress &amp; work style
          </span>
        </button>

        <button
          onClick={() => navigate("/input", { state: { mode: "manager" } })}
          className="group flex h-36 w-36 flex-col items-center justify-center gap-3 rounded-xl border-2 border-border bg-card transition-all duration-200 hover:border-primary hover:shadow-md"
        >
          <Users className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
          <span className="text-sm font-medium">Manager</span>
          <span className="text-[11px] text-muted-foreground text-center leading-tight px-2">
            See where your team stands
          </span>
        </button>
      </div>
    </div>
  );
};

export default Landing;
