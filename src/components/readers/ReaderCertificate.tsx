import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, Share2, Check, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import TarotLogo from '../ui/TarotLogo';
import { User, ReaderLevel } from '../../types';
import { uploadCertificate } from '../../lib/reader-services';

interface ReaderCertificateProps {
  user: User;
  readerLevel: ReaderLevel;
  quizScore: number;
  certificationDate: Date;
  onClose?: () => void;
}

const ReaderCertificate: React.FC<ReaderCertificateProps> = ({
  user,
  readerLevel,
  quizScore,
  certificationDate,
  onClose
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  
  // Get formatted date
  const formattedDate = new Date(certificationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Get the certification ID (using date for now)
  const certificationId = `TF-${Date.now().toString().substring(0, 10)}`;
  
  // Get the appropriate color for the reader level based on chakra system
  const getLevelColor = () => {
    switch (readerLevel?.color_theme) {
      case 'red': return 'from-red-500 to-orange-500';
      case 'orange': return 'from-orange-500 to-yellow-500';
      case 'yellow': return 'from-yellow-500 to-green-500';
      case 'green': return 'from-green-500 to-teal-500';
      case 'blue': return 'from-blue-500 to-indigo-500';
      case 'indigo': return 'from-indigo-500 to-purple-500';
      case 'violet': return 'from-violet-500 to-purple-700';
      default: return 'from-primary to-indigo-700';
    }
  };
  
  // Download certificate as PDF
  const downloadAsPDF = async () => {
    if (!certificateRef.current) return;
    
    try {
      setIsDownloading(true);
      
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        // Use standard font family for text to ensure it renders properly when exported
        fontFamily: 'Arial, sans-serif'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // A4 dimensions in mm (landscape)
      const pdfWidth = 297;
      const pdfHeight = 210;
      
      // Calculate scaling to fit certificate into PDF
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = (pdfHeight - imgHeight * ratio) / 2;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`TarotForge_Certificate_${user.username || 'Reader'}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Download certificate as image
  const downloadAsImage = async () => {
    if (!certificateRef.current) return;
    
    try {
      setIsDownloading(true);
      
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        // Use standard font family for text to ensure it renders properly when exported
        fontFamily: 'Arial, sans-serif'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create link and trigger download
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `TarotForge_Certificate_${user.username || 'Reader'}.png`;
      link.click();
      
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Share certificate
  const shareCertificate = async () => {
    if (!certificateRef.current) return;
    
    try {
      setIsSharing(true);
      
      // Generate image from certificate
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        // Use standard font family for text to ensure it renders properly when exported
        fontFamily: 'Arial, sans-serif'
      });
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
        }, 'image/png', 0.9);
      });
      
      // Upload to storage and get URL
      const shareableUrl = await uploadCertificate(user.id, blob, {
        username: user.username || user.full_name || '',
        level: readerLevel.name,
        certificationId,
        score: quizScore,
        date: formattedDate
      });
      
      if (shareableUrl) {
        setShareUrl(shareableUrl);
        
        // Check if native share is available
        if (navigator.share) {
          try {
            await navigator.share({
              title: `${user.username || 'Tarot Reader'}'s Certification`,
              text: `I've achieved ${readerLevel.name} certification on Tarot Forge!`,
              url: shareableUrl
            });
          } catch (shareError) {
            console.error('Error sharing:', shareError);
            // Fallback - copy to clipboard
            await navigator.clipboard.writeText(shareableUrl);
            setShowShareSuccess(true);
            setTimeout(() => setShowShareSuccess(false), 3000);
          }
        } else {
          // Fallback - copy to clipboard
          await navigator.clipboard.writeText(shareableUrl);
          setShowShareSuccess(true);
          setTimeout(() => setShowShareSuccess(false), 3000);
        }
      }
    } catch (error) {
      console.error('Error sharing certificate:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-card rounded-xl overflow-hidden max-w-5xl w-full max-h-[90vh] relative"
      >
        <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
          <h2 className="font-serif text-lg font-bold">Reader Certification</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center overflow-auto max-h-[calc(90vh-80px)]">
          <div
            ref={certificateRef}
            className="w-full max-w-4xl aspect-[1.414/1] bg-gradient-to-b from-black to-primary/20 rounded-xl p-8 relative overflow-hidden"
            style={{ fontFamily: 'Arial, sans-serif' }} 
          >
            {/* Certificate Border */}
            <div className="absolute inset-0 border-[12px] border-accent/20 rounded-xl pointer-events-none"></div>
            <div className="absolute inset-3 border-[2px] border-accent/40 rounded-lg pointer-events-none"></div>
            
            {/* Background Magical Elements */}
            <div className="absolute inset-0 overflow-hidden opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
              <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-accent/30 blur-3xl"></div>
              <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-primary/30 blur-3xl"></div>
            </div>
            
            {/* Certificate Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-between text-white">
              {/* Header */}
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <TarotLogo className="h-12 w-12 text-accent" />
                </div>
                <h1 className="text-4xl font-bold text-accent mb-1" style={{ fontFamily: 'Arial, serif' }}>CERTIFICATE OF ACHIEVEMENT</h1>
                <div className="w-32 h-1 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto mb-4"></div>
                <p className="text-sm uppercase tracking-widest" style={{ fontFamily: 'Arial, sans-serif' }}>Tarot Forge Certified Reader</p>
              </div>
              
              {/* Body */}
              <div className="text-center my-4 flex-grow flex flex-col items-center justify-center">
                <p className="text-lg mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>This is to certify that</p>
                <h2 className="text-4xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent font-bold mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {user.full_name || user.username || user.email.split('@')[0]}
                </h2>
                <p className="text-lg mb-6" style={{ fontFamily: 'Arial, sans-serif' }}>has demonstrated exceptional proficiency in tarot reading and has been awarded</p>
                
                <div className={`bg-gradient-to-r ${getLevelColor()} text-white px-6 py-3 rounded-full font-bold text-xl mb-6`} style={{ fontFamily: 'Arial, sans-serif' }}>
                  {readerLevel.name}
                </div>
                
                <p className="text-sm mb-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Achieving a score of <span className="font-bold">{quizScore.toFixed(1)}%</span> on the certification examination
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm text-accent/80 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>DATE</div>
                    <div className="font-medium" style={{ fontFamily: 'Arial, sans-serif' }}>{formattedDate}</div>
                  </div>
                  <div className="h-12 w-px bg-accent/20"></div>
                  <div className="text-center">
                    <div className="text-sm text-accent/80 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>CERTIFICATION ID</div>
                    <div className="font-medium" style={{ fontFamily: 'Arial, sans-serif' }}>{certificationId}</div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="w-full flex items-center justify-between">
                <div className="text-center">
                  <div className="font-serif text-xl font-bold italic text-accent mb-1" style={{ fontFamily: 'Arial, serif' }}>Tarot Forge</div>
                  <p className="text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>Official Certification Authority</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <QRCodeSVG 
                    value={`https://tarotforge.xyz/verify/${certificationId}`} 
                    size={60}
                    bgColor="transparent"
                    fgColor="white"
                    level="H"
                    className="mb-1"
                  />
                  <p className="text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>Scan to verify</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button
              onClick={downloadAsPDF}
              disabled={isDownloading}
              className="btn btn-primary px-4 py-2 flex items-center"
            >
              {isDownloading ? (
                <>
                  <span className="mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </button>
            
            <button
              onClick={downloadAsImage}
              disabled={isDownloading}
              className="btn btn-secondary px-4 py-2 flex items-center"
            >
              {isDownloading ? (
                <>
                  <span className="mr-2 h-4 w-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Image
                </>
              )}
            </button>
            
            <button
              onClick={shareCertificate}
              disabled={isSharing}
              className="btn btn-accent px-4 py-2 flex items-center"
            >
              {isSharing ? (
                <>
                  <span className="mr-2 h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin"></span>
                  Creating Link...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Certificate
                </>
              )}
            </button>
          </div>
          
          {/* Share success message */}
          {showShareSuccess && (
            <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg flex items-center">
              <Check className="h-4 w-4 text-success mr-2" />
              <span>Share link copied to clipboard!</span>
            </div>
          )}
          
          {shareUrl && (
            <div className="mt-4 p-3 bg-card border border-border rounded-lg w-full max-w-lg">
              <p className="text-sm mb-2">Share this link on social media:</p>
              <div className="flex">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full p-2 rounded-l-md bg-background border border-r-0 border-input focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setShowShareSuccess(true);
                    setTimeout(() => setShowShareSuccess(false), 3000);
                  }}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-r-md"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ReaderCertificate;