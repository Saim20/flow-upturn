"use client";

import { motion } from "framer-motion";
import { ReactNode, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

export type TabItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  content: ReactNode;
  link?: string; // Add link for isLinked mode
  /** Optional: Lazy load content - only render when tab is first activated */
  lazy?: boolean;
};

export type TabViewProps = {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (key: string) => void;
  contentVariants?: any;
  isLinked?: boolean;
  /** Prefix for data-tutorial attributes, e.g. "task" generates "task-ongoing-tab" */
  tutorialPrefix?: string;
  /** Enable lazy loading for all tabs (only render content when tab is activated) */
  lazyLoad?: boolean;
  /** Keep previously loaded tabs mounted (preserves state) */
  keepMounted?: boolean;
};

export const TabView = ({
  tabs,
  activeTab,
  setActiveTab,
  contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
      },
    },
  },
  isLinked = false,
  tutorialPrefix,
  lazyLoad = false,
  keepMounted = true,
}: TabViewProps) => {
  // Track which tabs have been visited (for lazy loading)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set([activeTab]));

  // Mark tab as visited when activated
  useEffect(() => {
    if (!visitedTabs.has(activeTab)) {
      setVisitedTabs(prev => new Set(prev).add(activeTab));
    }
  }, [activeTab, visitedTabs]);

  // Memoize tab button click handler
  const handleTabClick = useCallback((key: string) => {
    setActiveTab(key);
  }, [setActiveTab]);

  // Determine which tabs should render their content
  const shouldRenderContent = useCallback((tabKey: string, tabLazy?: boolean) => {
    const isLazy = tabLazy ?? lazyLoad;
    
    if (!isLazy) {
      // Not lazy - render if active
      return tabKey === activeTab;
    }
    
    // Lazy loading enabled
    if (!visitedTabs.has(tabKey)) {
      // Never visited - don't render
      return false;
    }
    
    if (keepMounted) {
      // Keep mounted - render all visited tabs (hide inactive with CSS)
      return true;
    }
    
    // Don't keep mounted - only render active tab
    return tabKey === activeTab;
  }, [activeTab, lazyLoad, keepMounted, visitedTabs]);

  // Memoize the active tab content
  const activeTabContent = useMemo(() => {
    return tabs.find((tab) => tab.key === activeTab);
  }, [tabs, activeTab]);
  return (
    <>
      {/* Desktop/Laptop Tab Layout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="hidden sm:flex flex-wrap justify-start gap-2 bg-surface-primary rounded-xl shadow-sm mb-8 p-1.5 border border-border-primary sticky top-0 z-10 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const tabButton = (
            <motion.button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-tutorial={tutorialPrefix ? `${tutorialPrefix}-${tab.key}-tab` : undefined}
              className={`relative px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 flex items-center gap-2
                ${activeTab === tab.key
                  ? `bg-primary-50 dark:bg-primary-900/30 ${tab.color} shadow-sm`
                  : "text-foreground-secondary hover:text-primary-600 dark:hover:text-primary-400 hover:bg-background-secondary dark:hover:bg-background-tertiary"
                }
              `}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              <span
                className={`${activeTab === tab.key ? tab.color : "text-foreground-tertiary"}`}
              >
                {tab.icon}
              </span>
              {tab.label}
              {activeTab === tab.key && (
                <motion.span
                  layoutId="active-tab-indicator"
                  className="absolute left-2 right-2 -bottom-1 h-0.5 rounded-full bg-primary-500"
                />
              )}
            </motion.button>
          );

          return isLinked && tab.link ? (
            <Link key={tab.key} href={tab.link}>
              {tabButton}
            </Link>
          ) : (
            tabButton
          );
        })}
      </motion.div>

      {/* Mobile/Tablet Dropdown Layout */}
      <div className="sm:hidden mb-6">
        <select
          value={activeTab}
          onChange={(e) => handleTabClick(e.target.value)}
          className="w-full p-3 border border-border-primary rounded-lg text-foreground-primary bg-surface-primary shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Content - with lazy loading support */}
      {lazyLoad || tabs.some(t => t.lazy) ? (
        // Lazy loading mode: render visited tabs, hide inactive ones
        <div className="bg-surface-primary rounded-xl shadow-sm p-3 sm:p-6">
          {tabs.map((tab) => {
            if (!shouldRenderContent(tab.key, tab.lazy)) {
              return null;
            }
            
            const isActive = tab.key === activeTab;
            
            return (
              <div
                key={tab.key}
                style={{ display: isActive ? 'block' : 'none' }}
                aria-hidden={!isActive}
              >
                {tab.content}
              </div>
            );
          })}
        </div>
      ) : (
        // Standard mode: only render active tab
        activeTabContent?.content && (
          <div className="bg-surface-primary rounded-xl shadow-sm p-3 sm:p-6">
            {activeTabContent.content}
          </div>
        )
      )}
    </>
  );
};

export default TabView;
