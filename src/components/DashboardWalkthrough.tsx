import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface WalkthroughStep {
  selector: string;
  title: string;
  description: string;
  waitForSelector?: string;
  clickToReveal?: string;
}

const steps: WalkthroughStep[] = [
  {
    selector: "[data-tour='work-style']",
    title: "Work Style",
    description: "This is your work style, analyzed from your chats.",
  },
  {
    selector: "[data-tour='project-card']",
    title: "Project Overview",
    description: "Here's what you've been working on. Click 'See details' to explore further.",
    clickToReveal: "[data-tour='see-details']",
  },
  {
    selector: "[data-tour='next-up']",
    title: "Todo",
    description: "Recommended next steps based on your work.",
  },
  {
    selector: "[data-tour='members']",
    title: "Members",
    description: "Your team members and how you interact with them.",
    waitForSelector: "[data-tour='members']",
  },
  {
    selector: "[data-tour='weekly-breakdown']",
    title: "Weekly Breakdown",
    description: "A summary of each week's activity.",
  },
  {
    selector: "[data-tour='message-activity']",
    title: "Message Activity",
    description: "Your communication patterns over the last 4 weeks.",
  },
];

const STORAGE_KEY = "dashboard_walkthrough_done";

const DashboardWalkthrough = () => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [waitingForReveal, setWaitingForReveal] = useState(false);

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

  // When waiting for reveal (user clicked See details), watch for the target element
  useEffect(() => {
    if (!waitingForReveal || currentStep < 0) return;
    const step = steps[currentStep];
    if (!step.waitForSelector) {
      setWaitingForReveal(false);
      return;
    }

    const interval = setInterval(() => {
      const el = document.querySelector(step.waitForSelector!);
      if (el) {
        setWaitingForReveal(false);
        // Move to next step now that expanded content is visible
        setCurrentStep((s) => s + 1);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [waitingForReveal, currentStep]);

  const next = () => {
    const step = steps[currentStep];

    // If this step has a clickToReveal, we need the user to click See details
    if (step.clickToReveal) {
      const btn = document.querySelector(step.clickToReveal) as HTMLElement;
      if (btn) {
        btn.click();
        // Wait for the expanded content to appear
        const nextStep = steps[currentStep + 1];
        if (nextStep?.waitForSelector) {
          setWaitingForReveal(true);
          return;
        }
      }
      setCurrentStep((s) => s + 1);
      return;
    }

    if (currentStep >= steps.length - 1) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setCurrentStep(-1);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  if (currentStep < 0 || !rect || waitingForReveal) return null;

  const step = steps[currentStep];
  const pad = 8;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="walkthrough-mask">
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
            mask="url(#walkthrough-mask)"
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

export default DashboardWalkthrough;
