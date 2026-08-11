import type { HTMLAttributes } from "react";

type MathMLProps = HTMLAttributes<Element> & { display?: "block" | "inline" };

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMLProps;
      mrow: MathMLProps;
      mi: MathMLProps;
      mn: MathMLProps;
      mo: MathMLProps;
      msub: MathMLProps;
      msup: MathMLProps;
      mover: MathMLProps;
    }
  }
}
