import { useNavigate } from "react-router-dom";
import { User, Users, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: "easeOut" as const },
  }),
};

const ModeSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="w-full px-6 sm:px-10 py-5 flex items-center max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center gap-12 px-6 pb-20">
        <motion.div
          className="text-center max-w-md space-y-3"
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            How would you like to use Lumos?
          </h1>
          <p className="text-muted-foreground">Choose your perspective</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-5">
          <motion.button
            disabled
            className="relative flex h-48 w-48 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card opacity-40 cursor-not-allowed"
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
          >
            <span className="absolute top-3 right-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Soon
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <span className="text-sm font-semibold text-foreground">Just Me</span>
              <p className="text-xs text-muted-foreground leading-relaxed px-3">
                Track my own work & progress
              </p>
            </div>
          </motion.button>

          <motion.button
            onClick={() => navigate("/input", { state: { mode: "manager" } })}
            className="group flex h-48 w-48 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary hover:shadow-md"
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
              <Users className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div className="text-center space-y-1">
              <span className="text-sm font-semibold text-foreground">I manage a team</span>
              <p className="text-xs text-muted-foreground leading-relaxed px-3">
                See where my team stands
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ModeSelect;
