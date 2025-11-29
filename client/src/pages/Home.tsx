import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Play, 
  Square, 
  Thermometer, 
  Wind, 
  Gauge, 
  AlertTriangle,
  Power,
  Flame,
  Timer,
  Settings,
  Download,
  Save,
  Loader2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MachineVisualization from "@/components/MachineVisualization";
import AlarmSystem from "@/components/AlarmSystem";
import { toast } from "sonner";

// PLC State Interface
interface PLCState {
  systemRunning: boolean;
  autoMode: boolean;
  alarmActive: boolean;
  heatingPhase: boolean;
  dryingPhase: boolean;
  coolingPhase: boolean;
  inletTemp: number;
  outletTemp: number;
  productTemp: number;
  mainPressure: number;
  filterDP: number;
  tempSetpoint: number;
  dryingTime: number;
  coolingTime: number;
  blowerSpeed: number;
  blowerOn: boolean;
  heater1On: boolean;
  heater2On: boolean;
  heater3On: boolean;
  dryingTimeRemaining: number;
  coolingTimeRemaining: number;
  batchCounter: number;
  alarmCounter: number;
}

interface Recipe {
  name: string;
  tempSetpoint: number;
  dryingTime: number;
  coolingTime: number;
  blowerSpeed: number;
}

const defaultRecipes: Recipe[] = [
  { name: "Standard Powder", tempSetpoint: 60, dryingTime: 30, coolingTime: 15, blowerSpeed: 50 },
  { name: "Granules", tempSetpoint: 70, dryingTime: 40, coolingTime: 20, blowerSpeed: 60 },
  { name: "Fine Powder", tempSetpoint: 55, dryingTime: 25, coolingTime: 10, blowerSpeed: 45 },
  { name: "Coarse Material", tempSetpoint: 80, dryingTime: 50, coolingTime: 25, blowerSpeed: 70 },
];

export default function Home() {
  const [plcState, setPLCState] = useState<PLCState>({
    systemRunning: false,
    autoMode: true,
    alarmActive: false,
    heatingPhase: false,
    dryingPhase: false,
    coolingPhase: false,
    inletTemp: 25,
    outletTemp: 25,
    productTemp: 25,
    mainPressure: 5,
    filterDP: 100,
    tempSetpoint: 60,
    dryingTime: 30,
    coolingTime: 15,
    blowerSpeed: 50,
    blowerOn: false,
    heater1On: false,
    heater2On: false,
    heater3On: false,
    dryingTimeRemaining: 0,
    coolingTimeRemaining: 0,
    batchCounter: 0,
    alarmCounter: 0,
  });

  const [chartData, setChartData] = useState<Array<{time: string, product: number, inlet: number, outlet: number}>>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Simulation Loop
  useEffect(() => {
    if (!plcState.systemRunning || manualMode) return;

    const interval = setInterval(() => {
      setPLCState(prev => {
        const next = { ...prev };
        
        // Heating Phase Logic
        if (next.productTemp < next.tempSetpoint && !next.dryingPhase && !next.coolingPhase) {
          next.heatingPhase = true;
          next.blowerOn = true;
          
          const tempDiff = next.tempSetpoint - next.productTemp;
          next.heater1On = tempDiff > 0;
          next.heater2On = tempDiff > 10;
          next.heater3On = tempDiff > 20;
          
          const heaterCount = [next.heater1On, next.heater2On, next.heater3On].filter(Boolean).length;
          const heatingRate = heaterCount * 0.8;
          
          next.productTemp = Math.min(next.productTemp + heatingRate, next.tempSetpoint);
          next.inletTemp = next.productTemp + 15;
          next.outletTemp = next.productTemp + 5;
        }
        
        // Drying Phase Logic
        if (next.heatingPhase && next.productTemp >= next.tempSetpoint - 2) {
          next.heatingPhase = false;
          next.dryingPhase = true;
          next.dryingTimeRemaining = next.dryingTime * 60;
          toast.success("Drying phase started");
        }
        
        if (next.dryingPhase) {
          next.heater1On = true;
          next.heater2On = false;
          next.heater3On = false;
          next.dryingTimeRemaining = Math.max(0, next.dryingTimeRemaining - 1);
          
          if (next.productTemp < next.tempSetpoint - 3) {
            next.productTemp += 0.5;
          } else if (next.productTemp > next.tempSetpoint + 3) {
            next.productTemp -= 0.3;
          }
          
          if (next.dryingTimeRemaining === 0) {
            next.dryingPhase = false;
            next.coolingPhase = true;
            next.coolingTimeRemaining = next.coolingTime * 60;
            next.heater1On = false;
            next.heater2On = false;
            next.heater3On = false;
            toast.info("Cooling phase started");
          }
        }
        
        // Cooling Phase Logic
        if (next.coolingPhase) {
          next.coolingTimeRemaining = Math.max(0, next.coolingTimeRemaining - 1);
          next.productTemp = Math.max(25, next.productTemp - 0.4);
          next.inletTemp = Math.max(25, next.inletTemp - 0.5);
          next.outletTemp = Math.max(25, next.outletTemp - 0.4);
          
          if (next.coolingTimeRemaining === 0) {
            next.coolingPhase = false;
            next.systemRunning = false;
            next.blowerOn = false;
            next.batchCounter += 1;
            toast.success(`Cycle completed! Batch #${next.batchCounter + 1}`);
          }
        }
        
        if (next.blowerOn) {
          next.mainPressure = 4 + (next.blowerSpeed / 100) * 2;
          next.filterDP = 100 + (next.blowerSpeed / 100) * 200;
        } else {
          next.mainPressure = Math.max(0, next.mainPressure - 0.5);
          next.filterDP = Math.max(0, next.filterDP - 20);
        }
        
        return next;
      });
      
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [plcState.systemRunning, manualMode]);

  // Chart Data Update
  useEffect(() => {
    if (plcState.systemRunning && elapsedTime % 5 === 0) {
      setChartData(prev => {
        const newData = [...prev, {
          time: `${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`,
          product: Math.round(plcState.productTemp),
          inlet: Math.round(plcState.inletTemp),
          outlet: Math.round(plcState.outletTemp),
        }];
        return newData.slice(-20);
      });
    }
  }, [elapsedTime, plcState.systemRunning, plcState.productTemp, plcState.inletTemp, plcState.outletTemp]);

  const handleStart = () => {
    if (!plcState.systemRunning) {
      setPLCState(prev => ({ ...prev, systemRunning: true }));
      setElapsedTime(0);
      setChartData([]);
      toast.success("System started");
    }
  };

  const handleStop = () => {
    setPLCState(prev => ({
      ...prev,
      systemRunning: false,
      heatingPhase: false,
      dryingPhase: false,
      coolingPhase: false,
      blowerOn: false,
      heater1On: false,
      heater2On: false,
      heater3On: false,
    }));
    toast.info("System stopped");
  };

  const handleEmergencyStop = () => {
    handleStop();
    toast.error("EMERGENCY STOP ACTIVATED");
  };

  const loadRecipe = (recipe: Recipe) => {
    if (plcState.systemRunning) {
      toast.error("Cannot load recipe while system is running");
      return;
    }
    setPLCState(prev => ({
      ...prev,
      tempSetpoint: recipe.tempSetpoint,
      dryingTime: recipe.dryingTime,
      coolingTime: recipe.coolingTime,
      blowerSpeed: recipe.blowerSpeed,
    }));
    setSelectedRecipe(recipe);
    toast.success(`Recipe "${recipe.name}" loaded`);
  };

  const exportData = () => {
    const data = {
      batchNumber: plcState.batchCounter,
      timestamp: new Date().toISOString(),
      settings: {
        tempSetpoint: plcState.tempSetpoint,
        dryingTime: plcState.dryingTime,
        coolingTime: plcState.coolingTime,
        blowerSpeed: plcState.blowerSpeed,
      },
      chartData: chartData,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fbd-batch-${plcState.batchCounter}-${Date.now()}.json`;
    a.click();
    toast.success("Data exported successfully");
  };

  const getCurrentPhase = () => {
    if (plcState.heatingPhase) return "Heating";
    if (plcState.dryingPhase) return "Drying";
    if (plcState.coolingPhase) return "Cooling";
    return "Idle";
  };

  const getPhaseColor = () => {
    if (plcState.heatingPhase) return "bg-orange-500";
    if (plcState.dryingPhase) return "bg-blue-500";
    if (plcState.coolingPhase) return "bg-cyan-500";
    return "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">FBD-120 Fluid Bed Dryer</h1>
            <p className="text-muted-foreground">Interactive Simulation & Control System</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={plcState.systemRunning ? "default" : "secondary"} className="text-lg px-4 py-2">
              <Power className="w-4 h-4 mr-2" />
              {plcState.systemRunning ? "Running" : "Stopped"}
            </Badge>
            <Badge className={`text-lg px-4 py-2 ${getPhaseColor()}`}>
              {getCurrentPhase()}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="alarms">Alarms</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-card text-card-foreground">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Product Temperature</h3>
                  <Thermometer className="w-6 h-6 text-orange-500" />
                </div>
                <div className="text-4xl font-bold mb-2">{plcState.productTemp.toFixed(1)}°C</div>
                <div className="text-sm text-muted-foreground">Setpoint: {plcState.tempSetpoint}°C</div>
                <Progress 
                  value={(plcState.productTemp / plcState.tempSetpoint) * 100} 
                  className="mt-4"
                />
              </Card>

              <Card className="p-6 bg-card text-card-foreground">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Blower Speed</h3>
                  <Wind className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-4xl font-bold mb-2">{plcState.blowerSpeed}%</div>
                <div className="text-sm text-muted-foreground">
                  Status: {plcState.blowerOn ? "Running" : "Stopped"}
                </div>
                <Progress 
                  value={plcState.blowerSpeed} 
                  className="mt-4"
                />
              </Card>

              <Card className="p-6 bg-card text-card-foreground">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Main Pressure</h3>
                  <Gauge className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-4xl font-bold mb-2">{plcState.mainPressure.toFixed(1)} bar</div>
                <div className="text-sm text-muted-foreground">Filter ΔP: {plcState.filterDP.toFixed(0)} Pa</div>
                <Progress 
                  value={(plcState.mainPressure / 6) * 100} 
                  className="mt-4"
                />
              </Card>
            </div>

            {/* Control Panel */}
            <Card className="p-6 bg-card text-card-foreground">
              <h3 className="text-xl font-semibold mb-4">Control Panel</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  size="lg" 
                  onClick={handleStart} 
                  disabled={plcState.systemRunning}
                  className="h-20"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Cycle
                </Button>
                <Button 
                  size="lg" 
                  variant="destructive" 
                  onClick={handleStop}
                  disabled={!plcState.systemRunning}
                  className="h-20"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>
                <Button 
                  size="lg" 
                  variant="destructive" 
                  onClick={handleEmergencyStop}
                  className="h-20 bg-red-600 hover:bg-red-700"
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Emergency Stop
                </Button>
              </div>
            </Card>

            {/* Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-card text-card-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className={plcState.heater1On ? "text-red-500 animate-pulse" : "text-gray-500"} />
                  <span className="font-semibold">Heater 1</span>
                </div>
                <Badge variant={plcState.heater1On ? "default" : "secondary"}>
                  {plcState.heater1On ? "ON" : "OFF"}
                </Badge>
              </Card>

              <Card className="p-4 bg-card text-card-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className={plcState.heater2On ? "text-red-500 animate-pulse" : "text-gray-500"} />
                  <span className="font-semibold">Heater 2</span>
                </div>
                <Badge variant={plcState.heater2On ? "default" : "secondary"}>
                  {plcState.heater2On ? "ON" : "OFF"}
                </Badge>
              </Card>

              <Card className="p-4 bg-card text-card-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className={plcState.heater3On ? "text-red-500 animate-pulse" : "text-gray-500"} />
                  <span className="font-semibold">Heater 3</span>
                </div>
                <Badge variant={plcState.heater3On ? "default" : "secondary"}>
                  {plcState.heater3On ? "ON" : "OFF"}
                </Badge>
              </Card>

              <Card className="p-4 bg-card text-card-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="text-blue-500" />
                  <span className="font-semibold">Timer</span>
                </div>
                <div className="text-lg font-bold">
                  {plcState.dryingPhase && `${Math.floor(plcState.dryingTimeRemaining / 60)}:${(plcState.dryingTimeRemaining % 60).toString().padStart(2, '0')}`}
                  {plcState.coolingPhase && `${Math.floor(plcState.coolingTimeRemaining / 60)}:${(plcState.coolingTimeRemaining % 60).toString().padStart(2, '0')}`}
                  {!plcState.dryingPhase && !plcState.coolingPhase && "--:--"}
                </div>
              </Card>
            </div>

            {/* Statistics */}
            <Card className="p-6 bg-card text-card-foreground">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Statistics</h3>
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Batch Counter</p>
                  <p className="text-2xl font-bold">{plcState.batchCounter}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Elapsed Time</p>
                  <p className="text-2xl font-bold">{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inlet Temp</p>
                  <p className="text-2xl font-bold">{plcState.inletTemp.toFixed(1)}°C</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outlet Temp</p>
                  <p className="text-2xl font-bold">{plcState.outletTemp.toFixed(1)}°C</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Visualization Tab */}
          <TabsContent value="visualization" className="space-y-6">
            <Card className="p-6 bg-card text-card-foreground">
              <h3 className="text-xl font-semibold mb-6">Machine Visualization</h3>
              <MachineVisualization
                blowerOn={plcState.blowerOn}
                heater1On={plcState.heater1On}
                heater2On={plcState.heater2On}
                heater3On={plcState.heater3On}
                productTemp={plcState.productTemp}
                blowerSpeed={plcState.blowerSpeed}
              />
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Recipes */}
            <Card className="p-6 bg-card text-card-foreground">
              <h3 className="text-xl font-semibold mb-4">Quick Recipes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {defaultRecipes.map((recipe) => (
                  <Card
                    key={recipe.name}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedRecipe?.name === recipe.name
                        ? "border-primary bg-primary/10"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => loadRecipe(recipe)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{recipe.name}</h4>
                      <Save className="w-4 h-4" />
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Temp: {recipe.tempSetpoint}°C</p>
                      <p>Drying: {recipe.dryingTime} min</p>
                      <p>Cooling: {recipe.coolingTime} min</p>
                      <p>Speed: {recipe.blowerSpeed}%</p>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-card text-card-foreground">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-6 h-6" />
                <h3 className="text-xl font-semibold">Process Parameters</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="tempSetpoint">Temperature Setpoint (°C)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      id="tempSetpoint"
                      min={40}
                      max={100}
                      step={5}
                      value={[plcState.tempSetpoint]}
                      onValueChange={(value) => setPLCState(prev => ({ ...prev, tempSetpoint: value[0] }))}
                      disabled={plcState.systemRunning}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={plcState.tempSetpoint}
                      onChange={(e) => setPLCState(prev => ({ ...prev, tempSetpoint: Number(e.target.value) }))}
                      disabled={plcState.systemRunning}
                      className="w-20"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dryingTime">Drying Time (minutes)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      id="dryingTime"
                      min={10}
                      max={60}
                      step={5}
                      value={[plcState.dryingTime]}
                      onValueChange={(value) => setPLCState(prev => ({ ...prev, dryingTime: value[0] }))}
                      disabled={plcState.systemRunning}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={plcState.dryingTime}
                      onChange={(e) => setPLCState(prev => ({ ...prev, dryingTime: Number(e.target.value) }))}
                      disabled={plcState.systemRunning}
                      className="w-20"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="coolingTime">Cooling Time (minutes)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      id="coolingTime"
                      min={5}
                      max={30}
                      step={5}
                      value={[plcState.coolingTime]}
                      onValueChange={(value) => setPLCState(prev => ({ ...prev, coolingTime: value[0] }))}
                      disabled={plcState.systemRunning}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={plcState.coolingTime}
                      onChange={(e) => setPLCState(prev => ({ ...prev, coolingTime: Number(e.target.value) }))}
                      disabled={plcState.systemRunning}
                      className="w-20"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="blowerSpeed">Blower Speed (%)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      id="blowerSpeed"
                      min={30}
                      max={100}
                      step={10}
                      value={[plcState.blowerSpeed]}
                      onValueChange={(value) => setPLCState(prev => ({ ...prev, blowerSpeed: value[0] }))}
                      disabled={plcState.systemRunning}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={plcState.blowerSpeed}
                      onChange={(e) => setPLCState(prev => ({ ...prev, blowerSpeed: Number(e.target.value) }))}
                      disabled={plcState.systemRunning}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {plcState.systemRunning && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="text-sm font-medium">Settings are locked while system is running</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Manual Control */}
            <Card className="p-6 bg-card text-card-foreground">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Manual Control Mode</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="manual-mode">Enable Manual</Label>
                  <Switch
                    id="manual-mode"
                    checked={manualMode}
                    onCheckedChange={setManualMode}
                    disabled={plcState.systemRunning}
                  />
                </div>
              </div>
              
              {manualMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button
                      variant={plcState.blowerOn ? "default" : "outline"}
                      onClick={() => setPLCState(prev => ({ ...prev, blowerOn: !prev.blowerOn }))}
                      className="h-20"
                    >
                      <Wind className="w-6 h-6 mr-2" />
                      Blower
                    </Button>
                    <Button
                      variant={plcState.heater1On ? "default" : "outline"}
                      onClick={() => setPLCState(prev => ({ ...prev, heater1On: !prev.heater1On }))}
                      className="h-20"
                    >
                      <Flame className="w-6 h-6 mr-2" />
                      Heater 1
                    </Button>
                    <Button
                      variant={plcState.heater2On ? "default" : "outline"}
                      onClick={() => setPLCState(prev => ({ ...prev, heater2On: !prev.heater2On }))}
                      className="h-20"
                    >
                      <Flame className="w-6 h-6 mr-2" />
                      Heater 2
                    </Button>
                    <Button
                      variant={plcState.heater3On ? "default" : "outline"}
                      onClick={() => setPLCState(prev => ({ ...prev, heater3On: !prev.heater3On }))}
                      className="h-20"
                    >
                      <Flame className="w-6 h-6 mr-2" />
                      Heater 3
                    </Button>
                  </div>
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-500">
                      <AlertTriangle className="w-5 h-5" />
                      <p className="text-sm font-medium">Manual mode: Use with caution. Monitor all parameters closely.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>Manual control is disabled. Enable the switch above to activate.</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Alarms Tab */}
          <TabsContent value="alarms" className="space-y-6">
            <AlarmSystem
              productTemp={plcState.productTemp}
              tempSetpoint={plcState.tempSetpoint}
              mainPressure={plcState.mainPressure}
              filterDP={plcState.filterDP}
              systemRunning={plcState.systemRunning}
            />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card className="p-6 bg-card text-card-foreground">
              <h3 className="text-xl font-semibold mb-6">Temperature Trends</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="product" 
                      stroke="#f97316" 
                      name="Product Temp (°C)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="inlet" 
                      stroke="#3b82f6" 
                      name="Inlet Temp (°C)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="outlet" 
                      stroke="#10b981" 
                      name="Outlet Temp (°C)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
