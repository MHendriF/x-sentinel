import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';

export const TACTICAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 26,
  mass: 0.9,
};

export const MotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);

export const MotionTabStage: React.FC<{
  tabKey: string;
  children: React.ReactNode;
}> = ({ tabKey, children }) => (
  <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: TACTICAL_EASE }}
      className="flex-1"
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

export const MotionStaggerGrid: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <motion.div
    initial="hidden"
    animate="show"
    variants={{
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.035,
        },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const MotionStaggerItem: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 10, scale: 0.99 },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.22, ease: TACTICAL_EASE },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);
