// @ts-nocheck
import React, { useState } from 'react';
import {
  ActionButton,
  ActionLink,
  Panel,
  StatusBadge,
} from '../../../src/components/design-system';
import { Modal, PageTitle } from '../../../src/components/ui';
import { ArrowUpRight, Check, Loader2, Plus, Trash2 } from '../../../src/components/system-icons';

export function ComponentsReview() {
  const [clicks, setClicks] = useState(0),
    [modal, setModal] = useState(null),
    [submitted, setSubmitted] = useState('');
  return (
    <div className="page-content" data-qa-components>
      <PageTitle
        eyebrow="QA ISOLADA — COMPONENTES REAIS"
        title="Variantes do design system."
        description="Consumidores React do produto, estados nativos e operações apenas em memória."
      />
      <section aria-labelledby="qa-actions">
        <h2 id="qa-actions">ActionButton</h2>
        <p role="status" data-qa-counter>
          Cliques locais: {clicks}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBlock: 24 }}>
          {['primary', 'secondary', 'danger', 'quiet'].flatMap((variant) =>
            ['regular', 'small'].map((size) => (
              <ActionButton
                key={variant + size}
                variant={variant}
                size={size}
                data-qa-variant={`${variant}-${size}`}
                onClick={() => setClicks((c) => c + 1)}
              >
                <Plus size={17} />
                {variant} · {size}
              </ActionButton>
            )),
          )}
          <ActionButton
            variant="primary"
            disabled
            data-qa-disabled
            onClick={() => setClicks((c) => c + 100)}
          >
            Indisponível
          </ActionButton>
          <ActionButton variant="primary" disabled data-qa-loading>
            <Loader2 className="spin" size={17} />
            Salvando…
          </ActionButton>
        </div>
      </section>
      <section aria-labelledby="qa-links">
        <h2 id="qa-links">ActionLink</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBlock: 24 }}>
          {['primary', 'secondary', 'danger', 'quiet'].map((variant) => (
            <ActionLink key={variant} variant={variant} href="/colecao" data-qa-link={variant}>
              {variant}
              <ArrowUpRight size={17} />
            </ActionLink>
          ))}
        </div>
      </section>
      <section aria-labelledby="qa-panels">
        <h2 id="qa-panels">Panel</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
            gap: 24,
            marginBlock: 24,
          }}
        >
          {['default', 'soft', 'dark'].map((tone) => (
            <Panel key={tone} tone={tone} data-qa-panel={tone}>
              <h3>Painel {tone}</h3>
              <p style={{ marginTop: 12 }}>
                Hierarquia, contraste e espaço para conteúdos de comunidade.
              </p>
              <ActionButton size="small" onClick={() => setModal(tone)}>
                <Plus size={16} />
                Abrir diálogo {tone}
              </ActionButton>
            </Panel>
          ))}
        </div>
      </section>
      <section aria-labelledby="qa-badges">
        <h2 id="qa-badges">StatusBadge</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBlock: 24 }}>
          {['neutral', 'info', 'success', 'warning', 'danger'].map((tone) => (
            <StatusBadge tone={tone} key={tone} data-qa-badge={tone}>
              {tone === 'success' && <Check size={14} />}Status {tone}
            </StatusBadge>
          ))}
        </div>
      </section>
      <section aria-labelledby="qa-fields">
        <h2 id="qa-fields">Formulário e estados nativos</h2>
        <Panel style={{ marginBlock: 24 }}>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(new FormData(event.currentTarget).get('qa_name'));
            }}
          >
            <div className="form-row">
              <label>
                Nome local
                <input name="qa_name" placeholder="Informe um nome" required minLength={2} />
              </label>
              <label>
                Campo com erro
                <input
                  defaultValue="Valor inválido"
                  aria-invalid="true"
                  aria-describedby="qa-field-error"
                />
                <small className="field-hint" id="qa-field-error">
                  Confira este valor antes de continuar.
                </small>
              </label>
            </div>
            <div className="form-row">
              <label>
                Campo desabilitado
                <input value="Não editável" disabled readOnly />
              </label>
              <label>
                Categoria
                <select defaultValue="collection">
                  <option value="collection">Coleção</option>
                  <option value="trade">Troca</option>
                </select>
              </label>
            </div>
            <label>
              Descrição
              <textarea placeholder="Uma descrição de demonstração" />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" />
              Confirmar somente nesta revisão
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <ActionButton variant="primary">
                <Check size={17} />
                Enviar formulário local
              </ActionButton>
              <ActionButton type="button" onClick={() => setModal('wide')}>
                <Plus size={17} />
                Abrir diálogo amplo
              </ActionButton>
            </div>
            {submitted && (
              <p className="auth-success" role="status">
                Formulário local enviado: {submitted}
              </p>
            )}
          </form>
        </Panel>
      </section>
      {modal && (
        <Modal
          title={modal === 'wide' ? 'Diálogo amplo de QA' : 'Diálogo de QA'}
          wide={modal === 'wide'}
          onClose={() => setModal(null)}
        >
          <p className="muted">
            Escape, botão Fechar e clique no backdrop usam o Modal real do produto.
          </p>
          <label className="form" style={{ marginBlock: 24 }}>
            Mensagem do diálogo
            <input aria-label="Mensagem do diálogo" placeholder="Teste o foco pelo teclado" />
          </label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <ActionButton type="button" variant="secondary" onClick={() => setModal(null)}>
              Voltar
            </ActionButton>
            <ActionButton
              type="button"
              variant="danger"
              onClick={() => {
                setClicks((c) => c + 1);
                setModal(null);
              }}
            >
              <Trash2 size={17} />
              Confirmar ação local
            </ActionButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
