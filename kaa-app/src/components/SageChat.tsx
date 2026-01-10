import React, { useState, useRef, useEffect } from 'react';
import logger from '../utils/logger';
import SageLogo from './SageLogo';
import './SageChat.css';

interface Message {
  id: string;
  type: 'user' | 'sage';
  content: string;
  timestamp: Date;
}

interface SageChatProps {
  clientAddress?: string;
}

interface ConversationContext {
  hasAskedAboutOnboarding: boolean;
  hasAskedAboutDocuments: boolean;
  hasAskedAboutMessages: boolean;
  hasAskedAboutUploads: boolean;
  onboardingStep: number;
  topicsCovered: string[];
}

interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  completedSteps: number[];
  userResponses: Record<string, string>;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface OnboardingQuestion {
  id: string;
  step: number;
  question: string;
  expectedResponses?: string[];
  followUpActions?: string[];
  nextStepLogic?: (response: string) => number;
}

interface Project {
  id: string;
  name: string;
  clientAddress: string;
  status: string;
  lastClientActivity: string;
  pendingDeliverables: number;
  clientUploads: number;
  priority: 'High' | 'Medium' | 'Low';
}

interface Deliverable {
  id: string;
  title: string;
  project: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'High' | 'Medium' | 'Low';
}

interface ClientActivity {
  id: string;
  clientAddress: string;
  activity: string;
  timestamp: string;
  type: 'login' | 'upload' | 'view' | 'message';
}

interface SageChatProps {
  clientAddress?: string;
  autoStartOnboarding?: boolean;
  currentView?: 'hub' | 'documents' | 'upload' | 'messages' | 'notifications' | 'analytics' | 'dashboard' | 'projects' | 'deliverables' | 'communications' | 'design-ideas';
  mode?: 'client' | 'team';
  teamMember?: string;
  role?: string;
  projects?: Project[];
  deliverables?: Deliverable[];
  clientActivity?: ClientActivity[];
}

const SageChat: React.FC<SageChatProps> = ({ 
  clientAddress = 'there', 
  autoStartOnboarding = false, 
  currentView = 'hub',
  mode = 'client',
  teamMember = '',
  role = '',
  projects = [],
  deliverables = [],
  clientActivity = []
}) => {
  // Initial message based on mode - use useMemo to avoid recreating on every render
  const initialMessage = React.useMemo<Message>(() => {
    if (mode === 'team') {
      // Get high priority tasks for initial message
      const highPriorityDeliverables = deliverables.filter(d => d.priority === 'High' && d.status !== 'completed');
      const urgentDeliverables = highPriorityDeliverables.filter(d => d.dueDate.toLowerCase().includes('tomorrow') || d.dueDate.toLowerCase().includes('today'));
      
      let taskGuidance = '';
      if (urgentDeliverables.length > 0) {
        const task = urgentDeliverables[0];
        taskGuidance = `**🚨 URGENT:** ${task.title} for ${task.project} is due ${task.dueDate}!`;
      } else if (highPriorityDeliverables.length > 0) {
        const task = highPriorityDeliverables[0];
        taskGuidance = `**Priority Task:** ${task.title} for ${task.project} (Due: ${task.dueDate})`;
      } else if (deliverables.length > 0) {
        const activeCount = deliverables.filter(d => d.status !== 'completed').length;
        taskGuidance = `You have ${activeCount} active deliverable${activeCount !== 1 ? 's' : ''}.`;
      } else {
        taskGuidance = `You're all caught up! 🎉`;
      }
      
      return {
        id: '1',
        type: 'sage',
        content: `Hi ${teamMember}! 👋 I'm Sage, your task assistant.\n\n**Your Focus Today:**\n${taskGuidance}\n\nI'll help you stay on track and guide you through your work. What would you like to tackle first?`,
        timestamp: new Date(),
      };
    }
    return {
      id: '1',
      type: 'sage',
      content: `Hello ${clientAddress}! 👋 I'm Sage, your onboarding assistant. I'm here to help you navigate the Client Portal and get the most out of your experience. What would you like to know?`,
      timestamp: new Date(),
    };
  }, [mode, teamMember, deliverables, clientAddress]);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<ConversationContext>({
    hasAskedAboutOnboarding: false,
    hasAskedAboutDocuments: false,
    hasAskedAboutMessages: false,
    hasAskedAboutUploads: false,
    onboardingStep: 0,
    topicsCovered: [],
  });

  // Initialize onboarding state from localStorage
  const loadOnboardingState = (): OnboardingState => {
    try {
      const saved = localStorage.getItem('kaa-onboarding-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          isActive: parsed.isActive || false,
          currentStep: parsed.currentStep || 0,
          completedSteps: parsed.completedSteps || [],
          userResponses: parsed.userResponses || {},
          startedAt: parsed.startedAt ? new Date(parsed.startedAt) : null,
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : null,
        };
      }
    } catch (error) {
      logger.error('Error loading onboarding state:', error);
    }
    return {
      isActive: false,
      currentStep: 0,
      completedSteps: [],
      userResponses: {},
      startedAt: null,
      completedAt: null,
    };
  };

  const [onboardingState, setOnboardingState] = useState<OnboardingState>(loadOnboardingState);

  // Save onboarding state to localStorage
  const saveOnboardingState = (state: OnboardingState) => {
    try {
      localStorage.setItem('kaa-onboarding-state', JSON.stringify({
        ...state,
        startedAt: state.startedAt?.toISOString() || null,
        completedAt: state.completedAt?.toISOString() || null,
      }));
      setOnboardingState(state);
    } catch (error) {
      logger.error('Error saving onboarding state:', error);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousViewRef = useRef<string>(currentView);
  const lastAcknowledgedStepRef = useRef<number>(0);
  const lastStepRef = useRef<number>(onboardingState.currentStep);

  // Reset acknowledgment when step changes
  useEffect(() => {
    if (lastStepRef.current !== onboardingState.currentStep) {
      lastAcknowledgedStepRef.current = 0; // Reset acknowledgment tracking
      lastStepRef.current = onboardingState.currentStep;
    }
  }, [onboardingState.currentStep]);

  // Map onboarding steps to expected views
  const stepToExpectedView: Record<number, string[]> = {
    2: ['hub'], // Dashboard step expects hub view
    3: ['documents'], // Documents step expects documents view
    4: ['messages'], // Messages step expects messages view
    5: ['upload'], // Upload step expects upload view
    6: ['hub', 'analytics'], // Progress step can be on hub or analytics
    7: ['design-ideas'], // Design ideas step expects design-ideas view
  };

  // Onboarding questions flow
  const onboardingQuestions: OnboardingQuestion[] = [
    {
      id: 'welcome',
      step: 1,
      question: `Welcome ${clientAddress}! 👋 Is this your first time using the Client Portal?`,
      expectedResponses: ['yes', 'no', 'first time', 'new', 'first', 'returning', 'back'],
      nextStepLogic: (response) => {
        const lowerResponse = response.toLowerCase();
        if (lowerResponse.includes('yes') || lowerResponse.includes('first') || lowerResponse.includes('new')) {
          return 2; // Go to dashboard overview
        }
        return 2; // Still show overview for returning users
      }
    },
    {
      id: 'dashboard',
      step: 2,
      question: `Let's start with your dashboard. Do you see the welcome banner at the top with "Welcome back! ${clientAddress}"?`,
      expectedResponses: ['yes', 'no', 'see', 'banner', 'welcome'],
      nextStepLogic: () => 3
    },
    {
      id: 'documents',
      step: 3,
      question: `Great! Have you found the **📄 Documents** tab in the top navigation bar?`,
      expectedResponses: ['yes', 'no', 'found', 'see', 'documents', 'tab'],
      nextStepLogic: () => 4
    },
    {
      id: 'messages',
      step: 4,
      question: `Perfect! Do you know how to contact your project manager using the **💬 Messages** tab?`,
      expectedResponses: ['yes', 'no', 'know', 'contact', 'message', 'manager'],
      nextStepLogic: () => 5
    },
    {
      id: 'upload',
      step: 5,
      question: `Excellent! Have you needed to share any files with your team using the **📤 Upload** button?`,
      expectedResponses: ['yes', 'no', 'upload', 'share', 'file', 'need'],
      nextStepLogic: () => 6
    },
    {
      id: 'progress',
      step: 6,
      question: `Wonderful! Have you checked your project progress? You can see it's 75% complete on your dashboard.`,
      expectedResponses: ['yes', 'no', 'progress', 'complete', 'status', 'seen'],
      nextStepLogic: () => 7
    },
    {
      id: 'design-ideas',
      step: 7,
      question: `Great! Have you explored the **🎨 Design Ideas** section? This is where you can collect inspiration images, import from Pinterest, and help us understand your design aesthetic preferences. Would you like to add some design ideas?`,
      expectedResponses: ['yes', 'no', 'explore', 'design', 'ideas', 'pinterest', 'inspiration', 'aesthetic'],
      nextStepLogic: () => 8
    },
    {
      id: 'completion',
      step: 8,
      question: `Fantastic! Do you feel comfortable navigating the Client Portal now?`,
      expectedResponses: ['yes', 'no', 'comfortable', 'ready', 'confident', 'still learning'],
      nextStepLogic: () => 9
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Team mode: Proactive task guidance based on view and deliverables
  useEffect(() => {
    if (mode === 'team' && isOpen) {
      // Team mode doesn't use onboarding - skip if onboarding state exists (shouldn't in team mode)
      if (onboardingState.isActive && mode !== 'team') return;
      
      const currentState = loadOnboardingState();
      const lastViewCheck = localStorage.getItem('kaa-sage-last-view-check');
      const lastView = lastViewCheck ? JSON.parse(lastViewCheck) : null;
      
      // Check if view changed and provide contextual guidance
      if (lastView?.view !== currentView || !lastView) {
        setTimeout(() => {
          let guidanceMessage = '';
          
          switch (currentView) {
            case 'dashboard':
              const pendingDeliverables = deliverables.filter(d => d.status !== 'completed');
              const highPriority = pendingDeliverables.filter(d => d.priority === 'High');
              
              if (highPriority.length > 0) {
                const urgent = highPriority.find(d => d.dueDate.toLowerCase().includes('tomorrow') || d.dueDate.toLowerCase().includes('today'));
                if (urgent) {
                  guidanceMessage = `**🚨 Urgent Task:** ${urgent.title} for ${urgent.project} is due ${urgent.dueDate}!\n\nGo to **📤 Deliverables** to update its status.`;
                } else {
                  guidanceMessage = `You have **${highPriority.length} high-priority** tasks.\n\nCheck **📤 Deliverables** to see what needs your attention first.`;
                }
              } else if (pendingDeliverables.length > 0) {
                guidanceMessage = `You have **${pendingDeliverables.length} pending deliverables**.\n\nVisit **📤 Deliverables** to track your progress.`;
              } else {
                guidanceMessage = `Great job! You're all caught up. Check **📋 Projects** to see your active work.`;
              }
              break;
              
            case 'projects':
              const activeProjects = projects.filter(p => p.status !== 'Completed');
              guidanceMessage = `You have **${activeProjects.length} active projects**.\n\n**Recent Activity:**\n${clientActivity.slice(0, 2).map(a => `• ${a.clientAddress}: ${a.activity}`).join('\n')}\n\nNeed help prioritizing? Ask me!`;
              break;
              
            case 'deliverables':
              const pendingCount = deliverables.filter(d => d.status === 'pending').length;
              const inProgressCount = deliverables.filter(d => d.status === 'in-progress').length;
              
              if (pendingCount > 0) {
                const nextTask = deliverables.find(d => d.status === 'pending' && d.priority === 'High');
                if (nextTask) {
                  guidanceMessage = `**Next Priority:** ${nextTask.title} (Due: ${nextTask.dueDate})\n\nStart working on this to stay on schedule!`;
                } else {
                  guidanceMessage = `You have **${pendingCount} pending** deliverables.\n\nReview them and start with the highest priority.`;
                }
              } else if (inProgressCount > 0) {
                guidanceMessage = `You have **${inProgressCount} tasks in progress**.\n\nKeep up the momentum! Complete one to free up capacity.`;
              } else {
                guidanceMessage = `All deliverables are on track! 🎉\n\nCheck **📋 Projects** for any new assignments.`;
              }
              break;
              
            case 'communications':
              const projectsNeedingContact = projects.filter(p => {
                const timeMatch = p.lastClientActivity.match(/(\d+)\s*(hour|day|week)/);
                if (!timeMatch) return false;
                const value = parseInt(timeMatch[1]);
                const unit = timeMatch[2];
                return (unit === 'day' && value >= 2) || (unit === 'week');
              });
              
              if (projectsNeedingContact.length > 0) {
                guidanceMessage = `**📞 Follow-up Needed:** ${projectsNeedingContact[0].name}\n\nLast client activity was ${projectsNeedingContact[0].lastClientActivity}. Consider reaching out!`;
              } else {
                guidanceMessage = `All projects have recent client activity. 💬\n\nUse this section to stay connected with clients.`;
              }
              break;
              
            case 'messages':
              guidanceMessage = `**💬 Messages** - Stay connected with your team and clients.\n\nRespond to any urgent messages first, then work through your inbox.`;
              break;
              
            case 'notifications':
              guidanceMessage = `**🔔 Notifications** - Stay updated on all project activity.\n\nReview any new notifications and take action as needed.`;
              break;
          }
          
          if (guidanceMessage && (!lastView || lastView.view !== currentView)) {
            const message: Message = {
              id: Date.now().toString(),
              type: 'sage',
              content: guidanceMessage,
              timestamp: new Date(),
            };
            
            // Only add if we haven't already shown guidance for this view in this session
            setMessages(prev => {
              const lastSageMessage = prev[prev.length - 1];
              if (lastSageMessage && lastSageMessage.type === 'sage' && lastSageMessage.content.includes(guidanceMessage.split('\n')[0])) {
                return prev; // Don't duplicate
              }
              return [...prev, message];
            });
            
            localStorage.setItem('kaa-sage-last-view-check', JSON.stringify({ view: currentView, timestamp: Date.now() }));
          }
        }, 1000);
      }
    }
  }, [currentView, mode, isOpen, deliverables, projects, clientActivity]);

  // Auto-start onboarding on first visit (client mode only)
  useEffect(() => {
    if (mode !== 'client') return;
    const isOnboardingCompleted = localStorage.getItem('kaa-onboarding-completed') === 'true';
    const skipOnboarding = sessionStorage.getItem('skip_onboarding') === 'true';
    
    // Skip onboarding if explicitly requested or already completed
    if (skipOnboarding || isOnboardingCompleted) {
      return;
    }
    
    if (autoStartOnboarding && !isOnboardingCompleted) {
      // Check if onboarding should start (not completed and auto-start enabled)
      const currentState = loadOnboardingState();
      
      if (!currentState.isActive && currentState.currentStep === 0) {
        // Start onboarding from beginning
        const newState: OnboardingState = {
          isActive: true,
          currentStep: 1,
          completedSteps: [],
          userResponses: {},
          startedAt: new Date(),
          completedAt: null,
        };
        
        saveOnboardingState(newState);
        
        // Auto-open chat widget
        setIsOpen(true);
        
        // Replace default message with first onboarding question
        const firstQuestion = onboardingQuestions.find(q => q.step === 1);
        if (firstQuestion) {
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            type: 'sage',
            content: firstQuestion.question,
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
      } else if (currentState.isActive && currentState.currentStep > 0 && currentState.currentStep <= 7) {
        // Resume onboarding if it was in progress
        setIsOpen(true);
        const currentQuestion = onboardingQuestions.find(q => q.step === currentState.currentStep);
        if (currentQuestion) {
          // Check if we need to show the question (messages might be empty or have default message)
          const lastMessage = messages[messages.length - 1];
          const isAlreadyShowingQuestion = lastMessage && lastMessage.content.includes(currentQuestion.question);
          
          if (!isAlreadyShowingQuestion) {
            const resumeMessage: Message = {
              id: Date.now().toString(),
              type: 'sage',
              content: currentQuestion.question,
              timestamp: new Date(),
            };
            // Replace or add the question message
            if (messages.length === 1 && messages[0].type === 'sage') {
              // Replace default message
              setMessages([resumeMessage]);
            } else {
              // Add to existing messages
              setMessages(prev => [...prev, resumeMessage]);
            }
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // onboardingQuestions is stable (defined in component), messages are managed by effect
  }, [autoStartOnboarding]);

  // Detect navigation and auto-advance onboarding
  useEffect(() => {
    // Only process if onboarding is active and we haven't already acknowledged this step for this view
    if (!onboardingState.isActive || onboardingState.completedAt) {
      previousViewRef.current = currentView;
      return;
    }
    
    const currentStep = onboardingState.currentStep;
    const expectedViews = stepToExpectedView[currentStep];
    
    // Check if current view matches expected view for this step
    if (expectedViews && expectedViews.includes(currentView)) {
      // Check if view actually changed (not just initial mount)
      const viewChanged = previousViewRef.current !== currentView;
      const notAlreadyAcknowledged = lastAcknowledgedStepRef.current !== currentStep;
      
      if (viewChanged && notAlreadyAcknowledged) {
        // Wait a moment to ensure the view is fully loaded
        const acknowledgeTimer = setTimeout(() => {
          // Mark this step as acknowledged for this view
          lastAcknowledgedStepRef.current = currentStep;
          
          // Auto-acknowledge the navigation and advance
          const currentState = loadOnboardingState();
          // Double-check state is still valid (hasn't changed since we started)
          if (currentState.currentStep === currentStep && currentState.isActive && !currentState.completedAt) {
            // Generate acknowledgment message based on step
            let acknowledgmentMessage = '';
            let autoResponse = '';
            
            switch (currentStep) {
              case 2: // Dashboard
                autoResponse = 'yes';
                acknowledgmentMessage = `Perfect! I can see you're on your dashboard! 🎉\n\nYou can see:\n**📊 Summary Cards** (12 documents, 3 uploads, 2 pending)\n**📋 Recent Activity** (latest updates on the left)\n**📄 Important Documents** (pinned files below)\n**📈 Project Progress** (75% complete on the right)\n**⚡ Quick Actions** (shortcuts on the right)\n\nEverything you need is right here on your dashboard!`;
                break;
              
              case 3: // Documents
                autoResponse = 'yes';
                acknowledgmentMessage = `Excellent! I see you've navigated to the Documents page! 📄\n\nHere you can:\n• Browse all your project files\n• Search for specific documents\n• View important documents (marked with 📌)\n• Download or view documents directly\n\nYour important documents include:\n• Project Contract.pdf (updated 2 days ago)\n• Service Agreement.pdf (updated 1 week ago)\n\nTake a moment to explore your documents!`;
                break;
              
              case 4: // Messages
                autoResponse = 'yes';
                acknowledgmentMessage = `Great! You've opened Messages! 💬\n\nFrom here you can:\n• Send messages to your project manager\n• Ask questions about your project\n• Share updates or concerns\n• Get real-time responses\n• View message history\n\nYour project manager is ready to help - feel free to send a message anytime!`;
                break;
              
              case 5: // Upload
                autoResponse = 'yes';
                acknowledgmentMessage = `Perfect! You're on the Upload page! 📤\n\nYou can now:\n• Select files to upload (PDF, DOCX, images, etc.)\n• Add descriptions for context\n• Upload files to share with your team\n\n**💡 Tip:** Name your files clearly (e.g., "Invoice_January_2026.pdf") for easy reference.\n\nYour team will be notified automatically when you upload files!`;
                break;
              
              case 6: // Progress
                autoResponse = 'yes';
                acknowledgmentMessage = `Wonderful! I can see you're checking your progress! 📊\n\nYour project is **75% complete**!\n\n**✅ Completed:**\n• Project Kickoff (Jan 15)\n• Phase 1 Delivery (Feb 20)\n\n**🔄 In Progress:**\n• Phase 2 Review (currently active)\n\n**⏳ Upcoming:**\n• Final Delivery (Target: Apr 30)\n\nYou can track your progress from the dashboard or view detailed analytics here!`;
                break;
            }
            
            if (acknowledgmentMessage && autoResponse) {
              // Ensure chat is open to show acknowledgment
              if (!isOpen) {
                setIsOpen(true);
              }
              
              // Add acknowledgment message
              const ackMessage: Message = {
                id: Date.now().toString(),
                type: 'sage',
                content: acknowledgmentMessage,
                timestamp: new Date(),
              };
              
              setMessages(prev => [...prev, ackMessage]);
              
              // Process the step automatically (simulate user saying "yes")
              setTimeout(() => {
                const result = processOnboardingStep(autoResponse, currentStep);
                
                // Save user response
                const updatedResponses = {
                  ...currentState.userResponses,
                  [`step_${currentStep}`]: `[Auto-detected navigation to ${currentView}]`,
                };
                
                // Update onboarding state
                let updatedState: OnboardingState;
                if (result.isComplete) {
                  updatedState = {
                    ...currentState,
                    isActive: false,
                    currentStep: result.nextStep,
                    completedSteps: [...currentState.completedSteps, currentStep],
                    userResponses: updatedResponses,
                    completedAt: new Date(),
                  };
                  localStorage.setItem('kaa-onboarding-completed', 'true');
                } else {
                  updatedState = {
                    ...currentState,
                    currentStep: result.nextStep,
                    completedSteps: [...currentState.completedSteps, currentStep],
                    userResponses: updatedResponses,
                  };
                }
                
                saveOnboardingState(updatedState);
                
                // Add next question message
                const nextQuestion = onboardingQuestions.find(q => q.step === result.nextStep);
                if (nextQuestion && !result.isComplete) {
                  setTimeout(() => {
                    const nextMessage: Message = {
                      id: (Date.now() + 1).toString(),
                      type: 'sage',
                      content: result.content,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, nextMessage]);
                  }, 800);
                } else if (result.isComplete) {
                  setTimeout(() => {
                    const completeMessage: Message = {
                      id: (Date.now() + 1).toString(),
                      type: 'sage',
                      content: result.content,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, completeMessage]);
                  }, 800);
                }
              }, 1500);
            }
          }
        }, 500); // Small delay to ensure view is loaded
        
        return () => clearTimeout(acknowledgeTimer);
      }
    }
    
    // Update previous view
    previousViewRef.current = currentView;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // processOnboardingStep and onboardingQuestions are stable, stepToExpectedView is stable
    // isOpen is checked but doesn't need to trigger re-run
  }, [currentView, onboardingState.currentStep, onboardingState.isActive, deliverables, projects, clientActivity, mode]);

  // Process onboarding step response
  const processOnboardingStep = (userResponse: string, currentStep: number): { content: string; nextStep: number; isComplete: boolean } => {
    const currentQuestion = onboardingQuestions.find(q => q.step === currentStep);
    if (!currentQuestion) {
      return { content: 'Thank you! Your onboarding is complete.', nextStep: 9, isComplete: true };
    }

    const lowerResponse = userResponse.toLowerCase();
    let nextStep = currentStep + 1;
    let content = '';

    // Check if there's custom next step logic
    if (currentQuestion.nextStepLogic) {
      nextStep = currentQuestion.nextStepLogic(userResponse);
    }

    // Generate contextual response based on step
    switch (currentStep) {
      case 1: // Welcome
        if (lowerResponse.includes('yes') || lowerResponse.includes('first') || lowerResponse.includes('new')) {
          content = `Perfect! I'm Sage, your onboarding assistant. I'll guide you through everything step by step.\n\n**Let's begin!** Your dashboard is your command center - you can see your welcome banner, summary cards, and project progress right here.`;
        } else {
          content = `Welcome back! Even if you've been here before, let me quickly show you around to make sure you're getting the most out of the portal.`;
        }
        break;

      case 2: // Dashboard
        if (lowerResponse.includes('yes') || lowerResponse.includes('see')) {
          content = `Excellent! 🎉 You can see:\n\n**📊 Summary Cards** (12 documents, 3 uploads, 2 pending)\n**📋 Recent Activity** (latest updates on the left)\n**📄 Important Documents** (pinned files below)\n**📈 Project Progress** (75% complete on the right)\n**⚡ Quick Actions** (shortcuts on the right)\n\nEverything you need is right here on your dashboard!`;
        } else {
          content = `No worries! Look at the top of your dashboard - you should see a purple banner that says "Welcome back! ${clientAddress}". Below that are summary cards showing your stats. Can you see them now?`;
        }
        break;

      case 3: // Documents
        if (lowerResponse.includes('yes') || lowerResponse.includes('found') || lowerResponse.includes('see')) {
          content = `Wonderful! 📄 Click on **Documents** to see all your project files. You can:\n\n• Browse all documents\n• Search for specific files\n• View important documents (marked with 📌)\n\nYour important documents include:\n• Project Contract.pdf (updated 2 days ago)\n• Service Agreement.pdf (updated 1 week ago)\n\nTry clicking the **📄 Documents** tab to explore!`;
        } else {
          content = `Let me help you find it! Look at the top navigation bar - you'll see several tabs: 🏠 Dashboard, **📄 Documents**, 💬 Messages, etc. The Documents tab is right there. Can you see it now?`;
        }
        break;

      case 4: // Messages
        if (lowerResponse.includes('yes') || lowerResponse.includes('know')) {
          content = `Perfect! 💬 You can message your project manager by:\n\n1. Clicking **💬 Messages** in the top navigation\n2. Or using "Contact Manager" in Quick Actions (right side of dashboard)\n\nYour messages help you:\n• Ask questions about your project\n• Share updates or concerns\n• Get real-time responses\n• Stay connected with your team\n\nFeel free to send a message anytime!`;
        } else {
          content = `No problem! Here's how to contact your project manager:\n\n1. Click **💬 Messages** in the top navigation bar\n2. Or find "Contact Manager" in the Quick Actions section (right side of your dashboard)\n\nOnce you open Messages, you can send questions, updates, or requests directly to your project manager. They'll respond as soon as possible!`;
        }
        break;

      case 5: // Upload
        if (lowerResponse.includes('yes') || lowerResponse.includes('need') || lowerResponse.includes('share')) {
          content = `Great! 📤 Here's how to upload files:\n\n1. Click **📤 Upload** button in the top navigation\n2. Select your file (PDF, DOCX, images, etc.)\n3. Add a description (optional but helpful)\n4. Click "Upload"\n\nYour team will be notified automatically when you upload a file!\n\n**💡 Tip:** Name your files clearly (e.g., "Invoice_January_2026.pdf") for easy reference.`;
        } else {
          content = `That's okay! When you do need to share files, here's how:\n\n1. Click **📤 Upload** in the top navigation\n2. Select your file\n3. Add a description\n4. Upload!\n\nYour team will automatically get a notification when you upload files. You can also find the Upload button in the Quick Actions section.`;
        }
        break;

      case 6: // Progress
        if (lowerResponse.includes('yes') || lowerResponse.includes('seen') || lowerResponse.includes('check')) {
          content = `Excellent! 📊 Your project is **75% complete**!\n\n**✅ Completed:**\n• Project Kickoff (Jan 15)\n• Phase 1 Delivery (Feb 20)\n\n**🔄 In Progress:**\n• Phase 2 Review (currently active)\n\n**⏳ Upcoming:**\n• Final Delivery (Target: Apr 30)\n\nYou can see the progress bar and milestones on the right side of your dashboard. For detailed analytics, click **📊 Analytics** in the navigation!`;
        } else {
          content = `Take a look! 📊 On the right side of your dashboard, you'll see a "Project Progress" section showing **75% Complete**.\n\nYou can see:\n• Progress bar visualization\n• Completed milestones (✅)\n• Current phase (🔄)\n• Upcoming deadlines (⏳)\n\nThis helps you track where your project is at any time!`;
        }
        break;

      case 7: // Design Ideas
        if (lowerResponse.includes('yes') || lowerResponse.includes('explore') || lowerResponse.includes('design') || lowerResponse.includes('ideas') || lowerResponse.includes('pinterest')) {
          content = `Perfect! 🎨 The **Design Ideas** section is a powerful tool to help us understand your vision!\n\n**What You Can Do:**\n• Upload inspiration images from your computer\n• Import entire boards from Pinterest\n• Add images by URL\n• Tag images with styles (Modern, Traditional, Rustic, etc.)\n• Build a visual library of your aesthetic preferences\n\n**Why This Matters:**\nThe more design ideas you share, the better we can:\n• Understand your style preferences\n• Create designs that match your vision\n• Streamline the design process\n• Reduce revisions\n\n**Try It Now:**\n1. Click **🎨 Design Ideas** in the navigation\n2. Click "+ Add Image" to get started\n3. Or import from Pinterest if you have boards!\n\n**💡 Pro Tip:** Tag your images with styles like "Modern", "Rustic", or "Tropical" to help us categorize your preferences!`;
        } else {
          content = `No problem! The **Design Ideas** section is optional but really helpful.\n\n**What It Does:**\n• Lets you collect inspiration images\n• Helps us understand your aesthetic preferences\n• Can import from your Pinterest boards\n• Streamlines the design process\n\n**When You're Ready:**\nJust click **🎨 Design Ideas** in the navigation bar anytime. You can add images whenever inspiration strikes!\n\n**Benefits:**\n• Faster design iterations\n• Better alignment with your vision\n• Fewer revisions needed\n• More personalized results\n\nFeel free to explore it later when you're ready!`;
        }
        break;

      case 8: // Completion
        if (lowerResponse.includes('yes') || lowerResponse.includes('comfortable') || lowerResponse.includes('ready') || lowerResponse.includes('confident')) {
          content = `Fantastic! 🎉 You're all set!\n\n**Quick Reference:**\n• **📄 Documents** - Access all your project files\n• **💬 Messages** - Contact your project manager\n• **📤 Upload** - Share files with your team\n• **📊 Analytics** - View detailed project insights\n• **🔔 Notifications** - Stay updated on everything\n\n**Remember:** I'm always here if you have questions! Just click my chat button anytime. 👋\n\nWelcome to your Client Portal!`;
        } else {
          content = `That's perfectly fine! Learning takes time. 🤗\n\n**Quick Tips:**\n• Take your time exploring each feature\n• Try clicking different tabs to see what's available\n• Use the Quick Actions for fast access to common tasks\n• I'm here anytime you need help - just ask!\n\n**You can always:**\n• Ask me "Show me my documents"\n• Ask "How do I contact my team?"\n• Ask about any feature you're curious about\n\nFeel free to explore at your own pace!`;
        }
        break;

      default:
        content = 'Thank you for completing onboarding!';
        break;
    }

    // Check if we've reached the end
    if (nextStep > 8) {
      return { content, nextStep: 9, isComplete: true };
    }

    // Get next question
    const nextQuestion = onboardingQuestions.find(q => q.step === nextStep);
    if (nextQuestion) {
      content += `\n\n**Next Question:**\n\n${nextQuestion.question}`;
    }

    return { content, nextStep, isComplete: false };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userResponse = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    // Check if user wants to resume onboarding
    const lowerResponse = userResponse.toLowerCase();
    if ((lowerResponse.includes('resume') || lowerResponse.includes('continue') || lowerResponse.includes('start onboarding') || 
         lowerResponse.includes('help me onboard') || lowerResponse.includes('begin onboarding')) && 
        !onboardingState.isActive && onboardingState.currentStep > 0 && !onboardingState.completedAt) {
      handleResumeOnboarding();
      setIsTyping(false);
      return;
    }

    // Check if onboarding is active
    if (onboardingState.isActive && onboardingState.currentStep > 0 && onboardingState.currentStep <= 7) {
      // Process onboarding step
      setTimeout(() => {
        const currentState = loadOnboardingState();
        const result = processOnboardingStep(userResponse, currentState.currentStep);

        // Save user response
        const updatedResponses = {
          ...currentState.userResponses,
          [`step_${currentState.currentStep}`]: userResponse,
        };

        // Update onboarding state
        let updatedState: OnboardingState;
        if (result.isComplete) {
          // Mark onboarding as complete
          updatedState = {
            ...currentState,
            isActive: false,
            currentStep: result.nextStep,
            completedSteps: [...currentState.completedSteps, currentState.currentStep],
            userResponses: updatedResponses,
            completedAt: new Date(),
          };
          localStorage.setItem('kaa-onboarding-completed', 'true');
        } else {
          updatedState = {
            ...currentState,
            currentStep: result.nextStep,
            completedSteps: [...currentState.completedSteps, currentState.currentStep],
            userResponses: updatedResponses,
          };
        }

        saveOnboardingState(updatedState);

        // Add Sage's response
        const sageResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'sage',
          content: result.content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, sageResponse]);
        setIsTyping(false);
      }, 1000 + Math.random() * 1000);
    } else {
      // Use ChatGPT API for intelligent responses when not in onboarding
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        
        // Prepare conversation history (last 10 messages for context)
        const conversationHistory = messages.slice(-10).map(msg => ({
          type: msg.type,
          content: msg.content
        }));

        const response = await fetch(`${apiUrl}/api/sage/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userResponse,
            conversationHistory,
            clientAddress,
            mode,
            currentView,
            onboardingActive: onboardingState.isActive,
            onboardingStep: onboardingState.currentStep
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        const sageResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'sage',
          content: data.response || 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, sageResponse]);
        setIsTyping(false);
      } catch (error) {
        logger.error('Error calling Sage ChatGPT API:', error);
        
        // Fallback to basic response if API fails
        const fallbackResponse = generateSageResponse(userResponse, context);
        const sageResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'sage',
          content: fallbackResponse.content || 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, sageResponse]);
        setContext(fallbackResponse.newContext);
        setIsTyping(false);
      }
    }
  };

  const generateSageResponse = (
    userInput: string,
    currentContext: ConversationContext
  ): { content: string; newContext: ConversationContext } => {
    const lowerInput = userInput.toLowerCase();
    const newContext = { ...currentContext };
    let content = '';

    // Team mode - task-focused responses
    if (mode === 'team') {
      // What should I work on / what's my priority
      if (lowerInput.includes('what should') || lowerInput.includes('what do i') || lowerInput.includes('priority') || 
          lowerInput.includes('next task') || lowerInput.includes('what to work')) {
        const pendingDeliverables = deliverables.filter(d => d.status !== 'completed');
        const highPriority = pendingDeliverables.filter(d => d.priority === 'High');
        const urgent = highPriority.find(d => d.dueDate.toLowerCase().includes('tomorrow') || d.dueDate.toLowerCase().includes('today'));
        
        if (urgent) {
          content = `**🚨 URGENT TASK:**\n\n**${urgent.title}**\n• Project: ${urgent.project}\n• Due: ${urgent.dueDate}\n• Status: ${urgent.status}\n\n**Action:** Go to **📤 Deliverables** and start working on this immediately!\n\nThis should be your top priority right now.`;
        } else if (highPriority.length > 0) {
          const nextTask = highPriority[0];
          content = `**🎯 Your Next Priority:**\n\n**${nextTask.title}**\n• Project: ${nextTask.project}\n• Due: ${nextTask.dueDate}\n• Status: ${nextTask.status}\n\nYou have **${highPriority.length} high-priority** tasks total. Focus on this one first!\n\nGo to **📤 Deliverables** to update its status.`;
        } else if (pendingDeliverables.length > 0) {
          const nextTask = pendingDeliverables[0];
          content = `**📋 Next Task:**\n\n**${nextTask.title}**\n• Project: ${nextTask.project}\n• Due: ${nextTask.dueDate}\n• Priority: ${nextTask.priority}\n\nYou have **${pendingDeliverables.length} pending deliverables**. Start with this one!\n\nVisit **📤 Deliverables** to begin.`;
        } else {
          content = `🎉 Great news! You're all caught up with deliverables!\n\n**Check these areas:**\n• **📋 Projects** - Review any new assignments\n• **💬 Messages** - Respond to any client communications\n• **🔔 Notifications** - Check for any updates\n\nKeep up the great work!`;
        }
        return { content, newContext };
      }

      // Show my tasks / deliverables
      if (lowerInput.includes('my task') || lowerInput.includes('deliverable') || lowerInput.includes('assignment') ||
          lowerInput.includes('what i have') || lowerInput.includes('show task')) {
        const pendingCount = deliverables.filter(d => d.status !== 'completed').length;
        const inProgressCount = deliverables.filter(d => d.status === 'in-progress').length;
        const highPriority = deliverables.filter(d => d.priority === 'High' && d.status !== 'completed');
        
        content = `**Your Current Workload:**\n\n• **${pendingCount}** Pending Deliverables\n• **${inProgressCount}** In Progress\n• **${highPriority.length}** High Priority\n\n**Top Priority Tasks:**\n${highPriority.slice(0, 3).map(d => `• ${d.title} (Due: ${d.dueDate})`).join('\n')}\n\nGo to **📤 Deliverables** to see all your tasks and update their status!`;
        return { content, newContext };
      }

      // How do I navigate / where is X
      if (lowerInput.includes('where') || lowerInput.includes('how do i') || lowerInput.includes('navigate') ||
          lowerInput.includes('find') || lowerInput.includes('go to')) {
        if (lowerInput.includes('project') || lowerInput.includes('assignment')) {
          content = `**📋 Projects** are in the top navigation bar!\n\nClick **📋 Projects** to see:\n• All your assigned projects\n• Project status and progress\n• Client activity for each project\n\nYou currently have **${projects.length} assigned projects**.`;
        } else if (lowerInput.includes('deliverable') || lowerInput.includes('task')) {
          content = `**📤 Deliverables** are in the top navigation bar!\n\nClick **📤 Deliverables** to:\n• View all your tasks\n• Update task status\n• See due dates and priorities\n• Mark tasks as complete\n\nYou have **${deliverables.filter(d => d.status !== 'completed').length} pending deliverables**.`;
        } else if (lowerInput.includes('message') || lowerInput.includes('communication')) {
          content = `**💬 Messages** are in the top navigation bar!\n\nClick **💬 Messages** to:\n• Send messages to clients\n• View message history\n• Stay connected with your team\n\n**💡 Tip:** Check **📞 Communications** for project-specific client contact options.`;
        } else {
          content = `**Navigation Guide:**\n\n• **🏠 Dashboard** - Overview of your work and stats\n• **📋 Projects** - All assigned projects\n• **📤 Deliverables** - Your tasks and assignments\n• **📞 Communications** - Client contact and messaging\n• **💬 Messages** - Team and client messaging\n• **🔔 Notifications** - Updates and alerts\n\nWhat would you like to access?`;
        }
        return { content, newContext };
      }

      // Project status / what projects do I have
      if (lowerInput.includes('project') && (lowerInput.includes('have') || lowerInput.includes('assigned') || lowerInput.includes('my'))) {
        const activeProjects = projects.filter(p => p.status !== 'Completed');
        content = `**Your Projects (${activeProjects.length} active):**\n\n${activeProjects.map(p => `**${p.name}**\n• Client: ${p.clientAddress}\n• Status: ${p.status}\n• Pending: ${p.pendingDeliverables} deliverables\n• Last Activity: ${p.lastClientActivity}\n`).join('\n')}\n\nGo to **📋 Projects** to see full details!`;
        return { content, newContext };
      }

      // Default team help
      if (lowerInput.includes('help') || lowerInput.includes('what can')) {
        content = `**I can help you with:**\n\n**📋 Task Management:**\n• "What should I work on?" - Get your top priority\n• "Show my tasks" - See all deliverables\n• "What's my priority?" - Next urgent task\n\n**📊 Project Management:**\n• "What projects do I have?" - List your projects\n• "Navigate to projects" - Find project section\n\n**💬 Communication:**\n• "How do I message clients?" - Communication help\n• "Where are messages?" - Find messaging\n\n**🎯 Stay On Task:**\nI'll automatically guide you when you navigate to different sections!\n\n**What do you need help with?**`;
        return { content, newContext };
      }
    }

    // Onboarding flow - specific steps (client mode only)
    if (lowerInput.includes('onboard') || lowerInput.includes('start') || lowerInput.includes('begin') || 
        lowerInput.includes('next step') || lowerInput.includes('what do i do') || lowerInput.includes('how do i start')) {
      
      if (!newContext.hasAskedAboutOnboarding || newContext.onboardingStep === 0) {
        newContext.hasAskedAboutOnboarding = true;
        newContext.onboardingStep = 1;
        content = `Great! Let's get you started. Here's your onboarding path:\n\n**Step 1: Explore Your Dashboard** 🏠\nLook at your current dashboard - you can see:\n• 12 total documents ready for you\n• Recent activity and updates\n• Project progress at 75%\n\n**Step 2: Review Important Documents** 📄\nI recommend starting with:\n• "Project Contract.pdf" (updated 2 days ago)\n• "Service Agreement.pdf" (updated 1 week ago)\n\nClick **📄 Documents** in the top navigation to see everything.\n\n**What would you like to do first?**\n• "Show me my documents"\n• "Tell me about messages"\n• "How do I contact my team?"`;
      } else if (newContext.onboardingStep === 1) {
        newContext.onboardingStep = 2;
        content = `Perfect! Let's continue your onboarding.\n\n**Step 3: Connect with Your Team** 💬\nYour project manager is available via Messages. You can:\n• Click **💬 Messages** in the navigation\n• Use "Contact Manager" in Quick Actions\n• Send questions, updates, or feedback\n\n**Step 4: Stay Updated** 🔔\nCheck **🔔 Notifications** regularly for:\n• New document uploads\n• Project timeline changes\n• Team messages\n• Important deadlines\n\n**Ready for the next step?** Try asking:\n• "How do I upload a file?"\n• "Show me project progress"\n• "What's my current status?"`;
      } else {
        content = `You're making great progress! 🎉\n\nBased on what you've learned, here's what you can do now:\n\n**Immediate Actions:**\n1. Review your documents (📄 Documents tab)\n2. Check your project progress (shown on dashboard)\n3. Connect with your team (💬 Messages)\n\n**Explore Further:**\n• Upload files your team needs (📤 Upload)\n• View detailed analytics (📊 Analytics)\n• Check all notifications (🔔 Notifications)\n\n**Is there something specific you'd like help with right now?**`;
      }
      newContext.topicsCovered.push('onboarding');
      return { content, newContext };
    }

    // Documents - specific guidance
    if (lowerInput.includes('document') || lowerInput.includes('file') || lowerInput.includes('pdf') || 
        (lowerInput.includes('show me') && (lowerInput.includes('doc') || lowerInput.includes('file')))) {
      
      if (!newContext.hasAskedAboutDocuments) {
        newContext.hasAskedAboutDocuments = true;
        content = `Perfect! Here's how to access your documents:\n\n**📍 Location:** Click **📄 Documents** in the top navigation bar\n\n**📋 What You'll Find:**\n• All project files in one place\n• Search functionality\n• Organized by date and type\n\n**🎯 Recommended First Steps:**\n1. Click the **📄 Documents** tab now\n2. Start with "Project Contract.pdf" - it's important\n3. Review "Service Agreement.pdf"\n\n**💡 Pro Tip:** Use the Quick Actions "View Documents" button on your dashboard for quick access!\n\nWould you like me to walk you through uploading a document next?`;
      } else {
        content = `You already know where to find documents! 📄\n\n**Quick Reminder:**\n• Click **📄 Documents** in the navigation\n• Or use "View Documents" in Quick Actions\n\n**Try This Now:**\n1. Click the **📄 Documents** tab\n2. Look for files marked with a 📌 pin - those are important\n3. Click any document to view it\n\nNeed help with something else?`;
      }
      newContext.topicsCovered.push('documents');
      return { content, newContext };
    }

    // Messages - specific guidance
    if (lowerInput.includes('message') || lowerInput.includes('contact') || lowerInput.includes('team') || 
        lowerInput.includes('manager') || lowerInput.includes('communicate')) {
      
      if (!newContext.hasAskedAboutMessages) {
        newContext.hasAskedAboutMessages = true;
        content = `Great question! Here's how to connect with your team:\n\n**📍 How to Message:**\n1. Click **💬 Messages** in the top navigation\n2. Or use "Contact Manager" in Quick Actions (right side of dashboard)\n\n**💬 What You Can Do:**\n• Send messages to your project manager\n• Ask questions about your project\n• Share updates or concerns\n• Get real-time responses\n\n**🎯 Right Now:**\nTry clicking the **💬 Messages** tab - it's that simple! Your project manager will see your message and respond.\n\n**Example Message Ideas:**\n• "Hi! I'm getting started with the portal"\n• "I have a question about the contract"\n• "Can we schedule a quick call?"\n\nWant to learn about uploading files next?`;
      } else {
        content = `You know how to message! 💬\n\n**Quick Access:**\n• Click **💬 Messages** in navigation\n• Or "Contact Manager" in Quick Actions\n\n**Try sending a message now** - your project manager is waiting to help!\n\nWhat else can I help you with?`;
      }
      newContext.topicsCovered.push('messages');
      return { content, newContext };
    }

    // Upload - specific guidance
    if (lowerInput.includes('upload') || lowerInput.includes('share') || lowerInput.includes('send file') ||
        lowerInput.includes('add document')) {
      
      if (!newContext.hasAskedAboutUploads) {
        newContext.hasAskedAboutUploads = true;
        content = `Excellent! Here's how to upload documents:\n\n**📍 How to Upload:**\n1. Click **📤 Upload** button in the top navigation\n2. Or use the upload option in Quick Actions\n\n**📤 Upload Process:**\n1. Click **📤 Upload**\n2. Select your file (PDF, DOCX, images, etc.)\n3. Add a description (optional but helpful)\n4. Click "Upload"\n5. Your team will be notified automatically\n\n**💡 Best Practices:**\n• Name files clearly (e.g., "Invoice_January_2026.pdf")\n• Add descriptions for context\n• Upload files as you receive them\n\n**🎯 Try It Now:**\nClick the **📤 Upload** button in the top navigation to get started!\n\nHave you reviewed your important documents yet?`;
      } else {
        content = `You know how to upload! 📤\n\n**Quick Steps:**\n1. Click **📤 Upload** in navigation\n2. Select your file\n3. Add description if needed\n4. Upload!\n\n**Try uploading something now** - your team will be notified automatically.\n\nWhat else can I help with?`;
      }
      newContext.topicsCovered.push('uploads');
      return { content, newContext };
    }

    // Progress/Status - specific guidance
    if (lowerInput.includes('progress') || lowerInput.includes('status') || lowerInput.includes('where am i') ||
        lowerInput.includes('how am i doing') || lowerInput.includes('milestone')) {
      content = `Great question! Here's your project status:\n\n**📊 Current Progress: 75% Complete**\n\n**✅ Completed:**\n• Project Kickoff (Jan 15)\n• Phase 1 Delivery (Feb 20)\n\n**🔄 In Progress:**\n• Phase 2 Review (currently active)\n\n**⏳ Upcoming:**\n• Final Delivery (Target: Apr 30)\n\n**📍 Where to View:**\n• See progress bar on your dashboard\n• Check "Project Progress" section (right side)\n• Click **📊 Analytics** for detailed reports\n\n**🎯 Next Steps:**\n• Review Phase 2 deliverables\n• Check for any pending items (you have 2)\n• Connect with your team if you have questions\n\n**💡 You're doing great!** You're 3/4 of the way through. Want help with anything specific about the project?`;
      newContext.topicsCovered.push('progress');
      return { content, newContext };
    }

    // Dashboard
    if (lowerInput.includes('dashboard') || lowerInput.includes('home') || lowerInput.includes('main page')) {
      content = `Your dashboard is your command center! 🏠\n\n**What's on Your Dashboard:**\n• **Welcome Banner** - Shows your last login\n• **Summary Cards** - Quick stats (12 docs, 3 uploads, 2 pending)\n• **Recent Activity** - Latest updates and changes\n• **Important Documents** - Priority files (pinned 📌)\n• **Project Progress** - Status bar and milestones\n• **Quick Actions** - Fast shortcuts to common tasks\n\n**🎯 Key Sections:**\n• **Left Column:** Recent activity and important docs\n• **Right Column:** Quick actions and project progress\n\n**💡 Tip:** Click **🏠 Dashboard** anytime to return here!\n\nWhat would you like to explore on your dashboard?`;
      newContext.topicsCovered.push('dashboard');
      return { content, newContext };
    }

    // Notifications
    if (lowerInput.includes('notification') || lowerInput.includes('alert') || lowerInput.includes('update')) {
      content = `Here's how notifications work:\n\n**📍 Access:** Click **🔔 Notifications** in the top navigation\n\n**🔔 What You'll See:**\n• New document uploads\n• Messages from your team\n• Project timeline changes\n• Important deadlines and reminders\n• Status updates\n\n**💡 Pro Tips:**\n• Check notifications regularly\n• Unread notifications are highlighted\n• Click any notification to go directly to the item\n\n**🎯 Try It:** Click **🔔 Notifications** now to see all your alerts!\n\nYou currently have activity showing in "Recent Activity" on your dashboard too.`;
      newContext.topicsCovered.push('notifications');
      return { content, newContext };
    }

    // Analytics
    if (lowerInput.includes('analytics') || lowerInput.includes('report') || lowerInput.includes('insight') ||
        lowerInput.includes('statistic')) {
      content = `Analytics give you detailed project insights! 📊\n\n**📍 Access:** Click **📊 Analytics** in the top navigation\n\n**📈 What You'll Find:**\n• Detailed project progress reports\n• Timeline visualizations\n• Document access statistics\n• Team activity overview\n• Performance metrics\n\n**🎯 Quick Stats (from your dashboard):**\n• 12 total documents\n• 3 recent uploads\n• 2 pending items\n• 75% project completion\n\n**💡 When to Use Analytics:**\n• Check detailed progress reports\n• Understand project trends\n• Review team activity\n• Track milestones\n\nWant to see your detailed analytics? Click **📊 Analytics** in the navigation!`;
      newContext.topicsCovered.push('analytics');
      return { content, newContext };
    }

    // Greeting
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
      if (newContext.topicsCovered.length > 0) {
        content = `Hello again! 👋\n\nI see we've already covered ${newContext.topicsCovered.length} topic${newContext.topicsCovered.length > 1 ? 's' : ''}:\n${newContext.topicsCovered.map(t => `• ${t}`).join('\n')}\n\n**What would you like to explore next?**\n• Documents and files\n• Messaging your team\n• Uploading files\n• Project progress\n• Or something else?`;
      } else {
        content = `Hello! 👋 I'm Sage, your onboarding assistant.\n\nI'm here to guide you through the Client Portal. You can ask me:\n• "Help me onboard" or "How do I start?"\n• "Show me my documents"\n• "How do I contact my team?"\n• "What's my next step?"\n\n**What would you like to do first?**`;
      }
      return { content, newContext };
    }

    // Help - contextual based on what they've learned
    if (lowerInput.includes('help') || lowerInput.includes('what can')) {
      const coveredTopics = newContext.topicsCovered;
      
      if (coveredTopics.length === 0) {
        content = `I can help you with everything! Here's where to start:\n\n**🎯 Getting Started:**\n• Say "Help me onboard" for step-by-step guidance\n• Or "How do I start?" to begin your journey\n\n**📋 Main Features:**\n• Documents - Find and access files\n• Messages - Contact your team\n• Upload - Share files\n• Progress - Track your project\n\n**What would you like to explore first?**`;
      } else {
        const remaining = ['documents', 'messages', 'uploads', 'progress', 'notifications'].filter(
          t => !coveredTopics.includes(t)
        );
        
        content = `Great! Here's what I can help with:\n\n**✅ You've Learned About:**\n${coveredTopics.map(t => `• ${t.charAt(0).toUpperCase() + t.slice(1)}`).join('\n')}\n\n**🎯 Still Available:**\n${remaining.length > 0 ? remaining.map(t => `• ${t.charAt(0).toUpperCase() + t.slice(1)}`).join('\n') : '• You have covered the basics! Try exploring features directly.'}\n\n**What would you like to know more about?**`;
      }
      return { content, newContext };
    }

    // Default - contextual based on conversation
    const recentTopics = newContext.topicsCovered.slice(-2);
    
    if (recentTopics.length > 0) {
      content = `I understand you're asking about "${userInput}".\n\n**Based on what we've covered** (${recentTopics.join(', ')}), here are some specific things I can help with:\n\n**📄 Documents:** "Show me my documents" or "How do I find files?"\n**💬 Messages:** "How do I contact my team?"\n**📤 Upload:** "How do I upload a file?"\n**📊 Progress:** "What's my project status?"\n**🏠 Dashboard:** "Tell me about my dashboard"\n\n**Or ask:**\n• "Help me onboard" for step-by-step guidance\n• "What's my next step?" for actionable advice\n\n**What specifically would you like help with?**`;
    } else {
      content = `Thanks for your question! I'm here to help you get the most out of the Client Portal.\n\n**🎯 Let's Get Started:**\nTry asking:\n• "Help me onboard" - Step-by-step onboarding\n• "What's my next step?" - Actionable guidance\n• "Show me my documents" - Access your files\n• "How do I contact my team?" - Messaging help\n\n**Or be specific:**\n• "How do I upload a file?"\n• "What's my project status?"\n• "Where can I see my progress?"\n\n**What would you like to explore?**`;
    }
    
    return { content, newContext };
  };

  const handleSkipOnboarding = () => {
    // Save current progress but mark as skipped
    const currentState = loadOnboardingState();
    const skippedState: OnboardingState = {
      ...currentState,
      isActive: false,
      currentStep: currentState.currentStep,
      completedAt: null,
    };
    saveOnboardingState(skippedState);
    
    // Add message confirming skip
    const skipMessage: Message = {
      id: Date.now().toString(),
      type: 'sage',
      content: `No problem! I've saved your progress. You can always ask me to resume onboarding by saying "Start onboarding" or "Help me onboard".\n\nFeel free to explore the portal or ask me any questions!`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, skipMessage]);
  };

  const handleResumeOnboarding = () => {
    // Resume onboarding from where they left off
    const currentState = loadOnboardingState();
    const resumeState: OnboardingState = {
      ...currentState,
      isActive: true,
    };
    saveOnboardingState(resumeState);
    
    // Find the current question
    const currentQuestion = onboardingQuestions.find(q => q.step === currentState.currentStep);
    if (currentQuestion) {
      const resumeMessage: Message = {
        id: Date.now().toString(),
        type: 'sage',
        content: `Great! Let's continue where we left off.\n\n${currentQuestion.question}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, resumeMessage]);
    } else {
      // Start from beginning if no current step
      const firstQuestion = onboardingQuestions[0];
      const startMessage: Message = {
        id: Date.now().toString(),
        type: 'sage',
        content: firstQuestion.question,
        timestamp: new Date(),
      };
      const newState: OnboardingState = {
        isActive: true,
        currentStep: 1,
        completedSteps: [],
        userResponses: {},
        startedAt: new Date(),
        completedAt: null,
      };
      saveOnboardingState(newState);
      setMessages([startMessage]);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`sage-chat-container ${isOpen ? 'open' : ''}`}>
      {/* Chat Window */}
      {isOpen && (
        <div className="sage-chat-window">
          <div className="sage-chat-header">
            <div className="sage-chat-header-info">
              <div className="sage-avatar" role="img" aria-label="Sage the onboarding assistant">
                <SageLogo size="small" />
              </div>
              <div className="sage-info">
                <div className="sage-name">Sage</div>
                <div className="sage-status">
                  <span className="sage-status-dot"></span>
                  Online
                </div>
              </div>
              {onboardingState.isActive && onboardingState.currentStep > 0 && (
                <div className="sage-onboarding-progress">
                  <span className="onboarding-badge">Onboarding</span>
                  <span className="onboarding-step-indicator">
                    Step {onboardingState.currentStep} of 8
                  </span>
                </div>
              )}
            </div>
            <div className="sage-header-actions">
              {onboardingState.isActive && onboardingState.currentStep > 0 && !onboardingState.completedAt && (
                <button 
                  className="sage-skip-btn" 
                  onClick={handleSkipOnboarding}
                  aria-label="Skip onboarding"
                  title="Skip onboarding for now"
                >
                  Skip
                </button>
              )}
              {!onboardingState.isActive && onboardingState.currentStep > 0 && !onboardingState.completedAt && (
                <button 
                  className="sage-resume-btn" 
                  onClick={handleResumeOnboarding}
                  aria-label="Resume onboarding"
                  title="Resume onboarding"
                >
                  Resume
                </button>
              )}
              <button className="sage-minimize-btn" onClick={toggleChat} aria-label="Minimize chat">
                −
              </button>
            </div>
          </div>

          <div className="sage-chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`sage-message sage-message-${message.type}`}
              >
                {message.type === 'sage' && (
                  <div className="sage-message-avatar" role="img" aria-label="Sage">
                    <SageLogo size="small" />
                  </div>
                )}
                <div className="sage-message-content">
                  <div className="sage-message-bubble">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="sage-message-time">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="sage-message sage-message-sage">
                <div className="sage-message-avatar" role="img" aria-label="Sage">
                  <SageLogo size="small" />
                </div>
                <div className="sage-message-content">
                  <div className="sage-message-bubble sage-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="sage-chat-input-form" onSubmit={handleSendMessage}>
            <input
              ref={inputRef}
              type="text"
              className="sage-chat-input"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button
              type="submit"
              className="sage-chat-send-btn"
              disabled={!inputValue.trim()}
            >
              →
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        className={`sage-chat-button ${onboardingState.isActive && !onboardingState.completedAt ? 'onboarding-active' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Close chat' : 'Open chat with Sage'}
      >
        {isOpen ? (
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>✕</span>
        ) : (
          <SageLogo size="small" />
        )}
        {onboardingState.isActive && !onboardingState.completedAt && (
          <span className="onboarding-notification-badge">●</span>
        )}
      </button>
    </div>
  );
};

export default SageChat;
