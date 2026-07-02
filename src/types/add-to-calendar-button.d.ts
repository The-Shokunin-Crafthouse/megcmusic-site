import type { DetailedHTMLProps, HTMLAttributes } from "react";

// The add-to-calendar-button web component is configured entirely through string
// attributes. Declare the intrinsic element so TSX accepts it; every ATCB option
// is optional and passed as a string.
type AtcbAttributes = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  name?: string;
  options?: string;
  location?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  label?: string;
  buttonStyle?: string;
  size?: string;
  lightMode?: string;
  hideBackground?: string | boolean;
  hideCheckmark?: string | boolean;
  styleLight?: string;
  listStyle?: string;
  trigger?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "add-to-calendar-button": AtcbAttributes;
    }
  }
}
