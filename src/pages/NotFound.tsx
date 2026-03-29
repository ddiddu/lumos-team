import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: "easeOut" as const },
  }),
};

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="w-full px-6 sm:px-10 py-5 flex items-center max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="text-lg font-bold tracking-tight text-foreground hover:opacity-70 transition-opacity"
        >
          Lumos
        </button>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
        <motion.p
          className="text-6xl sm:text-7xl font-bold tracking-tight text-foreground"
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
        >
          404
        </motion.p>
        <motion.p
          className="mt-4 text-base text-muted-foreground"
          initial="hidden"
          animate="visible"
          custom={1}
          variants={fadeUp}
        >
          This page doesn't exist.
        </motion.p>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
        >
          <Button
            variant="outline"
            className="mt-8 rounded-lg"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
