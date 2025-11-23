import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface DraggableBlockProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
}

const DraggableBlock = ({ id, children, isEditMode }: DraggableBlockProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isEditMode && "cursor-move"
      )}
    >
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-2 top-4 z-10 cursor-grab active:cursor-grabbing bg-primary/20 rounded p-1 hover:bg-primary/30 transition-colors"
        >
          <GripVertical className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className={cn(isEditMode && "ml-6")}>
        {children}
      </div>
    </div>
  );
};

interface DraggableDashboardBlocksProps {
  blocks: {
    id: string;
    component: React.ReactNode;
    visible: boolean;
  }[];
  onLayoutChange?: (newOrder: string[]) => void;
  useGrid?: boolean;
}

export const DraggableDashboardBlocks = ({ blocks, onLayoutChange, useGrid = false }: DraggableDashboardBlocksProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [items, setItems] = useState(() => {
    // Try to load saved order from localStorage
    const saved = localStorage.getItem("dashboard-block-order");
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved);
        // Reorder blocks based on saved order
        const ordered = savedOrder
          .map((id: string) => blocks.find(b => b.id === id))
          .filter(Boolean);
        // Add any new blocks that weren't in saved order
        const newBlocks = blocks.filter(b => !savedOrder.includes(b.id));
        return [...ordered, ...newBlocks];
      } catch (e) {
        return blocks;
      }
    }
    return blocks;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save to localStorage
        const orderIds = newOrder.map(item => item.id);
        localStorage.setItem("dashboard-block-order", JSON.stringify(orderIds));
        
        // Notify parent
        onLayoutChange?.(orderIds);
        
        return newOrder;
      });
    }
  };

  // Update items when blocks change (e.g., visibility)
  useEffect(() => {
    const currentOrder = items.map(i => i.id);
    const updatedBlocks = currentOrder
      .map(id => blocks.find(b => b.id === id))
      .filter(Boolean) as typeof blocks;
    
    // Add new blocks
    const newBlocks = blocks.filter(b => !currentOrder.includes(b.id));
    setItems([...updatedBlocks, ...newBlocks]);
  }, [blocks]);

  const visibleItems = items.filter(item => item.visible);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className={cn(
            "gap-2",
            isEditMode && "bg-gradient-primary"
          )}
        >
          <GripVertical className="w-4 h-4" />
          {isEditMode ? "Done Editing" : "Rearrange Blocks"}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleItems.map(item => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className={cn(
            useGrid ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"
          )}>
            {visibleItems.map((item) => (
              <DraggableBlock key={item.id} id={item.id} isEditMode={isEditMode}>
                {item.component}
              </DraggableBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
