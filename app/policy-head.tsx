import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";

export function PolicyHead() {
  return (
    <header className="policy-head">
      <Link className="app-brand" href="/">
        <Image
          src="/brand/ubb-shield.webp"
          alt=""
          aria-hidden="true"
          width={388}
          height={594}
          priority
        />
        <strong>Centro de Estudio UBB</strong>
      </Link>
      <Link className="policy-back" href="/">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        Volver al portal
      </Link>
    </header>
  );
}
