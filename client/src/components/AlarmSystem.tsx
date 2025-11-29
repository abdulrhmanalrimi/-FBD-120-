import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, AlertCircle, Info, CheckCircle, Bell, BellOff } from "lucide-react";

export interface Alarm {
  id: string;
  timestamp: Date;
  severity: "critical" | "warning" | "info";
  message: string;
  acknowledged: boolean;
  active: boolean;
}

interface AlarmSystemProps {
  productTemp: number;
  tempSetpoint: number;
  mainPressure: number;
  filterDP: number;
  systemRunning: boolean;
}

export default function AlarmSystem({
  productTemp,
  tempSetpoint,
  mainPressure,
  filterDP,
  systemRunning,
}: AlarmSystemProps) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastAlarmTime, setLastAlarmTime] = useState(0);

  // Check for alarm conditions
  useEffect(() => {
    if (!systemRunning) return;

    const now = Date.now();
    // Prevent alarm spam (minimum 5 seconds between same type)
    if (now - lastAlarmTime < 5000) return;

    // High temperature alarm
    if (productTemp > tempSetpoint + 10) {
      addAlarm({
        severity: "critical",
        message: `High Temperature: ${productTemp.toFixed(1)}°C exceeds setpoint by ${(productTemp - tempSetpoint).toFixed(1)}°C`,
      });
    }

    // Low pressure alarm
    if (mainPressure < 3) {
      addAlarm({
        severity: "warning",
        message: `Low Pressure: ${mainPressure.toFixed(1)} bar - Check blower operation`,
      });
    }

    // High filter differential pressure (clogged filter)
    if (filterDP > 400) {
      addAlarm({
        severity: "warning",
        message: `High Filter ΔP: ${filterDP.toFixed(0)} Pa - Filter may be clogged`,
      });
    }

    // Very high temperature (critical)
    if (productTemp > 95) {
      addAlarm({
        severity: "critical",
        message: `CRITICAL: Temperature ${productTemp.toFixed(1)}°C approaching maximum limit!`,
      });
    }
  }, [productTemp, tempSetpoint, mainPressure, filterDP, systemRunning, lastAlarmTime]);

  const addAlarm = (alarm: Omit<Alarm, "id" | "timestamp" | "acknowledged" | "active">) => {
    const newAlarm: Alarm = {
      id: `alarm-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      acknowledged: false,
      active: true,
      ...alarm,
    };

    setAlarms((prev) => [newAlarm, ...prev]);
    setLastAlarmTime(Date.now());

    // Play sound if enabled
    if (soundEnabled && alarm.severity === "critical") {
      playAlarmSound();
    }
  };

  const playAlarmSound = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "square";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const acknowledgeAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === id ? { ...alarm, acknowledged: true, active: false } : alarm
      )
    );
  };

  const acknowledgeAll = () => {
    setAlarms((prev) =>
      prev.map((alarm) => ({ ...alarm, acknowledged: true, active: false }))
    );
  };

  const clearHistory = () => {
    setAlarms((prev) => prev.filter((alarm) => alarm.active));
  };

  const activeAlarms = alarms.filter((alarm) => alarm.active);
  const criticalCount = activeAlarms.filter((a) => a.severity === "critical").length;
  const warningCount = activeAlarms.filter((a) => a.severity === "warning").length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 border-red-500/50 text-red-500";
      case "warning":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-500";
      case "info":
        return "bg-blue-500/20 border-blue-500/50 text-blue-500";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Alarm Summary */}
      <Card className="p-4 bg-card text-card-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="font-semibold">Critical: {criticalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold">Warning: {warningCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold">Total: {alarms.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Bell className="w-4 h-4 mr-2" />
              ) : (
                <BellOff className="w-4 h-4 mr-2" />
              )}
              Sound {soundEnabled ? "On" : "Off"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={acknowledgeAll}
              disabled={activeAlarms.length === 0}
            >
              Acknowledge All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              disabled={alarms.length === activeAlarms.length}
            >
              Clear History
            </Button>
          </div>
        </div>
      </Card>

      {/* Active Alarms */}
      {activeAlarms.length > 0 && (
        <Card className="p-4 bg-card text-card-foreground">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
            Active Alarms
          </h3>
          <div className="space-y-2">
            {activeAlarms.map((alarm) => (
              <div
                key={alarm.id}
                className={`p-3 rounded-lg border ${getSeverityColor(alarm.severity)} ${
                  alarm.severity === "critical" ? "animate-pulse" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(alarm.severity)}
                    <div className="flex-1">
                      <p className="font-medium">{alarm.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alarm.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => acknowledgeAlarm(alarm.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alarm History */}
      <Card className="p-4 bg-card text-card-foreground">
        <h3 className="text-lg font-semibold mb-3">Alarm History</h3>
        <ScrollArea className="h-[300px] pr-4">
          {alarms.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No alarms recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`p-3 rounded-lg border ${
                    alarm.acknowledged
                      ? "bg-muted/50 border-border opacity-60"
                      : getSeverityColor(alarm.severity)
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alarm.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={alarm.acknowledged ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {alarm.severity.toUpperCase()}
                        </Badge>
                        {alarm.acknowledged && (
                          <Badge variant="outline" className="text-xs">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{alarm.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alarm.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
