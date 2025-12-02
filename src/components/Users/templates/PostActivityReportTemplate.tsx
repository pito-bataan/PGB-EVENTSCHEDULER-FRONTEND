import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, Eye, X, Calendar as CalendarIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PostActivityReportData {
  activityTitle: string;
  officeOrganizer: string;
  dateAndTime: string;
  venue: string;
  objective: string;
  summaryOfImplementation: string;
  participantsBeneficiaries: string;
  keyAchievementsOutputs: string;
  supportingDocumentation: File[];
  preparedBy: string;
  preparedDate: string;
}

interface PostActivityReportTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<PostActivityReportData>;
}

const PostActivityReportTemplate: React.FC<PostActivityReportTemplateProps> = ({
  open,
  onOpenChange,
  initialData
}) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  
  const [templateData, setTemplateData] = useState<PostActivityReportData>({
    activityTitle: '',
    officeOrganizer: '',
    dateAndTime: '',
    venue: '',
    objective: '',
    summaryOfImplementation: '',
    participantsBeneficiaries: '',
    keyAchievementsOutputs: '',
    supportingDocumentation: [],
    preparedBy: '',
    preparedDate: new Date().toISOString().split('T')[0]
  });

  // Update template data when initialData or open state changes
  useEffect(() => {
    if (open && initialData) {
      setTemplateData({
        activityTitle: initialData.activityTitle || '',
        officeOrganizer: initialData.officeOrganizer || '',
        dateAndTime: initialData.dateAndTime || '',
        venue: initialData.venue || '',
        objective: initialData.objective || '',
        summaryOfImplementation: initialData.summaryOfImplementation || '',
        participantsBeneficiaries: initialData.participantsBeneficiaries || '',
        keyAchievementsOutputs: initialData.keyAchievementsOutputs || '',
        supportingDocumentation: initialData.supportingDocumentation || [],
        preparedBy: initialData.preparedBy || '',
        preparedDate: initialData.preparedDate || new Date().toISOString().split('T')[0]
      });
    }
  }, [open, initialData]);

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
        doc.text('POST ACTIVITY REPORT', pageWidth / 2, headerYPos, { align: 'center' });
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

      // Table data
      const tableData = [
        ['Activity Title', templateData.activityTitle || 'N/A'],
        ['Office/Organizer', templateData.officeOrganizer || 'N/A'],
        ['Date and Time', templateData.dateAndTime || 'N/A'],
        ['Venue', templateData.venue || 'N/A'],
        ['Objective', templateData.objective || 'N/A'],
        ['Summary of Implementation', templateData.summaryOfImplementation || 'N/A'],
        ['Participants/Beneficiaries', templateData.participantsBeneficiaries || 'N/A'],
        ['Key Achievements/Outputs', templateData.keyAchievementsOutputs || 'N/A'],
        ['Prepared By', templateData.preparedBy || 'N/A'],
        ['Date', templateData.preparedDate || 'N/A']
      ];

      // Draw table
      const colWidth1 = 70; // Label column width
      const colWidth2 = pageWidth - margin * 2 - colWidth1; // Value column width
      const rowHeight = 10;
      const cellPadding = 3;

      let tableStartY = yPos;
      let currentPageTableStart = yPos;
      
      tableData.forEach(([label, value], index) => {
        // Check if we need a new page
        if (yPos + rowHeight > pageHeight - margin) {
          // Draw border for current page before moving to next
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.rect(margin, currentPageTableStart, pageWidth - margin * 2, yPos - currentPageTableStart);
          doc.line(margin + colWidth1, currentPageTableStart, margin + colWidth1, yPos);
          
          doc.addPage();
          yPos = addPageHeader(false);
          currentPageTableStart = yPos;
        }

        // Label (left column) - bold and gray background
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, colWidth1, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        
        // Split label if too long
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
        
        // Draw horizontal line after each row (except last)
        if (index < tableData.length - 1) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.3);
          doc.line(margin, yPos, pageWidth - margin, yPos);
        }
      });
      
      // Draw outer table border for the last page
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin, currentPageTableStart, pageWidth - margin * 2, yPos - currentPageTableStart);
      
      // Draw vertical line between columns
      doc.line(margin + colWidth1, currentPageTableStart, margin + colWidth1, yPos);

      // Add Photo Documentation section if photos exist
      if (templateData.supportingDocumentation.length > 0) {
        yPos += 10; // Space after table
        
        // Check if we need a new page
        if (yPos + 30 > pageHeight - margin) {
          doc.addPage();
          yPos = addPageHeader(false);
        }
        
        // Photo Documentation header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Supporting Documentation', margin, yPos);
        yPos += 10;
        
        // Display all photos, 4 per page (2x2 grid)
        const photosToDisplay = templateData.supportingDocumentation;
        
        // Load and display photos in 2 columns
        const photoWidth = (pageWidth - margin * 2 - 10) / 2; // 2 columns with 10px gap
        const photoHeight = 60; // Fixed height for photos
        const photoGap = 10;
        const photosPerPage = 4; // 2x2 grid
        
        for (let i = 0; i < photosToDisplay.length; i++) {
          const photo = photosToDisplay[i];
          const positionInPage = i % photosPerPage; // Position within current page (0-3)
          const col = positionInPage % 2; // 0 for left, 1 for right
          const row = Math.floor(positionInPage / 2); // 0 for top row, 1 for bottom row
          
          // Add new page after every 4 photos (except first)
          if (i > 0 && i % photosPerPage === 0) {
            doc.addPage();
            yPos = addPageHeader(false);
            // Re-add Photo Documentation header on new page
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Supporting Documentation (continued)', margin, yPos);
            yPos += 10;
          }
          
          try {
            // Load image from file
            const reader = new FileReader();
            const imageData = await new Promise<string>((resolve, reject) => {
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(photo);
            });
            
            // Calculate position
            const xPos = margin + (col * (photoWidth + photoGap));
            const currentY = yPos + (row * (photoHeight + photoGap));
            
            // Add image to PDF
            doc.addImage(imageData, 'JPEG', xPos, currentY, photoWidth, photoHeight);
            
            // Add photo caption
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Photo ${i + 1}`, xPos + photoWidth / 2, currentY + photoHeight + 4, { align: 'center' });
          } catch (error) {
            console.error(`Failed to load photo ${i + 1}:`, error);
          }
        }
        
        // Update yPos after photos on current page
        const photosOnLastPage = photosToDisplay.length % photosPerPage || photosPerPage;
        const rowsOnLastPage = Math.ceil(photosOnLastPage / 2);
        yPos += rowsOnLastPage * (photoHeight + photoGap) + 10;
      }

      if (preview) {
        // Generate blob URL for preview
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
        setShowPdfPreview(true);
      } else {
        // Download the PDF
        doc.save(`Post_Activity_Report_${templateData.activityTitle || 'Template'}.pdf`);
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Activity Report Template</DialogTitle>
            <DialogDescription>
              Fill out the template fields to see the format, then download as PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Form - Table Style */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  {/* Activity Title */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm w-1/3 border-r">
                      Activity Title:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.activityTitle}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, activityTitle: e.target.value }))}
                        placeholder="Enter activity title"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Office/Organizer */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Office/Organizer:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.officeOrganizer}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, officeOrganizer: e.target.value }))}
                        placeholder="Enter office/organizer"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Date and Time */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Date and Time:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.dateAndTime}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, dateAndTime: e.target.value }))}
                        placeholder="Enter date and time"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Venue */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Venue:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.venue}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, venue: e.target.value }))}
                        placeholder="Enter venue"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Objective */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Objective:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.objective}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, objective: e.target.value }))}
                        placeholder="Enter objective"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Summary of Implementation */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Summary of Implementation:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.summaryOfImplementation}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, summaryOfImplementation: e.target.value }))}
                        placeholder="Describe implementation"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Participants/Beneficiaries */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Participants/Beneficiaries:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.participantsBeneficiaries}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, participantsBeneficiaries: e.target.value }))}
                        placeholder="List participants/beneficiaries"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Key Achievements/Outputs */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Key Achievements/Outputs:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.keyAchievementsOutputs}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, keyAchievementsOutputs: e.target.value }))}
                        placeholder="List key achievements and outputs"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Supporting Documentation */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Supporting Documentation:
                    </td>
                    <td className="p-2">
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setTemplateData(prev => ({
                              ...prev,
                              supportingDocumentation: files
                            }));
                          }}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        {templateData.supportingDocumentation.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {templateData.supportingDocumentation.length} file(s) selected
                          </p>
                        )}
                      </div>
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {templateData.preparedDate ? format(new Date(templateData.preparedDate), 'MMM dd, yyyy') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={templateData.preparedDate ? new Date(templateData.preparedDate) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setTemplateData(prev => ({
                                  ...prev,
                                  preparedDate: date.toISOString().split('T')[0]
                                }));
                              }
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
              PDF Preview - Post Activity Report
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
                link.download = `Post_Activity_Report_${templateData.activityTitle || 'Template'}.pdf`;
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

export default PostActivityReportTemplate;
