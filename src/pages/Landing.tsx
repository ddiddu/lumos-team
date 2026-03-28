import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-4">
      <div className="text-center max-w-lg space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Untitled</h1>
        <p className="text-muted-foreground leading-relaxed">
          Paste your Teams or Slack chat and get instant insights into your work
          style, project progress, and communication patterns — all summarized
          in one dashboard.
        </p>
      </div>

      <div className="flex gap-6">
        <button
          onClick={() => navigate("/input")}
          className="group flex h-32 w-32 flex-col items-center justify-center gap-3 rounded-xl border-2 border-border bg-card transition-all duration-200 hover:border-primary hover:shadow-md"
        >
          <User className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
          <span className="text-sm font-medium">Me</span>
        </button>

        <button
          disabled
          className="flex h-32 w-32 flex-col items-center justify-center gap-3 rounded-xl border-2 border-border bg-card opacity-40 cursor-not-allowed"
        >
          <Users className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">Manager</span>
        </button>
      </div>
    </div>
  );
};

export default Landing;
