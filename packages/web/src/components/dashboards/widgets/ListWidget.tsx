/**
 * List Widget Component
 *
 * Displays a list of items with optional actions
 */

'use client';

import { List, Empty, Tag } from 'antd';
import { RightOutlined } from '@ant-design/icons';

export interface ListItem {
  id: string;
  title: string;
  description?: string;
  meta?: string;
  tag?: { label: string; color?: string };
  onClick?: () => void;
}

export interface ListWidgetProps {
  items: ListItem[];
  maxItems?: number;
}

/**
 * List Widget
 *
 * @example
 * ```tsx
 * <ListWidget
 *   items={[
 *     {
 *       id: '1',
 *       title: 'Critical Violation in Finance',
 *       description: 'User has conflicting roles',
 *       meta: '2 hours ago',
 *       tag: { label: 'High Risk', color: 'red' },
 *       onClick: () => navigate('/violation/1')
 *     }
 *   ]}
 * />
 * ```
 */
export function ListWidget({ items, maxItems = 10 }: ListWidgetProps) {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <Empty
        description="No items"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="my-8"
      />
    );
  }

  return (
    <List
      dataSource={displayItems}
      renderItem={(item) => (
        <List.Item
          className={item.onClick ? 'cursor-pointer hover:bg-gray-50' : ''}
          onClick={item.onClick}
          extra={item.onClick && <RightOutlined className="text-gray-400" />}
        >
          <List.Item.Meta
            title={
              <div className="flex items-center gap-2">
                <span>{item.title}</span>
                {item.tag && (
                  <Tag color={item.tag.color}>{item.tag.label}</Tag>
                )}
              </div>
            }
            description={item.description}
          />
          {item.meta && (
            <div className="text-xs text-gray-500">{item.meta}</div>
          )}
        </List.Item>
      )}
    />
  );
}
