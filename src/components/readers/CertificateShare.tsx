import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Download, User, Clock, Calendar, Shield, CheckCircle, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TarotLogo from '../ui/TarotLogo';
import type { ReaderCertificate } from '../../types';

const CertificateShare: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [certificate, setCertificate] = useState<ReaderCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!certificateId) {
          setError('Certificate ID is missing');
          setLoading(false);
          return;
        }
        
        const { data, error: fetchError } = await supabase
          .from('reader_certificates')
          .select('*')
          .eq('id', certificateId)
          .single();
        
        if (fetchError || !data) {
          console.error('Error fetching certificate:', fetchError);
          setError('Certificate not found or has been removed');
          setLoading(false);
          return;
        }
        
        setCertificate(data as ReaderCertificate);
      } catch (err) {
        console.error('Error in fetchCertificate:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCertificate();
  }, [certificateId]);
  
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-medium">Loading certificate...</h2>
        </div>
      </div>
    );
  }
  
  if (error || !certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-2">Certificate Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || 'The certificate you are looking for does not exist or has been removed.'}</p>
          <a href="/" className="btn btn-primary py-2 px-6">
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }
  
  // Get appropriate color based on level
  const getLevelColor = (levelName: string) => {
    if (levelName.includes('Novice')) return 'text-blue-500 border-blue-500 bg-blue-500/10';
    if (levelName.includes('Adept')) return 'text-purple-500 border-purple-500 bg-purple-500/10';
    if (levelName.includes('Ethereal')) return 'text-teal-500 border-teal-500 bg-teal-500/10';
    if (levelName.includes('Celestial')) return 'text-amber-500 border-amber-500 bg-amber-500/10';
    if (levelName.includes('Arcane')) return 'text-rose-500 border-rose-500 bg-rose-500/10';
    return 'text-primary border-primary bg-primary/10';
  };
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl overflow-hidden my-8"
          >
            <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 p-6 text-center">
              <TarotLogo className="h-14 w-14 text-accent mx-auto mb-4" />
              <h1 className="text-3xl font-serif font-bold mb-2">Tarot Reader Certification</h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                This certificate verifies the tarot reading proficiency of {certificate.username}
                at the {certificate.level_name} level.
              </p>
            </div>
            
            <div className="p-6">
              {/* Certificate Image */}
              {certificate.certificate_url && (
                <div className="mb-8">
                  <img 
                    src={certificate.certificate_url}
                    alt="Tarot Reader Certificate"
                    className="w-full rounded-lg shadow-lg"
                  />
                  <div className="flex justify-center mt-4">
                    <a 
                      href={certificate.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`TarotForge_Certificate_${certificate.username}.png`}
                      className="btn btn-secondary py-2 flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Image
                    </a>
                  </div>
                </div>
              )}
              
              {/* Certificate Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-serif font-bold mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2 text-accent" />
                      Certificate Details
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Certified Reader</span>
                        <span className="font-medium text-lg">{certificate.username}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Certification Level</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getLevelColor(certificate.level_name)}`}>
                          <Award className="h-4 w-4 mr-1" />
                          {certificate.level_name}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Certification Date</span>
                        <span className="font-medium">
                          {new Date(certificate.certification_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Certification ID</span>
                        <span className="font-medium">{certificate.certification_id}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Quiz Score</span>
                        <span className="font-medium">{certificate.score.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-serif font-bold mb-4 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-accent" />
                      Verification
                    </h2>
                    
                    <div className="p-4 border border-border rounded-lg bg-card/50 flex flex-col items-center mb-6">
                      <div className="mb-3 p-2 bg-white rounded-lg">
                        <QRCodeSVG
                          value={window.location.href}
                          size={150}
                          level="H"
                          imageSettings={{
                            src: "/tarot-icon.svg",
                            excavate: true,
                            width: 30,
                            height: 30
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Scan this QR code to verify the authenticity of this certificate
                      </p>
                    </div>
                    
                    <div className="mb-6">
                      <div className="bg-muted/20 p-3 rounded-lg mb-4 flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-medium mb-1">Verified Authentic</h3>
                          <p className="text-sm text-muted-foreground">
                            This certificate has been verified as an authentic Tarot Forge reader certification.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={copyLink} 
                        className="btn btn-secondary py-2 w-full flex items-center justify-center"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied to Clipboard
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Certificate Link
                          </>
                        )}
                      </button>
                      
                      <div className="flex gap-2">
                        <a 
                          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`I've achieved ${certificate.level_name} certification as a tarot reader on Tarot Forge! #TarotForge #TarotCertification`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary py-2 flex-1 flex items-center justify-center"
                        >
                          Share on Twitter
                        </a>
                        <a 
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary py-2 flex-1 flex items-center justify-center"
                        >
                          Share on LinkedIn
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* About Tarot Forge */}
              <div className="mt-10 pt-6 border-t border-border">
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <TarotLogo className="h-5 w-5 mr-2 text-accent" />
                  About Tarot Forge
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Tarot Forge is a premier platform for tarot enthusiasts, offering certification, 
                  custom deck creation, and professional reading services. Certified readers undergo 
                  rigorous testing to ensure they possess comprehensive knowledge of tarot symbolism, 
                  interpretation techniques, and ethical reading practices.
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-success mr-1" />
                    <span className="text-sm">Verified Credentials</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-success mr-1" />
                    <span className="text-sm">Standardized Testing</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-success mr-1" />
                    <span className="text-sm">Ethical Guidelines</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-success mr-1" />
                    <span className="text-sm">Professional Development</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CertificateShare;