import { useNavigate } from "react-router-dom";
import { Search, Zap, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-20">
      {/* Hero */}
      <div className="text-center max-w-lg space-y-4 mb-10">
        <h1 className="text-5xl font-bold tracking-tight">Lumos</h1>
        <p className="text-xl font-medium">Illuminate your team's path forward.</p>
        <p className="text-muted-foreground leading-relaxed">
          Stop chasing updates. The answers are already in your chat.
        </p>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        className="text-base px-8 py-6 mb-16"
        onClick={() => navigate("/start")}
      >
        Illuminate Now →
      </Button>

      {/* Stat banner */}
      <div className="max-w-lg w-full rounded-lg bg-muted/60 px-6 py-5 text-center space-y-2 mb-14">
        <p className="text-sm text-muted-foreground leading-relaxed">
          According to Asana's research on 10,000 knowledge workers, 60% of work time is spent on
          'work about work' — chasing status, coordinating, and figuring out what everyone's doing.
        </p>
      </div>

      {/* Value props */}
      <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 max-w-lg w-full justify-center mb-16">
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
