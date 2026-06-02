import { Globe, Camera, MessageCircle, Tv } from 'lucide-react';
import './Footer.css';

const SOCIAL_LINKS = [
  { Icon: Globe, label: 'Facebook', href: '#' },
  { Icon: Camera, label: 'Instagram', href: '#' },
  { Icon: MessageCircle, label: 'Twitter', href: '#' },
  { Icon: Tv, label: 'YouTube', href: '#' },
];

const FOOTER_LINKS = [
  'Audio Description',
  'Help Center',
  'Gift Cards',
  'Media Center',
  'Investor Relations',
  'Jobs',
  'Terms of Use',
  'Privacy',
  'Legal Notices',
  'Cookie Preferences',
  'Corporate Information',
  'Contact Us',
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* Social Icons */}
        <div className="footer__social">
          {SOCIAL_LINKS.map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              className="footer__social-link"
              aria-label={label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon size={22} />
            </a>
          ))}
        </div>

        {/* Link Grid */}
        <div className="footer__links">
          {FOOTER_LINKS.map((text) => (
            <a key={text} href="#" className="footer__link">
              {text}
            </a>
          ))}
        </div>

        {/* Service Code */}
        <button className="footer__service-btn">Service Code</button>

        {/* Copyright */}
        <p className="footer__copy">&copy; 2026 AndScene!. A Futuristic Streaming Project.</p>
      </div>
    </footer>
  );
}
