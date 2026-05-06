import { useState } from 'react';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Opportunities } from './components/Opportunities';
import { Builders } from './components/Builders';
import { HowItWorks } from './components/HowItWorks';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { FiltersProvider } from './context/FiltersContext';

export default function App() {
  const [modal, setModal] = useState<{ open: boolean; tab: 'login' | 'signup' }>({
    open: false,
    tab: 'login',
  });

  const openLogin = () => setModal({ open: true, tab: 'login' });
  const openSignup = () => setModal({ open: true, tab: 'signup' });
  const close = () => setModal((s) => ({ ...s, open: false }));

  return (
    <FiltersProvider>
      <Nav onLogin={openLogin} onSignup={openSignup} />
      <Hero />
      <Opportunities />
      <Builders />
      <HowItWorks />
      <FinalCTA onSignup={openSignup} />
      <Footer />
      <LoginModal open={modal.open} initialTab={modal.tab} onClose={close} />
    </FiltersProvider>
  );
}
