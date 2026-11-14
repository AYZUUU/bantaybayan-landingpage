import { useEffect, useRef, useState } from "react";
import {
  LuArrowRight,
  LuArrowUpRight,
  LuBell,
  LuChevronLeft,
  LuChevronRight,
  LuDownload,
  LuMapPin,
  LuMessageSquareText,
  LuPlay,
  LuShieldCheck,
  LuSmartphone,
  LuUsers,
  LuX,
} from "react-icons/lu";
import brandLogo from "../assets/bantaybayan.png";
import "./LandingPage.css";

const responseSteps = [
  {
    number: "01",
    title: "Send a report",
    description:
      "Share the emergency type, severity, and location from the mobile app when it is available.",
    icon: LuSmartphone,
  },
  {
    number: "02",
    title: "Review the details",
    description:
      "Authorized staff can review incoming incidents and see location information on the dashboard.",
    icon: LuMapPin,
  },
  {
    number: "03",
    title: "Coordinate a response",
    description:
      "Teams can assign responders, update incident status, and receive report notifications.",
    icon: LuUsers,
  },
];

const features = [
  {
    title: "Reports with useful context",
    description:
      "Emergency type, severity, contact details, and location help responders understand a report.",
    icon: LuMessageSquareText,
  },
  {
    title: "A shared incident view",
    description:
      "The admin dashboard brings incoming reports and available map information together.",
    icon: LuMapPin,
  },
  {
    title: "Clearer team coordination",
    description:
      "Authorized staff can assign responders, track status changes, and receive alerts.",
    icon: LuBell,
  },
];

const tutorialSteps = [
  { title: "Open BantayBayan", description: "Open the app and go to the reporting screen.", icon: LuSmartphone },
  { title: "Choose how to report", description: "Use the quick emergency alert for urgent help, or sign in to send a detailed report.", icon: LuBell },
  { title: "Check your location", description: "Allow location access and tap Your location to adjust the pin if needed.", icon: LuMapPin },
  { title: "Select the emergency", description: "For a detailed report, choose medical, fire, accident, or crime.", icon: LuMessageSquareText },
  { title: "Set the severity", description: "Choose Low, Medium, High, or Critical to describe how serious it is.", icon: LuShieldCheck },
  { title: "Add an incident photo", description: "A photo is required for a detailed report.", icon: LuSmartphone },
  { title: "Send your report", description: "Submit the report and check the app for confirmation. For urgent situations, contact local emergency services directly.", icon: LuArrowRight },
  { title: "Check report status", description: "Signed-in users can track an available report status in the app. Anonymous quick alerts cannot be tracked.", icon: LuUsers },
];

function Modal({ titleId, onClose, children }: {
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="landing-modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button className="landing-modal-close" type="button" onClick={onClose} aria-label="Close">
        <LuX aria-hidden="true" />
      </button>
      {children}
    </dialog>
  );
}

function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal titleId="welcome-modal-title" onClose={onClose}>
      <div className="landing-modal-content">
        <h2 id="welcome-modal-title">Welcome to BantayBayan</h2>
        <p className="landing-modal-tagline">
          Your community's safety starts here. We're building a clearer way for people to share emergencies and response teams to coordinate help.
        </p>
        <p className="landing-modal-description">
          BantayBayan connects your community with a shared way to report incidents and coordinate a response.
        </p>
        <button className="landing-modal-action" type="button" onClick={onClose}>
          Let's get started <LuArrowRight aria-hidden="true" />
        </button>
      </div>
    </Modal>
  );
}

function TutorialModal({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  return (
    <Modal titleId="tutorial-modal-title" onClose={onClose}>
      <div className="landing-tutorial-content">
        <div className="landing-tutorial-header">
          <h2 id="tutorial-modal-title">How to Report an Emergency</h2>
          <p>Step {currentStep + 1} of {tutorialSteps.length}</p>
        </div>
        <div className="landing-tutorial-step" aria-live="polite">
          <span className="landing-tutorial-icon"><Icon aria-hidden="true" /></span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </div>
        <div className="landing-tutorial-dots" aria-label="Tutorial steps">
          {tutorialSteps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={`landing-tutorial-dot${index === currentStep ? " active" : ""}`}
              onClick={() => setCurrentStep(index)}
              aria-label={`Go to step ${index + 1}: ${item.title}`}
              aria-current={index === currentStep ? "step" : undefined}
            />
          ))}
        </div>
        <div className="landing-tutorial-actions">
          <button type="button" className="landing-tutorial-nav" disabled={currentStep === 0} onClick={() => setCurrentStep(currentStep - 1)}>
            <LuChevronLeft aria-hidden="true" /> Previous
          </button>
          {currentStep === tutorialSteps.length - 1 ? (
            <button type="button" className="landing-modal-action" onClick={onClose}>Got it! <LuArrowRight aria-hidden="true" /></button>
          ) : (
            <button type="button" className="landing-tutorial-nav" onClick={() => setCurrentStep(currentStep + 1)}>
              Next <LuChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function MapPreview() {
  return (
    <div className="landing-preview" aria-label="Illustrative dashboard preview">
      <div className="landing-preview-topbar">
        <div className="landing-preview-brand">
          <span className="landing-preview-brand-icon">
            <LuShieldCheck aria-hidden="true" />
          </span>
          <span>
            <strong>BantayBayan</strong>
            <small>Response dashboard</small>
          </span>
        </div>
        <span className="landing-preview-demo">DEMO PREVIEW</span>
      </div>

      <div className="landing-map">
        <svg
          className="landing-map-lines"
          viewBox="0 0 640 420"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <path d="M-20 90 C85 72 92 156 185 144 S293 55 382 92 519 192 669 142" />
          <path d="M-15 245 C87 217 115 308 202 292 S313 191 398 218 530 316 665 273" />
          <path d="M122 -20 C162 70 107 141 153 212 S235 324 204 445" />
          <path d="M322 -12 C274 73 344 139 310 204 S284 344 358 438" />
          <path d="M504 -15 C446 56 521 135 475 207 S466 342 530 438" />
          <path d="M-5 164 C120 148 211 183 314 161 S515 107 659 175" />
          <path d="M-10 345 C116 318 215 354 325 327 S516 277 656 350" />
        </svg>
        <div className="landing-map-label landing-map-label--one">ILOCOS SUR</div>
        <div className="landing-map-label landing-map-label--two">COMMUNITY</div>
        <span className="landing-map-pin landing-map-pin--one">
          <LuMapPin aria-hidden="true" />
        </span>
        <span className="landing-map-pin landing-map-pin--two">
          <LuMapPin aria-hidden="true" />
        </span>
        <span className="landing-map-pin landing-map-pin--three">
          <LuMapPin aria-hidden="true" />
        </span>
        <div className="landing-map-note">
          <span className="landing-map-note-dot" />
          Map preview · illustrative only
        </div>
      </div>

      <div className="landing-report-card">
        <div className="landing-report-card-icon">
          <LuMessageSquareText aria-hidden="true" />
        </div>
        <div className="landing-report-card-copy">
          <span>REPORT WORKFLOW</span>
          <strong>Review details and coordinate</strong>
          <small>For authorized response teams</small>
        </div>
        <LuArrowUpRight className="landing-report-card-arrow" aria-hidden="true" />
      </div>
    </div>
  );
}

type LandingPageProps = {
  apkUrl?: string;
};

export default function LandingPage({ apkUrl }: LandingPageProps) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="landing-page" id="top">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      <header className="landing-header">
        <div className="landing-header-inner">
          <a className="landing-brand" href="#top" aria-label="BantayBayan home">
            <span className="landing-brand-mark">
              <img src={brandLogo} alt="" />
            </span>
            <span className="landing-brand-name">
              BantayBayan
              <small>Community response · Ilocos Sur</small>
            </span>
          </a>
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-glow" aria-hidden="true" />
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">
                <span className="landing-eyebrow-dot" />
                COMMUNITY-FIRST EMERGENCY RESPONSE
              </p>
              <h1>
                A clearer path from <span>report</span> to response.
              </h1>
              <p className="landing-hero-description">
                BantayBayan helps communities share emergency reports and gives
                response teams a shared place to review incidents and coordinate.
              </p>
              <div className="landing-hero-actions">
                {apkUrl && (
                  <a className="landing-button landing-button-primary" href={apkUrl}>
                    Download for Android <LuDownload aria-hidden="true" />
                  </a>
                )}
                <a className={`landing-button ${apkUrl ? "landing-button-secondary" : "landing-button-primary"}`} href="#how-it-works">
                  See how it works <LuArrowRight aria-hidden="true" />
                </a>
              </div>
              <p className="landing-hero-caption">
                A community response platform for Ilocos Sur.
              </p>
            </div>
            <div className="landing-hero-visual">
              <MapPreview />
            </div>
          </div>
          <div className="landing-hero-bottom" aria-hidden="true" />
        </section>

        <section className="landing-intro">
          <div className="landing-container landing-intro-inner">
            <p className="landing-section-kicker">BUILT AROUND THE HANDOFF</p>
            <h2>
              Better information helps teams make
              <span> the next step clearer.</span>
            </h2>
            <p>
              From a citizen’s report to an incident view for authorized staff,
              BantayBayan is designed to keep essential information connected.
            </p>
          </div>
        </section>

        <section className="landing-steps-section" id="how-it-works">
          <div className="landing-container">
            <div className="landing-section-heading">
              <div>
                <p className="landing-section-kicker">HOW IT WORKS</p>
                <h2>One connected response flow.</h2>
              </div>
              <p>
                Simple steps for sharing information, reviewing incidents, and
                coordinating follow-up.
              </p>
            </div>
            <div className="landing-steps-grid">
              {responseSteps.map(({ number, title, description, icon: Icon }) => (
                <article className="landing-step-card" key={number}>
                  <div className="landing-step-topline">
                    <span>{number}</span>
                    <Icon aria-hidden="true" />
                  </div>
                  <div className="landing-steps-action">
                    <button type="button" className="landing-button landing-button-tutorial" onClick={() => setShowTutorial(true)}>
                      Watch Tutorial <LuPlay aria-hidden="true" />
                    </button>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-features-section" id="features">
          <div className="landing-container landing-features-layout">
            <div className="landing-features-intro">
              <p className="landing-section-kicker">MADE FOR THE MOMENT</p>
              <h2>Useful tools, with people at the center.</h2>
              <p>
                The platform brings reporting and response coordination into one
                workflow, without losing sight of the people behind each incident.
              </p>
              <div className="landing-sms-note">
                <span><LuMessageSquareText aria-hidden="true" /></span>
                <p>
                  <strong>SMS fallback when configured</strong>
                  The mobile app can offer a text-message fallback if online
                  reporting is unavailable. Delivery depends on a configured
                  relay phone and cellular coverage.
                </p>
              </div>
            </div>
            <div className="landing-feature-list">
              {features.map(({ title, description, icon: Icon }) => (
                <article className="landing-feature-item" key={title}>
                  <span className="landing-feature-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <LuArrowUpRight className="landing-feature-arrow" aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta-section">
          <div className="landing-container">
            <div className="landing-cta-card">
              <div className="landing-cta-mark">
                <LuShieldCheck aria-hidden="true" />
              </div>
              <div>
                <p className="landing-section-kicker">BANTAYBAYAN</p>
                <h2>Connected communities start with a clear signal.</h2>
                <p>Learn more about the community response flow.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-brand-mark">
              <img src={brandLogo} alt="" />
            </span>
            <span>
              <strong>BantayBayan</strong>
              <small>Community response · Ilocos Sur</small>
            </span>
          </div>
          <p>
            Demo platform only. For urgent situations, contact your local
            emergency services directly.
          </p>
          <span className="landing-footer-copy">© {new Date().getFullYear()} BantayBayan</span>
        </div>
      </footer>
    </div>
  );
}
