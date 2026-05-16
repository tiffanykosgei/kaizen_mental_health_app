import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { LegalModal } from '../../components/LegalConsent';

const roleCards = [
  {
    role: 'client',
    label: 'Client',
    img: '/mental health matters.jpg',
    color: 'var(--primary)',
    summary: 'Take assessments, book sessions, and track your wellness journey.',
    steps: [
      'Create your personal wellness account.',
      'Complete mental health assessments at your pace.',
      'Book sessions and access helpful resources.',
      'Continue into your client portal.'
    ]
  },
  {
    role: 'professional',
    label: 'Professional',
    img: '/be kind to your mind.jpg',
    color: 'var(--secondary)',
    summary: 'Manage sessions, support clients, and share therapeutic resources.',
    steps: [
      'Sign in through the professional portal.',
      'Manage client sessions and progress notes.',
      'Upload resources that support client growth.',
      'Continue into your professional portal.'
    ]
  },
  {
    role: 'admin',
    label: 'Admin',
    img: '/better everyday.jpg',
    color: 'var(--accent)',
    summary: 'Oversee users, sessions, resources, revenue, and platform activity.',
    steps: [
      'Access the secure administrator area.',
      'Review users, professionals, sessions, and resources.',
      'Monitor platform insights and operational reports.',
      'Continue into your admin portal.'
    ]
  }
];

const infoModals = {
  contacts: {
    title: 'Contacts',
    body: [
      'Phone: +254 729 604375',
      'Email: kosgeitiffany@gmail.com',
      'Support hours: Monday to Friday, 8:00 AM to 6:00 PM EAT.',
      'For urgent safety concerns, please contact local emergency services or visit the nearest hospital. Kaizen is not an emergency response service.'
    ]
  },
  about: {
    title: 'About Us',
    body: [
      'Kaizen is a mental health platform built around continuous improvement, privacy, and access to supportive care.',
      'Clients can complete wellness assessments, book sessions with mental health professionals, keep journals, and explore resources that support day-to-day wellbeing.',
      'Professionals can manage bookings, view relevant client progress, share educational resources, and keep their profile and availability up to date.',
      'Administrators help keep the platform organized by overseeing users, sessions, resources, revenue reports, and account safety.'
    ]
  },
  story: {
    title: 'Our Story',
    body: [
      'Kaizen began with a simple belief: small, steady steps can transform wellbeing.',
      'The platform was shaped for Kenyan mental health access, where people may need a private first step before reaching out for professional support.',
      'Our goal is to make the journey feel less scattered: assessment, booking, resources, reminders, and progress tracking all live in one clear space.',
      'Kaizen is still growing, but its foundation is simple: compassionate support, responsible data handling, and practical tools that help people keep moving forward.'
    ]
  },
  careers: {
    title: 'Careers',
    body: [
      'We welcome people who care about mental health, thoughtful technology, and human-centered support.',
      'Roles on Kaizen focus on improving access, safety, and the wellness experience for clients and professionals alike.',
      'Typical opportunities include software engineering, product design, clinical partnerships, community outreach, platform support, and operations.',
      'We value confidentiality, cultural awareness, ethical decision-making, and the ability to build calmly in a sensitive care environment.',
      'To express interest, send your CV and a short note to kosgeitiffany@gmail.com.'
    ]
  },
  terms: {
    title: 'Terms and Policies',
    body: [
      'See Kaizen’s full Terms of Use and Privacy Policy in one place.',
      'These show how we protect user data, support safe platform use, and ensure clear expectations for everyone.',
      'Review both the terms and the privacy sections before registering or engaging with the platform.'
    ]
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();
  const [activeRole, setActiveRole] = useState(null);
  const [activeInfo, setActiveInfo] = useState(null);

  const selectedRole = roleCards.find(card => card.role === activeRole);
  const selectedInfo = activeInfo ? infoModals[activeInfo] : null;
  const showTermsModal = activeInfo === 'terms';

  const closeModal = () => {
    setActiveRole(null);
    setActiveInfo(null);
  };

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-body)',
      position: 'relative'
    }}>
      <style>{`
        @keyframes kaizenFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes kaizenFloatHeart {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0.22; }
          50% { transform: translate3d(18px, -24px, 0) rotate(10deg); opacity: 0.42; }
        }
        @keyframes kaizenGlow {
          0%, 100% { box-shadow: 0 14px 30px rgba(233,30,140,0.16); }
          50% { box-shadow: 0 18px 42px rgba(156,39,176,0.24); }
        }
        .welcome-heart {
          position: absolute;
          color: rgba(233,30,140,0.34);
          font-size: clamp(34px, 6vw, 92px);
          line-height: 1;
          pointer-events: none;
          animation: kaizenFloatHeart 8s ease-in-out infinite;
          filter: blur(0.2px);
        }
        .welcome-heart::before { content: "\\2665"; }
        .welcome-role-card:hover {
          transform: translateY(-8px);
          border-color: var(--primary);
          box-shadow: 0 18px 42px rgba(233,30,140,0.18);
        }
        .welcome-nav-button:hover {
          color: var(--primary);
        }
        @media (max-width: 820px) {
          .welcome-nav-links { display: none !important; }
          .welcome-main { padding: 18px 16px 20px !important; }
          .welcome-title { font-size: 34px !important; }
          .welcome-subtitle { font-size: 14px !important; }
          .welcome-role-grid { gap: 12px !important; }
          .welcome-role-card { min-height: 178px !important; }
          .welcome-role-image { height: 92px !important; }
        }
      `}</style>

      <span className="welcome-heart" style={{ top: '14%', left: '7%', animationDelay: '0s' }} />
      <span className="welcome-heart" style={{ top: '66%', left: '4%', animationDelay: '1.4s', color: 'rgba(156,39,176,0.24)' }} />
      <span className="welcome-heart" style={{ top: '18%', right: '9%', animationDelay: '2.2s', color: 'rgba(156,39,176,0.26)' }} />
      <span className="welcome-heart" style={{ right: '12%', bottom: '8%', animationDelay: '3.1s' }} />

      <nav style={{
        height: 76,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 18,
        padding: '14px 40px',
        background: 'var(--bg-card)',
        borderBottom: '1.5px solid var(--border)',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800
          }}>K</span>
          <div>
            <h1 style={{
              fontSize: 20,
              fontWeight: 800,
              margin: 0,
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Kaizen
            </h1>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
              Mental Health Platform
            </p>
          </div>
        </div>

        <div className="welcome-nav-links" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            ['contacts', 'Contacts'],
            ['about', 'About Us'],
            ['story', 'Our Story'],
            ['careers', 'Careers'],
            ['terms', 'Terms and Policies']
          ].map(([key, label]) => (
            <button
              key={key}
              className="welcome-nav-button"
              onClick={() => setActiveInfo(key)}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 0'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button onClick={toggleTheme} className={`theme-toggle ${dark ? 'dark' : ''}`} type="button" aria-label="Toggle theme">
          <div className="theme-toggle-thumb" />
        </button>
      </nav>

      <main className="welcome-main" style={{
        height: 'calc(100vh - 76px)',
        padding: '34px 28px 30px',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        background: 'radial-gradient(circle at 22% 26%, rgba(233,30,140,0.14), transparent 26%), radial-gradient(circle at 78% 70%, rgba(156,39,176,0.13), transparent 28%)'
      }}>
        <section style={{ textAlign: 'center', maxWidth: 840, animation: 'kaizenFadeUp 650ms ease both' }}>
          <h2 className="welcome-title" style={{
            fontSize: 52,
            fontWeight: 850,
            color: 'var(--text-primary)',
            margin: '0 0 12px',
            lineHeight: 1.05
          }}>
            Welcome to <span style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Kaizen</span>
          </h2>
          <p className="welcome-subtitle" style={{
            fontSize: 17,
            color: 'var(--text-secondary)',
            maxWidth: 700,
            margin: '0 auto'
          }}>
            Choose your space to see how it works, then continue to the right landing page.
          </p>
        </section>

        <section className="welcome-role-grid" style={{
          width: 'min(980px, 100%)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 20
        }}>
          {roleCards.map((card, index) => (
            <button
              key={card.role}
              className="welcome-role-card"
              onClick={() => setActiveRole(card.role)}
              type="button"
              style={{
                minHeight: 250,
                padding: 0,
                border: '1.5px solid var(--border)',
                borderRadius: 18,
                overflow: 'hidden',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
                animation: `kaizenFadeUp 650ms ease ${index * 120}ms both`
              }}
            >
              <img
                className="welcome-role-image"
                src={encodeURI(card.img)}
                alt={`${card.label} wellness`}
                style={{
                  width: '100%',
                  height: 132,
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <div style={{ padding: '18px 18px 20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 8
                }}>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: card.color }}>
                    {card.label}
                  </h3>
                  <span style={{ color: card.color, fontWeight: 800 }}>-&gt;</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.45 }}>
                  {card.summary}
                </p>
              </div>
            </button>
          ))}
        </section>
      </main>

      {selectedRole && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5,
            background: 'rgba(20, 18, 32, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(520px, 100%)',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: 18,
              padding: 28,
              boxShadow: '0 24px 80px rgba(0,0,0,0.24)',
              animation: 'kaizenFadeUp 260ms ease both'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <p style={{ margin: '0 0 6px', color: selectedRole.color, fontSize: 13, fontWeight: 700 }}>
                  How it works
                </p>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 28, fontWeight: 800 }}>
                  {selectedRole.label}
                </h3>
              </div>
              <button
                onClick={closeModal}
                type="button"
                aria-label="Close modal"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1
                }}
              >
                x
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedRole.steps.map((step, index) => (
                <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: selectedRole.color,
                    color: 'white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 13
                  }}>
                    {index + 1}
                  </span>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate(`/portal/${selectedRole.role}`)}
              type="button"
              style={{
                width: '100%',
                marginTop: 24,
                padding: '13px 18px',
                border: 'none',
                borderRadius: 10,
                background: selectedRole.color,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                animation: 'kaizenGlow 3.5s ease-in-out infinite'
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {selectedInfo && !showTermsModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5,
            background: 'rgba(20, 18, 32, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(520px, 100%)',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: 18,
              padding: 28,
              boxShadow: '0 24px 80px rgba(0,0,0,0.24)',
              animation: 'kaizenFadeUp 260ms ease both'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <p style={{ margin: '0 0 6px', color: 'var(--primary)', fontSize: 13, fontWeight: 700 }}>
                  Kaizen
                </p>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 28, fontWeight: 800 }}>
                  {selectedInfo.title}
                </h3>
              </div>
              <button
                onClick={closeModal}
                type="button"
                aria-label="Close modal"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1
                }}
              >
                x
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedInfo.body.map(text => (
                <p key={text} style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {text}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTermsModal && <LegalModal type="combined" onClose={closeModal} color="var(--primary)" maxWidth="520px" />}
    </div>
  );
}
