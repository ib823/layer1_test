/**
 * Type definitions for html-to-docx
 */

declare module 'html-to-docx' {
  export interface HTMLToDocxOptions {
    title?: string;
    creator?: string;
    description?: string;
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }

  export function convert(
    html: string,
    header: any,
    options?: HTMLToDocxOptions
  ): Promise<Uint8Array>;
}
