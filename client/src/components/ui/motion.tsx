import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';

export const TACTICAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.8,
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
