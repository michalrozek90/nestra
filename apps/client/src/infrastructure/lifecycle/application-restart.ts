export type ApplicationRestartPreparation = () => Promise<boolean>;

const restartPreparations = new Set<ApplicationRestartPreparation>();

export function registerApplicationRestartPreparation(
  preparation: ApplicationRestartPreparation,
): () => void {
  restartPreparations.add(preparation);

  return () => {
    restartPreparations.delete(preparation);
  };
}

export async function prepareForApplicationRestart(): Promise<boolean> {
  for (const preparation of restartPreparations) {
    if (!(await preparation())) {
      return false;
    }
  }

  return true;
}
