import { useNavigate } from "react-router-dom";
import { Search, Zap, MessageSquare, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="w-full px-6 sm:px-10 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-lg font-bold tracking-tight text-foreground">Lumos</span>
        <Button variant="ghost" size="sm" onClick={() => navigate("/start")}>
          Get started
        </Button>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-2xl leading-[1.1]"
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
        >
          Illuminate your team's path forward.
        </motion.h1>

        <motion.p
          className="mt-5 text-base sm:text-lg text-muted-foreground max-w-md leading-relaxed"
          initial="hidden"
          animate="visible"
          custom={1}
          variants={fadeUp}
        >
          Stop chasing updates. The answers are already in your chat.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
        >
          <Button
            size="lg"
            className="mt-9 text-base px-8 h-12 rounded-full font-semibold shadow-md hover:shadow-lg transition-shadow duration-300 group"
            onClick={() => navigate("/start")}
          >
            Illuminate Now
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </section>

      {/* Stat strip */}
      <section className="bg-muted/50 border-y border-border">
        <motion.div
          className="max-w-4xl mx-auto px-6 py-14 sm:py-16 flex flex-col sm:flex-row items-center gap-6 sm:gap-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          custom={0}
        >
          <span className="text-5xl sm:text-6xl font-bold text-primary shrink-0">60%</span>
          <div className="text-center sm:text-left">
            <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
              of work time is spent on <em>'work about work'</em> — chasing status, coordinating, and figuring out what everyone's doing.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Asana · Anatomy of Work Index · 10,000 knowledge workers
            </p>
          </div>
        </motion.div>
      </section>

      {/* Value Props */}
      <section className="max-w-4xl mx-auto px-6 py-20 sm:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: Search,
              title: "Know who's blocked",
              desc: "Spot risks before they escalate into missed deadlines.",
            },
            {
              icon: Zap,
              title: "No setup required",
              desc: "Paste your team chat and get insights in seconds.",
            },
            {
              icon: MessageSquare,
              title: "Works with Teams & Slack",
              desc: "Wherever your team already talks, Lumos listens.",
            },
          ].map((v, i) => (
            <motion.div
              key={v.title}
              className="rounded-xl border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-md"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              custom={i}
              variants={fadeUp}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-4">
                <v.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{v.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24 text-center">
          <motion.h2
            className="text-2xl sm:text-3xl font-bold text-foreground"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
          >
            Simple pricing for teams
          </motion.h2>
          <motion.p
            className="mt-3 text-sm text-muted-foreground"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
          >
            Start free. Upgrade when you're ready.
          </motion.p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
            {/* Starter */}
            <motion.div
              className="rounded-xl border border-border bg-card p-6 text-left"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={2}
              variants={fadeUp}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Starter</p>
              <p className="mt-3 text-3xl font-bold text-foreground">
                $199<span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Up to 10 members</p>
              <ul className="mt-5 space-y-2">
                {["Chat analysis", "Member insights", "Weekly reports"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Growth */}
            <motion.div
              className="rounded-xl border-2 border-primary bg-card p-6 text-left relative"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={3}
              variants={fadeUp}
            >
              <span className="absolute -top-3 left-5 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Popular
              </span>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Growth</p>
              <p className="mt-3 text-3xl font-bold text-foreground">
                $499<span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Up to 25 members</p>
              <ul className="mt-5 space-y-2">
                {["Everything in Starter", "Team dashboards", "Priority support"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.p
            className="mt-8 text-xs text-muted-foreground"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={4}
            variants={fadeUp}
          >
            Free trial — paste your chat, no signup needed
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Lumos. Built for teams that move fast.</p>
      </footer>
    </div>
  );
};

export default Landing;
