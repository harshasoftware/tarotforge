Here's the fixed version with all missing closing brackets added:

```javascript
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
```