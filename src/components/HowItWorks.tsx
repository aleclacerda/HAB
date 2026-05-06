import React from 'react';

const steps = [
  {
    n: '01',
    title: 'Defina seu perfil',
    text: 'Cidade, faixa de preço, estágio do imóvel. Sorocaba é nosso ponto de partida.',
  },
  {
    n: '02',
    title: 'Receba oportunidades ranqueadas',
    text: 'Score Habitus combina preço x região, valorização e reputação da construtora.',
  },
  {
    n: '03',
    title: 'Decida com dados, sem achismo',
    text: 'Compare lado a lado, veja histórico de entregas e simule cenários de valorização.',
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="section">
      <div className="container">
        <div className="section-head--center">
          <span className="section-tag">Como funciona</span>
          <h2 className="section-title section-title--xl">
            Da busca à decisão em <em>três passos</em>
          </h2>
        </div>
        <div className="steps-row">
          {steps.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="step">
                <div className="step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="step-connector" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7"/>
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
