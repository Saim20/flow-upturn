'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, ArrowsClockwise, WarningCircle, Plus } from "@phosphor-icons/react";
import { staggerContainer, fadeInUp } from '@/components/ui/animations';
import SectionHeader from './SectionHeader';
import EmptyState from './EmptyState';
import LoadingSection from './LoadingSection';

interface Notice {
  id?: number;
  title: string;
  urgency?: "low" | "normal" | "high" | "urgent";
  valid_from?: string;
  valid_till?: string;
}

interface NewsReminderSectionProps {
  notices: Notice[];
  loading: boolean;
  onNoticeClick: (noticeId: number) => void;
  onRefresh: () => void;
  canCreate?: boolean;
  onCreateClick?: () => void;
}

type TabType = 'all' | 'unread' | 'urgent';

export default function NoticesSection({
  notices,
  loading,
  onNoticeClick,
  onRefresh,
  canCreate = false,
  onCreateClick,
}: NewsReminderSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [readNotices, setReadNotices] = useState<Set<number>>(new Set());

  // Load read notices from localStorage on component mount
  useEffect(() => {
    const savedReadNotices = localStorage.getItem('readNotices');
    if (savedReadNotices) {
      try {
        const parsedReadNotices = JSON.parse(savedReadNotices);
        setReadNotices(new Set(parsedReadNotices));
      } catch (error) {
        console.error('Error parsing read notices from localStorage:', error);
      }
    }
  }, []);

  // Mark notice as read when clicked
  const handleNoticeClick = (noticeId: number) => {
    setReadNotices(prev => new Set(prev).add(noticeId));
    const readNoticesSet = new Set(readNotices);
    readNoticesSet.add(noticeId);
    // Save updated read notices to localStorage
    localStorage.setItem('readNotices', JSON.stringify(Array.from(readNoticesSet)));
    onNoticeClick(noticeId);
  };

  // FunnelSimple notices based on active tab
  const filteredNotices = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notices.filter(notice => notice.id && !readNotices.has(notice.id));
      case 'urgent':
        return notices.filter(notice => notice.urgency === 'high' || notice.urgency === 'urgent');
      case 'all':
      default:
        return notices;
    }
  }, [notices, activeTab, readNotices]);



  const getTabCount = (tab: TabType): number => {
    switch (tab) {
      case 'unread':
        return notices.filter(notice => notice.id && !readNotices.has(notice.id)).length;
      case 'urgent':
        return notices.filter(notice => notice.urgency === 'high' || notice.urgency === 'urgent').length;
      case 'all':
      default:
        return notices.length;
    }
  };

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => {
    const count = getTabCount(tab);
    const isActive = activeTab === tab;
    
    return (
      <button 
        onClick={() => setActiveTab(tab)}
        className={`relative px-3 py-1 transition-colors ${
          isActive 
            ? 'text-primary-600' 
            : 'text-foreground-secondary hover:text-foreground-primary'
        }`}
      >
        {label}
        {count > 0 && (
          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
            isActive 
              ? 'bg-primary-100 text-primary-600' 
              : 'bg-background-tertiary text-foreground-secondary'
          }`}>
            {count}
          </span>
        )}
        {isActive && (
          <motion.span 
            layoutId="news-tab-indicator"
            className="absolute left-0 right-0 -bottom-1 h-0.5 bg-primary-600 rounded-full" 
          />
        )}
      </button>
    );
  };
  return (
    <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary h-full flex flex-col overflow-hidden">
      <div className="p-5 shrink-0">
        <SectionHeader title="News & Reminder" icon={Bell} />
      </div>
      <div className="px-5 pb-5 flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium mb-4 shrink-0">
          <TabButton tab="all" label="All" />
          <TabButton tab="unread" label="Unread" />
          <TabButton tab="urgent" label="Urgent" />
          
          <div className="ml-auto flex items-center gap-2">
            <motion.button 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              onClick={onRefresh}
              className="rounded-full p-2 bg-surface-secondary hover:bg-surface-hover transition-colors"
            >
              <ArrowsClockwise size={16} className="text-foreground-secondary" />
            </motion.button>
            {canCreate && onCreateClick && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCreateClick}
                className="rounded-full p-2 bg-primary-600 hover:bg-primary-700 transition-colors"
                title="Create new notice"
              >
                <Plus size={16} className="text-white" />
              </motion.button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <LoadingSection text="Loading notices..." icon={Bell} />
          </div>
        ) : (
          <ul 
            className="space-y-3 mt-6 flex-1 overflow-y-auto min-h-0"
          >
            {filteredNotices.length > 0 ? (
              filteredNotices.map((item) => {
                const isRead = item.id ? readNotices.has(item.id) : false;
                return (
                    <motion.li 
                    key={item.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    onClick={() => item.id && handleNoticeClick(item.id)}
                    className={`flex justify-between items-center p-3 rounded-lg hover:bg-surface-hover transition-colors border-b border-border-primary last:border-b-0 cursor-pointer ${
                      isRead ? 'opacity-70' : ''
                    }`}
                    >
                    <div className="flex items-center gap-3">
                      {!isRead && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />
                      )}
                      <span className={`font-medium ${
                      isRead ? 'text-foreground-secondary' : 'text-foreground-primary'
                      }`}>
                      {item.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(item.urgency === "high" || item.urgency === "urgent") && (
                      <div className="bg-error/10 text-error text-xs px-2 py-1 rounded-full flex items-center">
                        <WarningCircle size={12} className="mr-1" />
                        {item.urgency === "urgent" ? "Urgent" : "High"}
                      </div>
                      )}
                      {item.urgency === "normal" && (
                      <div className="bg-warning/10 text-warning text-xs px-2 py-1 rounded-full flex items-center">
                        <WarningCircle size={12} className="mr-1" />
                        Normal
                      </div>
                      )}
                      {item.urgency === "low" && (
                      <div className="bg-success/10 text-success text-xs px-2 py-1 rounded-full flex items-center">
                        <WarningCircle size={12} className="mr-1" />
                        Low
                      </div>
                      )}
                    </div>
                    </motion.li>
                );
              })
            ) : (
              <EmptyState 
                icon={Bell} 
                message={
                  activeTab === 'unread' 
                    ? "All notices have been read" 
                    : activeTab === 'urgent'
                    ? "No urgent notices at this time"
                    : "No notices available at this time"
                } 
              />
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
