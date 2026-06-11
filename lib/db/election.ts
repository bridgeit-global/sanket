import 'server-only';

export async function getCurrentElectionId(): Promise<string> {
  return process.env.CURRENT_ELECTION_ID || '172LS2024';
}
