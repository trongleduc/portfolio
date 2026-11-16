import { Hero } from "@/features/portfolio/components/Hero";
import { Projects } from "@/features/portfolio/components/Projects";
import { Journey } from "@/features/portfolio/components/Journey";
import { Stack } from "@/features/portfolio/components/Stack";
import { Contact } from "@/features/portfolio/components/Contact";
import { getPortfolioData } from "@/lib/queries";

// Always render with fresh data so CMS edits show up on reload.
export const revalidate = 0;

export default async function Home() {
  const { profile, projects, works, educations, techStack } = await getPortfolioData();
  const { languages, frontend, backend, workflowAi, codingTools } = techStack;

  return (
    <div className="pb-16">
      <Hero initialProfile={profile} works={works} educations={educations} />
      <Journey initialWorks={works} initialEducations={educations} />
      <Projects initialProjects={projects} />
      <Stack
        initialLanguages={languages}
        initialFrontend={frontend}
        initialBackend={backend}
        initialWorkflowAi={workflowAi}
        initialCodingTools={codingTools}
      />
      <Contact initialProfile={profile} />
    </div>
  );
}
