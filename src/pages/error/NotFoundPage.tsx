import { Link } from 'react-router-dom';
import LostOracleAnimation from '../../components/ui/LostOracleAnimation';
import { Compass } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-purple-900/30 to-slate-900 text-white flex flex-col items-center justify-center p-2 text-center antialiased overflow-hidden">
      {/* Optional: Subtle background elements for atmosphere if desired later */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-purple-600/20 rounded-full filter blur-3xl opacity-50 animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-600/20 rounded-full filter blur-3xl opacity-50 animate-pulse-slow animation-delay-2000"></div>

      <div className="max-w-2xl w-full flex flex-col items-center">
        <div className="mb-4 transform transition-all duration-500 hover:scale-105">
          <LostOracleAnimation 
            size="xl" 
            className="filter drop-shadow-[0_0_25px_rgba(192,132,252,0.6)]"
          />
        </div>
        
        <h4
          className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-2 tracking-tight [text-shadow:0_2px_10px_rgba(192,132,252,0.3)]"
        >
          Path Lost in the Mists
        </h4>
        
        <p className="text-slate-300/90 text-xs md:text-sm leading-snug mb-4 max-w-xl text-justify">
          Alas, brave seeker, the way you seek is shrouded. The mists of the digital aether have obscured this passage. 
          Perhaps the stars misaligned, or the path was but a whisper on the wind.
        </p>
        
        <Link 
          to="/"
          className="group inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 hover:from-purple-700 hover:via-pink-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-purple-500/40 transform transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:ring-opacity-80 text-xs md:text-sm"
        >
          <Compass className="h-4 w-4 mr-2 transition-transform duration-500 ease-out group-hover:rotate-[360deg] group-hover:scale-110" />
          Return to a Familiar Path
        </Link>

        <p className="mt-8 text-xs text-slate-500/70">
          If you believe the path should be clear, the Oracle may be consulted via our support channels.
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage; 