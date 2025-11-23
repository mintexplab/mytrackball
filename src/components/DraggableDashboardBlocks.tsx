interface BlockCategory {
  title: string;
  blocks: {
    id: string;
    component: React.ReactNode;
    visible: boolean;
  }[];
}

interface DraggableDashboardBlocksProps {
  categories: BlockCategory[];
}

export const DraggableDashboardBlocks = ({ categories }: DraggableDashboardBlocksProps) => {
  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const visibleBlocks = category.blocks.filter(block => block.visible);
        
        if (visibleBlocks.length === 0) return null;

        return (
          <div key={category.title} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground px-1">
              {category.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleBlocks.map((block) => (
                <div key={block.id} className="w-full">
                  {block.component}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
