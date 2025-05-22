import React, { useState, useEffect } from 'react';

interface TarotDeckProps {
  boxImage: string;
  cardImages?: string[];
  deckName?: string;
  cardWidth?: number;
  cardHeight?: number;
  cardCount?: number | null;
}

interface PixelColor {
  r: number;
  g: number;
  b: number;
}

interface CardPosition {
  x: number;
  y: number;
  index: number;
}

const TarotDeck: React.FC<TarotDeckProps> = ({ 
  boxImage, 
  cardImages = [], 
  deckName = "Tarot Deck",
  cardWidth = 150,
  cardHeight = 249,
  cardCount = null
}) => {
  const [colors, setColors] = useState({
    borderColor: "#c1a438",
    boxGradientStart: "rgb(25, 25, 25)",
    boxGradientEnd: "rgb(85, 82, 73)"
  });

  // Extract dominant colors from box image
  useEffect(() => {
    if (!boxImage) return;

    const extractColors = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return; // Skip if context is null
        
        const img = new Image();
        
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Sample colors from different areas of the image
          const colorSamples: PixelColor[] = [];
          const sampleSize = 4; // Sample every 4th pixel
          
          for (let i = 0; i < data.length; i += sampleSize * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a > 128) { // Only consider non-transparent pixels
              colorSamples.push({ r, g, b });
            }
          }
          
          if (colorSamples.length === 0) return;
          
          // Find dominant colors using simple clustering
          const dominantColors = findDominantColors(colorSamples, 3);
          
          // Sort by brightness to get light and dark variants
          const sortedColors = dominantColors.sort((a, b) => 
            (a.r + a.g + a.b) - (b.r + b.g + b.b)
          );
          
          const darkest = sortedColors[0];
          const lightest = sortedColors[sortedColors.length - 1];
          const middle = sortedColors[Math.floor(sortedColors.length / 2)];
          
          setColors({
            borderColor: `rgb(${lightest.r}, ${lightest.g}, ${lightest.b})`,
            boxGradientStart: `rgb(${darkest.r}, ${darkest.g}, ${darkest.b})`,
            boxGradientEnd: `rgb(${middle.r}, ${middle.g}, ${middle.b})`
          });
        };
        
        img.src = boxImage;
      } catch (error) {
        console.log('Could not extract colors from image, using defaults');
      }
    };

    extractColors();
  }, [boxImage]);

  // Simple k-means clustering for color extraction
  const findDominantColors = (pixels: PixelColor[], k: number): PixelColor[] => {
    if (pixels.length === 0) return [];
    
    // Initialize centroids randomly
    const centroids: PixelColor[] = [];
    for (let i = 0; i < k; i++) {
      const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
      centroids.push({ ...randomPixel });
    }
    
    // Run k-means for a few iterations
    for (let iter = 0; iter < 5; iter++) {
      const clusters: PixelColor[][] = Array(k).fill(null).map(() => []);
      
      // Assign pixels to nearest centroid
      pixels.forEach(pixel => {
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        centroids.forEach((centroid, index) => {
          const distance = Math.sqrt(
            Math.pow(pixel.r - centroid.r, 2) +
            Math.pow(pixel.g - centroid.g, 2) +
            Math.pow(pixel.b - centroid.b, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = index;
          }
        });
        
        clusters[closestCentroid].push(pixel);
      });
      
      // Update centroids
      clusters.forEach((cluster, index) => {
        if (cluster.length > 0) {
          const avgR = cluster.reduce((sum, p) => sum + p.r, 0) / cluster.length;
          const avgG = cluster.reduce((sum, p) => sum + p.g, 0) / cluster.length;
          const avgB = cluster.reduce((sum, p) => sum + p.b, 0) / cluster.length;
          
          centroids[index] = { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) };
        }
      });
    }
    
    return centroids;
  };

  // Auto-detect card count from images or use provided count
  const actualCardCount = cardCount !== null ? cardCount : cardImages.length || 78;

  // Generate card positions with slight offset for stacking effect
  const generateCardPositions = (count: number): CardPosition[] => {
    const visibleCards = Math.min(count, 15); // Limit visible cards for performance
    return Array.from({ length: visibleCards }, (_, i) => ({
      x: (i * 50) / (visibleCards - 1), // Spread cards across 50px range
      y: (i * 50) / (visibleCards - 1), // Spread cards across 50px range
      index: i + 1
    }));
  };

  const cardPositions = generateCardPositions(actualCardCount);

  const styles = {
    deckContainer: {
      transform: 'scale(0.7)',
      position: 'relative',
      width: '100%',
      height: '100%'
    },
    cards: {
      position: 'relative',
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      marginLeft: '-50px'
    },
    boxContainer: {
      position: 'relative'
    },
    mainBox: {
      width: `${cardWidth + 8}px`,
      height: `${cardHeight + 8}px`,
      background: `url('${boxImage}') 100% 100% / cover no-repeat`,
      borderWidth: '0.5px',
      borderStyle: 'solid',
      borderColor: 'black',
      borderRadius: '0px 2px 2px',
      zIndex: 10,
      marginTop: '54px',
      marginLeft: '54px',
      position: 'absolute'
    },
    leftSide: {
      width: '50px',
      height: `${cardHeight + 8}px`,
      borderWidth: '0.5px',
      borderStyle: 'solid',
      borderColor: 'rgba(0, 0, 0, 0.44)',
      borderRadius: '2px 0px 2px 2px',
      background: `linear-gradient(0deg, ${colors.boxGradientStart} 0%, ${colors.boxGradientEnd} 100%)`,
      transform: 'skewY(45deg)',
      transformOrigin: 'right top',
      marginTop: '54px',
      marginLeft: '4.5px',
      position: 'absolute'
    },
    rightSide: {
      width: '50px',
      height: `${cardHeight + 8}px`,
      backgroundColor: 'rgb(0, 0, 0)',
      transform: 'skewY(45deg)',
      borderRadius: '2px',
      borderTop: '0.5px solid black',
      transformOrigin: 'right top',
      marginLeft: `${cardWidth + 12}px`,
      zIndex: -2,
      position: 'absolute',
      marginTop: '54px'
    },
    bottomShadow: {
      width: `${cardWidth + 8}px`,
      height: `${cardHeight + 8}px`,
      borderTop: '0.5px solid black',
      backgroundColor: 'rgb(0, 0, 0)',
      marginTop: '4px',
      marginLeft: '4px',
      borderRadius: '2px',
      zIndex: -3,
      position: 'absolute'
    },
    cardHoverContainer: {
      position: 'absolute',
      transition: 'transform 0.5s ease',
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      transformOrigin: `${cardWidth / 2}px center`,
      zIndex: -1,
      marginLeft: '4px'
    },
    cardFront: {
      position: 'absolute',
      borderRadius: '13px',
      width: '100%',
      height: '100%',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
      border: `0.5px solid ${colors.borderColor}`,
      top: '-4px',
      left: '4px'
    },
    deckShadow: {
      width: '100px',
      height: '50px',
      marginLeft: '25px',
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 70%)',
      position: 'absolute',
      bottom: '-20px',
      left: '75px'
    }
  } as const;

  return (
    <div 
      className="deck-animation-container hover:animate-none w-full h-full"
      style={styles.deckContainer}
      onMouseEnter={(e) => {
        const cards = e.currentTarget.querySelectorAll('.card-hover-container');
        cards.forEach((card, index) => {
          (card as HTMLElement).style.animation = `pullCard 3s forwards`;
          (card as HTMLElement).style.animationDelay = `${index * 1.5}s`;
        });
      }}
      onMouseLeave={(e) => {
        const cards = e.currentTarget.querySelectorAll('.card-hover-container');
        cards.forEach((card) => {
          (card as HTMLElement).style.animation = 'none';
          (card as HTMLElement).style.transform = `translateX(${(card as HTMLElement).style.getPropertyValue('--x')}) translateY(${(card as HTMLElement).style.getPropertyValue('--y')}) translateZ(1px)`;
        });
      }}
    >
      <div style={styles.cards}>
        <div style={styles.boxContainer}>
          <div style={styles.mainBox}></div>
          <div style={styles.leftSide}></div>
          <div style={styles.rightSide}></div>
          <div style={styles.bottomShadow}></div>
        </div>
        
        {cardPositions.map((position, index) => (
          <div
            key={index}
            className="card-hover-container"
            style={{
              ...styles.cardHoverContainer,
              '--x': `${position.x}px`,
              '--y': `${position.y}px`,
              transform: `translateX(${position.x}px) translateY(${position.y}px) translateZ(1px)`
            } as React.CSSProperties}
          >
            <div
              style={{
                ...styles.cardFront,
                backgroundImage: `url('${cardImages[index % cardImages.length] || cardImages[0] || ''}')`
              }}
            ></div>
          </div>
        ))}
        
        <div style={styles.deckShadow}></div>
      </div>

      <style>
        {`
        @keyframes pullCard {
          0% { 
            transform: translateX(var(--x)) translateY(var(--y)) translateZ(1px); 
          }
          16.67% { 
            transform: translateX(var(--x)) translateY(calc(var(--y) - 250px)) translateZ(1px); 
          }
          83.33% { 
            transform: translateX(var(--x)) translateY(calc(var(--y) - 250px)) translateZ(1px); 
          }
          100% { 
            transform: translateX(var(--x)) translateY(var(--y)) translateZ(1px); 
          }
        }
        `}
      </style>
    </div>
  );
};

export default TarotDeck; 