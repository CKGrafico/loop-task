import { useState } from "react";

export interface HoverState {
  isHovered: boolean;
  hoverProps: {
    onMouseOver: () => void;
    onMouseOut: () => void;
  };
}

export function useHoverState(): HoverState {
  const [isHovered, setIsHovered] = useState(false);
  return {
    isHovered,
    hoverProps: {
      onMouseOver: () => setIsHovered(true),
      onMouseOut: () => setIsHovered(false),
    },
  };
}
