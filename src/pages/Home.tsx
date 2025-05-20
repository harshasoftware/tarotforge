import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from '../components/ui/Check';

const Home = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Choose Your Plan
            </h2>
            <p className="mt-4 text-lg leading-6 text-gray-500">
              Select the subscription that fits your tarot journey
            </p>
          </div>
          
          <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="p-6">
                <h3 className="text-xl font-serif font-bold mb-2">Seeker</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">$9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                <div className="border-t border-border pt-4 mb-4">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">30 basic credits monthly</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Create one custom deck</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Basic email support</span>
                    </li>
                  </ul>
                </div>
                
                <Link to="/subscription" className="btn btn-outline w-full py-2">
                  Subscribe
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="p-6">
                <h3 className="text-xl font-serif font-bold mb-2">Mystic</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">$19.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                <div className="border-t border-border pt-4 mb-4">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">75 basic credits monthly</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Create three custom decks</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Priority email support</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Advanced reading features</span>
                    </li>
                  </ul>
                </div>
                
                <Link to="/subscription" className="btn btn-primary w-full py-2">
                  Subscribe
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="p-6">
                <h3 className="text-xl font-serif font-bold mb-2">Visionary</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">$49.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                <div className="border-t border-border pt-4 mb-4">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">150 basic credits monthly</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Create multiple decks</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Roll over up to 30 credits</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Priority support</span>
                    </li>
                  </ul>
                </div>
                
                <Link to="/subscription" className="btn btn-outline w-full py-2">
                  Subscribe
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;