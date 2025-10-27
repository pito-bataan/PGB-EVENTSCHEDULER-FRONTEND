import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Eye } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface AssessmentArea {
  name: string;
  rating: 'fully-achieved' | 'partly-achieved' | 'not-achieved' | '';
}

interface AssessmentEvaluationData {
  eventTitle: string;
  dateAndVenue: string;
  organizingOffice: string;
  assessmentAreas: AssessmentArea[];
  recommendations: string;
  preparedBy: string;
  preparedDate: string;
}

interface AssessmentEvaluationTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<AssessmentEvaluationData>;
}

const AssessmentEvaluationTemplate: React.FC<AssessmentEvaluationTemplateProps> = ({
  open,
  onOpenChange,
  initialData
}) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  
  const defaultAssessmentAreas: AssessmentArea[] = [
    { name: 'Achievement of Objectives', rating: '' },
    { name: 'Participation and Engagement', rating: '' },
    { name: 'Logistics and Support', rating: '' },
    { name: 'Coordination and Communication', rating: '' }
  ];
  
  const [templateData, setTemplateData] = useState<AssessmentEvaluationData>({
    eventTitle: '',
    dateAndVenue: '',
    organizingOffice: '',
    assessmentAreas: defaultAssessmentAreas,
    recommendations: '',
    preparedBy: '',
    preparedDate: new Date().toISOString().split('T')[0]
  });

  // Update template data when initialData or open state changes
  useEffect(() => {
    if (open && initialData) {
      setTemplateData({
        eventTitle: initialData.eventTitle || '',
        dateAndVenue: initialData.dateAndVenue || '',
        organizingOffice: initialData.organizingOffice || '',
        assessmentAreas: initialData.assessmentAreas || defaultAssessmentAreas,
        recommendations: initialData.recommendations || '',
        preparedBy: initialData.preparedBy || '',
        preparedDate: initialData.preparedDate || new Date().toISOString().split('T')[0]
      });
    }
  }, [open, initialData]);

  const updateAssessmentRating = (index: number, rating: 'fully-achieved' | 'partly-achieved' | 'not-achieved') => {
    setTemplateData(prev => ({
      ...prev,
      assessmentAreas: prev.assessmentAreas.map((area, i) => 
        i === index ? { ...area, rating } : area
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
        doc.text('ASSESSMENT & EVALUATION REPORT', pageWidth / 2, headerYPos, { align: 'center' });
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

      // Basic Info Table
      const basicInfoData = [
        ['Event Title', templateData.eventTitle || 'N/A'],
        ['Date and Venue', templateData.dateAndVenue || 'N/A'],
        ['Organizing Office', templateData.organizingOffice || 'N/A']
      ];

      // Draw basic info table
      const colWidth1 = 70;
      const colWidth2 = pageWidth - margin * 2 - colWidth1;
      const rowHeight = 10;
      const cellPadding = 3;

      let currentPageTableStart = yPos;
      
      basicInfoData.forEach(([label, value], index) => {
        // Label (left column) - bold and gray background
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, colWidth1, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        
        const labelLines = doc.splitTextToSize(label, colWidth1 - cellPadding * 2);
        const labelHeight = labelLines.length * 4;
        doc.text(labelLines, margin + cellPadding, yPos + cellPadding + 3);

        // Value (right column)
        doc.setFont('helvetica', 'normal');
        const valueLines = doc.splitTextToSize(value, colWidth2 - cellPadding * 2);
        const valueHeight = valueLines.length * 4;
        doc.text(valueLines, margin + colWidth1 + cellPadding, yPos + cellPadding + 3);

        // Adjust row height if content is tall
        const maxHeight = Math.max(labelHeight, valueHeight);
        const adjustedHeight = Math.max(rowHeight, maxHeight + cellPadding * 2);
        
        // Redraw with adjusted height if needed
        if (adjustedHeight > rowHeight) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos, colWidth1, adjustedHeight, 'F');
          // Redraw text
          doc.setFont('helvetica', 'bold');
          doc.text(labelLines, margin + cellPadding, yPos + cellPadding + 3);
          doc.setFont('helvetica', 'normal');
          doc.text(valueLines, margin + colWidth1 + cellPadding, yPos + cellPadding + 3);
          yPos += adjustedHeight;
        } else {
          yPos += rowHeight;
        }
        
        // Draw horizontal line after each row
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, pageWidth - margin, yPos);
      });

      // Assessment Areas Table headers (now part of the same table)
      const assessmentTableStart = yPos;
      const totalTableWidth = pageWidth - margin * 2;
      const col1Width = colWidth1; // Use same width as label column
      const col2Width = (totalTableWidth - col1Width) / 3; // Divide remaining space equally
      const col3Width = (totalTableWidth - col1Width) / 3;
      const col4Width = (totalTableWidth - col1Width) / 3;
      const headerHeight = 15;

      // Draw header row background
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, col1Width, headerHeight, 'F');
      doc.rect(margin + col1Width, yPos, col2Width, headerHeight, 'F');
      doc.rect(margin + col1Width + col2Width, yPos, col3Width, headerHeight, 'F');
      doc.rect(margin + col1Width + col2Width + col3Width, yPos, col4Width, headerHeight, 'F');

      // Header text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      doc.text('Assessment Area', margin + cellPadding, yPos + cellPadding + 3);
      
      const col2Text = doc.splitTextToSize('Fully Achieved / High / Adequate', col2Width - 4);
      doc.text(col2Text, margin + col1Width + col2Width / 2, yPos + 3, { align: 'center' });
      
      const col3Text = doc.splitTextToSize('Partly Achieved / Moderate / Limited', col3Width - 4);
      doc.text(col3Text, margin + col1Width + col2Width + col3Width / 2, yPos + 3, { align: 'center' });
      
      const col4Text = doc.splitTextToSize('Not Achieved / Low / Poor', col4Width - 4);
      doc.text(col4Text, margin + col1Width + col2Width + col3Width + col4Width / 2, yPos + 3, { align: 'center' });

      yPos += headerHeight;

      // Draw assessment rows
      doc.setFont('helvetica', 'normal');
      const assessmentRowHeight = 12;

      templateData.assessmentAreas.forEach((area, index) => {
        // Check if we need a new page
        if (yPos + assessmentRowHeight > pageHeight - margin) {
          doc.addPage();
          yPos = addPageHeader(false);
        }

        // Draw gray background for the area name column (left side)
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, col1Width, assessmentRowHeight, 'F');

        // Area name
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const areaLines = doc.splitTextToSize(area.name, col1Width - cellPadding * 2);
        doc.text(areaLines, margin + cellPadding, yPos + 4);

        // Rating checkboxes
        const checkSize = 3;
        const checkY = yPos + assessmentRowHeight / 2 - checkSize / 2;

        // Fully Achieved
        const check1X = margin + col1Width + col2Width / 2 - checkSize / 2;
        doc.rect(check1X, checkY, checkSize, checkSize);
        if (area.rating === 'fully-achieved') {
          doc.setFillColor(0, 0, 0);
          doc.rect(check1X + 0.5, checkY + 0.5, checkSize - 1, checkSize - 1, 'F');
        }

        // Partly Achieved
        const check2X = margin + col1Width + col2Width + col3Width / 2 - checkSize / 2;
        doc.rect(check2X, checkY, checkSize, checkSize);
        if (area.rating === 'partly-achieved') {
          doc.setFillColor(0, 0, 0);
          doc.rect(check2X + 0.5, checkY + 0.5, checkSize - 1, checkSize - 1, 'F');
        }

        // Not Achieved
        const check3X = margin + col1Width + col2Width + col3Width + col4Width / 2 - checkSize / 2;
        doc.rect(check3X, checkY, checkSize, checkSize);
        if (area.rating === 'not-achieved') {
          doc.setFillColor(0, 0, 0);
          doc.rect(check3X + 0.5, checkY + 0.5, checkSize - 1, checkSize - 1, 'F');
        }

        yPos += assessmentRowHeight;

        // Draw horizontal line
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, pageWidth - margin, yPos);
      });

      // Draw vertical lines for assessment section (only the rating columns, not the main divider)
      doc.line(margin + col1Width + col2Width, assessmentTableStart, margin + col1Width + col2Width, yPos);
      doc.line(margin + col1Width + col2Width + col3Width, assessmentTableStart, margin + col1Width + col2Width + col3Width, yPos);

      // Continue table with Recommendations (draw horizontal line first)
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      // Recommendations for Future Events row
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, colWidth1, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const recoLabelLines = doc.splitTextToSize('Recommendations for Future Events:', colWidth1 - cellPadding * 2);
      doc.text(recoLabelLines, margin + cellPadding, yPos + cellPadding + 3);

      doc.setFont('helvetica', 'normal');
      const recoValueLines = doc.splitTextToSize(templateData.recommendations || 'N/A', colWidth2 - cellPadding * 2);
      const recoHeight = recoValueLines.length * 4;
      doc.text(recoValueLines, margin + colWidth1 + cellPadding, yPos + cellPadding + 3);

      const recoAdjustedHeight = Math.max(rowHeight, recoHeight + cellPadding * 2);
      if (recoAdjustedHeight > rowHeight) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, colWidth1, recoAdjustedHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(recoLabelLines, margin + cellPadding, yPos + cellPadding + 3);
        doc.setFont('helvetica', 'normal');
        doc.text(recoValueLines, margin + colWidth1 + cellPadding, yPos + cellPadding + 3);
        yPos += recoAdjustedHeight;
      } else {
        yPos += rowHeight;
      }

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      // Prepared By row
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, colWidth1, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Prepared By:', margin + cellPadding, yPos + cellPadding + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(templateData.preparedBy || 'N/A', margin + colWidth1 + cellPadding, yPos + cellPadding + 3);
      yPos += rowHeight;

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      // Date row
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, colWidth1, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', margin + cellPadding, yPos + cellPadding + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(templateData.preparedDate || 'N/A', margin + colWidth1 + cellPadding, yPos + cellPadding + 3);
      yPos += rowHeight;

      // Draw outer border for the entire table
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      const entireTableHeight = yPos - currentPageTableStart;
      doc.rect(margin, currentPageTableStart, pageWidth - margin * 2, entireTableHeight);
      
      // Draw vertical line between columns for the entire table
      doc.line(margin + colWidth1, currentPageTableStart, margin + colWidth1, yPos);

      if (preview) {
        // Generate blob URL for preview
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
        setShowPdfPreview(true);
      } else {
        // Download the PDF
        doc.save(`Assessment_Evaluation_Report_${templateData.eventTitle || 'Template'}.pdf`);
        toast.success('PDF downloaded successfully!');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'fully-achieved': return 'Fully Achieved / High / Adequate';
      case 'partly-achieved': return 'Partly Achieved / Moderate / Limited';
      case 'not-achieved': return 'Not Achieved / Low / Poor';
      default: return 'Not Rated';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assessment & Evaluation Report Template</DialogTitle>
            <DialogDescription>
              Fill out the template fields to see the format, then download as PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  {/* Event Title */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm w-1/3 border-r">
                      Event Title:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.eventTitle}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, eventTitle: e.target.value }))}
                        placeholder="Enter event title"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Date and Venue */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Date and Venue:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.dateAndVenue}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, dateAndVenue: e.target.value }))}
                        placeholder="Enter date and venue"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Organizing Office */}
                  <tr>
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Organizing Office:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.organizingOffice}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, organizingOffice: e.target.value }))}
                        placeholder="Enter organizing office"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Assessment Areas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Assessment Areas</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b grid grid-cols-4 gap-2 text-xs font-medium">
                  <div>Assessment Area</div>
                  <div className="text-center">Fully Achieved / High / Adequate</div>
                  <div className="text-center">Partly Achieved / Moderate / Limited</div>
                  <div className="text-center">Not Achieved / Low / Poor</div>
                </div>
                
                {templateData.assessmentAreas.map((area, index) => (
                  <div key={index} className="p-3 border-b last:border-b-0 grid grid-cols-4 gap-2 items-center">
                    <div className="text-sm font-medium">{area.name}</div>
                    
                    <div className="flex justify-center">
                      <input
                        type="radio"
                        name={`rating-${index}`}
                        checked={area.rating === 'fully-achieved'}
                        onChange={() => updateAssessmentRating(index, 'fully-achieved')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="radio"
                        name={`rating-${index}`}
                        checked={area.rating === 'partly-achieved'}
                        onChange={() => updateAssessmentRating(index, 'partly-achieved')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="radio"
                        name={`rating-${index}`}
                        checked={area.rating === 'not-achieved'}
                        onChange={() => updateAssessmentRating(index, 'not-achieved')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm w-1/3 border-r align-top">
                      Recommendations for Future Events:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.recommendations}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, recommendations: e.target.value }))}
                        placeholder="Enter recommendations"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Prepared By */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Prepared By:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.preparedBy}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, preparedBy: e.target.value }))}
                        placeholder="Enter name"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Date */}
                  <tr>
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Date:
                    </td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={templateData.preparedDate}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, preparedDate: e.target.value }))}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
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
              PDF Preview - Assessment & Evaluation Report
            </DialogTitle>
            <DialogDescription>
              This is how your report will look when downloaded
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
                link.download = `Assessment_Evaluation_Report_${templateData.eventTitle || 'Template'}.pdf`;
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

export default AssessmentEvaluationTemplate;
