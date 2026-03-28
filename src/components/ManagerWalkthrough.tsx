import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface WalkthroughStep {
  selector: string;
  title: string;
  description: string;
}

const steps: WalkthroughStep[] = [
  {
    selector: "[data-tour-manager='header']",
    title: "Team Status",
    description: "This is your team's current status at a glance.",
  },
  {
    selector: "[data-tour-manager='member-card']",
    title: "Member Card",
    description: "Each card shows where that person stands and what they're working on.",
  },
  {
    selector: "[data-tour-manager='status-badge']",
    title: "Status Indicators",
    description: "Active, blocked, or quiet — based on their recent messages.",
  },
  {
    selector: "[data-tour-manager='see-details']",
    title: "Detailed View",
    description: "Click to see their full project breakdown.",
  },
];

const STORAGE_KEY = "manager_walkthrough_done";

const ManagerWalkthrough = () => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setCurrentStep(0), 600);
    return () => clearTimeout(timer);
  }, []);

  const updateRect = useCallback(() => {
    if (currentStep < 0 || currentStep >= steps.length) return;
    const step = steps[currentStep];
    const el = document.querySelector(step.selector);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
  }, [currentStep]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    const scrollables = document.querySelectorAll("[class*='overflow-y-auto'], [class*='overflow-auto']");
    scrollables.forEach((el) => el.addEventListener("scroll", updateRect));
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      scrollables.forEach((el) => el.removeEventListener("scroll", updateRect));
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  const next = () => {
    if (currentStep >= steps.length - 1) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setCurrentStep(-1);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  if (currentStep < 0 || !rect) return null;

  const step = steps[currentStep];
  const pad = 8;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="manager-walkthrough-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - pad}
                y={rect.top - pad}
                width={rect.width + pad * 2}
                height={rect.height + pad * 2}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="hsl(0 0% 0% / 0.6)"
            mask="url(#manager-walkthrough-mask)"
          />
        </svg>

        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-300"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] border-t bg-card p-4 flex items-center justify-between pointer-events-auto">
        <div className="min-w-0 mr-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
          <h4 className="text-sm font-semibold">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            onClick={() => {
              sessionStorage.setItem(STORAGE_KEY, "true");
              setCurrentStep(-1);
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
          <Button size="sm" onClick={next}>
            {currentStep >= steps.length - 1 ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default ManagerWalkthrough;
