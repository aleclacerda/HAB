export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} Habitus · Inteligência imobiliária</span>
        <div className="footer-links">
          <a href="#">Termos</a>
          <a href="#">Privacidade</a>
          <a href="#">Contato</a>
          <a href="/admin/login" className="footer-admin-link">Administrador</a>
        </div>
      </div>
    </footer>
  );
}
