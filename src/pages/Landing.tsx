import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-4">
      <div className="text-center max-w-lg space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Untitled</h1>
        <p className="text-muted-foreground leading-relaxed">
          Connects to your Teams or Slack — or lets you paste your chat history
          directly — to give you a clear picture of where you and your team are,
          and how you work.
        </p>
      </div>

      <div className="flex gap-6">
        <button
          onClick={() => navigate("/input")}
          className="group flex h-36 w-36 flex-col items-center justify-center gap-3 rounded-xl border-2 border-border bg-card transition-all duration-200 hover:border-primary hover:shadow-md"
        >
          <User className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
          <span className="text-sm font-medium">Me</span>
          <span className="text-[11px] text-muted-foreground text-center leading-tight px-2">
            Track your progress &amp; work style
          </span>
        </button>

        <button
          disabled
          className="flex h-36 w-36 flex-col items-center justify-center gap-3 rounded-xl border-2 border-border bg-card opacity-40 cursor-not-allowed"
        >
          <Users className="h-8 w-8 text-muted-foreground" />
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
