// Type overrides for @dnd-kit to work with React 19
// This addresses React 19 compatibility issues with @dnd-kit
declare module '@dnd-kit/core' {
  import { FC, ReactNode } from 'react';

  export interface DndContextProps {
    children?: ReactNode;
    sensors?: any[];
    collisionDetection?: any;
    onDragEnd?: (event: any) => void;
    onDragStart?: (event: any) => void;
    onDragMove?: (event: any) => void;
    onDragOver?: (event: any) => void;
    onDragCancel?: () => void;
    autoScroll?: boolean | object;
    modifiers?: any[];
    measuring?: object;
  }

  export const DndContext: FC<DndContextProps>;
  export * from '@dnd-kit/core/dist/index';
}

declare module '@dnd-kit/sortable' {
  import { FC, ReactNode } from 'react';

  export interface SortableContextProps {
    children?: ReactNode;
    items: string[];
    strategy?: any;
  }

  export const SortableContext: FC<SortableContextProps>;
  export * from '@dnd-kit/sortable/dist/index';
}
