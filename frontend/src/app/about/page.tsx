'use client';

export default function AboutPage() {
  return (
    <div>
      <div className="ebm-answer-card">
        <h3><i className="bi bi-info-circle me-1" />About openEBM</h3>
        <p>
          <strong>openEBM</strong> (Open Evidence-Based Medicine) is a free, no-login medical evidence
          assistant powered by Anthropic's Claude. It provides clinically grounded answers with
          rigorously verified citations from major journals, society guidelines, and public health
          agencies.
        </p>
      </div>

      <div className="ebm-answer-card">
        <h3><i className="bi bi-shield-check me-1" />How citations are verified</h3>
        <p className="small">
          Claude proposes candidate references after searching the web. Our backend then independently
          fetches each URL, extracts the actual page title and metadata, compares it to the claimed
          title, and rejects any link that is broken, mismatched, or hallucinated. Only verified
          references are shown.
        </p>
      </div>

      <div className="ebm-answer-card">
        <h3><i className="bi bi-globe me-1" />Languages</h3>
        <p className="small">English, Français, Español, العربية, Português.</p>
      </div>

      <div className="ebm-answer-card">
        <h3><i className="bi bi-exclamation-triangle me-1" />Important</h3>
        <p className="small mb-0">
          openEBM is decision support and educational software. It is <strong>not a substitute for
          clinician judgment</strong>. In emergencies seek immediate professional medical care. Always
          verify dosing, contraindications, pregnancy/lactation safety, and pediatric vs adult dosing
          against authoritative primary sources before acting clinically.
        </p>
      </div>

      <div className="ebm-answer-card">
        <h3><i className="bi bi-code-slash me-1" />Open project</h3>
        <p className="small mb-0">
          <a href="https://github.com/Joysilas389/OpenEBM" target="_blank" rel="noopener noreferrer">
            github.com/Joysilas389/OpenEBM
          </a>
        </p>
      </div>
    </div>
  );
}
