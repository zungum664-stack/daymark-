import { ArrowUpRight, BookOpen, Landmark, Sprout } from 'lucide-react';
import { GROWTH_LINKS } from '../data/growth-links';

const cards = [
  { title: 'High-interest SA savings', detail: 'A little more room for the money you are setting aside.', icon: Landmark, link: GROWTH_LINKS.savings, tag: 'SAVING' },
  { title: 'Tax-free investments', detail: 'A plain-language starting point for growing money over time.', icon: Sprout, link: GROWTH_LINKS.taxFree, tag: 'INVESTING' },
  { title: 'SA payday survival guide', detail: 'A practical guide for making payday stretch to payday.', icon: BookOpen, link: GROWTH_LINKS.payday, tag: 'PDF GUIDE' },
];

export function GrowRands() {
  return (
    <section className="grow-page" aria-labelledby="grow-title">
      <div className="eyebrow"><span className="eyebrow-line" /> A FEW GOOD PLACES TO BEGIN</div>
      <h1 id="grow-title">Grow<br /><em>your rands.</em></h1>
      <p className="intro-copy grow-intro">Useful next steps, for whenever you feel ready. No pressure, no products to buy here.</p>
      <div className="growth-list">
        {cards.map(({ title, detail, icon: Icon, link, tag }, index) => (
          <article className="growth-card" key={title} data-testid={`card-growth-${index + 1}`}>
            <div className="growth-icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></div>
            <div className="growth-copy">
              <span className="growth-tag">{tag}</span>
              <h2>{title}</h2>
              <p>{detail}</p>
              {link.href ? (
                <a className="placeholder-link" href={link.href} target="_blank" rel="noreferrer" data-testid={`link-growth-${index + 1}`}>
                  {link.label}<ArrowUpRight size={13} aria-hidden="true" />
                </a>
              ) : (
                <span className="placeholder-link" aria-label={`${title}: ${link.label}`} data-testid={`link-growth-${index + 1}`}>
                  {link.label}<ArrowUpRight size={13} aria-hidden="true" />
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="growth-note"><span className="note-mark" /> Daymark is a notebook, not financial advice.</p>
    </section>
  );
}
