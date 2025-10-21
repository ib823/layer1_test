'use client';

import { App } from 'antd';

/**
 * Safe wrapper for Ant Design's message API
 * Must be used inside components wrapped by <App> from antd
 */
export function useMessage() {
  const { message } = App.useApp();
  return message;
}
