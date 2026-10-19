import Link from 'next/link';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
export const metadata = { title: 'Regras do marketplace' };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const client = await createClient();
  const result = await client
    ?.from('marketplace_settings')
    .select(
      'operator_name,operator_contact,commission_bps,enabled,terms_version,pickup_instructions',
    )
    .eq('id', true)
    .single();
  const settings = result?.data;
  const operator = settings?.operator_name || 'Duelink',
    contact = settings?.operator_contact || 'officegenisson@gmail.com';
  return (
    <div className="page-content">
      <PageTitle
        eyebrow="COMPRA E VENDA DE CARTAS FÍSICAS"
        title="Regras do marketplace."
        description={`Versão ${settings?.terms_version || '2026-10-19'} · Operação ${operator}`}
      />
      <div className="prose">
        <h2>Quem participa da compra</h2>
        <p>
          O marketplace aproxima compradores e vendedores de cartas físicas em Lagarto, Sergipe. O
          vendedor é identificado no anúncio e responde pela descrição, origem e entrega do
          exemplar. A operação {operator} oferece intermediação, moderação e atendimento. A
          responsabilidade de cada participante será apurada de acordo com a legislação e a
          atividade efetivamente exercida.
        </p>
        <p>
          Contato de atendimento:{' '}
          {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? (
            <a href={`mailto:${contact}`}>{contact}</a>
          ) : (
            contact
          )}
          . O cadastro financeiro e a elegibilidade para vender seguem as exigências do Mercado
          Pago. A compra e a venda devem ser realizadas por pessoas com capacidade para contratar; a
          participação de menores exige representação ou assistência do responsável, conforme
          aplicável.
        </p>
        <h2>Anúncios e conservação</h2>
        <p>
          Somente cartas físicas de Yu-Gi-Oh! e Pokémon TCG podem ser anunciadas. Não são admitidos
          produtos falsificados, cartas digitais, conteúdo ilícito ou uso de fotos de terceiros como
          se fossem do exemplar. O vendedor informará edição, idioma, raridade, acabamento,
          quantidade e conservação, com fotos próprias de frente, verso e defeitos. A imagem do
          catálogo é apenas referência.
        </p>
        <p>
          A moderação poderá pedir correções, recusar ou pausar o anúncio. Essa revisão não equivale
          a certificação profissional de autenticidade. O vendedor deve manter o estoque atualizado;
          uma reserva de compra ou troca impede comprometer a mesma unidade em outra operação.
        </p>
        <h2>Preço e comissão</h2>
        <p>
          O vendedor define o preço em reais. A comissão atual da operação é{' '}
          {settings?.commission_bps === null || settings?.commission_bps === undefined
            ? 'ainda não definida'
            : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(settings.commission_bps / 100)}% sobre o subtotal das cartas`}
          . O vendedor verá a comissão, o líquido antes das tarifas do Mercado Pago e as condições
          ao enviar o anúncio. Mudanças de taxa exigem um novo aceite para voltar a vender; pedidos
          já contratados preservam sua regra original.
        </p>
        <p>
          As tarifas do Mercado Pago são próprias do provedor e dependem da conta e da forma de
          pagamento; não fazem parte da comissão exibida da plataforma. O comprador verá o preço
          total antes de pagar. Qualquer despesa adicional precisa ser informada previamente e
          aceita, sem cobranças ocultas.
        </p>
        <h2>Pedido e pagamento</h2>
        <p>
          Cada pedido reúne cartas de um único vendedor. Confira os itens, quantidades, valores,
          retirada e esta versão dos termos antes de continuar. O checkout ocorre no Mercado Pago,
          com Pix e cartão conforme a disponibilidade para a conta e o pagamento. O sistema
          considera a confirmação recebida do provedor; voltar à página do site não comprova
          pagamento.
        </p>
        <p>
          Reservas sem pagamento expiram. Se houver aprovação tardia ou cobrança duplicada, o pedido
          será enviado para conferência e atendimento, sem prometer estoque indisponível.
          Recebimento do pagamento, entrega física e disponibilidade do repasse são estados
          diferentes. Os prazos e a liberação dos valores seguem o Mercado Pago.
        </p>
        <h2>Retirada combinada em Lagarto</h2>
        <p>
          O lançamento atende retirada presencial em local combinado, sem frete ou transporte
          contratado pelo site. Comprador e vendedor combinam local público, data e horário na
          conversa do pedido. Confira os exemplares e confirme a entrega somente depois de
          recebê-los. As duas confirmações encerram a retirada no sistema.
        </p>
        {settings?.pickup_instructions && (
          <p>
            <strong>Instruções da operação:</strong> {settings.pickup_instructions}
          </p>
        )}
        <h2>Cancelamento e devolução</h2>
        <p>
          Use os controles do pedido para cancelar uma reserva ainda não paga ou solicitar
          atendimento e devolução após o pagamento. Descreva o motivo na conversa e mantenha as
          evidências. O fluxo respeita os direitos legais aplicáveis, inclusive o direito de
          arrependimento de sete dias nas contratações abrangidas pelo artigo 49 do Código de Defesa
          do Consumidor. Não há exclusão genérica do direito de devolução por se tratar de carta
          usada.
        </p>
        <p>
          Os reembolsos são processados pelo provedor e acompanhados até a confirmação. Reembolsos
          totais ou parciais ajustam proporcionalmente a comissão; a restituição das tarifas segue
          as regras do provedor. Se faltar saldo ou houver contestação, o atendimento acompanhará a
          pendência. Confirmar a entrega no aplicativo não elimina direitos previstos em lei.
        </p>
        <h2>Privacidade e histórico</h2>
        <p>
          Dados de conta, mensagens e pedidos são usados para executar a negociação, prevenir abuso
          e atender solicitações. Os participantes veem apenas as informações necessárias à sua
          operação; administradores autorizados acessam os dados necessários à gestão e ao
          atendimento. Dados completos do cartão e código de segurança não são armazenados no
          Duelink. Consulte a <Link href="/privacidade">política de privacidade</Link>.
        </p>
        <p>
          O pedido preserva os itens, valores, fotos, comissão e versão dos termos aceitos na
          contratação. O aceite é registrado com a conta, a versão e o horário. Guarde o resumo do
          pedido. Você pode solicitar informações ou atendimento pelo contato da operação e pela
          conversa do pedido.
        </p>
        <h2>Preparação da operação</h2>
        <p>
          {settings?.enabled
            ? 'A abertura das compras depende também da habilitação do provedor e da conexão financeira do vendedor.'
            : 'As vendas permanecem fechadas enquanto a operação conclui as configurações comerciais e financeiras.'}{' '}
          As informações definitivas de identificação da operação, atendimento e políticas devem
          estar configuradas antes da abertura pública das vendas.
        </p>
      </div>
    </div>
  );
}
