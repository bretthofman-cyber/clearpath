import { useContext, useState } from "react";
import { EntitlementContext } from "./useEntitlement.js";
import { trackGateClick } from "./analytics.js";

const FEATURE_COPY = {
  probability_view: {
    headline: "See how likely your plan is to succeed",
    body: "Run 1,000 simulations to understand the range of outcomes your current plan may produce.",
  },
  scenario_comparison: {
    headline: "Compare scenarios side by side",
    body: "View Base, Conservative, and Aggressive scenarios together to stress-test your assumptions.",
  },
  custom_assumptions: {
    headline: "Set your own market assumptions",
    body: "Override default return and inflation rates to model your specific view of the future.",
  },
  carry_forward_cap: {
    headline: "Use your carry-forward concessional cap",
    body: "Access unused contribution cap from prior years to top up super and reduce tax this financial year.",
  },
  franking_credits: {
    headline: "Model your franking credit refunds",
    body: "Include dividend imputation credits in your tax calculations and retirement income projections.",
  },
  debt_recycling: {
    headline: "Model a debt recycling strategy",
    body: "Convert non-deductible mortgage interest into tax-deductible investment debt and accelerate your net worth.",
  },
  pdf_export: {
    headline: "Save your plan as a PDF",
    body: "Export a full report of your financial model to review offline or share with your adviser.",
  },
  multi_plan: {
    headline: "Create a second financial plan",
    body: "Model an alternative life scenario, a major decision, or a different income path alongside your current plan.",
  },
  strategy_centre: {
    headline: "Unlock the Strategy Centre",
    body: "Get a personalised list of opportunities to improve your plan, each backed by your own numbers.",
  },
  csv_export: {
    headline: "Export your projections to a spreadsheet",
    body: "Download your full net worth trajectory for use in Excel, Google Sheets, or your own analysis.",
  },
  _default: {
    headline: "Premium feature",
    body: "This feature is available on Independent Means Premium.",
  },
};

export default function UpgradeModal({ featureId, onClose, onTrialStarted }) {
  const { status, activateTrial } = useContext(EntitlementContext);
  const [activating, setActivating] = useState(false);

  const copy = FEATURE_COPY[featureId] ?? FEATURE_COPY._default;
  const isFree = status === "free";

  async function handleStartTrial() {
    trackGateClick(featureId, { source: "upgrade_modal", action: "start_trial" });
    setActivating(true);
    await activateTrial(featureId);
    setActivating(false);
    onClose();
    onTrialStarted?.();
  }

  function handleSeePricing() {
    trackGateClick(featureId, { source: "upgrade_modal", action: "see_pricing" });
    // Phase 6: link to pricing page
  }

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0,
          background: "rgba(33,36,30,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1200,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#FBFAF6",
            borderRadius: 20,
            padding: "36px 40px",
            maxWidth: 400,
            width: "calc(100% - 40px)",
            boxShadow: "0 20px 60px rgba(33,36,30,0.22)",
            position: "relative",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "none", border: "none", fontSize: 18,
              color: "#9DB0A1", cursor: "pointer", lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Gold lock icon */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(194,160,107,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 18, fontSize: 20,
          }}>
            🔒
          </div>

          {/* Headline */}
          <div style={{
            fontFamily: "Spectral, serif",
            fontSize: 22, fontWeight: 500,
            color: "#2E4A3D",
            lineHeight: 1.3,
            marginBottom: 12,
          }}>
            {copy.headline}
          </div>

          {/* Body copy */}
          <div style={{
            fontSize: 14, color: "#6B6655",
            lineHeight: 1.65, marginBottom: 28,
          }}>
            {copy.body}
          </div>

          {/* Primary CTA */}
          {isFree ? (
            <button
              onClick={handleStartTrial}
              disabled={activating}
              style={{
                width: "100%",
                background: activating ? "#9DB0A1" : "#2E4A3D",
                color: "#F5F2EB",
                border: "none", borderRadius: 12,
                padding: "13px 20px",
                fontSize: 14, fontWeight: 600,
                cursor: activating ? "default" : "pointer",
                fontFamily: "inherit",
                marginBottom: 10,
                transition: "background 0.2s",
              }}
            >
              {activating ? "Activating…" : "Start 14-day free trial"}
            </button>
          ) : (
            <button
              onClick={handleSeePricing}
              style={{
                width: "100%",
                background: "#2E4A3D",
                color: "#F5F2EB",
                border: "none", borderRadius: 12,
                padding: "13px 20px",
                fontSize: 14, fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: 10,
              }}
            >
              Upgrade to Premium
            </button>
          )}

          {/* Secondary CTA */}
          <button
            onClick={handleSeePricing}
            style={{
              width: "100%",
              background: "none",
              border: "1px solid #D8D2C4",
              borderRadius: 12,
              padding: "11px 20px",
              fontSize: 13, color: "#6B6655",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            See Premium
          </button>

          {/* Compliance note for trial */}
          {isFree && (
            <div style={{
              marginTop: 16, fontSize: 11,
              color: "#9DB0A1", textAlign: "center",
              lineHeight: 1.5,
            }}>
              No credit card required. Trial ends automatically after 14 days.
            </div>
          )}
        </div>
      </div>

    </>
  );
}
