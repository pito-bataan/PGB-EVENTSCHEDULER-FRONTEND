import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen,
  Calendar,
  Clock,
  Users,
  FileText,
  Upload,
  Building2,
  Package,
  CheckCircle2,
  Phone,
  Mail,
  Eye,
  AlertCircle,
  Timer,
  CalendarClock,
  MapPin,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const RequestEventGuidePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      number: 1,
      title: 'Choose Event Type',
      icon: Timer,
      iconColor: 'text-purple-600',
      items: [
        { 
          icon: Clock, 
          iconColor: 'text-blue-600', 
          title: 'Simple Event', 
          desc: 'This type of event must be submitted at least 7 days before your event date. This means you need to plan ahead and submit your request one week early. Simple events are usually smaller or less complicated events.'
        },
        { 
          icon: CalendarClock, 
          iconColor: 'text-green-600', 
          title: 'Complex Event', 
          desc: 'This type of event must be submitted at least 30 days (one month) before your event date. Complex events need more time to prepare because they usually involve more people, departments, or resources. Make sure to submit early!'
        },
        { 
          icon: AlertCircle, 
          iconColor: 'text-amber-600', 
          title: 'Important Note', 
          desc: 'The system will not allow you to select dates that do not meet these requirements. For example, if you choose "Simple Event", you cannot pick a date that is only 5 days away. The calendar will block those dates automatically.'
        }
      ]
    },
    {
      number: 2,
      title: 'Event Details',
      icon: FileText,
      iconColor: 'text-blue-600',
      items: [
        { 
          icon: FileText, 
          iconColor: 'text-gray-600', 
          title: 'Event Title', 
          desc: 'Type the name of your event. Be clear and specific. For example: "Basic Basketball Coaching".'
        },
        { 
          icon: UserCheck, 
          iconColor: 'text-gray-600', 
          title: 'Requestor', 
          desc: 'Enter your full name only. This helps us know who is requesting the event. For example: "Juan Dela Cruz".'
        },
        { 
          icon: MapPin, 
          iconColor: 'text-red-600', 
          title: 'Location', 
          desc: 'Type where your event will take place. Be specific about the venue. For example: "Kagitingan Hall Pavilion" or "Bataan People Center".'
        },
        { 
          icon: Calendar, 
          iconColor: 'text-indigo-600', 
          title: 'Start Date & Time', 
          desc: 'Select when your event will begin. Choose both the date (example: January 15, 2025) and the time (example: 9:00 AM). Make sure this follows your event type requirement.'
        },
        { 
          icon: Calendar, 
          iconColor: 'text-indigo-600', 
          title: 'End Date & Time', 
          desc: 'Select when your event will finish. Choose the date and time when everything will be done. For example, if your event starts at 9:00 AM, it might end at 5:00 PM on the same day.'
        },
        { 
          icon: Users, 
          iconColor: 'text-cyan-600', 
          title: 'Number of Participants', 
          desc: 'Enter the total number of people who will attend your event. Count everyone including staff, guests, and attendees. For example: 150 people.'
        },
        { 
          icon: Users, 
          iconColor: 'text-purple-600', 
          title: 'VIP Count', 
          desc: 'Enter how many VIP (Very Important Person) guests will attend. These are local people or special guests. For example: 10 VIPs.'
        },
        { 
          icon: Users, 
          iconColor: 'text-pink-600', 
          title: 'VVIP Count', 
          desc: 'Enter how many VVIP (Very Very Important Person) guests will attend. These are foreign persons or international guests. For example: 2 VVIPs.'
        },
        { 
          icon: UserCheck, 
          iconColor: 'text-emerald-600', 
          title: 'Governor Attendance Toggle', 
          desc: 'Turn this switch ON if Governor Joet Garcia will attend your event. If the Governor is not attending, leave it OFF. This is important because it affects what documents you need to submit.'
        },
        { 
          icon: Upload, 
          iconColor: 'text-orange-600', 
          title: 'Upload Documents (If Governor Attends)', 
          desc: 'If you turned ON the Governor toggle, a pop-up window will appear. You must upload two files: (1) Event Briefer - a document explaining your event details, and (2) Program - the schedule or flow of your event. These files help the Governor prepare.'
        },
        { 
          icon: Eye, 
          iconColor: 'text-purple-600', 
          title: 'View Template', 
          desc: 'Click this button to see a template that is automatically filled with the information you entered. This is helpful if you don\'t have the Event Briefer or Program files yet. You can use this template as a guide or download it.'
        },
        { 
          icon: FileText, 
          iconColor: 'text-gray-600', 
          title: 'Event Description', 
          desc: 'Write a detailed explanation about your event. Include the purpose, activities, and any special information. For example: "This event is a basic basketball coaching program for youth development. It includes training sessions, drills, and practice games."'
        }
      ]
    },
    {
      number: 3,
      title: 'Attachments',
      icon: Upload,
      iconColor: 'text-green-600',
      items: [
        { 
          icon: FileText, 
          iconColor: 'text-gray-600', 
          title: 'Supporting Files', 
          desc: 'Upload any documents, images, or files that support your event request. These can be letters, proposals, photos, or any relevant files. Accepted file types include PDF, DOC, DOCX, JPG, PNG, and more. You can upload multiple files if needed.'
        }
      ]
    },
    {
      number: 4,
      title: 'Tag Departments',
      icon: Building2,
      iconColor: 'text-orange-600',
      items: [
        { 
          icon: Building2, 
          iconColor: 'text-blue-600', 
          title: 'Select Departments', 
          desc: 'Choose which departments you need help from. Click on the departments that will provide materials or services for your event. Common departments include: PGSO (Provincial General Services Office), PEO (Provincial Engineering Office), PITO (Provincial Information Technology Office), and others. You can select multiple departments.'
        },
        { 
          icon: Package, 
          iconColor: 'text-green-600', 
          title: 'Example', 
          desc: 'For example, if you need chairs, tables, sound system, or stage equipment, you should select PGSO from the list. If you need technical support or projectors, select PITO. Choose all departments that can help make your event successful.'
        }
      ]
    },
    {
      number: 5,
      title: 'Select Requirements',
      icon: Package,
      iconColor: 'text-pink-600',
      items: [
        { 
          icon: CheckCircle2, 
          iconColor: 'text-green-600', 
          title: 'Requirements Modal Opens', 
          desc: 'After you select a department, a pop-up window (modal) will appear. This window shows all the materials and equipment that the department has available for your specific event date. You will see a list of items like chairs, tables, microphones, etc.'
        },
        { 
          icon: AlertCircle, 
          iconColor: 'text-amber-600', 
          title: 'What If The Modal Is Empty?', 
          desc: 'If the pop-up window is empty or shows no items, it means the department has not yet added their available materials for that date. When this happens, you need to contact them directly. Call or visit the PGSO office, PEO office, PITO office, or whichever department you selected. They will help you manually.'
        },
        { 
          icon: Package, 
          iconColor: 'text-blue-600', 
          title: 'Select Items and Quantities', 
          desc: 'From the list of available items, click on what you need. For each item, enter how many you need. For example: 50 chairs, 10 tables, 2 microphones. Make sure you select the correct quantities so the department can prepare everything for your event.'
        }
      ]
    },
    {
      number: 6,
      title: 'Schedule Verification',
      icon: Phone,
      iconColor: 'text-cyan-600',
      items: [
        { 
          icon: Phone, 
          iconColor: 'text-green-600', 
          title: 'Contact Number', 
          desc: 'Enter your mobile phone number. Make sure it is correct and active. The admin team will call or text you for follow-ups, confirmations, or if they have questions about your event. Use this format: 09XX-XXX-XXXX.'
        },
        { 
          icon: Mail, 
          iconColor: 'text-blue-600', 
          title: 'Email Address', 
          desc: 'Enter your email address. Make sure it is correct. This is for tagged departments to contact you if they need to reach you. For example: juan.delacruz@bataan.gov.ph'
        }
      ]
    },
    {
      number: 7,
      title: 'Review & Submit',
      icon: CheckCircle2,
      iconColor: 'text-indigo-600',
      items: [
        { 
          icon: Eye, 
          iconColor: 'text-purple-600', 
          title: 'Review Your Request', 
          desc: 'Before submitting, a pop-up window will appear showing ALL the information you entered in the previous steps. This includes your event details, selected departments, requirements, attachments, and contact information. Take your time to read everything carefully.'
        },
        { 
          icon: CheckCircle2, 
          iconColor: 'text-blue-600', 
          title: 'Verify Everything Is Correct', 
          desc: 'Check each detail one by one. Make sure the event title, date, time, location, and all other information are correct. Verify that you selected the right departments and requirements. If you see any mistakes, you can go back and fix them before submitting.'
        },
        { 
          icon: CheckCircle2, 
          iconColor: 'text-green-600', 
          title: 'Click Submit Button', 
          desc: 'After you have verified that everything is correct, click the "Submit" button. This will send your event request to the admin team for review and approval. Once you click submit, your request is officially recorded in the system.'
        },
        { 
          icon: CheckCircle2, 
          iconColor: 'text-emerald-600', 
          title: 'Success! Check My Events Page', 
          desc: 'After submitting, you will see a success message. Your event request is now saved! You can view your event by going to the "My Events" page in the sidebar. There you can track the status of your request (pending, approved, or rejected) and see any updates or messages from the admin.'
        }
      ]
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex justify-center">
            <div className="p-3 bg-muted rounded-xl">
              <BookOpen className="w-10 h-10 text-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">How to Request an Event</h1>
          <p className="text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
        </motion.div>

        {/* Main Card with Animation */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-4 flex-shrink-0 space-y-0">
                  <div className="flex items-center gap-3">
                    <Badge className="h-10 w-10 rounded-full flex items-center justify-center p-0 text-lg font-bold">
                      {currentStepData.number}
                    </Badge>
                    <StepIcon className={`w-7 h-7 ${currentStepData.iconColor}`} />
                  </div>
                  <CardTitle className="text-2xl pt-3">{currentStepData.title}</CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-hidden pt-0 pb-4">
                  <ScrollArea className="h-full w-full">
                    <div className="space-y-4 pr-4">
                      {currentStepData.items.map((item, itemIndex) => {
                        const ItemIcon = item.icon;
                        
                        return (
                          <motion.div
                            key={itemIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: itemIndex * 0.1 }}
                            className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border"
                          >
                            <ItemIcon className={`w-5 h-5 ${item.iconColor} flex-shrink-0 mt-0.5`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm mb-2">{item.title}</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </Button>

          <div className="flex gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'bg-primary w-8' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={nextStep}
            disabled={currentStep === steps.length - 1}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Need Help?</p>
                <p className="text-sm text-muted-foreground">
                  If you have questions, contact the <strong>Event Committee Admin</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default RequestEventGuidePage;
