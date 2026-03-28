import WalkthroughOverlay, { type WalkthroughStep } from "./WalkthroughOverlay";

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
    waitForSelector: "[data-tour='next-up']",
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

const DashboardWalkthrough = () => (
  <WalkthroughOverlay
    steps={steps}
    storageKey="dashboard_walkthrough_done"
    maskId="walkthrough-mask"
  />
);

export default DashboardWalkthrough;
