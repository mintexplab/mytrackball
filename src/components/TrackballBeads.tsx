import { useEffect, useState } from "react";

export const TrackballBeads = () => {
  const [visibleLetters, setVisibleLetters] = useState(0);
  const letters = "TRACKBALL";

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLetters((prev) => {
        if (prev < letters.length) {
          return prev + 1;
        }
        return 0; // Reset to start animation over
      });
    }, 800);

    return () => clearInterval(interval);
  }, [letters.length]);

  const getBeadsForLetter = (letter: string, index: number) => {
    const beadPatterns: { [key: string]: [number, number][] } = {
      T: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3]],
      R: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [1, 1], [2, 1], [1, 2], [2, 3]],
      A: [[0, 3], [0, 2], [0, 1], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [1, 2]],
      C: [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3]],
      K: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 2], [2, 1], [2, 3]],
      B: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 2], [1, 3], [2, 1]],
      L: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]],
    };

    const pattern = beadPatterns[letter] || [[0, 0]];
    const baseX = index * 45;
    const baseY = 0;

    return pattern.map(([x, y], beadIndex) => (
      <div
        key={`${index}-${beadIndex}`}
        className="absolute w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"
        style={{
          left: `${baseX + x * 8}px`,
          top: `${baseY + y * 8}px`,
          animationDelay: `${beadIndex * 0.05}s`,
        }}
      />
    ));
  };

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {letters.split("").map((letter, index) => (
        <div key={index} className={`inline-block transition-opacity duration-300 ${index < visibleLetters ? "opacity-100" : "opacity-0"}`}>
          {getBeadsForLetter(letter, index)}
        </div>
      ))}
    </div>
  );
};
