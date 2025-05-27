import React, { useEffect, useState } from 'react';
import { useCollaborativeStore } from '../../stores/collaborativeSessionStore';
import { Activity, Database, Users, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceMonitorProps {
  show?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  show = false, 
  position = 'bottom-right' 
}) => {
  const { metrics, presence, participants } = useCollaborativeStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [networkLatency, setNetworkLatency] = useState<number>(0);

  // Calculate network latency
  useEffect(() => {
    const interval = setInterval(async () => {
      const start = Date.now();
      try {
        await fetch('/api/ping', { method: 'HEAD' });
        setNetworkLatency(Date.now() - start);
      } catch {
        setNetworkLatency(-1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const activeConnections = Object.keys(presence).filter(
    userId => presence[userId].lastActivity && 
    Date.now() - presence[userId].lastActivity! < 30000
  ).length;

  const connectionColor = networkLatency < 0 ? 'text-destructive' :
    networkLatency < 100 ? 'text-green-500' :
    networkLatency < 300 ? 'text-yellow-500' : 'text-destructive';

  return (
    <div className={`fixed ${positionClasses[position]} z-[100]`}>
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 min-w-[300px]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Performance Monitor
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Minimize
              </button>
            </div>

            <div className="space-y-3">
              {/* Database Updates */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">DB Updates/min</span>
                </div>
                <span className="text-sm font-mono">
                  {metrics.dbUpdatesPerMinute}
                </span>
              </div>

              {/* Presence Updates */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Presence Updates/min</span>
                </div>
                <span className="text-sm font-mono">
                  {metrics.presenceUpdatesPerMinute}
                </span>
              </div>

              {/* Network Latency */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Wifi className={`h-3 w-3 ${connectionColor}`} />
                  <span className="text-muted-foreground">Network Latency</span>
                </div>
                <span className={`text-sm font-mono ${connectionColor}`}>
                  {networkLatency < 0 ? 'Offline' : `${networkLatency}ms`}
                </span>
              </div>

              {/* Active Connections */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-muted-foreground">Active Connections</span>
                </div>
                <span className="text-sm font-mono">
                  {activeConnections}/{participants.length}
                </span>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Session uptime: {formatUptime(metrics.lastDbUpdate)}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsExpanded(true)}
            className="bg-card/80 backdrop-blur-sm border border-border rounded-full p-2 shadow-lg hover:bg-card/90 transition-colors"
            title="Show performance monitor"
          >
            <Activity className={`h-4 w-4 ${
              metrics.dbUpdatesPerMinute > 10 ? 'text-warning animate-pulse' : 'text-primary'
            }`} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

function formatUptime(startTime: number): string {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default PerformanceMonitor; 