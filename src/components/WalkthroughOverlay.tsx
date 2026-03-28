import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

export interface WalkthroughStep {
  selector: string;
  title: string;
  description: string;
  waitForSelector?: string;
  clickToReveal?: string;
}

interface WalkthroughOverlayProps {
  steps: WalkthroughStep[];
  storageKey: string;
  maskId: string;
}

const WalkthroughOverlay = ({ steps, storageKey, maskId }: WalkthroughOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [waitingForReveal, setWaitingForReveal] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(storageKey)) return;
    const timer = setTimeout(() => setCurrentStep(0), 600);
    return () => clearTimeout(timer);
  }, [storageKey]);

  const updateRect = useCallback(() => {
    if (currentStep < 0 || currentStep >= steps.length) return;
    const step = steps[currentStep];
    const el = document.querySelector(step.selector);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
  }, [currentStep, steps]);

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
        setCurrentStep((s) => s + 1);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [waitingForReveal, currentStep, steps]);

  const dismiss = () => {
    sessionStorage.setItem(storageKey, "true");
    setCurrentStep(-1);
  };

  const next = () => {
    const step = steps[currentStep];
    if (step.clickToReveal) {
      const btn = document.querySelector(step.clickToReveal) as HTMLElement;
      if (btn) {
        btn.click();
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
      dismiss();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  if (currentStep < 0 || !rect || waitingForReveal) return null;

  const step = steps[currentStep];
  const pad = 8;

  // Calculate tooltip position: prefer bottom, fall back to top
  const tooltipWidth = 320;
  const gap = 12;
  let tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
  let tooltipTop = rect.top + rect.height + pad + gap;
  let arrowSide: "top" | "bottom" = "top";

  // If tooltip would go off bottom of screen, position above
  if (tooltipTop + 160 > window.innerHeight) {
    tooltipTop = rect.top - pad - gap - 160;
    arrowSide = "bottom";
  }

  // Keep tooltip within horizontal bounds
  if (tooltipLeft < 16) tooltipLeft = 16;
  if (tooltipLeft + tooltipWidth > window.innerWidth - 16) {
    tooltipLeft = window.innerWidth - 16 - tooltipWidth;
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id={maskId}>
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
            mask={`url(#${maskId})`}
          />
        </svg>

        {/* Highlight ring */}
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

      {/* Floating tooltip card */}
      <div
        className="fixed z-[60] pointer-events-auto"
        style={{
          left: tooltipLeft,
          top: tooltipTop,
          width: tooltipWidth,
        }}
      >
        {/* Arrow */}
        {arrowSide === "top" && (
          <div
            className="absolute -top-2 w-4 h-4 rotate-45 bg-card border-l border-t border-border"
            style={{ left: Math.min(Math.max(rect.left + rect.width / 2 - tooltipLeft - 8, 12), tooltipWidth - 20) }}
          />
        )}

        <div className="rounded-lg border bg-card shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={dismiss}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          </div>

          <div>
            <h4 className="text-sm font-semibold">{step.title}</h4>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={currentStep === 0}
              className="text-xs h-7 px-2"
            >
              ← Prev
            </Button>
            <Button size="sm" onClick={next} className="text-xs h-7 px-3">
              {currentStep >= steps.length - 1 ? "Done" : "Next →"}
            </Button>
          </div>
        </div>

        {arrowSide === "bottom" && (
          <div
            className="absolute -bottom-2 w-4 h-4 rotate-45 bg-card border-r border-b border-border"
            style={{ left: Math.min(Math.max(rect.left + rect.width / 2 - tooltipLeft - 8, 12), tooltipWidth - 20) }}
          />
        )}
      </div>
    </>
  );
};

export default WalkthroughOverlay;
