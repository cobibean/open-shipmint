'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#f7d755', '#fbbf24', '#3b82f6', '#22c55e', '#f59e0b', '#06b6d4'];

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
  shape: 'circle' | 'square' | 'triangle';
}

export const Confetti = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      rotation: Math.random() * 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 10 + 6,
      delay: Math.random() * 0.8,
      shape: (['circle', 'square', 'triangle'] as const)[Math.floor(Math.random() * 3)],
    }));

    setParticles(newParticles);

    const timeout = setTimeout(() => {
      setParticles([]);
    }, 4000);

    return () => clearTimeout(timeout);
  }, []);

  const getShapeStyle = (particle: Particle) => {
    const base = {
      width: particle.size,
      height: particle.size,
      backgroundColor: particle.color,
    };

    switch (particle.shape) {
      case 'circle':
        return { ...base, borderRadius: '50%' };
      case 'square':
        return { ...base, borderRadius: '2px' };
      case 'triangle':
        return {
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          borderLeft: `${particle.size / 2}px solid transparent`,
          borderRight: `${particle.size / 2}px solid transparent`,
          borderBottom: `${particle.size}px solid ${particle.color}`,
        };
      default:
        return base;
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            x: `${particle.x}vw`,
            y: '-10vh',
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: '110vh',
            rotate: particle.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 3,
            delay: particle.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
            opacity: {
              times: [0, 0.8, 1],
            },
          }}
          style={{
            position: 'absolute',
            ...getShapeStyle(particle),
          }}
        />
      ))}
    </div>
  );
};
