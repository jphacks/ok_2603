import { missing, type Election, type Source } from "./model";

export type PastCandidate = {
  name: string;
  age: number | null;
  party: string;
  standing: string | null;
  occupation: string | null;
  votes: number | null;
  elected: boolean;
};
export type PastElection = {
  id: string;
  name: string;
  kind: NonNullable<Election["kind"]>;
  municipality?: string;
  date: string;
  sources: Source[];
  candidates: PastCandidate[];
};

const modules = import.meta.glob("../../shared/past-elections/*.json", {
  eager: true,
  import: "default",
}) as Record<string, PastElection[]>;

export const pastElections: PastElection[] = Object.values(modules)
  .flat()
  .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

export function pastElectionToElection(past: PastElection): Election {
  return {
    id: past.id,
    name: past.name,
    kind: past.kind,
    prefectureIds: ["沖縄県"],
    ...(past.municipality ? { municipality: past.municipality } : {}),
    level: "local",
    period: "past",
    date: past.date,
    sources: past.sources,
    turnout: missing(),
  };
}

export function pastResultFor(election: Pick<Election, "id" | "name" | "date"> | undefined) {
  if (!election) return undefined;
  return pastElections.find(
    (past) =>
      past.id === election.id ||
      (past.name === election.name && past.date === election.date),
  );
}
