import { useEffect, useState } from "react";

interface Bead {
  id: number;
  x: number;
  y: number;
  delay: number;
}

export const SparkleBeads = () => {
  const [beads, setBeads] = useState<Bead[]>([]);

  useEffect(() => {
    // Create 12 beads positioned around the screen edges (avoiding center)
    const newBeads: Bead[] = [];
    const positions = [
      // Top area
      { x: 20, y: 10 }, { x: 35, y: 8 }, { x: 65, y: 12 }, { x: 80, y: 9 },
      // Bottom area
      { x: 18, y: 88 }, { x: 38, y: 90 }, { x: 62, y: 89 }, { x: 82, y: 91 },
      // Left side
      { x: 8, y: 25 }, { x: 12, y: 50 }, { x: 10, y: 75 },
      // Right side
      { x: 88, y: 30 }, { x: 90, y: 55 }, { x: 92, y: 70 }
    ];

    positions.forEach((pos, index) => {
      newBeads.push({
        id: index,
        x: pos.x,
        y: pos.y,
        delay: Math.random() * 3
      });
    });

    setBeads(newBeads);
  }, []);

  return (
    <>
      {beads.map((bead) => (
        <div
          key={bead.id}
          className="absolute w-2 h-2 bg-red-500 rounded-full pointer-events-none"
          style={{
            left: `${bead.x}%`,
            top: `${bead.y}%`,
            animation: `beadFloat ${5 + Math.random() * 3}s ease-in-out infinite, beadPulse 2s ease-in-out infinite`,
            animationDelay: `${bead.delay}s`,
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.9), 0 0 6px rgba(239, 68, 68, 0.6)',
          }}
        />
      ))}
    </>
  );
};
