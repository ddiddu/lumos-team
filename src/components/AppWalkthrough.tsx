import WalkthroughOverlay, { type WalkthroughStep } from "./WalkthroughOverlay";

const steps: WalkthroughStep[] = [
  {
    selector: "[data-tour='team-overview']",
    title: "Team Overview",
    description: "See every team member's status at a glance — active, quiet, or blocked.",
  },
  {
    selector: "[data-tour='filter-pills']",
    title: "Status Filters",
    description: "Filter by status to see who needs your attention first.",
  },
  {
    selector: "[data-tour-manager='member-card']",
    title: "Member Card",
    description: "Each card shows what that person is working on and their last update.",
  },
  {
    selector: "[data-tour-manager='see-details']",
    title: "See Details",
    description: "Click to dive into their full profile and project breakdown.",
    clickToReveal: "[data-tour-manager='see-details']",
  },
  {
    selector: "[data-tour='work-style']",
    title: "Work Style",
    description: "Understand how this person works — their role, style, and communication habits.",
    waitForSelector: "[data-tour='work-style']",
  },
  {
    selector: "[data-tour='project-card']",
    title: "Projects",
    description: "See every project they're involved in.",
  },
  {
    selector: "[data-tour='left-off']",
    title: "Where I Left Off",
    description: "Know exactly where they left off — no need to ask for an update.",
  },
  {
    selector: "[data-tour='next-up']",
    title: "Todo",
    description: "See what's next on their plate.",
    clickToReveal: "[data-tour='see-details']",
  },
  {
    selector: "[data-tour='weekly-breakdown']",
    title: "Activity",
    description: "See how active they've been week by week.",
    waitForSelector: "[data-tour='weekly-breakdown']",
  },
  {
    selector: "[data-tour='message-activity']",
    title: "Message Activity",
    description: "See how active they've been week by week — and spot when things went quiet.",
  },
  {
    selector: "[data-tour='members']",
    title: "Collaborators",
    description: "See who they work with directly.",
    clickToReveal: "[data-tour='back-to-team']",
  },
  {
    selector: "[data-tour='mode-toggle']",
    title: "Me / Manager",
    description: "Switch to Me mode to see your own progress and work style.",
    waitForSelector: "[data-tour='mode-toggle']",
  },
  {
    selector: "",
    title: "That's Waypoint",
    description: "Know where your team stands.",
  },
];

const AppWalkthrough = () => (
  <WalkthroughOverlay
    steps={steps}
    storageKey="app_walkthrough_done"
    maskId="app-walkthrough-mask"
  />
);

export default AppWalkthrough;
