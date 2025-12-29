import React, { useEffect, useRef, useState, useCallback } from 'react';

interface FrequencyOrbProps {
  audioData?: Uint8Array;
  isActive?: boolean;
  size?: number;
  barCount?: number;
  colorScheme?: 'rainbow' | 'blue-purple' | 'cyan-magenta' | 'green-gold';
  animationSpeed?: number;
}

const FrequencyOrb: React.FC<FrequencyOrbProps> = ({
  audioData,
  isActive = true,
  size = 400,
  barCount = 64,
  colorScheme = 'rainbow',
  animationSpeed = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [smoothedData, setSmoothedData] = useState<number[]>(Array(barCount).fill(0));
  const timeRef = useRef<number>(0);

  // Color scheme definitions
  const colorSchemes = {
    rainbow: (hue: number) => `hsl(${hue % 360}, 100%, 50%)`,
    'blue-purple': (hue: number) => {
      const normalized = hue % 360;
      if (normalized < 180) {
        return `hsl(240, 100%, ${50 + (normalized / 180) * 20}%)`;
      }
      return `hsl(280, 100%, ${70 - ((normalized - 180) / 180) * 20}%)`;
    },
    'cyan-magenta': (hue: number) => {
      const normalized = hue % 360;
      return `hsl(${normalized < 180 ? 180 + (normalized / 180) * 120 : 300 - ((normalized - 180) / 180) * 120}, 100%, 50%)`;
    },
    'green-gold': (hue: number) => {
      const normalized = hue % 360;
      return `hsl(${normalized < 180 ? 120 : 40}, ${100 - (normalized % 180 / 180) * 30}%, 50%)`;
    },
  };

  const getColor = useCallback(
    (index: number, intensity: number, time: number) => {
      const baseHue = (index / barCount) * 360 + time * 50 * animationSpeed;
      const colorFn = colorSchemes[colorScheme];
      return colorFn(baseHue);
    },
    [barCount, colorScheme, animationSpeed]
  );

  // Smooth audio data transitions
  useEffect(() => {
    if (!audioData) return;

    setSmoothedData((prev) => {
      const newData = [...prev];
      const targetData = new Array(barCount).fill(0);

      // Downsample or upsample audio data to match barCount
      const step = Math.max(1, Math.floor(audioData.length / barCount));
      for (let i = 0; i < barCount; i++) {
        const index = Math.min(i * step, audioData.length - 1);
        targetData[i] = audioData[index] / 255;
      }

      // Exponential smoothing for fluid animation
      for (let i = 0; i < barCount; i++) {
        newData[i] = prev[i] * 0.7 + targetData[i] * 0.3;
      }

      return newData;
    });
  }, [audioData, barCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = size;
    const height = size;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.2;
    const maxBarLength = Math.min(width, height) * 0.35;

    const drawFrame = () => {
      // Clear with subtle fade effect
      ctx.fillStyle = 'rgba(10, 10, 20, 0.15)';
      ctx.fillRect(0, 0, width, height);

      if (isActive) {
        timeRef.current += 0.016 * animationSpeed; // ~60fps delta
      }

      // Draw orbital background glow
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, baseRadius * 2);
      gradient.addColorStop(0, 'rgba(100, 150, 255, 0.1)');
      gradient.addColorStop(0.5, 'rgba(100, 100, 255, 0.05)');
      gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw frequency bars in circular pattern
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const intensity = smoothedData[i] || 0;

        // Calculate bar dimensions
        const barLength = baseRadius + intensity * maxBarLength;
        const barWidth = (Math.PI * 2) / barCount * baseRadius * 0.6;

        // Start position (inner radius)
        const startX = centerX + Math.cos(angle) * baseRadius;
        const startY = centerY + Math.sin(angle) * baseRadius;

        // End position (outer radius based on intensity)
        const endX = centerX + Math.cos(angle) * barLength;
        const endY = centerY + Math.sin(angle) * barLength;

        // Draw bar with gradient
        const barGradient = ctx.createLinearGradient(startX, startY, endX, endY);
        const color1 = getColor(i, intensity, timeRef.current);
        const color2 = getColor(i, intensity * 0.5, timeRef.current + 0.5);

        barGradient.addColorStop(0, `${color1}80`);
        barGradient.addColorStop(0.5, color1);
        barGradient.addColorStop(1, `${color2}40`);

        ctx.strokeStyle = barGradient;
        ctx.lineWidth = Math.max(2, barWidth * 0.8);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw glow effect
        if (intensity > 0.1) {
          ctx.strokeStyle = `${getColor(i, intensity, timeRef.current)}40`;
          ctx.lineWidth = barWidth * 1.5;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }

      // Draw center orb
      const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 0.3);
      orbGradient.addColorStop(0, 'rgba(200, 150, 255, 0.8)');
      orbGradient.addColorStop(0.7, 'rgba(100, 100, 255, 0.4)');
      orbGradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Draw rotating ring effect
      const avgIntensity = smoothedData.reduce((a, b) => a + b, 0) / barCount;
      ctx.strokeStyle = `rgba(150, 200, 255, ${0.3 + avgIntensity * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw outer ring
      ctx.strokeStyle = `rgba(100, 150, 255, ${0.15 + avgIntensity * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + maxBarLength * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [size, barCount, isActive, getColor, animationSpeed, smoothedData]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(10, 10, 20, 0.8) 0%, rgba(20, 15, 35, 0.8) 100%)',
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(100, 150, 255, 0.3), inset 0 0 40px rgba(100, 100, 255, 0.1)',
        width: size,
        height: size,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          filter: isActive ? 'drop-shadow(0 0 20px rgba(100, 150, 255, 0.4))' : 'grayscale(1)',
          transition: 'filter 0.3s ease',
        }}
      />
    </div>
  );
};

export default FrequencyOrb;
