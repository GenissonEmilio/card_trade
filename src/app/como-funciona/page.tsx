import Link from 'next/link';
import { PageTitle } from '@/components/ui';
export const metadata = { title: 'Como funciona' };
export default function Page() {
  return (
    <div className="page-content">
      <PageTitle
        eyebrow="DO SEU DECK PARA UMA NOVA CONEXÃO"
        title="Uma boa troca começa aqui."
        description="O Duelink aproxima colecionadores de Yu-Gi-Oh! e Pokémon em Lagarto, Sergipe."
      />
      <div className="how-steps">
        {[
          {
            n: '01',
            title: 'Conecte sua coleção.',
            text: 'Crie sua conta, encontre suas cartas no catálogo e registre quantidade, edição, idioma e conservação. Escolha o que está disponível para troca.',
          },
          {
            n: '02',
            title: 'Conte o que você procura.',
            text: 'Adicione as cartas que faltam no seu deck à lista de desejos. Quando você e outro duelista tiverem cartas que o outro quer, um match aparece.',
          },
          {
            n: '03',
            title: 'Faça a troca acontecer.',
            text: 'Envie uma proposta, converse pelo chat e combine um encontro. Confira as cartas pessoalmente. Os dois confirmam o recebimento para concluir a troca.',
          },
        ].map((s) => (
          <div className="panel how-step" key={s.n}>
            <span className="step-number">{s.n}</span>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
      <div className="prose">
        <h2>Cartas reais, informações honestas.</h2>
        <p>
          Informe a edição e o idioma corretos e descreva marcas de uso. Use a escala de
          conservação: Mint (MT), Near Mint (NM), Excelente (EX), Bom (GD), Pouco jogada (LP),
          Jogada (PL) e Danificada (PO). Raridade e condição influenciam a troca e precisam ser
          acordadas entre os participantes.
        </p>
        <h2>Como funciona uma proposta?</h2>
        <p>
          Cada proposta troca uma carta por outra. O destinatário pode aceitar ou recusar. Após o
          aceite, os itens ficam reservados e não podem ser editados. As cartas mudam de coleção
          apenas quando os dois duelistas confirmam o recebimento. Cada participante pode avaliar a
          experiência uma vez.
        </p>
        <h2>Encontre-se com tranquilidade.</h2>
        <p>
          Prefira um local público e movimentado, durante o dia. Confira a condição, edição e
          autenticidade antes de confirmar o recebimento. Evite compartilhar endereço residencial,
          documentos e dados bancários. Se você for menor de idade, participe com acompanhamento de
          um responsável.
        </p>
        <h2>Uma comunidade de trocas presenciais.</h2>
        <p>
          O Duelink facilita o encontro entre colecionadores. As negociações são feitas diretamente
          entre os participantes. As compras do marketplace usam checkout hospedado no Mercado Pago,
          com Pix e cartão conforme habilitação. A retirada é combinada presencialmente. A moderação
          não certifica autenticidade; os direitos aplicáveis e os procedimentos estão nas regras do
          marketplace.
        </p>
        <h2>Como vender ou comprar?</h2>
        <p>
          Adicione a carta à sua coleção, conecte sua conta Mercado Pago em Vender cartas e envie o
          anúncio com fotos próprias, preço e conservação. Após moderação, o anúncio pode receber
          pedidos. O comprador revisa o carrinho de um vendedor, aceita as regras e segue ao
          checkout. As vendas só abrem depois da configuração da operação e da habilitação
          financeira.
        </p>
        <p>
          <Link className="text-link" href="/termos-marketplace">
            Ler as regras de compra e venda
          </Link>
        </p>
        <h2>Sobre o catálogo.</h2>
        <p>
          Os dados vêm da{' '}
          <a href="https://portal.ygoprodeck.com/api-guide/" target="_blank" rel="noreferrer">
            API YGOPRODeck
          </a>
          , com cache no servidor. O catálogo Pokémon utiliza o TCGdex. A busca pesquisa os nomes em
          português e inglês disponíveis nas fontes, sem limitar os resultados a uma lista de
          destaque. Quando falta tradução, o nome original é identificado. As imagens são
          re-hospedadas. Yu-Gi-Oh! pertence aos respectivos titulares; este é um projeto
          independente de fãs.
        </p>
        <Link className="button button-gold" href="/cadastro" style={{ marginTop: 25 }}>
          Criar minha conta gratuita
        </Link>
      </div>
    </div>
  );
}
