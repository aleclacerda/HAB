import { SearchPanel } from './SearchPanel';
import { BuildersMarquee } from './BuildersMarquee';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        <img src="/building_landing.jpg" alt="" className="hero-photo" />
        <div className="hero-photo-overlay" />
      </div>

      <div className="hero-inner">
        <div className="hero-left">
          <a href="#" className="hero-brand" aria-label="Habitus">
            <img src="/logo-transp.svg" alt="Habitus" className="hero-brand-logo" />
          </a>
          <SearchPanel />
        </div>
      </div>

      <BuildersMarquee variant="ghost" />
    </section>
  );
}
