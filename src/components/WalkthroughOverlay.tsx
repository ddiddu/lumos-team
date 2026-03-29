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
    const timer = setTimeout(() => setCurrentStep(0), 800);
    return () => clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    const handler = () => {
      setCurrentStep(0);
      setRect(null);
      setWaitingForReveal(false);
    };
    window.addEventListener("restart-walkthrough", handler);
    return () => window.removeEventListener("restart-walkthrough", handler);
  }, []);

  // Scroll element into view on step change
  useEffect(() => {
    if (currentStep < 0 || currentStep >= steps.length) return;
    const step = steps[currentStep];
    if (!step.selector) return;
    const timeout = setTimeout(() => {
      const el = document.querySelector(step.selector);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, 100);
    return () => clearTimeout(timeout);
  }, [currentStep, steps]);

  const updateRect = useCallback(() => {
    if (currentStep < 0 || currentStep >= steps.length) return;
    const step = steps[currentStep];
    if (!step.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (el) setRect(el.getBoundingClientRect());
  }, [currentStep, steps]);

  useEffect(() => {
    updateRect();
    const id = setInterval(updateRect, 250);
    window.addEventListener("resize", updateRect);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", updateRect);
    };
  }, [updateRect]);

  // Wait for element after clickToReveal
  useEffect(() => {
    if (!waitingForReveal || currentStep < 0) return;
    const nextStep = steps[currentStep + 1];
    if (!nextStep?.waitForSelector) {
      setWaitingForReveal(false);
      setCurrentStep((s) => s + 1);
      return;
    }
    const interval = setInterval(() => {
      const el = document.querySelector(nextStep.waitForSelector!);
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
      if (btn) btn.click();
      const nextStep = steps[currentStep + 1];
      if (nextStep?.waitForSelector) {
        setWaitingForReveal(true);
        return;
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

  if (currentStep < 0 || waitingForReveal || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const isCentered = !step.selector;
  const pad = 8;

  // Centered mode (final step, no element highlight)
  if (isCentered) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/60" />
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-lg border bg-card shadow-xl p-6 space-y-4 max-w-sm text-center">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <div>
              <h4 className="text-base font-semibold">{step.title}</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{step.description}</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={prev} className="text-xs h-7 px-2">
                ← Prev
              </Button>
              <Button size="sm" onClick={dismiss} className="text-xs h-8 px-4">
                Done
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!rect) return null;

  const tooltipWidth = 320;
  const gap = 12;
  let tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
  let tooltipTop = rect.top + rect.height + pad + gap;
  let arrowSide: "top" | "bottom" = "top";

  if (tooltipTop + 180 > window.innerHeight) {
    tooltipTop = rect.top - pad - gap - 180;
    arrowSide = "bottom";
  }
  if (tooltipTop < 16) {
    tooltipTop = rect.top + rect.height + pad + gap;
    arrowSide = "top";
  }
  if (tooltipLeft < 16) tooltipLeft = 16;
  if (tooltipLeft + tooltipWidth > window.innerWidth - 16) {
    tooltipLeft = window.innerWidth - 16 - tooltipWidth;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
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

      <div
        className="fixed z-[60] pointer-events-auto"
        style={{ left: tooltipLeft, top: tooltipTop, width: tooltipWidth }}
      >
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
            <button onClick={dismiss} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Skip tour
            </button>
          </div>
          <div>
            <h4 className="text-sm font-semibold">{step.title}</h4>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={prev} disabled={currentStep === 0} className="text-xs h-7 px-2">
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
