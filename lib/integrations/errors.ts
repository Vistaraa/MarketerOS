/** Provider errors are shown to users, so they carry the platform's own explanation but never tokens. */
export class ProviderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
