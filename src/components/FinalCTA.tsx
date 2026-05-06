import { ArrowRightIcon } from './icons';

export function FinalCTA({ onSignup }: { onSignup: () => void }) {
  return (
    <section className="final-cta">
      <div className="container">
        <div className="final-cta-card">
          <h2>
            Pronto para encontrar o <em>imóvel certo</em>?
          </h2>
          <p>
            Comece agora gratuitamente. Receba alertas quando o melhor imóvel para o seu perfil aparecer.
          </p>
          <div className="cta-actions">
            <button className="btn btn-primary btn-lg" onClick={onSignup}>
              Começar agora <ArrowRightIcon width={16} height={16} />
            </button>
            <a className="btn btn-ghost btn-lg" href="#oportunidades">Ver oportunidades</a>
          </div>
        </div>
      </div>
    </section>
  );
}
