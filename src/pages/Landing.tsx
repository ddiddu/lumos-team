import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 sm:gap-10 px-4 py-8">
      <div className="text-center max-w-lg space-y-3 sm:space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Lumos</h1>
        <p className="text-base sm:text-lg font-medium">Illuminate your team's path forward.</p>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Stop chasing updates. The answers are already in your chat. Instantly know who's active, who's blocked, and
          what needs your attention.
        </p>
      </div>

      <div className="flex gap-4 sm:gap-6">
        <button
          disabled
          className="flex h-28 w-28 sm:h-36 sm:w-36 flex-col items-center justify-center gap-2 sm:gap-3 rounded-xl border-2 border-border bg-card opacity-40 cursor-not-allowed"
        >
          <User className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
          <span className="text-xs sm:text-sm font-medium">Me</span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-tight px-2">
            Track your progress &amp; work style
          </span>
        </button>

        <button
          onClick={() => navigate("/input", { state: { mode: "manager" } })}
          className="group flex h-28 w-28 sm:h-36 sm:w-36 flex-col items-center justify-center gap-2 sm:gap-3 rounded-xl border-2 border-border bg-card transition-all duration-200 hover:border-primary hover:shadow-md"
        >
          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground transition-colors group-hover:text-primary" />
          <span className="text-xs sm:text-sm font-medium">Manager</span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-tight px-2">
            See where your team stands
          </span>
        </button>
      </div>
    </div>
  );
};

export default Landing;
