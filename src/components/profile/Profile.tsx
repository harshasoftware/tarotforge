@@ .. @@
 import { useForm } from 'react-hook-form';
 import { Mail, Save, Shield, AlertCircle, Check } from 'lucide-react';
 import { useAuth } from '../../context/AuthContext';
 import ProfileImageUpload from '../../components/profile/ProfileImageUpload';
 import { getUserProfile, updateUserProfile } from '../../lib/user-profile';
 import { supabase } from '../../lib/supabase';
 import { User } from '../../types';
 import CreditSummaryCard from '../../components/profile/CreditSummaryCard';
-import CreditTransactionHistory from '../../components/profile/CreditTransactionHistory';
 
 interface ProfileFormData {
   username: string;
 }
@@ .. @@
               <motion.div
                 className="mt-8"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.2 }}
               >
-                <CreditTransactionHistory />
+                {/* Credit Transaction History removed as we've moved to deck-based pricing */}
               </motion.div>
             </motion.div>
           </div>