export class ApiError extends Error {
  public status: number;
  public errorCode: string;
  public details: unknown | null;
  public correlationId: string | null;

  constructor({
    status,
    errorCode,
    message,
    details = null,
    correlationId = null,
  }: {
    status: number;
    errorCode: string;
    message: string;
    details?: unknown | null;
    correlationId?: string | null;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
    this.correlationId = correlationId;
  }
}
