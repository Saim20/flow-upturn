import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, StatusBadge, InfoRow } from "@/components/ui/Card";
import { ArrowSquareOut, TrashSimple, PencilSimple, Clock, Calendar, Building, User, Target } from "@phosphor-icons/react";
import { Project } from "@/hooks/useProjects";
import Link from "next/link";
import { Employee } from "@/lib/types/schemas";

interface Department {
  id: number | string;
  name: string;
}

interface ProjectCardProps {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
  onDetails?: () => void;
  employees: Employee[];
  departments: Department[];
  isDeleting?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showDetails?: boolean;
  progressColor?: string;
  statusIcon?: React.ReactNode;
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onDetails,
  employees,
  departments,
  isDeleting = false,
  showEdit = false,
  showDelete = false,
  showDetails = false,
  progressColor = "bg-blue-100 text-blue-800",
  statusIcon = null,
}: ProjectCardProps) {
  const {
    id,
    project_title,
    project_lead_id,
    department_ids,
    end_date,
    progress,
    description,
  } = project;

  const getProgressVariant = (progress: string | number) => {
    if (typeof progress === 'number') {
      if (progress >= 80) return 'success';
      if (progress >= 50) return 'info';
      if (progress >= 25) return 'warning';
      return 'error';
    }
    return 'info';
  };

  const actions = (
    <div className="flex items-center gap-2">
      {showEdit && (
        <Button
        data-testid="edit-project-button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label="Edit project"
          className="p-2 h-8 w-8 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600"
        >
          <PencilSimple size={14} />
        </Button>
      )}

      {showDelete && (
        <Button
        data-testid="delete-project-button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          isLoading={isDeleting}
          aria-label="Delete project"
          className="p-2 h-8 w-8 hover:bg-error/10 dark:hover:bg-error/20 hover:text-error"
        >
          <TrashSimple size={14} />
        </Button>
      )}
      {showDetails && (
        <Link href={`/ops/project/${id}`}>
          <Button
            data-testid="view-project-button"
            variant="ghost"
            size="sm"
            aria-label="View project details"
            className="p-2 h-8 w-8 hover:bg-surface-hover hover:text-foreground-primary"
          >
            <ArrowSquareOut size={14} />
          </Button>

        </Link>
      )}
    </div>
  );

  return (
    <Card data-testid="project-card">
      <CardHeader
        title={project_title}
        icon={statusIcon}
        action={actions}
      />

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoRow
            icon={<Building size={16} />}
            label="Departments"
            value={
              project.department_ids && project.department_ids.length > 0
                ? project.department_ids
                  .map((id) => departments.find((d) => d.id === id)?.name || "N/A")
                  .join(", ")
                : "N/A"
            }
          />

          <InfoRow
            icon={<User size={16} />}
            label="Lead"
            value={employees.find((e) => e.id === project_lead_id)?.name || "N/A"}
          />
          <InfoRow
            icon={<Target size={16} />}
            label="Progress"
            value={
              <StatusBadge
                status={typeof progress === "number" ? `${progress}%` : "0%"}
                variant={getProgressVariant(progress || 0)}
              />
            }
          />
          <InfoRow
            icon={<Calendar size={16} />}
            label="Deadline"
            value={end_date || "Not set"}
          />
        </div>

        {description && (
          <div className="mt-4 p-3 bg-background-secondary dark:bg-background-tertiary rounded-md">
            <p className="text-sm text-foreground-secondary line-clamp-3">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 