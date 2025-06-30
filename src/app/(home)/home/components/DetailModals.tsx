import React from 'react';
import TaskDetails from "@/components/operations-and-services/task/shared/TaskDetails";
import NoticeDetails from "@/components/operations-and-services/notice/NoticeDetails";

interface DetailModalsProps {
  selectedNoticeId: number | null;
  selectedTaskId: number | null;
  onCloseNotice: () => void;
  onCloseTask: () => void;
  onTaskStatusUpdate: () => void;
}

export default function DetailModals({
  selectedNoticeId,
  selectedTaskId,
  onTaskStatusUpdate,
  onCloseNotice,
  onCloseTask,
}: DetailModalsProps) {
  return (
    <>
      {selectedNoticeId !== null && (
        <NoticeDetails
          id={selectedNoticeId}
          onClose={onCloseNotice}
        />
      )}
      {selectedTaskId !== null && (
        <TaskDetails
          id={selectedTaskId}
          onTaskStatusUpdate={onTaskStatusUpdate}
          onClose={onCloseTask}
        />
      )}
    </>
  );
}
