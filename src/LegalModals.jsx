import { useState } from "react";

export const TERMS_CONTENT = `Last updated: 8 July 2026

PLEASE READ THESE TERMS CAREFULLY BEFORE USING INDEPENDENT MEANS.

1. ACCEPTANCE
By creating an account or using Independent Means ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.

2. NATURE OF THE SERVICE
Independent Means is a financial modelling and educational planning tool. It provides general information only. Nothing on this Service constitutes personal financial advice, investment advice, taxation advice, or any other form of financial product advice as defined under the Corporations Act 2001 (Cth) or the Australian Securities and Investments Commission Act 2001 (Cth).

All projections, estimates, and outputs are illustrative scenario models based on the inputs you provide and stated assumptions. They are not predictions and may differ materially from actual outcomes.

Before making any financial decisions, you should seek advice from a licensed Australian financial adviser (AFSL holder) and, where appropriate, a registered tax agent.

3. ELIGIBILITY
You must be at least 18 years of age and an Australian resident to use the Service. By using the Service, you confirm you meet these requirements.

4. YOUR ACCOUNT
You are responsible for maintaining the confidentiality of your account. You must notify us immediately of any unauthorised use. We reserve the right to suspend or terminate accounts that breach these Terms.

5. ACCEPTABLE USE
You agree not to: misuse the Service for any unlawful purpose; attempt to gain unauthorised access to any part of the Service; reproduce or commercially exploit the Service without written permission; or enter false or misleading information.

6. INTELLECTUAL PROPERTY
All content, software, and design elements of the Service are owned by or licensed to Independent Means. No part of the Service may be reproduced without express written permission.

7. DISCLAIMER OF WARRANTIES
The Service is provided "as is" without warranties of any kind. We do not warrant that the Service will be uninterrupted, error-free, or that outputs will be accurate or suitable for your circumstances.

8. LIMITATION OF LIABILITY
To the maximum extent permitted by Australian law, Independent Means and its operators are not liable for any loss or damage (including consequential, indirect, or economic loss) arising from your use of the Service or reliance on any output it produces.

Nothing in these Terms limits rights you may have under the Australian Consumer Law.

9. PRIVACY
Your use of the Service is also governed by our Privacy Policy, which forms part of these Terms.

10. CHANGES TO TERMS
We may update these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the updated Terms.

11. GOVERNING LAW
These Terms are governed by the laws of Victoria, Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of Victoria.

12. CONTACT
For questions about these Terms, contact: hello@independentmeans.com.au`;

export const PRIVACY_CONTENT = `Last updated: 8 July 2026

Independent Means ("we", "us", "our") is committed to protecting your privacy in accordance with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).

1. WHAT INFORMATION WE COLLECT
We collect:
• Account information: your name and email address provided via Google Sign-In.
• Financial data inputs: the data you enter into the modelling tool (income, assets, super balances, property values, spending targets, etc.).
• Usage data: basic information about how you interact with the Service (e.g. which stages you have completed).

We do not collect payment card details, tax file numbers, or government-issued identity documents.

2. HOW WE USE YOUR INFORMATION
We use your information to:
• Provide and maintain the Service and save your data across sessions.
• Improve the Service based on how it is used.
• Communicate with you about the Service (e.g. important updates).

We do not use your financial data inputs to provide personalised financial advice.

3. HOW WE STORE YOUR INFORMATION
Your data is stored securely using Supabase (supabase.com), which uses Amazon Web Services (AWS) infrastructure. Data is encrypted at rest and in transit. Row-level security ensures that only you can access your data.

4. DISCLOSURE TO THIRD PARTIES
We do not sell, rent, or trade your personal information to third parties. We may disclose information:
• To service providers (Supabase, Vercel, Google) who assist in operating the Service, under confidentiality obligations.
• If required by law or to protect our legal rights.

5. ACCESS AND CORRECTION
You may request access to, or correction of, your personal information at any time by contacting us. You may also delete your account and all associated data directly within the Service ("Clear data" in the app header).

6. COOKIES AND TRACKING
The Service uses session tokens (via Supabase Auth) to keep you signed in. We do not use third-party advertising cookies or tracking pixels.

7. CHILDREN'S PRIVACY
The Service is not directed at persons under 18. We do not knowingly collect information from minors.

8. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy in the Service.

9. COMPLAINTS
If you have a privacy concern, contact us at hello@independentmeans.com.au. If your concern is not resolved, you may contact the Office of the Australian Information Commissioner (OAIC) at oaic.gov.au.

10. CONTACT
Independent Means
Email: hello@independentmeans.com.au`;

export function LegalModal({ title, content, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(33,36,30,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#FBFAF6", borderRadius: 14, maxWidth: 640, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #ECE7DB", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 18, color: "#21241E" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8A8270", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", fontSize: 12, color: "#6B6655", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
          {content}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #ECE7DB", flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: "100%", padding: "10px", background: "#2E4A3D", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// Self-contained footer with its own modal state. Drop in anywhere.
export function SiteFooter() {
  const [modal, setModal] = useState(null);
  return (
    <>
      <footer className="no-print" style={{ background: "#21241E", padding: "24px 28px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 16, color: "#9DB0A1" }}>
            Independent<span style={{ color: "#6B8F84" }}> Means</span>
          </div>
          <div style={{ fontSize: 11, color: "#6B6655", display: "flex", gap: 20, flexWrap: "wrap" }}>
            <button onClick={() => setModal("terms")} style={{ background: "none", border: "none", color: "#6B6655", cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "inherit" }}>Terms of Service</button>
            <button onClick={() => setModal("privacy")} style={{ background: "none", border: "none", color: "#6B6655", cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "inherit" }}>Privacy Policy</button>
            <span>hello@independentmeans.com.au</span>
          </div>
          <div style={{ fontSize: 11, color: "#4A4A42" }}>© {new Date().getFullYear()} Independent Means. General information only.</div>
        </div>
      </footer>
      {modal === "terms"   && <LegalModal title="Terms of Service" content={TERMS_CONTENT}   onClose={() => setModal(null)} />}
      {modal === "privacy" && <LegalModal title="Privacy Policy"   content={PRIVACY_CONTENT} onClose={() => setModal(null)} />}
    </>
  );
}
