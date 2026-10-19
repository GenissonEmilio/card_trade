'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Eye, EyeOff, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { friendlyError, safeNext } from '@/lib/utils';
export function AuthForm({ mode }: { mode: 'login' | 'signup' | 'forgot' | 'reset' }) {
  const [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('erro') === 'confirmacao') {
      setError(
        'O link expirou ou já foi usado. Tente entrar ou solicite um novo link de recuperação.',
      );
    }
  }, []);
  const title = {
    login: 'Bom te ver de novo.',
    signup: 'Toda coleção começa aqui.',
    forgot: 'Vamos recuperar sua conta.',
    reset: 'Uma nova senha. Um novo começo.',
  }[mode];
  const subtitle = {
    login: 'Suas cartas, seus matches e novas conexões estão esperando por você.',
    signup: 'Junte-se aos duelistas de Lagarto. Sua próxima troca pode estar a poucos passos.',
    forgot: 'Informe seu e-mail. Você receberá um link para criar uma nova senha.',
    reset: 'Escolha uma senha forte para continuar explorando suas próximas trocas.',
  }[mode];
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const client = createClient();
    if (!client) {
      setError('O cadastro está em configuração. Tente novamente em breve.');
      return;
    }
    setBusy(true);
    const form = new FormData(e.currentTarget),
      email = String(form.get('email') || '').trim(),
      password = String(form.get('password') || ''),
      origin = window.location.origin;
    try {
      if (mode === 'signup') {
        const username = String(form.get('username')).trim().toLowerCase();
        const existing = await client
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();
        if (existing.data) {
          setError('Este nome de usuário já está em uso. Escolha outro.');
          return;
        }
        const { error, data } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: String(form.get('display_name')).trim(),
              username,
            },
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          window.location.href = '/colecao';
          return;
        }
        setSuccess(
          'Confira sua caixa de entrada e confirme seu e-mail para ativar sua conta. Se o e-mail já tiver cadastro, entre ou recupere sua senha.',
        );
      } else if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = safeNext(new URLSearchParams(window.location.search).get('next'));
      } else if (mode === 'forgot') {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/recuperar-senha?etapa=nova`,
        });
        if (error) throw error;
        setSuccess(
          'Se existir uma conta com este e-mail, você receberá um link de recuperação. Confira também o spam.',
        );
      } else {
        const { data } = await client.auth.getUser();
        if (!data.user) {
          setError('Abra o link de recuperação enviado ao seu e-mail antes de alterar a senha.');
          return;
        }
        const { error } = await client.auth.updateUser({
          password,
          data: { needs_password_setup: false },
        });
        if (error) throw error;
        setSuccess('Senha atualizada. Sua conta está pronta para novas conexões.');
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/">
          <img className="auth-logo" src="/logo.svg" alt="Duelink" />
        </Link>
        <span className="eyebrow">CONECTE SUA COLEÇÃO</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {success ? (
          <div className="auth-success" role="status">
            <Mail size={24} />
            <p>{success}</p>
            {mode === 'reset' && (
              <Link className="button button-gold full-width" href="/colecao">
                Ir para minha coleção
              </Link>
            )}
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            {mode === 'signup' && (
              <>
                <label>
                  Seu nome
                  <input
                    name="display_name"
                    autoComplete="name"
                    placeholder="Como podemos chamar você?"
                    minLength={2}
                    maxLength={60}
                    required
                  />
                </label>
                <label>
                  Nome de usuário
                  <input
                    name="username"
                    autoComplete="username"
                    placeholder="seu_nome_de_duelista"
                    pattern="[a-z0-9_]{3,24}"
                    minLength={3}
                    maxLength={24}
                    required
                    title="De 3 a 24 letras minúsculas, números ou sublinhado"
                  />
                  <small className="field-hint">
                    De 3 a 24 letras minúsculas, números ou sublinhado.
                  </small>
                </label>
              </>
            )}
            {mode !== 'reset' && (
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  maxLength={254}
                  required
                />
              </label>
            )}
            {mode !== 'forgot' && (
              <label>
                {mode === 'reset' ? 'Nova senha' : 'Senha'}
                <div className="password-field">
                  <input
                    name="password"
                    type={visible ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'login' ? 'Sua senha' : 'Pelo menos 8 caracteres'}
                    minLength={8}
                    maxLength={128}
                    required
                  />
                  <button
                    type="button"
                    aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            )}
            {mode === 'login' && (
              <div className="auth-forgot">
                <Link href="/recuperar-senha" className="text-link">
                  Esqueci minha senha
                </Link>
              </div>
            )}
            {mode === 'signup' && (
              <label className="checkbox-label">
                <input type="checkbox" required />
                <span>
                  Concordo com a{' '}
                  <Link href="/privacidade" className="text-link">
                    política de privacidade
                  </Link>{' '}
                  e com as orientações de troca da comunidade.
                </span>
              </label>
            )}
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            <button className="button button-gold full-width" disabled={busy}>
              {busy ? <Loader2 className="spin" size={17} /> : <ArrowUpRight size={17} />}
              {
                {
                  login: 'Entrar na minha conta',
                  signup: 'Criar minha conta gratuita',
                  forgot: 'Enviar link de recuperação',
                  reset: 'Salvar nova senha',
                }[mode]
              }
            </button>
          </form>
        )}
        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              Ainda não faz parte? <Link href="/cadastro">Crie sua conta</Link>
            </>
          ) : (
            <>
              Já tem uma conta? <Link href="/login">Entrar</Link>
            </>
          )}
        </p>
        <p className="auth-legal">
          Uma comunidade para trocas presenciais em Lagarto, SE.
          <br />
          <Link href="/como-funciona">Conheça as orientações de troca.</Link>
        </p>
      </div>
    </div>
  );
}
