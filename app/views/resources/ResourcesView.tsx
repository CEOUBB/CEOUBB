"use client";

import { useHydratedReducedMotion as useReducedMotion } from "../../../lib/hooks/use-hydrated-reduced-motion";
import Image from "next/image";
import { RESOURCE_GROUPS } from "./resources-data";
import type { Brand, ResourceItem } from "./resources-data";
import { MobileStrip, ResourceGroupSection } from "./resource-parts";

const BRAND_LOGOS: Record<Brand, string> = {
  chatgpt: "/brand/chatgpt.svg",
  claude: "/brand/claude.svg",
  gemini: "/brand/gemini.svg",
  deepseek: "/brand/deepseek.svg",
  kimi: "/brand/kimi.svg",
  qwen: "/brand/qwen.svg",
  github: "/brand/github.svg",
  notion: "/brand/notion.svg",
  microsoft: "/brand/microsoft.svg",
  autodesk: "/brand/autodesk.svg",
  spotify: "/brand/spotify.svg",
  applemusic: "/brand/applemusic.svg",
  moodle: "/brand/moodle.svg",
  youtubemusic: "/brand/youtubemusic.svg",
  perplexity: "/brand/perplexity.svg",
};

function BrandMark({ brand }: { brand: Brand }) {
  const logoSrc = BRAND_LOGOS[brand];
  if (!logoSrc) return null;
  return (
    <Image
      alt=""
      aria-hidden="true"
      className="brand-mark"
      height={24}
      src={logoSrc}
      unoptimized
      width={24}
    />
  );
}

/* Marca de la fila: vector propio, imagen de la marca o el escudo UBB para los
   servicios institucionales que no tienen logotipo propio. */
function ResourceMark({ item }: { item: ResourceItem }) {
  if (item.brand) return <BrandMark brand={item.brand} />;
  if (item.image) {
    return (
      <Image
        alt=""
        aria-hidden="true"
        className="brand-mark"
        height={64}
        src={item.image}
        width={64}
      />
    );
  }
  return (
    <Image
      alt=""
      aria-hidden="true"
      className="brand-mark"
      height={594}
      src="/brand/ubb-shield.webp"
      width={388}
    />
  );
}

// Implements: REQ-A11Y-05, REQ-MOTION-07
export function ResourcesView() {
  const shouldReduceMotion = useReducedMotion();

  const jumpTo = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: shouldReduceMotion || event.detail === 0 ? "instant" : "smooth",
      block: "start",
    });
    target.focus({ preventScroll: true });
  };

  return (
    <section className="resources-hub">
      <div className="page-head lead">
        <h1>Recursos de estudio</h1>
        <p>
          <span>
            Herramientas, material académico y convenios para acompañar tu estudio durante el
            semestre.
          </span>
        </p>
      </div>

      <MobileStrip />

      <nav className="resource-index" aria-label="Categorías de recursos">
        {RESOURCE_GROUPS.map((group) => (
          <a
            href={`#recursos-${group.id}`}
            key={group.id}
            onClick={(event) => jumpTo(event, `recursos-${group.id}`)}
          >
            {group.title}
          </a>
        ))}
      </nav>
      {RESOURCE_GROUPS.map((group) => (
        <ResourceGroupSection
          group={group}
          key={group.id}
          renderMark={(item) => <ResourceMark item={item} />}
        />
      ))}
    </section>
  );
}
