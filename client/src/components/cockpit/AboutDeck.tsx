import React from 'react';
import { AboutHeroBanner } from './about/AboutHeroBanner';
import { CoreCapabilitiesGrid } from './about/CoreCapabilitiesGrid';
import { ModularArchitectureCard } from './about/ModularArchitectureCard';
import { SystemSpecsCard } from './about/SystemSpecsCard';
import { DocsCatalogCard } from './about/DocsCatalogCard';
import { SecurityNotice } from './about/SecurityNotice';

export const AboutDeck: React.FC = () => {
  return (
    <div className="animate-in fade-in space-y-6 pb-8 duration-300">
      {/* 1. Hero Title Banner */}
      <AboutHeroBanner />

      {/* 2. Core Capabilities & Modular Surfaces */}
      <CoreCapabilitiesGrid />

      {/* 3. Codebase Architecture & Sub-Modules */}
      <ModularArchitectureCard />

      {/* 4. Technology Stack & System Specifications */}
      <SystemSpecsCard />

      {/* 5. Engineering Documentation Catalog */}
      <DocsCatalogCard />

      {/* 6. Security & Data Sovereignty Notice */}
      <SecurityNotice />
    </div>
  );
};
