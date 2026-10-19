import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="eyebrow">404 · CARTA FORA DO DECK</span>
      <h1>Esta página não foi encontrada.</h1>
      <p>Vamos voltar para a sua próxima conexão?</p>
      <Link className="button button-gold" href="/">
        Explorar cartas
      </Link>
    </div>
  );
}
