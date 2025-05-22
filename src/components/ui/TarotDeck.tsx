import React, { useState, useEffect } from 'react';

interface TarotDeckProps { 
  boxImage: string;
  cardImages?: string[];
  deckName?: string;
  cardWidth?: number;
  cardHeight?: number;
  cardCount?: number | null; // null means auto-detect from cardImages length
}

const TarotDeck: React.FC<TarotDeckProps> = ({ 
  boxImage, 
  cardImages = [], 
  deckName = "Tarot Deck",
  cardWidth = 150,
  cardHeight = 249,
  cardCount = null // null means auto-detect from cardImages length
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
        const img = new Image();
        
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Sample colors from different areas of the image
          const colorSamples = [];
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
  const findDominantColors = (pixels, k) => {
    if (pixels.length === 0) return [];
    
    // Initialize centroids randomly
    const centroids = [];
    for (let i = 0; i < k; i++) {
      const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
      centroids.push({ ...randomPixel });
    }
    
    // Run k-means for a few iterations
    for (let iter = 0; iter < 5; iter++) {
      const clusters = Array(k).fill().map(() => []);
      
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

  // Generate card positions with minimal offset for thin deck effect
  const generateCardPositions = (count) => {
    const visibleCards = Math.min(count, 78); // Show all 78 cards
    const totalThickness = 15; // Total thickness of deck in pixels
    return Array.from({ length: visibleCards }, (_, i) => ({
      x: (i * totalThickness) / (visibleCards - 1), // Spread cards across thickness
      y: (i * totalThickness) / (visibleCards - 1), // Spread cards across thickness
      index: i + 1
    }));
  };

  const cardPositions = generateCardPositions(actualCardCount);

  const styles = {
    deckContainer: {
      transform: 'scale(0.7)', 
      position: 'relative',
      width: `${cardWidth + 30}px`,
      height: `${cardHeight + 30}px`
    },
    cards: {
      position: 'relative',
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      marginLeft: '-15px' // Match total deck thickness
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
      marginTop: '15px', // Match deck thickness
      marginLeft: '15px', // Match deck thickness
      position: 'absolute'
    },
    leftSide: {
      width: '15px', // Match deck thickness
      height: `${cardHeight + 8}px`,
      borderWidth: '0.5px',
      borderStyle: 'solid',
      borderColor: 'rgba(0, 0, 0, 0.44)',
      borderRadius: '2px 0px 2px 2px',
      background: `linear-gradient(0deg, ${colors.boxGradientStart} 0%, ${colors.boxGradientEnd} 100%)`,
      transform: 'skewY(45deg)',
      transformOrigin: 'right top',
      marginTop: '15px', // Match main box offset
      marginLeft: '0px', // Align with front edge
      position: 'absolute'
    },
    rightSide: {
      width: '15px', // Match deck thickness
      height: `${cardHeight + 8}px`,
      backgroundColor: 'rgb(0, 0, 0)',
      transform: 'skewY(45deg)',
      borderRadius: '2px',
      borderTop: '0.5px solid black',
      transformOrigin: 'right top',
      marginLeft: `${cardWidth + 8}px`, // Align with right edge of main box
      zIndex: -2,
      position: 'absolute',
      marginTop: '15px' // Match main box offset
    },
    bottomShadow: {
      width: `${cardWidth + 8}px`,
      height: `${cardHeight + 8}px`,
      borderTop: '0.5px solid black',
      backgroundColor: 'rgb(0, 0, 0)',
      marginTop: '0px', // Align with bottom edge
      marginLeft: '0px', // Align with left edge
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
      marginLeft: '0px' // Align with box edges
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
      top: '0px', // Align with box
      left: '0px' // Align with box
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
  };

  return (
    <div 
      className="deck-animation-container hover:animate-none"
      style={styles.deckContainer}
      onMouseEnter={(e) => {
        const cards = e.currentTarget.querySelectorAll('.card-hover-container');
        // Reverse the order so first card (index 0) animates first
        const reversedCards = Array.from(cards).reverse();
        reversedCards.forEach((card, index) => {
          card.style.animation = `placeCardInBox 2.5s forwards`;
          card.style.animationDelay = `${index * 0.1}s`;
        });
      }}
      onMouseLeave={(e) => {
        const cards = e.currentTarget.querySelectorAll('.card-hover-container');
        cards.forEach((card) => {
          card.style.animation = 'none';
          card.style.transform = `translateX(${card.style.getPropertyValue('--x')}) translateY(${card.style.getPropertyValue('--y')}) translateZ(1px)`;
          card.style.opacity = '1';
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
            }}
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

      <style jsx="true">{`
        @keyframes placeCardInBox {
          0% { 
            transform: translateX(var(--x)) translateY(var(--y)) translateZ(1px);
            opacity: 1;
          }
          25% { 
            transform: translateX(var(--x)) translateY(calc(var(--y) - 100px)) translateZ(10px);
            opacity: 1;
          }
          45% { 
            transform: translateX(var(--x)) translateY(calc(var(--y) - 100px)) translateZ(10px);
            opacity: 1;
          }
          65% { 
            transform: translateX(15px) translateY(calc(var(--y) - 50px)) translateZ(10px);
            opacity: 1;
          }
          85% { 
            transform: translateX(15px) translateY(15px) translateZ(10px);
            opacity: 0.8;
          }
          100% { 
            transform: translateX(15px) translateY(15px) translateZ(10px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default TarotDeck;