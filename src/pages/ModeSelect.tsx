import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";

const ModeSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-4">
      <div className="text-center max-w-md space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">How would you like to use Lumos?</h1>
        <p className="text-sm text-muted-foreground">Choose your perspective</p>
      </div>

      <div className="flex gap-6">
        <button
          disabled
          className="flex h-40 w-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-border bg-card opacity-40 cursor-not-allowed"
        >
          <User className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">Just Me</span>
          <span className="text-[11px] text-muted-foreground text-center leading-tight px-2">
            Track my own work &amp; progress
          </span>
        </button>

        <button
          onClick={() => navigate("/input", { state: { mode: "manager" } })}
          className="group flex h-40 w-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-border bg-card transition-all duration-200 hover:border-primary hover:shadow-md"
        >
          <Users className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
          <span className="text-sm font-medium">I manage a team</span>
          <span className="text-[11px] text-muted-foreground text-center leading-tight px-2">
            See where my team stands
          </span>
        </button>
      </div>
    </div>
  );
};

export default ModeSelect;
