'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Check, Loader2, Upload } from 'lucide-react';
import { useApp } from './providers';
import { PageTitle, Protected } from './ui';
import { createClient } from '@/lib/supabase/client';
import { friendlyError, initials } from '@/lib/utils';
export function Settings() {
  return (
    <div className="page-content">
      <Protected>
        <SettingsContent />
      </Protected>
    </div>
  );
}
function SettingsContent() {
  const { user, profile, refresh, toast } = useApp(),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const client = createClient();
    if (!client || !user) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const { error } = await client
      .from('profiles')
      .update({
        display_name: String(f.get('display_name')).trim(),
        username: String(f.get('username')).trim().toLowerCase(),
        bio: String(f.get('bio')).trim(),
        neighborhood: String(f.get('neighborhood')).trim(),
      })
      .eq('id', user.id);
    setBusy(false);
    if (error) toast(friendlyError(error.message), true);
    else {
      await refresh();
      toast('Seu perfil foi atualizado.');
    }
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0],
      client = createClient();
    if (!file || !client || !user) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2097152) {
      toast('Use uma imagem JPG, PNG ou WebP de até 2 MB.', true);
      return;
    }
    setUploading(true);
    const extension =
        { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type] || 'jpg',
      path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type });
    if (error) {
      setUploading(false);
      toast('Não foi possível enviar sua foto.', true);
      return;
    }
    const { data } = client.storage.from('avatars').getPublicUrl(path);
    const result = await client
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', user.id);
    setUploading(false);
    if (result.error) toast('Não foi possível atualizar sua foto.', true);
    else {
      await refresh();
      toast('Foto atualizada.');
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="SUA IDENTIDADE NA COMUNIDADE"
        title="Seu perfil, do seu jeito."
        description="Conte quem você é e facilite novas conexões com os duelistas da região."
      />
      <div className="settings-layout">
        <aside className="panel profile-summary">
          <div className="avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Sua foto" />
            ) : (
              initials(profile?.display_name || 'D')
            )}
          </div>
          <h2>{profile?.display_name}</h2>
          <p>@{profile?.username}</p>
          <Link href={`/perfil/${profile?.username}`} className="text-link">
            Ver perfil público <ArrowUpRight size={15} />
          </Link>
        </aside>
        <div className="panel">
          <h2>Informações do perfil</h2>
          <div className="avatar-upload">
            <div className="avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Sua foto" />
              ) : (
                initials(profile?.display_name || 'D')
              )}
            </div>
            <label>
              {uploading ? 'Enviando imagem…' : 'Alterar foto do perfil'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => void upload(e)}
                disabled={uploading}
              />
              <small>JPG, PNG ou WebP. Máximo de 2 MB.</small>
            </label>
          </div>
          <form className="form" onSubmit={save} key={profile?.id}>
            <div className="form-row">
              <label>
                Seu nome
                <input
                  name="display_name"
                  defaultValue={profile?.display_name}
                  required
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                />
              </label>
              <label>
                Nome de usuário
                <input
                  name="username"
                  defaultValue={profile?.username}
                  required
                  pattern="[a-z0-9_]{3,24}"
                  minLength={3}
                  maxLength={24}
                  autoComplete="username"
                />
              </label>
            </div>
            <label>
              Sobre você
              <textarea
                name="bio"
                defaultValue={profile?.bio}
                maxLength={500}
                placeholder="Seu arquétipo favorito, o que você coleciona, como começou a duelar…"
              />
            </label>
            <div className="form-row">
              <label>
                Cidade
                <input value="Lagarto, SE" disabled />
              </label>
              <label>
                Bairro <span className="optional">opcional</span>
                <input
                  name="neighborhood"
                  defaultValue={profile?.neighborhood}
                  maxLength={80}
                  placeholder="Ex.: Centro"
                />
              </label>
            </div>
            <p className="field-hint">
              Seu nome, foto, bairro e apresentação são públicos. Informe apenas o bairro, sem
              endereço completo.
            </p>
            <label>
              E-mail da conta
              <input value={user?.email || ''} disabled type="email" />
            </label>
            <Link className="text-link" href="/recuperar-senha">
              Alterar minha senha <ArrowUpRight size={13} />
            </Link>
            <button
              className="button button-gold"
              style={{ alignSelf: 'flex-start' }}
              disabled={busy}
            >
              {busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />}Salvar alterações
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
