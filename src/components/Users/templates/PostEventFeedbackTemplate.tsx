import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface FeedbackCriteria {
  name: string;
  rating: 'excellent' | 'good' | 'fair' | 'poor' | '';
}

interface PostEventFeedbackData {
  eventTitle: string;
  date: string;
  venue: string;
  organizingOffice: string;
  criteria: FeedbackCriteria[];
  question1: string; // What did you like most about this event?
  question2: string; // What areas of the event can be improved?
  question3: string; // Additional comments or suggestions
}

interface PostEventFeedbackTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<PostEventFeedbackData>;
}

const PostEventFeedbackTemplate: React.FC<PostEventFeedbackTemplateProps> = ({
  open,
  onOpenChange,
  initialData
}) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  
  const defaultCriteria: FeedbackCriteria[] = [
    { name: 'Achievement of Objectives', rating: '' },
    { name: 'Relevance of Topics / Activities', rating: '' },
    { name: 'Organization and Coordination', rating: '' },
    { name: 'Venue and Logistics', rating: '' },
    { name: 'Facilitators / Speakers', rating: '' },
    { name: 'Overall Satisfaction', rating: '' }
  ];
  
  const [templateData, setTemplateData] = useState<PostEventFeedbackData>({
    eventTitle: '',
    date: '',
    venue: '',
    organizingOffice: '',
    criteria: defaultCriteria,
    question1: '',
    question2: '',
    question3: ''
  });

  // Update template data when initialData or open state changes
  useEffect(() => {
    if (open && initialData) {
      setTemplateData({
        eventTitle: initialData.eventTitle || '',
        date: initialData.date || '',
        venue: initialData.venue || '',
        organizingOffice: initialData.organizingOffice || '',
        criteria: initialData.criteria || defaultCriteria,
        question1: initialData.question1 || '',
        question2: initialData.question2 || '',
        question3: initialData.question3 || ''
      });
    }
  }, [open, initialData]);

  const updateCriteriaRating = (index: number, rating: 'excellent' | 'good' | 'fair' | 'poor') => {
    setTemplateData(prev => ({
      ...prev,
      criteria: prev.criteria.map((item, i) => 
        i === index ? { ...item, rating } : item
      )
    }));
  };

  const generatePDF = async (preview: boolean = false) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Load Bataan logo
      let logoImg: HTMLImageElement | null = null;
      try {
        logoImg = new Image();
        logoImg.src = '/images/bataanlogo.png';
        await new Promise((resolve, reject) => {
          logoImg!.onload = resolve;
          logoImg!.onerror = reject;
        });
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
      
      const now = new Date();
      const timestamp = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      
      // Helper function to add header to any page
      const addPageHeader = (isFirstPage: boolean = false) => {
        let headerYPos = margin;
        
        // Add logo
        if (logoImg) {
          const logoWidth = 20;
          const logoHeight = 20;
          doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, headerYPos, logoWidth, logoHeight);
          headerYPos += logoHeight + 5;
        } else {
          // Fallback circle
          doc.setFillColor(0, 102, 204);
          doc.circle(pageWidth / 2, headerYPos + 10, 8, 'F');
          headerYPos += 25;
        }
        
        // Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('POST-EVENT FEEDBACK FORM', pageWidth / 2, headerYPos, { align: 'center' });
        headerYPos += 7;
        
        // Subtitle
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Provincial Government of Bataan', pageWidth / 2, headerYPos, { align: 'center' });
        headerYPos += 6;
        
        // Timestamp (only on first page)
        if (isFirstPage) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(timestamp, pageWidth / 2, headerYPos, { align: 'center' });
          headerYPos += 10;
        } else {
          headerYPos += 4;
        }
        
        // Horizontal line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(margin, headerYPos, pageWidth - margin, headerYPos);
        headerYPos += 10;
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        
        return headerYPos;
      };
      
      // Add header to first page
      let yPos = addPageHeader(true);

      // Basic Info (simple text with underlines - all aligned)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const labelEndX = margin + 40; // Fixed position where all underlines start
      
      doc.text('Event Title:', margin, yPos);
      doc.line(labelEndX, yPos + 1, pageWidth - margin, yPos + 1);
      doc.text(templateData.eventTitle || '', labelEndX + 2, yPos);
      yPos += 8;

      doc.text('Date:', margin, yPos);
      doc.line(labelEndX, yPos + 1, pageWidth - margin, yPos + 1);
      doc.text(templateData.date || '', labelEndX + 2, yPos);
      yPos += 8;

      doc.text('Venue:', margin, yPos);
      doc.line(labelEndX, yPos + 1, pageWidth - margin, yPos + 1);
      doc.text(templateData.venue || '', labelEndX + 2, yPos);
      yPos += 8;

      doc.text('Organizing Office:', margin, yPos);
      doc.line(labelEndX, yPos + 1, pageWidth - margin, yPos + 1);
      doc.text(templateData.organizingOffice || '', labelEndX + 2, yPos);
      yPos += 12;

      // Instructions
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Instructions:', margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const instructions = 'Please help us improve future activities by evaluating this event. Kindly check the rating that best describes your experience.';
      const instructionLines = doc.splitTextToSize(instructions, pageWidth - margin * 2);
      doc.text(instructionLines, margin, yPos);
      yPos += instructionLines.length * 5 + 8;

      // Rating Table (simpler layout)
      const col1Width = 70; // Criteria
      const ratingColWidth = (pageWidth - margin * 2 - col1Width) / 4; // 4 rating columns
      const rowHeight = 10;

      // Header row (no background, just text)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Criteria', margin + 5, yPos);
      doc.text('Excellent', margin + col1Width + ratingColWidth / 2, yPos, { align: 'center' });
      doc.text('Good', margin + col1Width + ratingColWidth * 1.5, yPos, { align: 'center' });
      doc.text('Fair', margin + col1Width + ratingColWidth * 2.5, yPos, { align: 'center' });
      doc.text('Poor', margin + col1Width + ratingColWidth * 3.5, yPos, { align: 'center' });

      yPos += 8;

      // Criteria rows (no heavy borders)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      templateData.criteria.forEach((item, index) => {
        // Criteria name (no background)
        const criteriaLines = doc.splitTextToSize(item.name, col1Width - 4);
        doc.text(criteriaLines, margin + 5, yPos + 6);

        // Rating checkboxes
        const checkSize = 3;
        const checkY = yPos + rowHeight / 2 - checkSize / 2;

        // Excellent
        const check1X = margin + col1Width + ratingColWidth / 2 - checkSize / 2;
        doc.rect(check1X, checkY, checkSize, checkSize);
        if (item.rating === 'excellent') {
          doc.setFillColor(0, 0, 0);
          doc.rect(check1X + 0.5, checkY + 0.5, checkSize - 1, checkSize - 1, 'F');
        }

        // Good
        const check2X = margin + col1Width + ratingColWidth * 1.5 - checkSize / 2;
        doc.rect(check2X, checkY, checkSize, checkSize);
        if (item.rating === 'good') {
          doc.setFillColor(0, 0, 0);
          doc.rect(check2X + 0.5, checkY + 0.5, checkSize - 1, checkSize - 1, 'F');
        }

        // Fair
        const check3X = margin + col1Width + ratingColWidth * 2.5 - checkSize / 2;
        doc.rect(check3X, checkY, checkSize, checkSize);
        if (item.rating === 'fair') {
          doc.setFillColor(0, 0, 0);
          doc.rect(check3X + 0.5, checkY + 0.5, checkSize - 1, checkSize - 1, 'F');
        }

        // Poor
        const check4X = margin + col1Width + ratingColWidth * 3.5 - checkSize / 2;
        doc.rect(check4X, checkY, checkSize, checkSize);
        if (item.rating === 'poor') {
          doc.setFillColor(0, 0, 0);
          doc.rect(check4X + 0.5, checkY + 0.5, checkSize - 1, checkSize - 1, 'F');
        }

        yPos += rowHeight;
      });

      yPos += 10;

      // Open-Ended Questions
      // Check if we need a new page
      if (yPos + 30 > pageHeight - margin) {
        doc.addPage();
        yPos = addPageHeader(false);
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Open-Ended Questions', margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Question 1
      if (yPos + 20 > pageHeight - margin) {
        doc.addPage();
        yPos = addPageHeader(false);
      }
      doc.text('1. What did you like most about this event?', margin, yPos);
      yPos += 6;
      const q1Lines = doc.splitTextToSize(templateData.question1 || '_____________________________________________________', pageWidth - margin * 2);
      doc.text(q1Lines, margin, yPos);
      yPos += q1Lines.length * 5 + 6;

      // Question 2
      if (yPos + 20 > pageHeight - margin) {
        doc.addPage();
        yPos = addPageHeader(false);
      }
      doc.text('2. What areas of the event can be improved?', margin, yPos);
      yPos += 6;
      const q2Lines = doc.splitTextToSize(templateData.question2 || '_____________________________________________________', pageWidth - margin * 2);
      doc.text(q2Lines, margin, yPos);
      yPos += q2Lines.length * 5 + 6;

      // Question 3
      if (yPos + 20 > pageHeight - margin) {
        doc.addPage();
        yPos = addPageHeader(false);
      }
      doc.text('3. Additional comments or suggestions:', margin, yPos);
      yPos += 6;
      const q3Lines = doc.splitTextToSize(templateData.question3 || '_____________________________________________________', pageWidth - margin * 2);
      doc.text(q3Lines, margin, yPos);
      yPos += q3Lines.length * 5 + 10;

      // Thank you message
      if (yPos + 10 > pageHeight - margin) {
        doc.addPage();
        yPos = addPageHeader(false);
      }
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your valuable feedback!', margin, yPos);

      if (preview) {
        // Generate blob URL for preview
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
        setShowPdfPreview(true);
      } else {
        // Download the PDF
        doc.save(`Post_Event_Feedback_${templateData.eventTitle || 'Template'}.pdf`);
        toast.success('PDF downloaded successfully!');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post-Event Feedback Form Template</DialogTitle>
            <DialogDescription>
              Fill out the template fields to see the format, then download as PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Event Title:</label>
                <Input
                  value={templateData.eventTitle}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, eventTitle: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date:</label>
                <Input
                  value={templateData.date}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, date: e.target.value }))}
                  placeholder="Enter date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Venue:</label>
                <Input
                  value={templateData.venue}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Enter venue"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Organizing Office:</label>
                <Input
                  value={templateData.organizingOffice}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, organizingOffice: e.target.value }))}
                  placeholder="Enter organizing office"
                />
              </div>
            </div>

            {/* Rating Criteria */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Rating Criteria</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b grid grid-cols-5 gap-2 text-xs font-medium">
                  <div>Criteria</div>
                  <div className="text-center">Excellent</div>
                  <div className="text-center">Good</div>
                  <div className="text-center">Fair</div>
                  <div className="text-center">Poor</div>
                </div>
                
                {templateData.criteria.map((item, index) => (
                  <div key={index} className="p-3 border-b last:border-b-0 grid grid-cols-5 gap-2 items-center">
                    <div className="text-sm font-medium">{item.name}</div>
                    
                    <div className="flex justify-center">
                      <input
                        type="radio"
                        name={`rating-${index}`}
                        checked={item.rating === 'excellent'}
                        onChange={() => updateCriteriaRating(index, 'excellent')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="radio"
                        name={`rating-${index}`}
                        checked={item.rating === 'good'}
                        onChange={() => updateCriteriaRating(index, 'good')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="radio"
                        name={`rating-${index}`}
                        checked={item.rating === 'fair'}
                        onChange={() => updateCriteriaRating(index, 'fair')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="radio"
                        name={`rating-${index}`}
                        checked={item.rating === 'poor'}
                        onChange={() => updateCriteriaRating(index, 'poor')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open-Ended Questions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Open-Ended Questions</h3>
              
              <div>
                <label className="text-sm font-medium">1. What did you like most about this event?</label>
                <Textarea
                  value={templateData.question1}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, question1: e.target.value }))}
                  placeholder="Enter response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">2. What areas of the event can be improved?</label>
                <Textarea
                  value={templateData.question2}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, question2: e.target.value }))}
                  placeholder="Enter response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">3. Additional comments or suggestions:</label>
                <Textarea
                  value={templateData.question3}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, question3: e.target.value }))}
                  placeholder="Enter response"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              onClick={() => generatePDF(true)}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              PDF Preview - Post-Event Feedback Form
            </DialogTitle>
            <DialogDescription>
              This is how your feedback form will look when downloaded
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden rounded-lg border" style={{ height: 'calc(90vh - 180px)' }}>
            {pdfPreviewUrl && (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                if (!pdfPreviewUrl) {
                  toast.error('No PDF preview available');
                  return;
                }
                
                // Download the PDF
                const link = document.createElement('a');
                link.href = pdfPreviewUrl;
                link.download = `Post_Event_Feedback_${templateData.eventTitle || 'Template'}.pdf`;
                link.click();
                toast.success('PDF downloaded successfully!');
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostEventFeedbackTemplate;
