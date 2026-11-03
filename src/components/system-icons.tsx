'use client';
import type { SVGProps } from 'react';
import icons from './design-icons.json';
type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
function icon(name: keyof typeof icons) {
  return function SystemIcon({ size = 20, strokeWidth: _stroke, fill, ...props }: IconProps) {
    const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="currentColor"
        aria-hidden={!labelled}
        role={labelled ? 'img' : undefined}
        opacity={fill === 'none' ? 0.45 : undefined}
        {...props}
        dangerouslySetInnerHTML={{ __html: icons[name] }}
      />
    );
  };
}
export const ArrowLeft = icon('arrow-left');
export const ArrowRight = icon('arrow-right');
export const ArrowLeftRight = icon('arrows-clockwise');
export const ArrowUpRight = icon('arrow-up-right');
export const BookOpen = icon('book-open');
export const Camera = icon('camera');
export const Check = icon('check');
export const CheckCircle2 = icon('check-circle');
export const ChevronDown = icon('caret-down');
export const CircleAlert = icon('warning-circle');
export const ClipboardCheck = icon('clipboard-text');
export const ClipboardList = icon('clipboard-text');
export const Compass = icon('cards');
export const Copy = icon('copy');
export const CreditCard = icon('credit-card');
export const Download = icon('download-simple');
export const ExternalLink = icon('arrow-square-out');
export const Eye = icon('eye');
export const EyeOff = icon('eye-slash');
export const FlaskConical = icon('flask');
export const Heart = icon('heart');
export const HelpCircle = icon('question');
export const ImageIcon = icon('image');
export const Layers3 = icon('cards-three');
export const LibraryBig = icon('books');
export const Loader2 = icon('spinner-gap');
export const LockKeyhole = icon('lock-key');
export const LogOut = icon('sign-out');
export const Mail = icon('envelope-simple');
export const MapPin = icon('map-pin');
export const Menu = icon('list');
export const MessageCircle = icon('chat-circle-dots');
export const Package = icon('package');
export const Pencil = icon('pencil-simple');
export const Plus = icon('plus');
export const Receipt = icon('receipt');
export const ReceiptText = icon('receipt');
export const RefreshCw = icon('arrows-clockwise');
export const Search = icon('magnifying-glass');
export const Send = icon('paper-plane-tilt');
export const Settings2 = icon('faders-horizontal');
export const Share2 = icon('share-network');
export const ShieldCheck = icon('seal-check');
export const ShoppingBag = icon('shopping-bag');
export const Sparkles = icon('sparkle');
export const Star = icon('star');
export const Store = icon('storefront');
export const Trash2 = icon('trash');
export const Upload = icon('upload-simple');
export const UserRound = icon('user-circle');
export const Users = icon('users-three');
export const Wallet = icon('wallet');
export const X = icon('x');
export const Zap = icon('lightning');
