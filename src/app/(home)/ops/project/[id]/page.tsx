"use client";

import { use } from "react"; // ✅ Import React.use() to unwrap params
import ProjectLayout from "../ProjectLayout";
import ProjectDetails from "@/components/ops/project/ProjectDetails";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // ✅ unwrap params safely
  const projectDetailsId = String(id);

  const { employees } = useEmployees();
  const { departments } = useDepartments();

  return (
    <ProjectLayout
      overrideContent={
        <ProjectDetails
          id={projectDetailsId}
          employees={employees}
          departments={departments}
          onClose={() => history.back()}
          setActiveTab={() => { }}
        />
      }
    />
  );
}
