import { useId, useState } from 'react';

const termsSections = [
  {
    title: '1. About Kaizen',
    body: 'Kaizen is a mental health support platform for clients, mental health professionals, and platform administrators. The platform may support wellness assessments, therapy/session booking, resource sharing, progress tracking, reporting, and administrative oversight.'
  },
  {
    title: '2. Not emergency care',
    body: 'Kaizen is not an emergency response service. If you are in immediate danger, experiencing a crisis, or may harm yourself or another person, contact local emergency services, a trusted person, or the nearest hospital immediately.'
  },
  {
    title: '3. Accounts and eligibility',
    body: 'You agree to provide accurate registration information and keep your account secure. Professionals must provide truthful qualifications, licence or certification details, and profile information. Administrators must use their access only for authorised platform operations.'
  },
  {
    title: '4. Professional services',
    body: 'Mental health professionals using Kaizen are responsible for their clinical judgement, professional conduct, confidentiality obligations, and compliance with applicable Kenyan laws, professional standards, and licensing requirements.'
  },
  {
    title: '5. Acceptable use',
    body: 'You must not misuse the platform, impersonate another person, upload unlawful or harmful content, attempt unauthorised access, interfere with security, or use Kaizen to harass, exploit, or discriminate against others.'
  },
  {
    title: '6. Assessments and resources',
    body: 'Assessments, journals, dashboards, and educational resources are intended to support wellbeing and care coordination. They do not replace diagnosis, treatment, or advice from a qualified professional.'
  },
  {
    title: '7. Fees and payments',
    body: 'Where paid services are offered, prices, payout rules, refunds, and session terms may be shown in the platform or agreed with the relevant professional. Users should review payment details before confirming a booking or payout request.'
  },
  {
    title: '8. Suspension and termination',
    body: 'Kaizen may restrict or suspend access where needed to protect users, comply with law, investigate misuse, or maintain platform security. You may stop using the platform at any time.'
  },
  {
    title: '9. Changes',
    body: 'These terms may be updated as the platform grows or legal requirements change. Material changes should be communicated through the platform where practical.'
  }
];

const privacySections = [
  {
    title: '1. Data controller and purpose',
    body: 'Kaizen processes personal data to create accounts, verify users, provide assessments and sessions, manage professional profiles, administer the platform, handle payments or payouts, improve safety, and comply with legal duties.'
  },
  {
    title: '2. Data we may collect',
    body: 'We may collect names, email addresses, phone numbers, passwords, roles, profile details, professional credentials, assessment responses, session details, uploaded resources, messages or notes supported by the platform, payment records, device or usage logs, and support requests.'
  },
  {
    title: '3. Sensitive mental health data',
    body: 'Mental health information is sensitive personal data. Kaizen limits access to authorised users, uses it for care-related platform purposes, and expects professionals and administrators to handle it with confidentiality and care.'
  },
  {
    title: '4. Kenya Data Protection Act principles',
    body: 'Kaizen aims to process personal data lawfully, fairly, transparently, for explicit and legitimate purposes, with data minimisation, accuracy, storage limitation, confidentiality, and appropriate safeguards, consistent with Kenya Data Protection Act, 2019.'
  },
  {
    title: '5. Your rights',
    body: 'Subject to law, you may request information about how your data is used, access your personal data, ask for correction, object to certain processing, request deletion where applicable, request restriction or portability, and complain to the Office of the Data Protection Commissioner.'
  },
  {
    title: '6. Sharing',
    body: 'We may share relevant data with the professional you book, authorised administrators, service providers that host or support the platform, payment providers, and regulators or law-enforcement bodies where legally required or necessary for safety.'
  },
  {
    title: '7. Security and retention',
    body: 'Kaizen uses reasonable technical and organisational safeguards to protect personal data. Data is kept only as long as needed for service delivery, legal, safety, audit, dispute-resolution, or legitimate administrative purposes.'
  },
  {
    title: '8. Cross-border processing',
    body: 'If personal data is stored or processed outside Kenya, Kaizen should use appropriate safeguards or another lawful basis recognised under Kenyan data protection law.'
  },
  {
    title: '9. Contact',
    body: 'For privacy requests, contact Kaizen through the platform contact details. You may also contact Kenya’s Office of the Data Protection Commissioner if you have unresolved concerns about personal data processing.'
  }
];

const modalStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0,0,0,0.58)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20
};

const linkButtonStyle = (color) => ({
  background: 'none',
  border: 'none',
  color,
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 600,
  padding: 0,
  textDecoration: 'underline'
});

export function LegalModal({ type, onClose, color = 'var(--primary)', maxWidth = '720px' }) {
  if (!type) return null;

  const isCombined = type === 'combined';
  const [activeSection, setActiveSection] = useState(isCombined ? 'terms' : type);
  const isTerms = activeSection === 'terms';
  const sections = isTerms ? termsSections : privacySections;
  const title = isCombined ? 'Terms and Policies' : (isTerms ? 'Terms of Use' : 'Privacy Policy');

  return (
    <div style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
      <div style={{
        width: `min(${maxWidth}, 100%)`,
        maxHeight: '82vh',
        overflowY: 'auto',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        border: '1.5px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)'
      }}>
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 id="legal-modal-title" style={{ margin: 0, fontSize: 22, color }}>{title}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Kaizen Mental Health Platform - Kenya
            </p>
            {isCombined && (
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                {['terms', 'privacy'].map((sectionKey) => {
                  const label = sectionKey === 'terms' ? 'Terms of Use' : 'Privacy Policy';
                  const active = activeSection === sectionKey;
                  return (
                    <button
                      key={sectionKey}
                      type="button"
                      onClick={() => setActiveSection(sectionKey)}
                      style={{
                        border: '1px solid var(--border)',
                        background: active ? 'rgba(233,30,140,0.08)' : 'transparent',
                        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: 10,
                        padding: '8px 14px',
                        cursor: 'pointer',
                        fontWeight: active ? 700 : 600,
                        fontSize: 13
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal modal"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: '20px 22px 24px' }}>
          <p style={{ marginTop: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>
            Last updated: May 7, 2026. This text is a platform-specific summary and should be reviewed by a qualified Kenyan legal professional before production use.
          </p>
          {sections.map((section) => (
            <section key={section.title} style={{ marginTop: 18 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--text-primary)' }}>
                {section.title}
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>
                {section.body}
              </p>
            </section>
          ))}
          <p style={{ margin: '20px 0 0', color: 'var(--text-muted)', lineHeight: 1.5, fontSize: 12 }}>
            Kenya DPA reference points: data-subject rights and data protection principles published by the Office of the Data Protection Commissioner, and the Data Protection Act, 2019.
          </p>
        </div>
      </div>
    </div>
  );
}

export function LegalLinks({ color = 'var(--primary)', align = 'center', style, modalMaxWidth }) {
  const [modal, setModal] = useState(null);

  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: align,
        alignItems: 'center',
        gap: 12,
        color: 'var(--text-muted)',
        fontSize: 14,
        ...style
      }}>
        <button type="button" onClick={() => setModal('terms')} style={linkButtonStyle(color)}>
          Terms of Use
        </button>
        <span>|</span>
        <button type="button" onClick={() => setModal('privacy')} style={linkButtonStyle(color)}>
          Privacy Policy
        </button>
      </div>
      <LegalModal type={modal} onClose={() => setModal(null)} color={color} maxWidth={modalMaxWidth} />
    </>
  );
}

export function LegalConsentCheckbox({ checked, onChange, error, color = 'var(--primary)' }) {
  const [modal, setModal] = useState(null);
  const checkboxId = useId();

  return (
    <div style={{ margin: '18px 0 20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        color: 'var(--text-secondary)',
        fontSize: 13,
        lineHeight: 1.5
      }}>
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ marginTop: 3, accentColor: color }}
        />
        <span>
          <label htmlFor={checkboxId} style={{ cursor: 'pointer' }}>
            I have read and agree to the
          </label>
          {' '}
          <button type="button" onClick={() => setModal('terms')} style={linkButtonStyle(color)}>
            Terms of Use
          </button>
          {' '}and the{' '}
          <button type="button" onClick={() => setModal('privacy')} style={linkButtonStyle(color)}>
            Privacy Policy
          </button>
          .
        </span>
      </div>
      {error && <p style={{ color: '#e53e3e', fontSize: 12, margin: '6px 0 0 28px' }}>{error}</p>}
      <LegalModal type={modal} onClose={() => setModal(null)} color={color} />
    </div>
  );
}
