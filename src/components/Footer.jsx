import { Globe, Camera, MessageCircle, Tv } from 'lucide-react';
import './Footer.css';

const SOCIAL_LINKS = [
  { Icon: Globe, label: 'Facebook', href: '#' },
  { Icon: Camera, label: 'Instagram', href: '#' },
  { Icon: MessageCircle, label: 'Twitter', href: '#' },
  { Icon: Tv, label: 'YouTube', href: '#' },
];

const QUICK_LINKS = [
  { heading: 'Company', items: ['About', 'Careers', 'Contact'] },
  { heading: 'Legal', items: ['Terms of Use', 'Privacy', 'Cookie Preferences'] },
];

const FOOTER_LINKS = [
  'Audio Description',
  'Help Center',
  'Gift Cards',
  'Media Center',
  'Investor Relations',
  'Jobs',
];

export default function Footer() {
  return (
    <footer className="footer glass modern-glass">
      <div className="container footer__content">
        {/* Social Icons */}
        <div className="footer__section footer__social">
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

        {/* Quick Links */}
        {QUICK_LINKS.map(({ heading, items }) => (
          <div key={heading} className="footer__section footer__quick">
            <h4 className="footer__heading">{heading}</h4>
            {items.map((text) => (
              <a key={text} href="#" className="footer__link">
                {text}
              </a>
            ))}
          </div>
        ))}

        {/* Additional Links */}
        <div className="footer__section footer__links">
          {FOOTER_LINKS.map((text) => (
            <a key={text} href="#" className="footer__link">
              {text}
            </a>
          ))}
        </div>

        {/* Newsletter Subscription */}
        <div className="footer__section footer__subscribe">
          <h4 className="footer__heading">Stay Updated</h4>
          <input type="email" placeholder="Enter your email" className="footer__input" />
          <button className="footer__btn">Subscribe</button>
        </div>
      </div>
      <p className="footer__copy">© 2026 AndScene! – All rights reserved.</p>
    </footer>
  );
}
