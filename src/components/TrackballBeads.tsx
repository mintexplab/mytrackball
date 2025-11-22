import { useEffect, useState } from "react";

interface PhraseInstance {
  id: number;
  phrase: string;
  position: { x: number; y: number };
  visibleChars: number;
  scale: number;
}

export const TrackballBeads = () => {
  const [phrases, setPhrases] = useState<PhraseInstance[]>([]);
  
  const allPhrases = [
    "TRACKBALL DISTRIBUTION",
    "XZ1 RECORDING VENTURES",
    "THE FUTURE OF MUSIC IS TODAY",
    "MUSIC DISTRIBUTION ON EVERY AXIS",
    "JOIN THE MUSIC DISTRIBUTION REVOLUTION",
    "DISTRIBUTION AS SMOOTH AS A TRACKBALL"
  ];

  const getRandomPosition = () => {
    const positions = [
      { x: 5, y: 5 },      // Top left
      { x: 60, y: 5 },     // Top right
      { x: 5, y: 85 },     // Bottom left
      { x: 60, y: 85 },    // Bottom right
      { x: 5, y: 45 },     // Middle left
      { x: 65, y: 45 },    // Middle right
    ];
    return positions[Math.floor(Math.random() * positions.length)];
  };

  const createNewPhrase = (id: number) => {
    const phrase = allPhrases[Math.floor(Math.random() * allPhrases.length)];
    const position = getRandomPosition();
    const scale = 0.6 + Math.random() * 0.4; // Random scale between 0.6 and 1.0
    
    return {
      id,
      phrase,
      position,
      visibleChars: 0,
      scale
    };
  };

  useEffect(() => {
    // Initialize with 2 phrases
    setPhrases([createNewPhrase(0), createNewPhrase(1)]);
    let nextId = 2;

    // Add a new phrase every 8-12 seconds
    const addPhraseInterval = setInterval(() => {
      setPhrases(prev => {
        // Keep max 3 phrases at a time
        const newPhrases = prev.length >= 3 ? prev.slice(1) : prev;
        return [...newPhrases, createNewPhrase(nextId++)];
      });
    }, 8000 + Math.random() * 4000);

    return () => clearInterval(addPhraseInterval);
  }, []);

  useEffect(() => {
    // Animate character appearance for each phrase
    const interval = setInterval(() => {
      setPhrases(prev => prev.map(p => {
        if (p.visibleChars < p.phrase.length) {
          return { ...p, visibleChars: p.visibleChars + 1 };
        } else if (p.visibleChars === p.phrase.length) {
          // Hold for a moment, then start fading
          return { ...p, visibleChars: p.visibleChars + 1 };
        }
        return p;
      }).filter(p => p.visibleChars <= p.phrase.length + 50)); // Remove after fade
    }, 150);

    return () => clearInterval(interval);
  }, []);

  const getBeadsForChar = (char: string, charIndex: number, phrasePos: { x: number; y: number }, scale: number) => {
    const beadPatterns: { [key: string]: [number, number][] } = {
      'A': [[0, 3], [0, 2], [0, 1], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [1, 2]],
      'B': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 2], [1, 3], [2, 1]],
      'C': [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3]],
      'D': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 1], [2, 2], [1, 3]],
      'E': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 2], [1, 3], [2, 0], [2, 3]],
      'F': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 2], [2, 0]],
      'G': [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3], [2, 2], [1, 2]],
      'H': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3]],
      'I': [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [0, 3], [1, 3], [2, 3]],
      'J': [[2, 0], [2, 1], [2, 2], [1, 3], [0, 3], [0, 2]],
      'K': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 2], [2, 1], [2, 3]],
      'L': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]],
      'M': [[0, 3], [0, 2], [0, 1], [0, 0], [1, 1], [2, 0], [2, 1], [2, 2], [2, 3]],
      'N': [[0, 3], [0, 2], [0, 1], [0, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3]],
      'O': [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3], [2, 1], [2, 2]],
      'P': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [1, 2], [2, 1]],
      'Q': [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3], [2, 1], [2, 2], [2, 4]],
      'R': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [1, 2], [2, 1], [2, 3]],
      'S': [[1, 0], [2, 0], [0, 1], [1, 2], [2, 3], [1, 3], [0, 3]],
      'T': [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3]],
      'U': [[0, 0], [0, 1], [0, 2], [1, 3], [2, 3], [2, 0], [2, 1], [2, 2]],
      'V': [[0, 0], [0, 1], [0, 2], [1, 3], [2, 0], [2, 1], [2, 2]],
      'W': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3]],
      'X': [[0, 0], [0, 3], [1, 2], [2, 0], [2, 3], [1, 1]],
      'Y': [[0, 0], [0, 1], [1, 2], [2, 0], [2, 1], [1, 3]],
      'Z': [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [0, 3], [1, 3], [2, 3]],
      '1': [[1, 0], [1, 1], [1, 2], [1, 3], [0, 1]],
      ' ': [],
    };

    const pattern = beadPatterns[char] || [[1, 1]];
    const spacing = 5 * scale;
    const baseX = charIndex * (spacing * 3);

    return pattern.map(([x, y], beadIndex) => (
      <div
        key={`${charIndex}-${beadIndex}`}
        className="absolute rounded-full shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse"
        style={{
          left: `${baseX + x * spacing}px`,
          top: `${y * spacing}px`,
          width: `${spacing * 0.8}px`,
          height: `${spacing * 0.8}px`,
          backgroundColor: '#ef4444',
          animationDelay: `${beadIndex * 0.03}s`,
        }}
      />
    ));
  };

  return (
    <>
      {phrases.map((phraseInstance) => {
        const isFading = phraseInstance.visibleChars > phraseInstance.phrase.length;
        const opacity = isFading ? Math.max(0, 1 - (phraseInstance.visibleChars - phraseInstance.phrase.length) / 50) : 1;

        return (
          <div
            key={phraseInstance.id}
            className="absolute pointer-events-none transition-opacity duration-300"
            style={{
              left: `${phraseInstance.position.x}%`,
              top: `${phraseInstance.position.y}%`,
              opacity,
            }}
          >
            {phraseInstance.phrase.split("").map((char, index) => (
              <div
                key={index}
                className={`inline-block transition-opacity duration-200`}
                style={{
                  opacity: index < phraseInstance.visibleChars ? 1 : 0,
                }}
              >
                {getBeadsForChar(char, index, phraseInstance.position, phraseInstance.scale)}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
};
