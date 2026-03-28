import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Untitled</h1>
        <p className="mt-2 text-muted-foreground">
          Analyze your work chat to discover patterns and insights.
        </p>
      </div>
      <div className="flex gap-4">
        <Button
          size="lg"
          className="min-w-[140px] text-base"
          onClick={() => navigate("/input")}
        >
          Me
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="min-w-[140px] text-base opacity-40 cursor-not-allowed"
          disabled
        >
          Manager
        </Button>
      </div>
    </div>
  );
};

export default Landing;
