/**
 * Animation utilities for framer-motion
 * Provides reusable animation variants and helpers
 */

import { Variants, Transition } from 'framer-motion';

/**
 * Standard animation durations (in seconds)
 */
export const DURATION = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const;

/**
 * Standard easing curves
 */
export const EASING = {
  easeOut: [0.0, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  easeInOut: [0.4, 0.0, 0.2, 1],
  spring: { type: 'spring', stiffness: 300, damping: 30 },
} as const;

/**
 * Fade in animation variant
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

/**
 * Slide up animation variant
 */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

/**
 * Scale animation variant (for modals/dialogs)
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

/**
 * Slide from side animations
 */
export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeIn,
    },
  },
};

export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeIn,
    },
  },
};

/**
 * Container variant with stagger children
 * Perfect for lists and grids
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

/**
 * Stagger item variant (child of staggerContainer)
 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: {
      duration: DURATION.fast,
    },
  },
};

/**
 * Fast stagger for dense lists (Kanban cards, etc.)
 */
export const fastStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
};

export const fastStaggerItem: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeOut,
    },
  },
};

/**
 * Page transition variants
 */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeIn,
    },
  },
};

/**
 * Card hover animation
 */
export const cardHover = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: 0.98,
  },
};

/**
 * Button press animation
 */
export const buttonPress = {
  tap: {
    scale: 0.95,
    transition: {
      duration: DURATION.fast,
    },
  },
};

/**
 * Helper to create custom stagger container
 */
export const createStaggerContainer = (
  staggerDelay: number = 0.1,
  delayChildren: number = 0
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

/**
 * Helper to create custom stagger item
 */
export const createStaggerItem = (
  duration: number = DURATION.normal,
  yOffset: number = 10
): Variants => ({
  hidden: { opacity: 0, y: yOffset },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration,
      ease: EASING.easeOut,
    },
  },
});

/**
 * Reduced motion detection helper
 * Returns simplified variants for users who prefer reduced motion
 */
export const getMotionVariants = (
  prefersReducedMotion: boolean,
  variants: Variants
): Variants => {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.01 } },
      exit: { opacity: 0, transition: { duration: 0.01 } },
    };
  }
  return variants;
};

/**
 * Get safe transition config respecting reduced motion
 */
export const getSafeTransition = (
  prefersReducedMotion: boolean,
  transition: Transition
): Transition => {
  if (prefersReducedMotion) {
    return { duration: 0.01 };
  }
  return transition;
};
