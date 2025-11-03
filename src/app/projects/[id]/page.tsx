import { ProjectDetail } from '@/components/features/projects/project-detail';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = await params;
  return <ProjectDetail projectId={resolvedParams.id} />;
}
