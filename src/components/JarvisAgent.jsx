import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, MicOff, Send, Bot, Brain, Search, Code, FileText } from 'lucide-react';
import FileUpload from './FileUpload';

const JarvisAgent = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  
  // Backend API configuration
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';

  // Available AI agents with n8n workflow mapping
  const aiAgents = [
    { id: 'financial', name: 'Financial Assistant', icon: Bot, color: 'from-green-500 to-emerald-500', workflow: 'financial-agent' },
    { id: 'tasks', name: 'Task Organizer', icon: FileText, color: 'from-blue-500 to-cyan-500', workflow: 'task-organizer' },
    { id: 'email', name: 'Email Assistant', icon: Send, color: 'from-purple-500 to-pink-500', workflow: 'email-assistant' },
    { id: 'receipts', name: 'Receipt Sorter', icon: Search, color: 'from-orange-500 to-red-500', workflow: 'receipt-sorter' },
    { id: 'general', name: 'General Assistant', icon: Brain, color: 'from-indigo-500 to-purple-500', workflow: 'general-assistant' },
  ];

  // Generate stable random positions for background elements
  const backgroundElements = useMemo(() => {
    return [...Array(50)].map((_, i) => ({
      id: i,
      width: Math.random() * 200 + 50,
      height: Math.random() * 200 + 50,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 5,
      animationDuration: Math.random() * 10 + 5
    }));
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;
  }, []);

  // Fetch and set voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    
    const populateVoiceList = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);

      // Set a default voice if one isn't already selected.
      setSelectedVoice(currentSelectedVoice => {
        if (!currentSelectedVoice && availableVoices.length > 0) {
          const defaultVoice = availableVoices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('en')) || availableVoices.find(voice => voice.lang.startsWith('en-US')) || availableVoices[0];
          return defaultVoice ? defaultVoice.voiceURI : null;
        }
        return currentSelectedVoice;
      });
    };

    // Voices can load asynchronously.
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = populateVoiceList;
    }
    
    populateVoiceList(); // Initial call
  }, []);

  // Initialize thread and check backend status
  useEffect(() => {
    const initializeBackend = async () => {
      try {
        // Check backend health
        const healthResponse = await fetch(`${API_BASE.replace('/api', '')}/health`);
        if (!healthResponse.ok) throw new Error('Backend not available');
        
        // Create or get thread
        const threadResponse = await fetch(`${API_BASE}/thread`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'default' })
        });
        
        if (!threadResponse.ok) throw new Error('Failed to create thread');
        
        const { threadId: newThreadId } = await threadResponse.json();
        setThreadId(newThreadId);
        setBackendStatus('connected');
        
        // Add welcome message
        const welcomeMessage = {
          id: Date.now(),
          text: 'Hello! I\'m JARVIS, your AI assistant. I can help you with weather, emails, research, and much more. How can I assist you today?',
          sender: 'ai',
          agent: 'JARVIS',
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages([welcomeMessage]);
        
      } catch (error) {
        console.error('Backend initialization failed:', error);
        setBackendStatus('error');
      }
    };
    
    initializeBackend();
  }, []);

  // Analyze query and route to appropriate n8n workflow
  const analyzeAndRoute = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // Financial keywords
    if (lowerQuery.includes('budget') || lowerQuery.includes('money') || lowerQuery.includes('expense') || 
        lowerQuery.includes('income') || lowerQuery.includes('financial') || lowerQuery.includes('spending') ||
        lowerQuery.includes('savings') || lowerQuery.includes('investment') || lowerQuery.includes('bank')) {
      return aiAgents.find(a => a.id === 'financial');
    }
    
    // Task organization keywords
    if (lowerQuery.includes('task') || lowerQuery.includes('todo') || lowerQuery.includes('organize') || 
        lowerQuery.includes('schedule') || lowerQuery.includes('plan') || lowerQuery.includes('reminder') ||
        lowerQuery.includes('calendar') || lowerQuery.includes('meeting') || lowerQuery.includes('appointment')) {
      return aiAgents.find(a => a.id === 'tasks');
    }
    
    // Email keywords
    if (lowerQuery.includes('email') || lowerQuery.includes('send') || lowerQuery.includes('mail') || 
        lowerQuery.includes('message') || lowerQuery.includes('contact') || lowerQuery.includes('reply')) {
      return aiAgents.find(a => a.id === 'email');
    }
    
    // Receipt sorting keywords
    if (lowerQuery.includes('receipt') || lowerQuery.includes('sort') || lowerQuery.includes('categorize') || 
        lowerQuery.includes('expense report') || lowerQuery.includes('document') || lowerQuery.includes('scan')) {
      return aiAgents.find(a => a.id === 'receipts');
    }
    
    // Default to general assistant
    return aiAgents.find(a => a.id === 'general');
  };

  // Handle voice input
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript) {
        handleSubmit(transcript);
      }
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Speak response
  const speak = (text) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = voices.find(v => v.voiceURI === selectedVoice);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    }
  };

  // Handle message submission with AI and n8n workflow routing
  const handleSubmit = async (text) => {
    if ((!text.trim() && selectedFiles.length === 0) || !threadId || backendStatus !== 'connected') return;

    const agent = analyzeAndRoute(text);
    setSelectedAgent(agent);
    setIsProcessing(true);

    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setTranscript('');
    setSelectedFiles([]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('threadId', threadId);
      formData.append('agent', agent.id);
      formData.append('workflow', agent.workflow);
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Send message to backend with agent context
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { response: aiResponse, workflowResult, timestamp } = await response.json();
      
      let responseText = aiResponse;
      if (workflowResult && workflowResult.success) {
        responseText += ` \n\n✅ ${agent.name} workflow executed successfully.`;
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'ai',
        agent: agent.name,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      speak(aiResponse);
      
    } catch (error) {
      console.error('Error communicating with AI:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: 'I apologize, but I\'m having trouble connecting to my systems right now. Please try again in a moment.',
        sender: 'ai',
        agent: 'JARVIS',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      speak(errorMessage.text);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0">
          {backgroundElements.map((element) => (
            <div
              key={element.id}
              className="absolute bg-blue-500/10 rounded-full blur-xl animate-pulse"
              style={{
                width: element.width + 'px',
                height: element.height + 'px',
                left: element.left + '%',
                top: element.top + '%',
                animationDelay: element.animationDelay + 's',
                animationDuration: element.animationDuration + 's'
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="p-6 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            JARVIS AI Assistant
          </h1>
          <p className="text-gray-400 mt-2">Voice-activated AI with n8n workflow integration</p>
          
          {/* Backend Status Indicator */}
          <div className="mt-3 flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-400' :
              backendStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              'bg-red-400'
            }`} />
            <span className="text-sm text-gray-400">
              {backendStatus === 'connected' ? 'AI Systems Online' :
               backendStatus === 'connecting' ? 'Connecting to AI Systems...' :
               'AI Systems Offline'}
            </span>
          </div>
        </div>

        {/* Voice Selector */}
        <div className="w-full max-w-md mx-auto mb-4">
          <label htmlFor="voice-select" className="block mb-2 text-sm font-medium text-gray-300">Assistant's Voice</label>
          <select
            id="voice-select"
            value={selectedVoice || ''}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
          >
            {voices.length > 0 ? (
              voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {`${voice.name} (${voice.lang})`}
                </option>
              ))
            ) : (
              <option value="" disabled>Loading voices...</option>
            )}
          </select>
        </div>

        {/* Agent Selection Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 px-4">
          {aiAgents.map((agent) => {
            const IconComponent = agent.icon;
            return (
              <div
                key={agent.id}
                className={`
                  px-3 py-2 rounded-full text-xs font-medium transition-all duration-300
                  ${selectedAgent && selectedAgent.id === agent.id 
                    ? `bg-gradient-to-r ${agent.color} text-white shadow-lg` 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <IconComponent size={14} />
                  <span>{agent.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Central visualization */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="relative">
            {/* Main circle */}
            <div className={`
              w-64 h-64 rounded-full relative transition-all duration-300
              ${isListening || isSpeaking ? 'scale-110' : 'scale-100'}
            `}>
              {/* Outer rings */}
              <div className={`
                absolute inset-0 rounded-full border-2 border-cyan-400/30
                ${isListening || isSpeaking ? 'animate-ping' : ''}
              `} />
              <div className={`
                absolute inset-0 rounded-full border-2 border-blue-400/20
                ${isListening || isSpeaking ? 'animate-ping animation-delay-200' : ''}
              `} />
              
              {/* Inner circle with gradient */}
              <div className={`
                absolute inset-2 rounded-full bg-gradient-to-br 
                ${selectedAgent ? selectedAgent.color : 'from-gray-700 to-gray-800'} 
                flex items-center justify-center shadow-lg
              `}>
                <button 
                  onClick={toggleListening} 
                  className="w-48 h-48 rounded-full bg-black/20 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50"
                >
                  {isListening ? <MicOff size={60} className="animate-pulse" /> : <Mic size={60} />}
                </button>
              </div>
              
              {/* Agent name display */}
              {selectedAgent && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                  <p className="text-sm text-gray-300 font-medium">{selectedAgent.name}</p>
                  <p className="text-xs text-gray-500">Active Workflow</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message display area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs text-gray-400 mt-1 text-right">{msg.timestamp}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="max-w-lg p-3 rounded-lg bg-gray-700 animate-pulse">
                <p className="text-sm">...</p>
              </div>
            </div>
          )}
        </div>

        {/* File Upload */}
        <FileUpload onFilesSelect={setSelectedFiles} />

        {/* Input bar */}
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(inputText); }} className="flex items-center bg-gray-900/50 border border-gray-700 rounded-full p-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? 'Listening...' : 'Type your message or use the mic'}
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none px-4"
              disabled={isListening}
            />
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 rounded-full p-3 text-white transition-colors duration-300" disabled={isProcessing}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JarvisAgent;
