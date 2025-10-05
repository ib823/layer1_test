export declare class FrameworkError extends Error {
    type: string;
    statusCode: number;
    retryable: boolean;
    sapError?: any | undefined;
    constructor(message: string, type: string, statusCode: number, retryable?: boolean, sapError?: any | undefined);
}
export declare class AuthenticationError extends FrameworkError {
    constructor(message: string, cause?: any);
}
export declare class AuthorizationError extends FrameworkError {
    constructor(message: string, cause?: any);
}
export declare class NotFoundError extends FrameworkError {
    constructor(message: string, cause?: any);
}
export declare class ValidationError extends FrameworkError {
    constructor(message: string, cause?: any);
}
//# sourceMappingURL=FrameworkError.d.ts.map