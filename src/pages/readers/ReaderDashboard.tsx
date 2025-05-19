import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Award, Calendar, Clock, MessageSquare, UserCheck, Users, BarChart4, BookOpen, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TarotLogo from '../../components/ui/TarotLogo';

const ReaderDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReadings: 0,
    averageRating: 0,
    pendingRequests: 0,
    completedToday: 0
  });
  
  // Format date to get reader since date in readable format
  const formattedReaderSince = () => {
    if (!user?.reader_since) return 'Recent';
    
    const date = new Date(user.reader_since);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };
  
  useEffect(() => {
    // Check if user is actually a certified reader
    if (user && !user.is_reader) {
      navigate('/become-reader');
      return;
    }
    
    // Simulate loading data
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API call with timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for now
        setStats({
          totalReadings: Math.floor(Math.random() * 30),
          averageRating: 4.8,
          pendingRequests: Math.floor(Math.random() * 5),
          completedToday: Math.floor(Math.random() * 3)
        });
      } catch (error) {
        console.error('Error loading reader stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 mt-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Reader Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your tarot reading services and client connections
            </p>
          </div>
          
          <div className="flex items-center bg-card/50 border border-border rounded-full px-4 py-2">
            <UserCheck className="h-5 w-5 text-accent mr-2" />
            <span className="text-sm">Certified since {formattedReaderSince()}</span>
          </div>
        </div>
        
        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Readings</p>
                <h3 className="text-3xl font-bold mt-1">{stats.totalReadings}</h3>
              </div>
              <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Average Rating</p>
                <h3 className="text-3xl font-bold mt-1">{stats.averageRating.toFixed(1)}</h3>
              </div>
              <div className="h-12 w-12 bg-accent/20 rounded-full flex items-center justify-center">
                <Award className="h-6 w-6 text-accent" />
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Pending Requests</p>
                <h3 className="text-3xl font-bold mt-1">{stats.pendingRequests}</h3>
              </div>
              <div className="h-12 w-12 bg-warning/20 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Completed Today</p>
                <h3 className="text-3xl font-bold mt-1">{stats.completedToday}</h3>
              </div>
              <div className="h-12 w-12 bg-success/20 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-success" />
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Main Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reading Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold">Reading Requests</h2>
                <button className="text-sm text-primary">View All</button>
              </div>
              
              <div className="p-6">
                {stats.pendingRequests > 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: stats.pendingRequests }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mr-3">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-medium">New Reading Request</h4>
                            <p className="text-sm text-muted-foreground">
                              {["Career Guidance", "Love & Relationships", "Spiritual Growth"][Math.floor(Math.random() * 3)]} • {Math.floor(Math.random() * 30) + 1} min ago
                            </p>
                          </div>
                        </div>
                        <button className="btn btn-primary py-1 px-3 text-xs">
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No Pending Requests</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You don't have any reading requests at the moment.
                    </p>
                    <button className="btn btn-secondary py-1.5 px-4 text-sm">
                      Update Availability
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-serif font-bold">Quick Actions</h2>
              </div>
              
              <div className="p-4">
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <Clock className="h-5 w-5 text-primary mr-3" />
                      Set Availability
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-primary mr-3" />
                      Manage Messages
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <Award className="h-5 w-5 text-primary mr-3" />
                      Update Profile
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <BarChart4 className="h-5 w-5 text-primary mr-3" />
                      View Analytics
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 mt-2 bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-start gap-3">
                  <TarotLogo className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium mb-1">Tarot Reader Pro</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upgrade to Pro for advanced analytics, priority placement, and exclusive tools.
                    </p>
                    <button className="btn btn-secondary py-1.5 px-4 text-xs w-full">
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Recent Readings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Recent Readings</h2>
              <button className="text-sm text-primary">View All</button>
            </div>
            
            <div className="p-6">
              {stats.totalReadings > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-border">
                        <th className="pb-3 pr-4 font-medium">Client</th>
                        <th className="pb-3 px-4 font-medium">Type</th>
                        <th className="pb-3 px-4 font-medium">Date</th>
                        <th className="pb-3 px-4 font-medium">Duration</th>
                        <th className="pb-3 pl-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.min(stats.totalReadings, 5) }).map((_, index) => (
                        <tr key={index} className="border-b border-border last:border-0">
                          <td className="py-4 pr-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center mr-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span>Anonymous User</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {["Celtic Cross", "Three Card", "Career Spread", "Relationship Spread"][Math.floor(Math.random() * 4)]}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {Math.floor(Math.random() * 40) + 20} min
                          </td>
                          <td className="pl-4 py-4">
                            <button className="btn btn-ghost py-1 px-2 text-xs border border-input hover:bg-secondary/50">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">No Readings Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    You haven't completed any readings yet. Check back here to see your reading history.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReaderDashboard;