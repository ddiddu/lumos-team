import { useNavigate } from "react-router-dom";
import { User, Users, Search, Zap, MessageSquare } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-16">
      {/* Hero */}
      <div className="text-center max-w-lg space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Lumos</h1>
        <p className="text-lg font-medium">Illuminate your team's path forward.</p>
        <p className="text-muted-foreground leading-relaxed">
          Stop chasing updates. The answers are already in your chat. Instantly know who's active, who's blocked, and
          what needs your attention.
        </p>
      </div>

      {/* Stat banner */}
      <div className="max-w-md w-full rounded-lg bg-muted/60 px-6 py-4 text-center space-y-1">
        <p className="text-sm text-muted-foreground leading-relaxed">
          "60% of work time is spent on 'work about work' — chasing status, coordinating, figuring out what everyone's doing."
        </p>
        <p className="text-xs text-muted-foreground/70">— Asana, 10,000 knowledge workers</p>
      </div>

      {/* Mode buttons */}
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

      {/* Value props */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 max-w-lg w-full justify-center">
        {[
          { icon: Search, title: "Know who's blocked", desc: "Spot risks before they escalate" },
          { icon: Zap, title: "No setup required", desc: "Paste your chat and go" },
          { icon: MessageSquare, title: "Works with Teams & Slack", desc: "Wherever your team talks" },
        ].map((v) => (
          <div key={v.title} className="flex flex-col items-center text-center gap-2">
            <v.icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{v.title}</span>
            <span className="text-xs text-muted-foreground">{v.desc}</span>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="max-w-md w-full text-center space-y-5">
        <h2 className="text-lg font-semibold">Simple pricing for teams</h2>
        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-lg border border-border px-5 py-3">
            <div className="text-left">
              <p className="text-sm font-medium">Starter</p>
              <p className="text-xs text-muted-foreground">Up to 10 members</p>
            </div>
            <span className="text-sm font-semibold">$199/mo</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-5 py-3">
            <div className="text-left">
              <p className="text-sm font-medium">Growth</p>
              <p className="text-xs text-muted-foreground">Up to 25 members</p>
            </div>
            <span className="text-sm font-semibold">$499/mo</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Free trial — paste your chat, no signup needed</p>
      </div>
    </div>
  );
};

export default Landing;
