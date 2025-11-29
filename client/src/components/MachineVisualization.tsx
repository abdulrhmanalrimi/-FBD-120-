import { useEffect, useRef } from "react";

interface MachineVisualizationProps {
  blowerOn: boolean;
  heater1On: boolean;
  heater2On: boolean;
  heater3On: boolean;
  productTemp: number;
  blowerSpeed: number;
}

export default function MachineVisualization({
  blowerOn,
  heater1On,
  heater2On,
  heater3On,
  productTemp,
  blowerSpeed,
}: MachineVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vy: number; size: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize particles
    if (particlesRef.current.length === 0 && blowerOn) {
      for (let i = 0; i < 30; i++) {
        particlesRef.current.push({
          x: 200 + Math.random() * 200,
          y: 500 + Math.random() * 50,
          vy: -2 - Math.random() * 2,
          size: 2 + Math.random() * 3,
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw machine body
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(150, 300, 300, 250);
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 3;
      ctx.strokeRect(150, 300, 300, 250);

      // Draw product bowl (cone shape)
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.moveTo(200, 300);
      ctx.lineTo(150, 200);
      ctx.lineTo(450, 200);
      ctx.lineTo(400, 300);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw filter at top
      ctx.fillStyle = "#333";
      ctx.fillRect(250, 100, 100, 100);
      ctx.strokeRect(250, 100, 100, 100);
      
      // Filter mesh pattern
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(250, 100 + i * 10);
        ctx.lineTo(350, 100 + i * 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(250 + i * 10, 100);
        ctx.lineTo(250 + i * 10, 200);
        ctx.stroke();
      }

      // Draw exhaust pipe
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(280, 50, 40, 50);
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2;
      ctx.strokeRect(280, 50, 40, 50);

      // Draw heaters
      const heaterY = 450;
      const heaterPositions = [220, 300, 380];
      const heaterStates = [heater1On, heater2On, heater3On];

      heaterStates.forEach((isOn, index) => {
        const x = heaterPositions[index];
        
        // Heater element
        ctx.fillStyle = isOn ? "#ff4500" : "#444";
        ctx.fillRect(x, heaterY, 40, 60);
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, heaterY, 40, 60);

        // Heater glow effect
        if (isOn) {
          const gradient = ctx.createRadialGradient(x + 20, heaterY + 30, 5, x + 20, heaterY + 30, 30);
          gradient.addColorStop(0, "rgba(255, 69, 0, 0.8)");
          gradient.addColorStop(1, "rgba(255, 69, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(x - 10, heaterY - 10, 60, 80);
        }

        // Heater coils
        ctx.strokeStyle = isOn ? "#ffff00" : "#666";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(x + 20, heaterY + 15 + i * 12, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw blower at bottom
      ctx.fillStyle = blowerOn ? "#3b82f6" : "#2a2a2a";
      ctx.beginPath();
      ctx.arc(300, 580, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Blower blades (rotating)
      if (blowerOn) {
        const rotation = (Date.now() / 100) * (blowerSpeed / 50);
        ctx.save();
        ctx.translate(300, 580);
        ctx.rotate(rotation);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(i * Math.PI / 2) * 30, Math.sin(i * Math.PI / 2) * 30);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw air flow particles
      if (blowerOn) {
        particlesRef.current.forEach((particle) => {
          // Update particle position
          particle.y += particle.vy * (blowerSpeed / 50);
          
          // Reset particle if it goes out of bounds
          if (particle.y < 100) {
            particle.y = 550;
            particle.x = 200 + Math.random() * 200;
          }

          // Draw particle with heat color
          const heatRatio = Math.min(productTemp / 100, 1);
          const r = Math.floor(100 + heatRatio * 155);
          const g = Math.floor(150 - heatRatio * 100);
          const b = Math.floor(255 - heatRatio * 200);
          
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw product particles in bowl
      if (blowerOn) {
        for (let i = 0; i < 50; i++) {
          const x = 200 + Math.random() * 200;
          const y = 250 + Math.random() * 40 + Math.sin(Date.now() / 200 + i) * 5;
          ctx.fillStyle = `rgba(139, 69, 19, ${0.5 + Math.random() * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw temperature indicator
      const tempBarHeight = Math.min((productTemp / 100) * 150, 150);
      const tempGradient = ctx.createLinearGradient(480, 400, 480, 250);
      tempGradient.addColorStop(0, "#00ff00");
      tempGradient.addColorStop(0.5, "#ffff00");
      tempGradient.addColorStop(1, "#ff0000");
      
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(470, 250, 30, 150);
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2;
      ctx.strokeRect(470, 250, 30, 150);
      
      ctx.fillStyle = tempGradient;
      ctx.fillRect(470, 400 - tempBarHeight, 30, tempBarHeight);

      // Temperature scale
      ctx.fillStyle = "#fff";
      ctx.font = "12px monospace";
      ctx.fillText("100°C", 505, 255);
      ctx.fillText("50°C", 505, 330);
      ctx.fillText("0°C", 505, 405);

      // Labels
      ctx.fillStyle = "#aaa";
      ctx.font = "14px sans-serif";
      ctx.fillText("Filter", 270, 90);
      ctx.fillText("Product Bowl", 240, 190);
      ctx.fillText("Heaters", 270, 520);
      ctx.fillText("Blower", 265, 630);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [blowerOn, heater1On, heater2On, heater3On, productTemp, blowerSpeed]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-card to-background rounded-lg border border-border">
      <canvas
        ref={canvasRef}
        width={600}
        height={650}
        className="max-w-full h-auto"
      />
    </div>
  );
}
