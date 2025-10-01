export interface SFEmployee {
  userId: string;
  firstName: string;
  lastName: string;
}

export interface SFODataResponse<T> {
  d: { results: T[] };
}