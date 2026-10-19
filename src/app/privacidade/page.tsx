import { PageTitle } from '@/components/ui';
export const metadata = { title: 'Privacidade' };
export default function Page() {
  return (
    <div className="page-content">
      <PageTitle
        eyebrow="TRANSPARÊNCIA NA COMUNIDADE"
        title="Sua privacidade importa."
        description="Como o Duelink usa as informações necessárias para conectar colecionadores."
      />
      <div className="prose">
        <h2>Informações da conta</h2>
        <p>
          O e-mail e a senha são usados para autenticação pelo Supabase. Sua senha é protegida pelo
          serviço de autenticação e não aparece no seu perfil. Nome, usuário, foto, apresentação e
          bairro são exibidos na comunidade. O bairro é opcional.
        </p>
        <h2>Coleção e lista de desejos</h2>
        <p>
          As cartas marcadas como disponíveis para troca são públicas. Sua coleção pessoal e sua
          lista de desejos têm acesso restrito à sua conta. O sistema cruza as listas para
          identificar matches e exibe apenas as cartas envolvidas na correspondência, sem divulgar
          toda a lista do outro duelista.
        </p>
        <h2>Propostas, conversas e avaliações</h2>
        <p>
          As propostas e mensagens podem ser acessadas pelos dois participantes. Avaliações de
          trocas concluídas são públicas. Não envie documentos, senhas ou informações bancárias nas
          conversas. Os dados são mantidos enquanto necessários ao funcionamento da conta e ao
          histórico de negociações.
        </p>
        <h2>Marketplace e pagamentos</h2>
        <p>
          Fotos e descrições dos anúncios são públicas após aprovação. Pedidos e conversas são
          acessíveis aos participantes e à administração autorizada para operação e atendimento.
          Valores, comissão, versão dos termos e situação dos pagamentos integram o histórico da
          compra. Documentos financeiros são fornecidos diretamente ao Mercado Pago; dados completos
          do cartão e CVV não são armazenados no Duelink.
        </p>
        <p>
          O acesso administrativo é atribuído de forma restrita e suas alterações de taxa e
          permissões são registradas. O histórico é mantido pelo período necessário à execução da
          operação, atendimento, prevenção de fraude e cumprimento de obrigações legais. Solicite
          esclarecimentos, exportação ou exclusão pelo contato da operação, respeitando registros
          que precisem ser conservados.
        </p>
        <h2>Serviços utilizados</h2>
        <p>
          O banco de dados, as imagens e a autenticação utilizam o Supabase, com projeto na região
          de São Paulo. A aplicação utiliza a Vercel. Os catálogos vêm do YGOPRODeck e do TCGdex. O
          checkout e o cadastro financeiro dos vendedores utilizam o Mercado Pago, que trata os
          dados necessários ao pagamento segundo suas políticas. Esses serviços tratam dados
          técnicos necessários ao funcionamento, conforme suas próprias políticas.
        </p>
        <h2>Armazenamento no navegador</h2>
        <p>
          Usamos cookies e armazenamento local necessários para manter sua sessão autenticada,
          lembrar o jogo selecionado e guardar o carrinho. Não instalamos rastreadores de
          publicidade. Você pode sair da conta e limpar o armazenamento do navegador a qualquer
          momento.
        </p>
        <h2>Controle das suas informações</h2>
        <p>
          Você pode editar seu perfil, remover cartas e apagar desejos nas respectivas telas. Para
          solicitar exportação ou exclusão da conta, abra uma solicitação privada ao responsável
          pelo projeto no{' '}
          <a href="https://github.com/GenissonEmilio" target="_blank" rel="noreferrer">
            perfil do mantenedor no GitHub
          </a>
          , sem publicar dados pessoais em issues públicas. A exclusão será tratada considerando os
          registros de negociações compartilhados com outros participantes.
        </p>
        <h2>Regras de convivência</h2>
        <p>
          Descreva as cartas com honestidade, respeite os outros participantes e honre o que foi
          combinado. Não publique conteúdo ofensivo, ilegal ou dados de terceiros. Esta plataforma é
          destinada à comunidade de Lagarto e à organização, troca e venda de cartas físicas entre
          seus participantes.
        </p>
      </div>
    </div>
  );
}
