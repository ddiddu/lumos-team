import WalkthroughOverlay, { type WalkthroughStep } from "./WalkthroughOverlay";

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

const ManagerWalkthrough = () => (
  <WalkthroughOverlay
    steps={steps}
    storageKey="manager_walkthrough_done"
    maskId="manager-walkthrough-mask"
  />
);

export default ManagerWalkthrough;
