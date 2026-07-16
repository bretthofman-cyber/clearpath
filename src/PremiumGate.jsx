import { useContext, useState } from "react";
import { EntitlementContext } from "./useEntitlement.js";
import UpgradeModal from "./UpgradeModal.jsx";
import { trackGateClick } from "./analytics.js";

/**
 * PremiumGate — wraps any feature section.
 *
 * FREE users: children are fully visible but non-interactive, overlaid with a
 * small gold "Premium" badge. Clicking anywhere opens the shared UpgradeModal.
 * Premium / trial users: renders children normally with no overlay.
 */
export default function PremiumGate({ featureId, children }) {
  const { can, openPricing } = useContext(EntitlementContext);
  const [showModal, setShowModal] = useState(false);

  if (can(featureId)) return <>{children}</>;

  function handleClick(e) {
    e.stopPropagation();
    trackGateClick(featureId, { source: "gate" });
    setShowModal(true);
  }

  return (
    <>
      <div style={{ position: "relative" }}>
        {/* Children visible but non-interactive */}
        <div style={{ pointerEvents: "none", userSelect: "none" }}>
          {children}
        </div>

        {/* Transparent click-capture overlay */}
        <div
          onClick={handleClick}
          style={{
            position: "absolute", inset: 0,
            cursor: "pointer",
            borderRadius: 10,
            border: "1.5px solid rgba(194,160,107,0.35)",
            background: "rgba(251,250,246,0.25)",
          }}
        />

        {/* Gold lock badge — top right */}
        <div
          style={{
            position: "absolute", top: 8, right: 8,
            background: "#C2A06B",
            color: "#2A2113",
            borderRadius: 20,
            padding: "3px 9px",
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 4,
            pointerEvents: "none",
            boxShadow: "0 1px 4px rgba(33,36,30,0.12)",
          }}
        >
          🔒 Premium
        </div>
      </div>

      {/* TrialBanner in App.jsx header confirms activation — no local modal needed */}
      {showModal && (
        <UpgradeModal
          featureId={featureId}
          onClose={() => setShowModal(false)}
          onOpenPricing={openPricing}
        />
      )}
    </>
  );
}
